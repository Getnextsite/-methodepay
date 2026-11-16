import type { Metadata } from 'next';
import Link from 'next/link';
import { requireTenant } from '@/lib/tenancy';
import { formatMoney } from '@/lib/money';
import { countryName, methodName } from '@/lib/labels';
import { buildReport, pctChange, type Breakdown, type Money } from '@/lib/reports';
import { RANGES, isoDay, resolvePeriod } from '@/lib/reports-period';
import { PageHeader, Section } from '@/components/ui';

export const metadata: Metadata = { title: 'Financial reports' };
export const dynamic = 'force-dynamic';

function Delta({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) {
  const change = pctChange(current, previous);
  if (change === null) return <span className="text-xs text-ink-400">new this period</span>;
  if (change === 0) return <span className="text-xs text-ink-400">no change</span>;
  const good = invert ? change < 0 : change > 0;
  return (
    <span className={`text-xs ${good ? 'text-mint' : 'text-red-300'}`}>
      {change > 0 ? '▲' : '▼'} {Math.abs(change)}% vs previous period
    </span>
  );
}

function Tile({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{value}</p>
      <div className="mt-1 min-h-[16px]">{children}</div>
    </div>
  );
}

function BreakdownTable({ title, rows, currency, empty }: { title: string; rows: Breakdown[]; currency: string; empty: string }) {
  const total = rows.reduce((s, r) => s + (r.gross[currency] ?? 0), 0);
  return (
    <Section title={title}>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-400">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {rows.slice(0, 8).map((r) => {
            const value = r.gross[currency] ?? 0;
            const share = total > 0 ? Math.round((value / total) * 100) : 0;
            const others = Object.entries(r.gross).filter(([c]) => c !== currency);
            return (
              <li key={r.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate text-ink-100">{r.label}</span>
                  <span className="shrink-0 tabular-nums text-white">
                    {formatMoney(value, currency)}
                    <span className="ml-2 text-xs text-ink-400">
                      {r.orders} order{r.orders === 1 ? '' : 's'}
                    </span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-700/70">
                  <div className="h-full rounded-full bg-mint/70" style={{ width: `${share}%` }} />
                </div>
                {others.length ? (
                  <p className="mt-1 text-xs text-ink-400">
                    + {others.map(([c, v]) => formatMoney(v, c)).join(', ')}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

function RevenueChart({
  series,
  currency,
  bucket,
}: {
  series: { key: string; gross: number; refunds: number; orders: number }[];
  currency: string;
  bucket: 'day' | 'week' | 'month';
}) {
  const W = 960;
  const H = 240;
  const pad = { l: 8, r: 8, t: 12, b: 26 };
  const max = Math.max(1, ...series.map((s) => s.gross));
  const slot = (W - pad.l - pad.r) / Math.max(1, series.length);
  const bar = Math.max(2, Math.min(28, slot * 0.7));
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const every = Math.ceil(series.length / 8);
  const label = (k: string) =>
    bucket === 'month'
      ? new Date(k + '-01T00:00:00Z').toLocaleDateString('en', { month: 'short', year: '2-digit', timeZone: 'UTC' })
      : new Date(k + 'T00:00:00Z').toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Revenue per ${bucket}`}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} stroke="currentColor" className="text-ink-700" strokeWidth="1" />
      ))}
      {series.map((s, i) => {
        const x = pad.l + slot * i + (slot - bar) / 2;
        const h = H - pad.b - y(s.gross);
        const rh = s.refunds > 0 ? Math.max(2, (H - pad.t - pad.b) * (s.refunds / max)) : 0;
        return (
          <g key={s.key}>
            <title>
              {`${label(s.key)}: ${formatMoney(s.gross, currency)} from ${s.orders} order${s.orders === 1 ? '' : 's'}${
                s.refunds ? `, ${formatMoney(s.refunds, currency)} refunded` : ''
              }`}
            </title>
            <rect x={x} y={y(s.gross)} width={bar} height={Math.max(0, h)} rx="3" className="fill-mint/80" />
            {rh ? <rect x={x} y={H - pad.b - rh} width={bar} height={rh} rx="2" className="fill-red-400/70" /> : null}
            {i % every === 0 ? (
              <text x={x + bar / 2} y={H - 8} textAnchor="middle" className="fill-ink-400" fontSize="11">
                {label(s.key)}
              </text>
            ) : null}
          </g>
        );
      })}
      <text x={W - pad.r} y={pad.t + 10} textAnchor="end" className="fill-ink-400" fontSize="11">
        {formatMoney(max, currency)}
      </text>
    </svg>
  );
}

function sum(m: Money, c: string) {
  return m[c] ?? 0;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { range?: string; from?: string; to?: string };
}) {
  const { account } = await requireTenant();
  const period = resolvePeriod(searchParams);
  const report = await buildReport(account.id, period, { method: methodName, country: countryName });
  const c = report.primary;
  const t = report.totals;
  const p = report.previous;

  const aov = t.paidOrders ? Math.round(sum(t.gross, c) / t.paidOrders) : 0;
  const prevAov = p.paidOrders ? Math.round(sum(p.gross, c) / p.paidOrders) : 0;
  const conversion = t.checkoutsStarted ? Math.round((t.checkoutsPaid / t.checkoutsStarted) * 1000) / 10 : 0;
  const prevConversion = p.checkoutsStarted ? Math.round((p.checkoutsPaid / p.checkoutsStarted) * 1000) / 10 : 0;
  const refundRate = t.paidOrders ? Math.round((t.refundedOrders / t.paidOrders) * 1000) / 10 : 0;
  const others = report.currencies.filter((x) => x !== c && (t.gross[x] || t.refunds[x]));
  const exportHref = `/dashboard/reports/export?from=${isoDay(period.from)}&to=${isoDay(new Date(period.to.getTime() - 86_400_000))}`;

  return (
    <>
      <PageHeader
        title="Financial reports"
        description="Revenue is counted on the day the money arrived and refunds on the day they were made, in UTC."
        action={
          <a href={exportHref} className="btn-ghost !py-2 !text-xs">
            Export CSV
          </a>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <Link
            key={r.key}
            href={`/dashboard/reports?range=${r.key}`}
            className={`rounded-full border px-3 py-1.5 text-xs ${
              period.key === r.key ? 'border-mint/50 bg-mint/10 text-mint' : 'border-ink-600 text-ink-200 hover:text-white'
            }`}
          >
            {r.label}
          </Link>
        ))}
        <form action="/dashboard/reports" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="range" value="custom" />
          <input type="date" name="from" defaultValue={isoDay(period.from)} className="input !w-auto !py-1.5 !text-xs" aria-label="From" />
          <span className="text-xs text-ink-400">to</span>
          <input
            type="date"
            name="to"
            defaultValue={isoDay(new Date(period.to.getTime() - 86_400_000))}
            className="input !w-auto !py-1.5 !text-xs"
            aria-label="To"
          />
          <button type="submit" className="btn-ghost !py-1.5 !text-xs">
            Apply
          </button>
        </form>
      </div>

      <p className="mb-4 text-sm text-ink-300">
        <span className="font-medium text-white">{period.label}</span> · {isoDay(period.from)} to{' '}
        {isoDay(new Date(period.to.getTime() - 86_400_000))} · amounts in {c}
      </p>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Gross revenue" value={formatMoney(sum(t.gross, c), c)}>
          <Delta current={sum(t.gross, c)} previous={sum(p.gross, c)} />
        </Tile>
        <Tile label="Refunds" value={formatMoney(sum(t.refunds, c), c)}>
          <span className="text-xs text-ink-400">
            {t.refundedOrders} order{t.refundedOrders === 1 ? '' : 's'} · {refundRate}% of sales
          </span>
        </Tile>
        <Tile label="Net revenue" value={formatMoney(sum(t.net, c), c)}>
          <Delta current={sum(t.net, c)} previous={sum(p.net, c)} />
        </Tile>
        <Tile label="Paid orders" value={String(t.paidOrders)}>
          <Delta current={t.paidOrders} previous={p.paidOrders} />
        </Tile>
        <Tile label="Average order" value={formatMoney(aov, c)}>
          <Delta current={aov} previous={prevAov} />
        </Tile>
        <Tile label="Checkout conversion" value={`${conversion}%`}>
          <span className="text-xs text-ink-400">
            {t.checkoutsPaid} of {t.checkoutsStarted} checkouts paid
            {prevConversion ? ` · was ${prevConversion}%` : ''}
          </span>
        </Tile>
        <Tile label="Discounts given" value={formatMoney(sum(t.discounts, c), c)}>
          <span className="text-xs text-ink-400">Shipping collected {formatMoney(sum(t.shipping, c), c)}</span>
        </Tile>
        <Tile label="Customers" value={String(t.newCustomers + t.returningCustomers)}>
          <span className="text-xs text-ink-400">
            {t.newCustomers} new · {t.returningCustomers} returning
          </span>
        </Tile>
      </div>

      {others.length ? (
        <div className="mb-6 rounded-2xl border border-ink-600 bg-ink-800/60 px-4 py-3 text-sm text-ink-200">
          Also in this period, kept separate because currencies are never added together:{' '}
          {others.map((x) => (
            <span key={x} className="mr-3 whitespace-nowrap">
              <strong className="text-white">{formatMoney(sum(t.net, x), x)}</strong> net in {x}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mb-6">
        <Section title={`Revenue per ${period.bucket}`} description="Green is money received, red is money refunded. Hover a bar for the figures.">
          {t.paidOrders === 0 && t.refundedOrders === 0 ? (
            <p className="py-10 text-center text-sm text-ink-400">No sales or refunds in this period.</p>
          ) : (
            <RevenueChart series={report.series} currency={c} bucket={period.bucket} />
          )}
        </Section>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <BreakdownTable title="By payment method" rows={report.byMethod} currency={c} empty="No sales yet." />
        <BreakdownTable title="By product" rows={report.byProduct} currency={c} empty="No sales yet." />
        <BreakdownTable title="By country" rows={report.byCountry} currency={c} empty="No buyer countries recorded." />
        <BreakdownTable title="Coupons used" rows={report.byCoupon} currency={c} empty="No coupon was used on a paid order." />
      </div>

      <Section
        title="Transactions"
        description={`Every sale and refund in the period${report.rows.length > 100 ? ' (latest 100 shown; the CSV has all of them)' : ''}.`}
      >
        {report.rows.length === 0 ? (
          <p className="text-sm text-ink-400">Nothing in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-ink-400">
                <tr>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Order</th>
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium">Method</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {[...report.rows]
                  .reverse()
                  .slice(0, 100)
                  .map((r) => (
                    <tr key={`${r.kind}-${r.orderId}`} className="border-t border-ink-600/60">
                      <td className="py-2.5 pr-3 text-ink-300">{r.at.toISOString().slice(0, 16).replace('T', ' ')}</td>
                      <td className="py-2.5 pr-3">
                        <Link href={`/dashboard/orders/${r.orderId}`} className="font-mono text-xs text-white hover:underline">
                          {r.ref}
                        </Link>
                        <span className="block text-xs text-ink-400">{r.buyerEmail}</span>
                      </td>
                      <td className="py-2.5 pr-3 text-ink-200">{r.product}</td>
                      <td className="py-2.5 pr-3 text-ink-300">{r.method ? methodName(r.method) : ''}</td>
                      <td className={`py-2.5 text-right tabular-nums ${r.kind === 'refund' ? 'text-red-300' : 'text-white'}`}>
                        {r.kind === 'refund' ? '−' : ''}
                        {formatMoney(r.amountCents, r.currency)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}
