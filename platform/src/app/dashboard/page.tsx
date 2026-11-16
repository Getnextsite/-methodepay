import Link from 'next/link';
import type { Metadata } from 'next';
import type { OrderStatus } from '@prisma/client';
import { requireTenant } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { loadMerchantContext } from '@/lib/gateway/context';
import { incompleteMethods } from '@/lib/gateway/resolve';
import { methodDefinition } from '@/lib/gateway/registry';
import { formatMoney } from '@/lib/money';
import { env } from '@/lib/env';
import { methodName } from '@/lib/labels';
import { loadOverview } from '@/lib/overview';
import { Banner } from '@/components/ui';
import { Icon, type IconName } from '@/components/dash-icons';
import {
  Amount,
  ConversionGauge,
  Delta,
  DotBars,
  Heatmap,
  IN,
  MoneyFlow,
  OUT,
  RailFan,
} from '@/components/overview-charts';

export const metadata: Metadata = { title: 'Overview' };
export const dynamic = 'force-dynamic';

const GROUP_ICON: Record<string, IconName> = {
  card: 'card',
  onramp: 'wallet',
  crypto: 'bitcoin',
  manual: 'bank',
  chat: 'chat',
};
const GROUP_KIND: Record<string, string> = {
  card: 'Card',
  onramp: 'On-ramp',
  crypto: 'Crypto',
  manual: 'Manual',
  chat: 'Chat',
};

const STATUS_LINE: Record<OrderStatus, { label: string; dot: string }> = {
  PAID: { label: 'Paid', dot: '#1f8a62' },
  AWAITING_VERIFICATION: { label: 'To verify', dot: '#d08a16' },
  PENDING: { label: 'Pending', dot: '#9aa6b0' },
  REFUNDED: { label: 'Refunded', dot: OUT },
  CANCELLED: { label: 'Cancelled', dot: '#9aa6b0' },
  EXPIRED: { label: 'Expired', dot: '#9aa6b0' },
};

function Panel({
  title,
  href,
  children,
  className = '',
  aside,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
  className?: string;
  aside?: React.ReactNode;
}) {
  return (
    <section className={`card p-5 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-white">{title}</h2>
        <div className="flex items-center gap-2">
          {aside}
          {href ? (
            <Link href={href} className="grid h-8 w-8 place-items-center rounded-full text-ink-300 transition hover:bg-ink-800 hover:text-white" aria-label={`Open ${title}`}>
              <Icon.arrowUpRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export default async function OverviewPage() {
  const { account, user } = await requireTenant();
  const [ctx, ov, recent, liveProducts] = await Promise.all([
    loadMerchantContext(account.id),
    loadOverview(account.id),
    prisma.order.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { product: { select: { name: true } } },
    }),
    prisma.product.findMany({
      where: { accountId: account.id, active: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { name: true, slug: true },
    }),
  ]);

  const c = ov.currency;
  const fmt = (v: number) => formatMoney(v, c);
  const incomplete = incompleteMethods(ctx);
  const rails = ctx.methods
    .filter((m) => m.enabled)
    .map((m) => {
      const def = methodDefinition(m.key);
      return { key: m.key, label: m.label?.trim() || def?.defaultLabel || methodName(m.key), kind: GROUP_KIND[def?.group ?? 'manual'] ?? 'Rail' };
    });
  const firstName = (user.name ?? '').split(' ')[0] || account.name;
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const conversion = ov.conversion.started ? Math.round((ov.conversion.paid / ov.conversion.started) * 100) : 0;
  const monthName = new Date(ov.thisMonth + '-01T00:00:00Z').toLocaleDateString('en', { month: 'long', timeZone: 'UTC' });
  const monthShort = monthName.slice(0, 3);
  const net = ov.moneyIn.thisMonth - ov.refunds.thisMonth;
  const shareLink = liveProducts[0] ? `${env.checkoutUrl}/c/${account.slug}/${liveProducts[0].slug}` : null;

  return (
    <>
      {/* ---------------------------------------------------------- greeting */}
      <div className="mb-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-white">Welcome back, {firstName}</h1>
          <p className="mt-0.5 text-[13px] text-ink-300">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          {shareLink ? (
            <Link href="/dashboard/products" className="btn-ghost !px-5">
              <Icon.link className="h-4 w-4" />
              Share a link
            </Link>
          ) : null}
          <Link href="/dashboard/products/new" className="btn-primary !px-5">
            <Icon.plus className="h-4 w-4" />
            Add product
          </Link>
        </div>
      </div>

      {/* ---------------------------------------------------------- rails as cards */}
      {rails.length ? (
        <div className="relative -mb-3 mt-1">
          <p className="absolute bottom-6 left-0 text-[12px] text-ink-300">Your payment methods</p>
          <Link href="/dashboard/methods" className="absolute bottom-6 right-0 text-right text-[12px] text-ink-300 hover:text-white">
            {rails.length} live
            <span className="block text-[11px] text-ink-400">Manage</span>
          </Link>
          <RailFan rails={rails} />
        </div>
      ) : null}

      <div className="relative z-20 rounded-[28px] border border-[#fff]/80 bg-[#fff]/45 p-3 shadow-[0_30px_80px_-50px_rgba(16,42,60,0.6)] backdrop-blur-xl sm:p-4">
        {ov.conversion.awaiting > 0 ? (
          <Banner
            tone="warn"
            action={
              <Link href="/dashboard/orders?status=AWAITING_VERIFICATION" className="btn-ghost !py-2 !text-xs">
                Review them
              </Link>
            }
          >
            <strong className="font-semibold">
              {ov.conversion.awaiting} order{ov.conversion.awaiting === 1 ? '' : 's'} awaiting verification.
            </strong>{' '}
            Buyers say they paid. Nothing is delivered until you confirm.
          </Banner>
        ) : null}
        {rails.length === 0 ? (
          <Banner
            tone="warn"
            action={
              <Link href="/onboarding/setup/store" className="btn-primary !py-2 !text-xs">
                Set up payments
              </Link>
            }
          >
            <strong className="font-semibold">No way to pay you yet.</strong> The setup walkthrough has you taking money in a couple of minutes.
          </Banner>
        ) : null}
        {incomplete.length > 0 ? (
          <Banner
            tone="info"
            action={
              <Link href="/dashboard/methods" className="btn-ghost !py-2 !text-xs">
                Finish setup
              </Link>
            }
          >
            <strong className="font-semibold">
              {incomplete.length} payment method{incomplete.length === 1 ? '' : 's'} switched on but not live:
            </strong>{' '}
            {incomplete.map((m) => m.label).join(', ')}.
          </Banner>
        ) : null}

        {/* -------------------------------------------------------- stat strip */}
        <div className="card mb-4 grid gap-0 divide-y divide-ink-600/60 p-0 sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4 xl:divide-x">
          {[
            {
              label: 'Total revenue',
              cents: ov.allTime.cents,
              delta: <span className="rounded-full bg-ink-700 px-1.5 py-0.5 text-[10.5px] font-medium text-ink-300">all time</span>,
              bars: <DotBars values={ov.weekly.revenue} label="Revenue per week" format={fmt} />,
            },
            {
              label: `Money in · ${monthShort}`,
              cents: ov.moneyIn.thisMonth,
              delta: <Delta current={ov.paidOrders.thisMonth} previous={ov.paidOrders.lastMonth} />,
              bars: <DotBars values={ov.weekly.orders} label="Paid orders per week" format={(v) => `${v} orders`} />,
            },
            {
              label: `Refunds · ${monthShort}`,
              cents: ov.refunds.thisMonth,
              delta: <Delta current={ov.refunds.thisMonth} previous={ov.refunds.lastMonth} invert />,
              bars: <DotBars values={ov.weekly.refunds} tone="out" label="Refunds per week" format={fmt} />,
            },
            {
              label: `Net · ${monthShort}`,
              cents: net,
              delta: <Delta current={net} previous={ov.moneyIn.lastMonth - ov.refunds.lastMonth} />,
              bars: <DotBars values={ov.weekly.started} label="Checkouts started per week" format={(v) => `${v} checkouts`} />,
            },
          ].map((s) => (
            <div key={s.label} className="px-5 py-4">
              <p className="flex items-center gap-2 text-[12px] text-ink-300">
                <span className="truncate">{s.label}</span>
                {s.delta}
              </p>
              <div className="mt-1.5 flex items-end justify-between gap-3">
                <p className="text-[24px] font-semibold leading-none tracking-tight text-white">
                  <Amount cents={s.cents} currency={c} />
                </p>
                {s.bars}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
          {/* ------------------------------------------------------ money flow */}
          <Panel title="Money flow" href="/dashboard/reports" aside={<span className="chip !text-[11px]">Last 7 months</span>}>
            <div className="text-center">
              <p className="text-[12.5px] text-ink-300">Money in · {monthName}</p>
              <p className="mt-0.5 text-[40px] font-semibold leading-tight tracking-tight text-white">
                <Amount cents={ov.moneyIn.thisMonth} currency={c} />
              </p>
            </div>
            {ov.flow.length === 0 && ov.refundRow.total === 0 ? (
              <p className="py-16 text-center text-sm text-ink-400">Paid orders will appear here, one row per payment method.</p>
            ) : (
              <div className="mt-2">
                <MoneyFlow
                  rows={ov.flow.map((r) => ({ ...r, label: r.key === 'other' ? 'Other methods' : methodName(r.key) }))}
                  refunds={{ ...ov.refundRow, label: 'Refunds' }}
                  months={ov.months}
                  current={ov.thisMonth}
                  currency={c}
                />
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ink-700/70 px-3.5 py-2 text-[11.5px] text-ink-300">
              <span>
                Size: <strong className="text-white">amount</strong> · Colour:{' '}
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: IN }} /> In
                </span>{' '}
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: OUT }} /> Refunded
                </span>
              </span>
              <span>
                Refunded in {monthName} <strong className="text-white">{fmt(ov.refunds.thisMonth)}</strong>
              </span>
            </div>
          </Panel>

          <div className="grid content-start gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* -------------------------------------------------- conversion */}
              <Panel title="Conversion" href="/dashboard/recovery">
                <div className="relative">
                  <ConversionGauge paid={ov.conversion.paid} started={ov.conversion.started} />
                  <p className="absolute inset-x-0 bottom-0 text-center text-[26px] font-semibold leading-none tracking-tight text-white tabular-nums">
                    {conversion}%
                  </p>
                </div>
                <p className="mt-1 text-center text-[10px] font-semibold uppercase tracking-wider text-ink-400">Checkouts paid</p>
                <div className="mt-3 flex justify-between text-[11.5px]">
                  <span>
                    <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#0f3b33]" />
                    <strong className="text-white">{ov.conversion.paid}</strong> <span className="text-ink-400">paid</span>
                  </span>
                  <span>
                    <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#c3e2d1]" />
                    <strong className="text-white">{Math.max(0, ov.conversion.started - ov.conversion.paid)}</strong>{' '}
                    <span className="text-ink-400">not paid</span>
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-ink-400">Checkouts started in {monthName}</p>
              </Panel>

              {/* -------------------------------------------------- heatmap */}
              <Panel title="Activity" href="/dashboard/orders">
                <p className="text-[22px] font-semibold tracking-tight text-white">
                  <Amount cents={net} currency={c} />{' '}
                  <span className="text-[11.5px] font-normal text-ink-400">{monthName} net</span>
                </p>
                <div className="mt-3">
                  <Heatmap days={ov.heatmap.days} max={ov.heatmap.max} currency={c} />
                </div>
                <p className="mt-2 flex items-center gap-1 text-[11px] text-ink-400">
                  <span className="mr-0.5">Less</span>
                  {['#e7ecef', '#c3e2d1', '#8fcaab', '#4fa680', '#1f8a62', '#0f3b33'].map((g) => (
                    <span key={g} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: g }} />
                  ))}
                  <span className="ml-0.5">More</span>
                </p>
                <p className="mt-0.5 text-[11px] text-ink-400">Paid orders per day, 26 weeks</p>
              </Panel>
            </div>

            {/* ---------------------------------------------------- transactions */}
            <Panel
              title="Transactions"
              href="/dashboard/orders"
              aside={<span className="text-[11.5px] text-ink-400">{fmt(ov.moneyIn.thisMonth)} in this month</span>}
            >
              {recent.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-400">
                  No orders yet. Share a checkout link and they land here the moment a buyer starts one.
                </p>
              ) : (
                <ul className="space-y-2">
                  {recent.map((o) => {
                    const group = methodDefinition(o.paymentMethod ?? '')?.group ?? 'manual';
                    const I = Icon[GROUP_ICON[group] ?? 'receipt'];
                    const st = STATUS_LINE[o.status];
                    const sign = o.status === 'PAID' ? '+' : o.status === 'REFUNDED' ? '−' : '';
                    return (
                      <li key={o.id}>
                        <Link
                          href={`/dashboard/orders/${o.id}`}
                          className="flex items-center gap-3 rounded-2xl border border-[#fff]/90 bg-[#fff]/70 px-3 py-2.5 transition hover:bg-[#fff]"
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-700 text-ink-200">
                            <I className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] font-medium text-white">{o.buyerName}</span>
                            <span className="block truncate text-[11.5px] text-ink-400">
                              {o.product.name} · {o.createdAt.toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                            </span>
                          </span>
                          <span className="text-right">
                            <span
                              className="block text-[13.5px] font-semibold tabular-nums"
                              style={{ color: o.status === 'PAID' ? '#14603f' : o.status === 'REFUNDED' ? '#9a4a10' : undefined }}
                            >
                              {sign}
                              <Amount cents={o.amountCents} currency={o.currency} />
                            </span>
                            <span className="flex items-center justify-end gap-1 text-[11px] text-ink-400">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.dot }} />
                              {st.label}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>
        </div>

        {liveProducts.length ? (
          <div className="mt-4">
            <Panel title="Your checkout links" href="/dashboard/products">
              <ul className="grid gap-3 md:grid-cols-3">
                {liveProducts.map((p) => (
                  <li key={p.slug} className="min-w-0 rounded-2xl border border-[#fff]/90 bg-[#fff]/70 p-3">
                    <p className="truncate text-[13px] font-medium text-white">{p.name}</p>
                    <code className="mt-1 block truncate text-[11px] text-mint">{`${env.checkoutUrl}/c/${account.slug}/${p.slug}`}</code>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        ) : null}
      </div>
    </>
  );
}
