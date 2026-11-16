import type { Metadata } from 'next';
import Link from 'next/link';
import { requireTenant } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { formatMoney, fromCents } from '@/lib/money';
import { parseFraud, type RiskReason } from '@/lib/fraud/score';
import { countryName, methodName } from '@/lib/labels';
import { Field, PageHeader, Section, StatTile } from '@/components/ui';
import { ActionForm, SubmitButton } from '@/components/action-form';
import { RiskBadge } from '@/components/risk-badge';
import { saveFraudAction } from './actions';

export const metadata: Metadata = { title: 'Fraud & risk' };
export const dynamic = 'force-dynamic';

function reasonsOf(meta: unknown): RiskReason[] {
  const risk = (meta as Record<string, unknown> | null)?.risk as Record<string, unknown> | undefined;
  return Array.isArray(risk?.reasons) ? (risk!.reasons as RiskReason[]) : [];
}

export default async function FraudPage({ searchParams }: { searchParams: { level?: string } }) {
  const { account, role } = await requireTenant();
  const canEdit = role === 'OWNER' || role === 'ADMIN';
  const row = await prisma.notificationSettings.upsert({
    where: { accountId: account.id },
    create: { accountId: account.id },
    update: {},
    select: { fraud: true },
  });
  const settings = parseFraud(row.fraud);
  const since = new Date(Date.now() - 30 * 86_400_000);
  const level = searchParams.level === 'high' ? ['high'] : ['medium', 'high'];

  const [assessed, byLevel, blockedCount, flagged, blocked, currencyRow] = await Promise.all([
    prisma.order.count({ where: { accountId: account.id, createdAt: { gte: since }, riskLevel: { not: null } } }),
    prisma.order.groupBy({
      by: ['riskLevel'],
      where: { accountId: account.id, createdAt: { gte: since }, riskLevel: { in: ['medium', 'high'] } },
      _count: { _all: true },
    }),
    prisma.blockedCheckout.count({ where: { accountId: account.id, createdAt: { gte: since } } }),
    prisma.order.findMany({
      where: { accountId: account.id, createdAt: { gte: since }, riskLevel: { in: level } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { product: { select: { name: true } } },
    }),
    prisma.blockedCheckout.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    prisma.product.groupBy({ by: ['currency'], where: { accountId: account.id }, _count: { _all: true } }),
  ]);
  const count = (l: string) => byLevel.find((b) => b.riskLevel === l)?._count._all ?? 0;
  const currency = currencyRow.sort((a, b) => b._count._all - a._count._all)[0]?.currency ?? 'USD';

  return (
    <>
      <PageHeader
        title="Fraud & risk"
        description="Every checkout is scored before the order is created, using only your own store's history. Nothing about your buyers is sent to an outside service."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Checkouts screened (30 days)" value={String(assessed)} />
        <StatTile label="Medium risk" value={String(count('medium'))} tone={count('medium') ? 'warn' : 'default'} />
        <StatTile label="High risk" value={String(count('high'))} tone={count('high') ? 'warn' : 'default'} />
        <StatTile label="Refused at checkout" value={String(blockedCount)} hint="Blocklist, blocked countries, or high risk with blocking on" />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <Section title="Screening rules" description="Points add up to a score out of 100.">
          <ActionForm action={saveFraudAction} className="space-y-4">
            <input type="hidden" name="currency" value={currency} />
            <label className="flex items-center gap-2.5 text-sm text-ink-100">
              <input type="checkbox" name="enabled" defaultChecked={settings.enabled} disabled={!canEdit} className="h-4 w-4 accent-mint" />
              Screen every checkout
            </label>
            <label className="flex items-start gap-2.5 text-sm text-ink-100">
              <input type="checkbox" name="blockHigh" defaultChecked={settings.blockHigh} disabled={!canEdit} className="mt-0.5 h-4 w-4 accent-mint" />
              <span>
                Refuse high-risk checkouts
                <span className="block text-xs text-ink-400">Off: high-risk orders are created and flagged for you to review. On: the buyer sees a polite refusal.</span>
              </span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Medium risk from" htmlFor="mediumAt" hint="Score (5–100).">
                <input id="mediumAt" name="mediumAt" type="number" min={5} max={100} defaultValue={settings.mediumAt} className="input" />
              </Field>
              <Field label="High risk from" htmlFor="highAt" hint="Score (10–100).">
                <input id="highAt" name="highAt" type="number" min={10} max={100} defaultValue={settings.highAt} className="input" />
              </Field>
              <Field label="Checkouts per hour" htmlFor="velocityPerHour" hint="From one email or IP before it counts as suspicious.">
                <input id="velocityPerHour" name="velocityPerHour" type="number" min={1} max={100} defaultValue={settings.velocityPerHour} className="input" />
              </Field>
              <Field label={`Review orders above (${currency})`} htmlFor="maxAmount" hint="Blank for no limit.">
                <input
                  id="maxAmount"
                  name="maxAmount"
                  inputMode="decimal"
                  defaultValue={settings.maxAmountCents ? fromCents(settings.maxAmountCents, currency) : ''}
                  className="input"
                />
              </Field>
            </div>
            <Field label="Blocked countries" htmlFor="blockedCountries" hint="Two-letter codes separated by commas, e.g. NG, KP. Checked against the billing country and where the buyer connects from.">
              <input id="blockedCountries" name="blockedCountries" defaultValue={settings.blockedCountries.join(', ')} className="input font-mono uppercase" />
            </Field>
            <Field label="Blocklist" htmlFor="blocklist" hint="One per line: an email (fraud@example.com), a whole domain (@example.com) or an IP address.">
              <textarea id="blocklist" name="blocklist" rows={5} defaultValue={settings.blocklist.join('\n')} className="input font-mono text-xs" />
            </Field>
            {canEdit ? <SubmitButton>Save rules</SubmitButton> : <p className="text-xs text-ink-400">Only admins can change the rules.</p>}
          </ActionForm>
        </Section>

        <Section title="What is checked">
          <ul className="space-y-2.5 text-sm text-ink-200">
            {[
              ['+100', 'Email, domain or IP on your blocklist, or a blocked country (always refused)'],
              ['+30', 'Throwaway email address (Mailinator, YOPmail, 10 Minute Mail…)'],
              ['+25', 'Too many checkouts from the same email in an hour'],
              ['+25', 'Too many checkouts from the same IP address in an hour'],
              ['+20', 'Billing country differs from the country the buyer connects from'],
              ['+20', 'Above the amount you set for review'],
              ['+15', 'Five times your average order or more (once you have 10 sales)'],
              ['+15', 'Three or more unpaid orders from this email this week'],
              ['+10', 'A made-up looking name'],
              ['+10', 'Paying with a gift card'],
              ['+80', 'A payment reference already used on another order (checked when the buyer confirms)'],
              ['−20', 'Returning customer who has paid before'],
            ].map(([points, label]) => (
              <li key={label} className="flex gap-3">
                <span className={`w-10 shrink-0 text-right font-mono text-xs ${points.startsWith('−') ? 'text-mint' : 'text-amber-200'}`}>{points}</span>
                <span>{label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink-400">
            Card payments through Stripe and PayPal also go through their own fraud checks. This screening matters most for crypto, bank transfers and other payments you confirm yourself, where nobody else is watching.
          </p>
        </Section>
      </div>

      <div className="mb-6">
        <Section
          title="Flagged orders (30 days)"
          description="Check these before you deliver. The reasons are on each order."
          footer={
            <div className="flex gap-3 text-xs">
              <Link href="/dashboard/fraud" className={level.length === 2 ? 'text-mint' : 'text-ink-300 hover:text-white'}>
                Medium and high
              </Link>
              <Link href="/dashboard/fraud?level=high" className={level.length === 1 ? 'text-mint' : 'text-ink-300 hover:text-white'}>
                High only
              </Link>
            </div>
          }
        >
          {flagged.length === 0 ? (
            <p className="text-sm text-ink-400">Nothing flagged. Good.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-ink-400">
                  <tr>
                    <th className="pb-2 font-medium">Risk</th>
                    <th className="pb-2 font-medium">Order</th>
                    <th className="pb-2 font-medium">Why</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {flagged.map((o) => (
                    <tr key={o.id} className="border-t border-ink-600/60 align-top">
                      <td className="py-2.5 pr-3">
                        <RiskBadge level={o.riskLevel} score={o.riskScore} />
                      </td>
                      <td className="py-2.5 pr-3">
                        <Link href={`/dashboard/orders/${o.id}`} className="font-mono text-xs text-white hover:underline">
                          {o.ref}
                        </Link>
                        <span className="block text-xs text-ink-400">
                          {o.buyerEmail} · {o.paymentMethod ? methodName(o.paymentMethod) : ''}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-ink-300">
                        {reasonsOf(o.meta)
                          .filter((r) => r.points > 0)
                          .map((r) => r.label)
                          .join(' ')}
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-ink-300">{o.status.replace('_', ' ').toLowerCase()}</td>
                      <td className="py-2.5 text-right tabular-nums text-ink-100">{formatMoney(o.amountCents, o.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      <Section title="Refused checkouts" description="No order was created for these. The buyer was told to contact you.">
        {blocked.length === 0 ? (
          <p className="text-sm text-ink-400">No checkout has been refused.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-ink-400">
                <tr>
                  <th className="pb-2 font-medium">When</th>
                  <th className="pb-2 font-medium">Buyer</th>
                  <th className="pb-2 font-medium">Why</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {blocked.map((b) => (
                  <tr key={b.id} className="border-t border-ink-600/60 align-top">
                    <td className="py-2.5 pr-3 text-xs text-ink-300">{b.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</td>
                    <td className="py-2.5 pr-3 text-xs">
                      <span className="text-white">{b.email}</span>
                      <span className="block text-ink-400">
                        {[b.ip, b.ipCountry ? `from ${countryName(b.ipCountry)}` : null, b.country ? `billing ${countryName(b.country)}` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-ink-300">
                      {(Array.isArray(b.reasons) ? (b.reasons as RiskReason[]) : [])
                        .filter((r) => r.points > 0)
                        .map((r) => r.label)
                        .join(' ')}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-ink-100">{formatMoney(b.amountCents, b.currency)}</td>
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
