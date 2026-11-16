'use server';

import { revalidatePath } from 'next/cache';
import { requireTenant, assertRole, ForbiddenError, type Tenant } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { parseChainVerify } from '@/lib/chain/settings';
import { addressProblem, coinInfo } from '@/lib/crypto-catalog';
import type { ActionState } from '@/components/action-form';

async function run(work: (tenant: Tenant) => Promise<ActionState>): Promise<ActionState> {
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'ADMIN');
    const result = await work(tenant);
    revalidatePath('/dashboard/wallets');
    return result;
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }
}

/**
 * Save one coin on several networks in one go. The form sends one
 * `address:<network>` field per network; blank ones are skipped. Every
 * address is checked against its network before anything is saved, so a
 * half-saved coin never happens.
 */
export async function addWalletsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return run(async (tenant) => {
    const custom = formData.get('coin') === '__other';
    const coin = (custom ? String(formData.get('customCoin') ?? '') : String(formData.get('coin') ?? ''))
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9.]/g, '')
      .slice(0, 16);
    if (!coin) return { error: 'Pick a coin.' };

    const entries: { network: string; address: string }[] = [];
    if (custom) {
      const network = String(formData.get('customNetwork') ?? '').trim().slice(0, 32);
      const address = String(formData.get('customAddress') ?? '').trim().slice(0, 190);
      if (!network) return { error: 'Name the network, for example "Avalanche C-Chain".' };
      if (address) entries.push({ network, address });
    } else {
      const info = coinInfo(coin);
      if (!info) return { error: 'Unknown coin.' };
      for (const net of info.networks) {
        const address = String(formData.get(`address:${net.id}`) ?? '').trim().slice(0, 190);
        if (address) entries.push({ network: net.id, address });
      }
    }
    if (entries.length === 0) return { error: 'Paste at least one receive address.' };

    const problems = entries
      .map((e) => ({ e, problem: addressProblem(coin, e.network, e.address) }))
      .filter((p) => p.problem);
    if (problems.length) {
      return { error: problems.map((p) => `${p.e.network}: ${p.problem}`).join(' ') };
    }

    // New coins go to the end of the list the buyer sees.
    const last = await prisma.wallet.aggregate({ where: { accountId: tenant.account.id }, _max: { sortOrder: true } });
    const existing = await prisma.wallet.findFirst({
      where: { accountId: tenant.account.id, coin },
      select: { sortOrder: true },
    });
    const sortOrder = existing?.sortOrder ?? (last._max.sortOrder ?? 0) + 10;

    for (const e of entries) {
      await prisma.wallet.upsert({
        where: { accountId_coin_network: { accountId: tenant.account.id, coin, network: e.network } },
        create: { accountId: tenant.account.id, coin, network: e.network, address: e.address, sortOrder },
        update: { address: e.address, active: true },
      });
    }
    return {
      message: `${coin} saved on ${entries.length} network${entries.length === 1 ? '' : 's'}: ${entries.map((e) => e.network).join(', ')}.`,
    };
  });
}

export async function updateAddressAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return run(async (tenant) => {
    const wallet = await prisma.wallet.findFirst({
      where: { id: String(formData.get('id') ?? ''), accountId: tenant.account.id },
    });
    if (!wallet) return { error: 'That address no longer exists.' };
    const address = String(formData.get('address') ?? '').trim().slice(0, 190);
    const problem = addressProblem(wallet.coin, wallet.network, address);
    if (problem) return { error: problem };
    const qrImageUrl = String(formData.get('qrImageUrl') ?? '').trim() || null;
    if (qrImageUrl && !/^https:\/\//.test(qrImageUrl)) return { error: 'The QR image must be an https link.' };
    await prisma.wallet.update({ where: { id: wallet.id }, data: { address, qrImageUrl } });
    return { message: `${wallet.coin} on ${wallet.network} updated.` };
  });
}

export async function toggleWalletAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return run(async (tenant) => {
    const wallet = await prisma.wallet.findFirst({
      where: { id: String(formData.get('id') ?? ''), accountId: tenant.account.id },
    });
    if (!wallet) return { error: 'That address no longer exists.' };
    await prisma.wallet.update({ where: { id: wallet.id }, data: { active: !wallet.active } });
    return { message: wallet.active ? 'Hidden from buyers. It stays saved here.' : 'Shown to buyers again.' };
  });
}

export async function removeWalletAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return run(async (tenant) => {
    await prisma.wallet.deleteMany({ where: { id: String(formData.get('id') ?? ''), accountId: tenant.account.id } });
    return { message: 'Address removed.' };
  });
}

/** Move a whole coin up or down in the order buyers see. */
export async function moveCoinAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return run(async (tenant) => {
    const coin = String(formData.get('coin') ?? '');
    const direction = formData.get('direction') === 'up' ? -1 : 1;
    const wallets = await prisma.wallet.findMany({
      where: { accountId: tenant.account.id },
      orderBy: [{ sortOrder: 'asc' }, { coin: 'asc' }],
      select: { coin: true },
    });
    const order = [...new Set(wallets.map((w) => w.coin))];
    const i = order.indexOf(coin);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= order.length) return { message: 'Already there.' };
    [order[i], order[j]] = [order[j], order[i]];
    await prisma.$transaction(
      order.map((c, index) =>
        prisma.wallet.updateMany({ where: { accountId: tenant.account.id, coin: c }, data: { sortOrder: (index + 1) * 10 } }),
      ),
    );
    return { message: `${coin} moved ${direction < 0 ? 'up' : 'down'}.` };
  });
}

export async function saveVerifyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return run(async (tenant) => {
    const chainVerify = parseChainVerify({
      enabled: formData.get('enabled') === 'on',
      mode: formData.get('mode') === 'review' ? 'review' : 'auto',
    });
    await prisma.notificationSettings.upsert({
      where: { accountId: tenant.account.id },
      create: { accountId: tenant.account.id, chainVerify },
      update: { chainVerify },
    });
    return { message: 'Verification settings saved.' };
  });
}
