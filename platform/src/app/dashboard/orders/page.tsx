import Link from 'next/link';
import type { Metadata } from 'next';
import type { OrderStatus, Prisma } from '@prisma/client';
import { requireTenant } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { prettyMethod } from '@/lib/notifier';
import { EmptyState, PageHeader, Section, StatusBadge } from '@/components/ui';

export const metadata: Metadata = { title: 'Orders' };

const PER_PAGE = 20;

const FILTERS: { label: string; status?: OrderStatus }[] = [
  { label: 'All' },
  { label: 'Awaiting verification', status: 'AWAITING_VERIFICATION' },
  { label: 'Paid', status: 'PAID' },
  { label: 'Pending', status: 'PENDING' },
  { label: 'Refunded', status: 'REFUNDED' },
  { label: 'Cancelled', status: 'CANCELLED' },
];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string; page?: string };
}) {
  const { account } = await requireTenant();

  const status = FILTERS.find((f) => f.status === searchParams.status)?.status;
  const query = (searchParams.q ?? '').trim();
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);

  const where: Prisma.OrderWhereInput = {
    accountId: account.id,
    ...(status ? { status } : {}),
    ...(query
      ? {
          OR: [
            { ref: { contains: query, mode: 'insensitive' } },
            { buyerEmail: { contains: query, mode: 'insensitive' } },
            { buyerName: { contains: query, mode: 'insensitive' } },
            { paymentReference: { contains: query, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  // Count in SQL rather than loading rows to measure them: a store with
  // 50,000 orders should not pay for a page of 20.
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: PER_PAGE,
      skip: (page - 1) * PER_PAGE,
      include: { product: { select: { name: true } } },
    }),
    prisma.order.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const base = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { status: searchParams.status, q: query || undefined, ...overrides };
    for (const [key, value] of Object.entries(merged)) if (value) params.set(key, value);
    const qs = params.toString();
    return `/dashboard/orders${qs ? `?${qs}` : ''}`;
  };

  return (
    <>
      <PageHeader
        title="Orders"
        description="Every checkout attempt, including the ones nobody finished. Manual rails sit in Awaiting verification until you confirm."
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {FILTERS.map((filter) => {
          const active = filter.status === status || (!filter.status && !status);
          return (
            <Link
              key={filter.label}
              href={base({ status: filter.status, page: undefined })}
              aria-current={active ? 'true' : undefined}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? 'border-mint/50 bg-mint/10 text-mint'
                  : 'border-ink-600 bg-ink-800/60 text-ink-300 hover:text-white'
              }`}
            >
              {filter.label}
            </Link>
          );
        })}

        <form action="/dashboard/orders" className="ml-auto flex gap-2">
          {searchParams.status ? (
            <input type="hidden" name="status" value={searchParams.status} />
          ) : null}
          <input
            name="q"
            defaultValue={query}
            placeholder="Reference, email or name"
            aria-label="Search orders"
            className="input !w-60 !py-2 !text-xs"
          />
          <button type="submit" className="btn-ghost !py-2 !text-xs">
            Search
          </button>
        </form>
      </div>

      <Section>
        {orders.length === 0 ? (
          <EmptyState
            title={query || status ? 'Nothing matches that' : 'No orders yet'}
            description={
              query || status
                ? 'Try a different filter, or clear the search.'
                : 'Orders appear the moment a buyer opens one of your checkout links and submits their details.'
            }
            action={
              query || status ? (
                <Link href="/dashboard/orders" className="btn-ghost">
                  Clear filters
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="-mx-5 -my-5 overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="border-b border-ink-600/70">
                <tr>
                  <th className="table-head">Reference</th>
                  <th className="table-head">Buyer</th>
                  <th className="table-head">Product</th>
                  <th className="table-head">Method</th>
                  <th className="table-head">Amount</th>
                  <th className="table-head">Status</th>
                  <th className="table-head">Placed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-600/50">
                {orders.map((order) => (
                  <tr key={order.id} className="transition hover:bg-ink-700/30">
                    <td className="table-cell">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="font-medium text-white hover:text-mint"
                      >
                        {order.ref}
                      </Link>
                    </td>
                    <td className="table-cell">
                      <span className="block text-ink-100">{order.buyerName}</span>
                      <span className="block text-xs text-ink-400">{order.buyerEmail}</span>
                    </td>
                    <td className="table-cell text-ink-200">{order.product.name}</td>
                    <td className="table-cell text-xs text-ink-300">
                      {order.paymentMethod ? prettyMethod(order.paymentMethod) : '—'}
                    </td>
                    <td className="table-cell tabular-nums">
                      {formatMoney(order.amountCents, order.currency)}
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="table-cell text-xs text-ink-400">
                      {order.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {pages > 1 ? (
        <nav className="mt-5 flex items-center justify-between text-sm" aria-label="Pagination">
          <p className="text-ink-400">
            Page {page} of {pages} · {total} order{total === 1 ? '' : 's'}
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={base({ page: String(page - 1) })} className="btn-ghost !py-2 !text-xs">
                Previous
              </Link>
            ) : null}
            {page < pages ? (
              <Link href={base({ page: String(page + 1) })} className="btn-ghost !py-2 !text-xs">
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </>
  );
}
