import Link from 'next/link';
import type { Metadata } from 'next';
import { requireTenant } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { orderCounts } from '@/lib/orders';
import { loadMerchantContext } from '@/lib/gateway/context';
import { incompleteMethods } from '@/lib/gateway/resolve';
import { entitlementsFor } from '@/lib/entitlements';
import { formatMoney } from '@/lib/money';
import { env } from '@/lib/env';
import { Banner, EmptyState, PageHeader, Section, StatTile, StatusBadge } from '@/components/ui';

export const metadata: Metadata = { title: 'Overview' };

export default async function OverviewPage() {
  const { account } = await requireTenant();
  const ent = entitlementsFor(account);

  const [stats, ctx, recent, productCount, liveProducts] = await Promise.all([
    orderCounts(account.id),
    loadMerchantContext(account.id),
    prisma.order.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { product: { select: { name: true } } },
    }),
    prisma.product.count({ where: { accountId: account.id } }),
    prisma.product.findMany({
      where: { accountId: account.id, active: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { name: true, slug: true },
    }),
  ]);

  const incomplete = incompleteMethods(ctx);
  const liveRails = ctx.methods.filter((m) => m.enabled).length;

  return (
    <>
      <PageHeader
        title="Overview"
        description={`${account.name} — ${ent.label} plan. Everything below is scoped to this store.`}
        action={
          <Link href="/dashboard/products/new" className="btn-primary">
            Add a product
          </Link>
        }
      />

      {stats.awaiting > 0 ? (
        <Banner
          tone="warn"
          action={
            <Link
              href="/dashboard/orders?status=AWAITING_VERIFICATION"
              className="btn-ghost !py-2 !text-xs"
            >
              Review them
            </Link>
          }
        >
          <strong className="font-semibold">
            {stats.awaiting} order{stats.awaiting === 1 ? '' : 's'} awaiting verification.
          </strong>{' '}
          Buyers have told you they paid on a manual rail. Nothing is delivered until you confirm.
        </Banner>
      ) : null}

      {/* Derived, not a stored flag: the nudge goes away the moment a buyer
          could actually pay, which is the only definition of "set up" worth
          tracking. */}
      {liveRails === 0 ? (
        <Banner
          tone="warn"
          action={
            <Link href="/onboarding/setup/store" className="btn-primary !py-2 !text-xs">
              Set up payments
            </Link>
          }
        >
          <strong className="font-semibold">No way to pay you yet.</strong> A checkout page would
          have nothing to offer a buyer. The setup walkthrough takes a crypto address or a WhatsApp
          number and has you taking money in a couple of minutes.
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
            {incomplete.length} payment method{incomplete.length === 1 ? '' : 's'} switched on but
            not live.
          </strong>{' '}
          {incomplete.map((m) => m.label).join(', ')} — a buyer would hit a dead end, so they stay
          hidden at checkout.
        </Banner>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Paid revenue"
          value={formatMoney(stats.paidRevenue, 'USD')}
          hint={`${stats.paid} paid order${stats.paid === 1 ? '' : 's'}`}
          tone="good"
        />
        <StatTile
          label="Awaiting verification"
          value={String(stats.awaiting)}
          hint="Manual rails you need to confirm"
          tone={stats.awaiting > 0 ? 'warn' : 'default'}
        />
        <StatTile label="All orders" value={String(stats.total)} hint="Including abandoned" />
        <StatTile
          label="Products"
          value={String(productCount)}
          hint={ent.products === -1 ? 'Unlimited on your plan' : `${ent.products} on your plan`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Section
          title="Recent orders"
          description="Newest first. Click through for the full audit trail."
        >
          {recent.length === 0 ? (
            <EmptyState
              title="No orders yet"
              description="Add a product, switch on a payment method, and share its checkout link. Orders land here the moment a buyer starts one."
              action={
                <Link href="/dashboard/products/new" className="btn-primary">
                  Add your first product
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-ink-600/60">
              {recent.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/dashboard/orders/${order.id}`}
                    className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition hover:bg-ink-700/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {order.ref} · {order.product.name}
                      </p>
                      <p className="truncate text-xs text-ink-400">
                        {order.buyerName} · {order.buyerEmail}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-medium tabular-nums text-ink-100">
                        {formatMoney(order.amountCents, order.currency)}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <div className="space-y-6">
          <Section title="Your checkout links" description="Share these anywhere — no cart needed.">
            {liveProducts.length === 0 ? (
              <p className="text-sm text-ink-400">
                Links appear here once you have an active product.
              </p>
            ) : (
              <ul className="space-y-3">
                {liveProducts.map((product) => (
                  <li key={product.slug}>
                    <p className="text-sm font-medium text-white">{product.name}</p>
                    <code className="mt-1 block overflow-x-auto rounded-lg border border-ink-600 bg-ink-950 px-2.5 py-2 text-[11px] text-mint">
                      {`${env.checkoutUrl}/c/${account.slug}/${product.slug}`}
                    </code>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Setup" description="What is live for buyers right now.">
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-300">Payment rails on</dt>
                <dd className="font-medium text-white">{liveRails}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-300">Wallets</dt>
                <dd className="font-medium text-white">{ctx.wallets.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-300">Checkout design</dt>
                <dd className="font-medium text-white">{titleCase(ctx.profile.design)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-300">Telegram alerts</dt>
                <dd className="font-medium text-white">
                  {ctx.notifications.telegramChatId ? 'On' : 'Off'}
                </dd>
              </div>
            </dl>
          </Section>
        </div>
      </div>
    </>
  );
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
