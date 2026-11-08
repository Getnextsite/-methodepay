import { prisma } from '@/lib/db';
import { apiError, authenticateApiRequest } from '@/lib/api-keys';

export const dynamic = 'force-dynamic';

/**
 * Customers, derived rather than stored.
 *
 * There is no customer table: a buyer is whoever has orders under an email.
 * That keeps checkout to one step with no account to create, which is most of
 * why these rails convert at all — and it means this endpoint aggregates
 * instead of reading a list.
 */
export async function GET(request: Request) {
  const caller = await authenticateApiRequest(request);
  if (!caller) return apiError('Invalid or missing API key.', 401, 'unauthorized');

  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? 50) || 50));

  // Rank by what buyers have actually paid, not by what they started: an
  // abandoned $900 checkout is not a top customer.
  const paid = await prisma.order.groupBy({
    by: ['buyerEmail'],
    where: { accountId: caller.accountId, status: 'PAID' },
    _count: { _all: true },
    _sum: { amountCents: true },
    _max: { createdAt: true },
    orderBy: { _sum: { amountCents: 'desc' } },
    take: limit,
  });

  const emails = paid.map((row) => row.buyerEmail);
  if (emails.length === 0) return Response.json({ data: [], has_more: false });

  const [allOrders, latest] = await Promise.all([
    prisma.order.groupBy({
      by: ['buyerEmail'],
      where: { accountId: caller.accountId, buyerEmail: { in: emails } },
      _count: { _all: true },
    }),
    // One query to attach the most recent name and country per buyer, rather
    // than N queries inside a loop.
    prisma.order.findMany({
      where: { accountId: caller.accountId, buyerEmail: { in: emails } },
      orderBy: { createdAt: 'desc' },
      select: { buyerEmail: true, buyerName: true, buyerCountry: true },
    }),
  ]);

  const totalOrders = new Map(allOrders.map((row) => [row.buyerEmail, row._count._all]));
  const profile = new Map<string, { name: string; country: string | null }>();
  for (const order of latest) {
    if (!profile.has(order.buyerEmail)) {
      profile.set(order.buyerEmail, { name: order.buyerName, country: order.buyerCountry });
    }
  }

  return Response.json({
    data: paid.map((row) => ({
      email: row.buyerEmail,
      name: profile.get(row.buyerEmail)?.name ?? null,
      country: profile.get(row.buyerEmail)?.country ?? null,
      orders: totalOrders.get(row.buyerEmail) ?? row._count._all,
      paid_orders: row._count._all,
      lifetime_value: row._sum.amountCents ?? 0,
      last_paid_order_at: row._max.createdAt?.toISOString() ?? null,
    })),
    has_more: paid.length === limit,
  });
}
