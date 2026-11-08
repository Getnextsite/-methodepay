import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import { requireTenant, assertRole, ForbiddenError } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { Field, PageHeader, Section } from '@/components/ui';
import { ActionForm, SubmitButton, type ActionState } from '@/components/action-form';

export const metadata: Metadata = { title: 'Wallets' };

const COMMON_COINS = [
  { coin: 'USDT', networks: ['TRC20', 'ERC20', 'BEP20', 'Polygon'] },
  { coin: 'USDC', networks: ['ERC20', 'Polygon', 'Solana', 'Base'] },
  { coin: 'BTC', networks: ['Bitcoin', 'Lightning'] },
  { coin: 'ETH', networks: ['ERC20', 'Base', 'Arbitrum'] },
  { coin: 'LTC', networks: ['Litecoin'] },
  { coin: 'TRX', networks: ['Tron'] },
  { coin: 'SOL', networks: ['Solana'] },
  { coin: 'BNB', networks: ['BEP20'] },
];

async function addWalletAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  'use server';
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'ADMIN');

    const coin = String(formData.get('coin') ?? '').trim().toUpperCase().slice(0, 32);
    const network = String(formData.get('network') ?? '').trim().slice(0, 32);
    const address = String(formData.get('address') ?? '').trim().slice(0, 190);
    const qrImageUrl = String(formData.get('qrImageUrl') ?? '').trim() || null;

    if (!coin) return { error: 'Pick a coin.' };
    if (!address) return { error: 'Paste the receive address.' };

    // The warning the plugin FAQ had to repeat constantly, enforced as advice
    // rather than a block: exchanges flag third-party deposits as merchant
    // activity and freeze accounts, but it is the merchant call to make.
    await prisma.wallet.upsert({
      where: { accountId_coin_network: { accountId: tenant.account.id, coin, network } },
      create: { accountId: tenant.account.id, coin, network, address, qrImageUrl },
      update: { address, qrImageUrl, active: true },
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath('/dashboard/wallets');
  return { message: 'Wallet saved.' };
}

async function removeWalletAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  'use server';
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'ADMIN');
    const id = String(formData.get('id') ?? '');
    await prisma.wallet.deleteMany({ where: { id, accountId: tenant.account.id } });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }
  revalidatePath('/dashboard/wallets');
  return { message: 'Wallet removed.' };
}

export default async function WalletsPage() {
  const { account } = await requireTenant();
  const wallets = await prisma.wallet.findMany({
    where: { accountId: account.id },
    orderBy: [{ coin: 'asc' }, { network: 'asc' }],
  });

  return (
    <>
      <PageHeader
        title="Wallets"
        description="The addresses behind the Pay with Crypto option. Funds go straight to you — MethodePay never holds them and cannot move them."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Section title="Add an address">
          <ActionForm action={addWalletAction}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Coin" htmlFor="coin">
                <input
                  id="coin"
                  name="coin"
                  list="coins"
                  required
                  className="input"
                  placeholder="USDT"
                />
                <datalist id="coins">
                  {COMMON_COINS.map((c) => (
                    <option key={c.coin} value={c.coin} />
                  ))}
                </datalist>
              </Field>
              <Field label="Network" htmlFor="network" hint="TRC20, ERC20, Polygon…">
                <input
                  id="network"
                  name="network"
                  list="networks"
                  className="input"
                  placeholder="TRC20"
                />
                <datalist id="networks">
                  {[...new Set(COMMON_COINS.flatMap((c) => c.networks))].map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </Field>
            </div>

            <Field
              label="Receive address"
              htmlFor="address"
              hint="Use a self-custody wallet. Exchange deposit addresses get flagged for third-party deposits and frozen."
            >
              <input
                id="address"
                name="address"
                required
                className="input font-mono text-xs"
                spellCheck={false}
              />
            </Field>

            <Field label="QR image URL" htmlFor="qrImageUrl" hint="Optional — one is generated if you leave this blank.">
              <input id="qrImageUrl" name="qrImageUrl" type="url" className="input" />
            </Field>

            <SubmitButton>Save wallet</SubmitButton>
          </ActionForm>
        </Section>

        <Section title="Your addresses" description="Buyers pick from these in a dropdown at checkout.">
          {wallets.length === 0 ? (
            <p className="text-sm text-ink-400">
              No addresses yet. Direct crypto stays hidden at checkout until you add one.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {wallets.map((wallet) => (
                <li
                  key={wallet.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-ink-600/70 bg-ink-900/40 p-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">
                      {wallet.coin}
                      {wallet.network ? ` · ${wallet.network}` : ''}
                    </p>
                    <code className="mt-1 block break-all font-mono text-[11px] text-ink-300">
                      {wallet.address}
                    </code>
                  </div>
                  <ActionForm action={removeWalletAction} className="shrink-0">
                    <input type="hidden" name="id" value={wallet.id} />
                    <SubmitButton
                      variant="danger"
                      className="!px-2.5 !py-1.5 !text-xs"
                      confirm={`Remove the ${wallet.coin} address? Buyers will no longer be offered it.`}
                    >
                      Remove
                    </SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
