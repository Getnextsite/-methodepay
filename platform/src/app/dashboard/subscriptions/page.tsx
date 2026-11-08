import Link from 'next/link';
import type { Metadata } from 'next';
import { requireTenant } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { entitlementsFor } from '@/lib/entitlements';
import { formatMoney } from '@/lib/money';
import { env } from '@/lib/env';
import { Banner, EmptyState, PageHeader, Section, StatTile } from '@/components/ui';

export const metadata: Metadata = { title: 'Subscriptions' };

export default async function SubscriptionsPage() {
  const { account } = await requireTenant();
  const ent = entitlementsFor(account);
  const now = new Date();
  const soon = new Date(Date.now() + 7 * 86_400_000);

  const [active, expiring, expired] = await Promise.all([
    prisma.order.findMany({
      where: {
        accountId: account.id,
        status: 'PAID',
        renewalState: 'ACTIVE',
        serviceExpiresAt: { gt: soon },
      },
      orderBy: { serviceExpiresAt: 'asc' },
      take: 50,
      include: { product: { select: { name: true } } },
    }),
    prisma.order.findMany({
      where: {
        accountId: account.id,
        status: 'PAID',
        renewalState: 'ACTIVE',
        serviceExpiresAt: { gt: now, lte: soon },
      },
      orderBy: { serviceExpiresAt: 'asc' },
      take: 50,
      include: { product: { select: { name: true } } },
    }),
    prisma.order.findMany({
      where: {
        accountId: account.id,
        status: 'PAID',
        serviceExpiresAt: { lte: now, not: null },
        renewalState: { in: ['ACTIVE', 'EXPIRED'] },
      },
      orderBy: { serviceExpiresAt: 'desc' },
      take: 50,
      include: { product: { select: { name: true } } },
    }),
  ]);

  const total = active.length + expiring.length + expired.length;

  return (
    <>
      <PageHeader
        title="Subscriptions"
        description="Every paid order on a product with an access period. Renewing early extends from the old expiry, so nobody loses days they paid for."
      />

      {!ent.renewals ? (
        <Banner
          tone="info"
          action={
            <Link href="/dashboard/billing" className="btn-ghost !py-2 !text-xs">
              See plans
            </Link>
          }
        >
          Automatic renewal reminders are part of the Professional plan. You can still see and
          manage access periods here on {ent.label}.
        </Banner>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Active" value={String(active.length)} tone="good" />
        <StatTile
          label="Expiring in 7 days"
          value={String(expiring.length)}
          tone={expiring.length > 0 ? 'warn' : 'default'}
        />
        <StatTile label="Lapsed" value={String(expired.length)} />
      </div>

      <div className="mt-6 space-y-6">
        {total === 0 ? (
          <Section>
            <EmptyState
              title="No access periods yet"
              description="Give a product an access length in days and its paid orders start appearing here with a renewal link you can send."
            />
          </Section>
        ) : null}

        {expiring.length > 0 ? (
          <Bucket
            title="Expiring within a week"
            description="The window where a nudge actually lands."
            rows={expiring}
          />
        ) : null}

        {active.length > 0 ? (
          <Bucket title="Active" description="Nothing to do." rows={active} />
        ) : null}

        {expired.length > 0 ? (
          <Bucket
            title="Lapsed"
            description="Access has ended. A renewal link still works."
            rows={expired}
          />
        ) : null}
      </div>
    </>
  );
}

type Row = {
  id: string;
  ref: string;
  buyerName: string;
  buyerEmail: string;
  amountCents: number;
  currency: string;
  serviceExpiresAt: Date | null;
  product: { name: string };
};

function Bucket({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: Row[];
}) {
  return (
    <Section title={title} description={description}>
      <div className="-mx-5 -my-5 overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-ink-600/70">
            <tr>
              <th className="table-head">Customer</th>
              <th className="table-head">Product</th>
              <th className="table-head">Paid</th>
              <th className="table-head">Access until</th>
              <th className="table-head">Renewal link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-600/50">
            {rows.map((row) => {
              const daysLeft = row.serviceExpiresAt
                ? Math.ceil((row.serviceExpiresAt.getTime() - Date.now()) / 86_400_000)
                : null;
              return (
                <tr key={row.id} className="transition hover:bg-ink-700/30">
                  <td className="table-cell">
                    <Link
                      href={`/dashboard/orders/${row.id}`}
                      className="font-medium text-white hover:text-mint"
                    >
                      {row.buyerName}
                    </Link>
                    <p className="text-xs text-ink-400">{row.buyerEmail}</p>
                  </td>
                  <td className="table-cell text-ink-200">{row.product.name}</td>
                  <td className="table-cell tabular-nums">
                    {formatMoney(row.amountCents, row.currency)}
                  </td>
                  <td className="table-cell text-xs">
                    {row.serviceExpiresAt ? (
                      <>
                        <span className="text-ink-100">
                          {row.serviceExpiresAt.toISOString().slice(0, 10)}
                        </span>
                        {daysLeft !== null ? (
                          <span className={daysLeft <= 0 ? 'ml-1.5 text-red-300' : 'ml-1.5 text-ink-400'}>
                            {daysLeft <= 0 ? 'lapsed' : `${daysLeft}d`}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="table-cell">
                    <code className="text-[11px] text-mint">
                      {`${env.checkoutUrl}/renew/${row.ref}`}
                    </code>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
