import type { Metadata } from 'next';
import Link from 'next/link';
import { requireTenant } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { Field, PageHeader, Section, StatTile } from '@/components/ui';
import { autoVerifiable } from '@/lib/chain/networks';
import { parseChainVerify } from '@/lib/chain/settings';
import { CRYPTO_CATALOG, byNetworkOrder, coinInfo, networkInfo } from '@/lib/crypto-catalog';
import { ActionForm, SubmitButton } from '@/components/action-form';
import { AddWalletForm, type CatalogCoin } from './add-form';
import {
  moveCoinAction,
  removeWalletAction,
  saveVerifyAction,
  toggleWalletAction,
  updateAddressAction,
} from './actions';

export const metadata: Metadata = { title: 'Wallets' };
export const dynamic = 'force-dynamic';

export default async function WalletsPage() {
  const { account, role } = await requireTenant();
  const canEdit = role === 'OWNER' || role === 'ADMIN';
  const [wallets, notifications, cryptoMethod] = await Promise.all([
    prisma.wallet.findMany({
      where: { accountId: account.id },
      orderBy: [{ sortOrder: 'asc' }, { coin: 'asc' }, { network: 'asc' }],
    }),
    prisma.notificationSettings.findUnique({ where: { accountId: account.id } }),
    prisma.paymentMethodConfig.findUnique({
      where: { accountId_key: { accountId: account.id, key: 'crypto' } },
      select: { enabled: true },
    }),
  ]);
  const verify = parseChainVerify(notifications?.chainVerify);

  // Coins in the order buyers see them, each with its networks.
  const groups = new Map<string, typeof wallets>();
  for (const w of wallets) groups.set(w.coin, [...(groups.get(w.coin) ?? []), w]);
  const coins = [...groups.entries()].map(([c, rows]) => [c, byNetworkOrder(c, rows)] as const);

  const catalog: CatalogCoin[] = CRYPTO_CATALOG.map((c) => ({
    symbol: c.symbol,
    name: c.name,
    color: c.color,
    glyph: c.glyph,
    networks: c.networks.map((n) => ({
      id: n.id,
      label: n.label,
      hint: n.hint,
      format: n.format,
      autoVerified: autoVerifiable(c.symbol, n.id),
    })),
  }));
  const saved: Record<string, string[]> = Object.fromEntries(coins.map(([c, rows]) => [c, rows.map((r) => r.network)]));

  const live = wallets.filter((w) => w.active);
  const auto = live.filter((w) => autoVerifiable(w.coin, w.network));

  return (
    <>
      <PageHeader
        title="Wallets"
        description="The coins and networks buyers can pay with when they choose Pay with Crypto. Funds go straight to your wallets: MethodePay never holds them and cannot move them."
      />

      {!cryptoMethod?.enabled && wallets.length > 0 ? (
        <div className="mb-6 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          Pay with Crypto is switched off, so buyers do not see these wallets.{' '}
          <Link href="/dashboard/methods" className="underline">
            Switch it on under Payment methods
          </Link>
          .
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatTile label="Coins offered" value={String(new Set(live.map((w) => w.coin)).size)} />
        <StatTile label="Networks offered" value={String(live.length)} hint={wallets.length > live.length ? `${wallets.length - live.length} hidden` : undefined} />
        <StatTile
          label="Verified automatically"
          value={`${auto.length} of ${live.length}`}
          tone={live.length && auto.length === live.length ? 'good' : 'default'}
          hint={verify.enabled ? 'On the blockchain, once the buyer submits the TXID' : 'Automatic verification is off'}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Section
          title="Your coins"
          description="Buyers pick a coin, then a network, in this order. Open a coin to edit, hide or remove a network."
        >
          {coins.length === 0 ? (
            <p className="text-sm text-ink-400">No wallet yet. Add your first coin on the right; Pay with Crypto stays hidden until you do.</p>
          ) : (
            <div className="space-y-3">
              {coins.map(([symbol, rows], index) => {
                const info = coinInfo(symbol);
                const shown = rows.filter((r) => r.active).length;
                return (
                  <details key={symbol} className="group rounded-xl border border-ink-600/70 bg-ink-900/40" open={coins.length <= 3}>
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-3 [&::-webkit-details-marker]:hidden">
                      <span
                        aria-hidden
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                        style={{ background: info?.color ?? '#64748b' }}
                      >
                        {info?.glyph ?? symbol.slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-white">
                          {symbol} <span className="font-normal text-ink-400">{info?.name ?? ''}</span>
                        </span>
                        <span className="block truncate text-xs text-ink-400">
                          {rows.map((r) => networkInfo(symbol, r.network)?.label ?? r.network).join(' · ')}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-ink-300">
                        {shown}/{rows.length} shown
                      </span>
                      <span aria-hidden className="shrink-0 text-ink-400 transition group-open:rotate-180">
                        ▾
                      </span>
                    </summary>

                    <div className="space-y-2.5 border-t border-ink-600/60 p-3.5">
                      {rows.map((w) => {
                        const net = networkInfo(symbol, w.network);
                        const automatic = autoVerifiable(symbol, w.network);
                        return (
                          <div key={w.id} className={`rounded-lg border border-ink-600/60 p-3 ${w.active ? '' : 'opacity-60'}`}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-white">
                                {net?.label ?? (w.network || 'No network')}
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
                                    automatic ? 'bg-mint/10 text-mint' : 'bg-ink-700 text-ink-300'
                                  }`}
                                >
                                  {automatic ? 'Auto-verified' : 'Checked by hand'}
                                </span>
                                {!w.active ? (
                                  <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10.5px] font-medium text-amber-200">Hidden</span>
                                ) : null}
                              </p>
                              {canEdit ? (
                                <span className="flex gap-1.5">
                                  <ActionForm action={toggleWalletAction} className="">
                                    <input type="hidden" name="id" value={w.id} />
                                    <SubmitButton variant="ghost" className="!px-2 !py-1 !text-[11px]">
                                      {w.active ? 'Hide' : 'Show'}
                                    </SubmitButton>
                                  </ActionForm>
                                  <ActionForm action={removeWalletAction} className="">
                                    <input type="hidden" name="id" value={w.id} />
                                    <SubmitButton
                                      variant="danger"
                                      className="!px-2 !py-1 !text-[11px]"
                                      confirm={`Remove ${symbol} on ${net?.label ?? w.network}? Buyers will no longer be offered it.`}
                                    >
                                      Remove
                                    </SubmitButton>
                                  </ActionForm>
                                </span>
                              ) : null}
                            </div>
                            <code className="mt-1.5 block break-all font-mono text-[11px] text-ink-300">{w.address}</code>
                            {canEdit ? (
                              <details className="mt-2 text-xs">
                                <summary className="cursor-pointer text-ink-400 hover:text-white">Edit address</summary>
                                <ActionForm action={updateAddressAction} className="mt-2 space-y-2">
                                  <input type="hidden" name="id" value={w.id} />
                                  <input
                                    name="address"
                                    defaultValue={w.address}
                                    className="input font-mono text-xs"
                                    spellCheck={false}
                                    aria-label="Receive address"
                                  />
                                  <input
                                    name="qrImageUrl"
                                    type="url"
                                    defaultValue={w.qrImageUrl ?? ''}
                                    className="input text-xs"
                                    placeholder="Custom QR image URL (optional, one is generated otherwise)"
                                    aria-label="QR image URL"
                                  />
                                  <SubmitButton variant="ghost" className="!px-2.5 !py-1.5 !text-xs">
                                    Save address
                                  </SubmitButton>
                                </ActionForm>
                              </details>
                            ) : null}
                          </div>
                        );
                      })}

                      {canEdit && coins.length > 1 ? (
                        <div className="flex gap-2 pt-1">
                          {index > 0 ? (
                            <ActionForm action={moveCoinAction} className="">
                              <input type="hidden" name="coin" value={symbol} />
                              <input type="hidden" name="direction" value="up" />
                              <SubmitButton variant="ghost" className="!px-2.5 !py-1 !text-[11px]">
                                ↑ Show earlier
                              </SubmitButton>
                            </ActionForm>
                          ) : null}
                          {index < coins.length - 1 ? (
                            <ActionForm action={moveCoinAction} className="">
                              <input type="hidden" name="coin" value={symbol} />
                              <input type="hidden" name="direction" value="down" />
                              <SubmitButton variant="ghost" className="!px-2.5 !py-1 !text-[11px]">
                                ↓ Show later
                              </SubmitButton>
                            </ActionForm>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </Section>

        {canEdit ? (
          <Section
            title="Add a coin"
            description="Pick a coin and paste an address for each network you accept. Addresses are checked against the network before they are saved."
          >
            <AddWalletForm catalog={catalog} saved={saved} />
          </Section>
        ) : null}
      </div>

      <div className="mt-6">
        <Section
          title="Automatic verification"
          description="When a buyer submits their transaction ID, MethodePay looks it up on the blockchain: right address, right coin, enough of it, sent after the order was placed, with enough confirmations, and not already used for another order. Supported: BTC, LTC, ETH, BNB, POL, USDT/USDC on Ethereum, BNB Chain and Polygon, and TRX/USDT/USDC on TRON."
        >
          <ActionForm action={saveVerifyAction}>
            <label className="flex items-center gap-2.5 text-sm text-ink-100">
              <input type="checkbox" name="enabled" defaultChecked={verify.enabled} />
              Check crypto payments on the blockchain automatically
            </label>
            <Field label="When a payment is verified" htmlFor="mode">
              <select id="mode" name="mode" defaultValue={verify.mode} className="input">
                <option value="auto">Mark the order paid and deliver it automatically</option>
                <option value="review">Mark it as verified, I confirm it myself</option>
              </select>
            </Field>
            {canEdit ? <SubmitButton>Save verification settings</SubmitButton> : null}
          </ActionForm>
        </Section>
      </div>
    </>
  );
}
