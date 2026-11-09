'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { PaymentMethodConfig } from '@prisma/client';
import { prisma } from '@/lib/db';
import { assertRole, ForbiddenError, requireTenant } from '@/lib/tenancy';
import { canUseMethod, entitlementsFor } from '@/lib/entitlements';
import { configIsReady, prepareConfigForStorage, readConfig } from '@/lib/gateway/config';
import { methodDefinition } from '@/lib/gateway/registry';
import { encryptSecret } from '@/lib/crypto';
import { nextSlug, stepAt } from '@/lib/onboarding/steps';
import type { ActionState } from '@/components/action-form';

/**
 * Saving a wizard step.
 *
 * Two rules hold across all of them.
 *
 * A rail goes live only when it is both complete and covered by the plan.
 * Neither condition is announced in a flash message that dies on the redirect:
 * every step and the final summary read the real state back out of the
 * database, so what the merchant sees is what a buyer would get.
 *
 * A field the step did not ask about keeps what it had. The wizard shows a
 * curated subset of each rail, so writing the whole config back from the form
 * alone would quietly erase instructions and defaults set elsewhere.
 */

const fieldName = (key: string, field: string) => `${key}__${field}`;

function formValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Build a full config submission from a partial form.
 *
 * Secrets the step did not ask about are submitted empty, which
 * `prepareConfigForStorage` reads as "unchanged" and keeps encrypted exactly as
 * they were — a stored secret never makes the round trip to a browser and back.
 */
function mergeSubmission(
  key: string,
  asked: Set<string>,
  formData: FormData,
  existing: PaymentMethodConfig | null,
): Record<string, unknown> {
  const def = methodDefinition(key);
  if (!def) return {};
  const current = readConfig(existing, key);
  const submitted: Record<string, unknown> = {};

  for (const field of def.fields) {
    if (asked.has(field.name)) {
      const raw = formData.get(fieldName(key, field.name));
      submitted[field.name] =
        field.type === 'checkbox' ? raw === 'on' || raw === '1' : typeof raw === 'string' ? raw : '';
    } else if (field.secret) {
      submitted[field.name] = '';
    } else {
      submitted[field.name] = current[field.name] ?? '';
    }
  }
  return submitted;
}

async function saveRail(
  accountId: string,
  key: string,
  asked: string[],
  formData: FormData,
  allowed: boolean,
): Promise<void> {
  if (!methodDefinition(key)) return;

  const existing = await prisma.paymentMethodConfig.findUnique({
    where: { accountId_key: { accountId, key } },
  });

  const config = prepareConfigForStorage(
    key,
    mergeSubmission(key, new Set(asked), formData, existing),
    existing,
  );

  // Readiness is checked against the stored shape, secrets still encrypted: it
  // only asks whether a value is present, so the answer is the same and nothing
  // has to be decrypted to find out.
  const enabled = configIsReady(key, config) && allowed;

  await prisma.paymentMethodConfig.upsert({
    where: { accountId_key: { accountId, key } },
    create: { accountId, key, enabled, config: config as object },
    update: { enabled, config: config as object },
  });
}

// ---------------------------------------------------------------- steps

export async function saveStoreStep(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'ADMIN');

    const name = formValue(formData, 'storeName').slice(0, 120);
    if (!name) return { error: 'Give your store a name.' };

    const values = {
      storeName: name,
      supportEmail: formValue(formData, 'supportEmail').slice(0, 190),
      orderPrefix: formValue(formData, 'orderPrefix').toUpperCase().slice(0, 8) || 'MP-',
    };

    await prisma.notificationSettings.upsert({
      where: { accountId: tenant.account.id },
      create: { accountId: tenant.account.id, ...values },
      update: values,
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath('/dashboard');
  redirect(`/onboarding/setup/${nextSlug('store')}`);
}

export async function saveCryptoStep(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'ADMIN');
    const accountId = tenant.account.id;
    let wallets = 0;

    // Rows post as wallet-0-coin, wallet-0-network, wallet-0-address. A row
    // with a coin but no address removes that wallet rather than leaving one
    // nobody can pay into.
    for (let i = 0; i < 12; i += 1) {
      const coin = formValue(formData, `wallet-${i}-coin`).toUpperCase().slice(0, 32);
      const network = formValue(formData, `wallet-${i}-network`).slice(0, 32);
      const address = formValue(formData, `wallet-${i}-address`).slice(0, 190);
      if (!coin) continue;

      if (!address) {
        await prisma.wallet.deleteMany({ where: { accountId, coin, network } });
        continue;
      }

      await prisma.wallet.upsert({
        where: { accountId_coin_network: { accountId, coin, network } },
        create: { accountId, coin, network, address, sortOrder: i },
        update: { address, active: true, sortOrder: i },
      });
      wallets += 1;
    }

    // Direct crypto is ready when a wallet exists, not when its own config is
    // filled in: the registry cannot see the wallets table, so the decision is
    // made here and matched by resolveMethods at checkout.
    const ent = entitlementsFor(tenant.account);
    await saveRail(
      accountId,
      'crypto',
      stepAt('crypto').rails[0].fields,
      formData,
      canUseMethod(ent, 'crypto') && wallets > 0,
    );
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath('/dashboard/wallets');
  redirect(`/onboarding/setup/${nextSlug('crypto')}`);
}

export async function saveChatStep(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'ADMIN');
    const accountId = tenant.account.id;

    const existing = await prisma.notificationSettings.findUnique({ where: { accountId } });
    const token = formValue(formData, 'telegramBotToken');

    const channels: string[] = [];
    if (formData.get('confirmViaWhatsapp') === 'on') channels.push('whatsapp');
    if (formData.get('confirmViaTelegram') === 'on') channels.push('telegram');

    const values = {
      // A blank secret box means "leave it alone", never "erase it".
      telegramBotTokenEnc: token ? encryptSecret(token) : existing?.telegramBotTokenEnc ?? null,
      telegramChatId: formValue(formData, 'telegramChatId') || null,
      confirmWhatsapp: formValue(formData, 'confirmWhatsapp') || null,
      confirmTelegram: formValue(formData, 'confirmTelegram') || null,
      confirmChannels: channels,
    };

    await prisma.notificationSettings.upsert({
      where: { accountId },
      create: { accountId, storeName: tenant.account.name, ...values },
      update: values,
    });

    const ent = entitlementsFor(tenant.account);
    await saveRail(
      accountId,
      'whatsapp',
      stepAt('chat').rails[0].fields,
      formData,
      canUseMethod(ent, 'whatsapp'),
    );
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath('/dashboard/notifications');
  redirect(`/onboarding/setup/${nextSlug('chat')}`);
}

export async function saveRailsStep(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = formValue(formData, 'step');
  const step = stepAt(slug);

  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'ADMIN');
    const ent = entitlementsFor(tenant.account);

    for (const rail of step.rails) {
      await saveRail(tenant.account.id, rail.key, rail.fields, formData, canUseMethod(ent, rail.key));
    }
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath('/dashboard/methods');
  redirect(`/onboarding/setup/${nextSlug(slug)}`);
}
