import { prisma } from '@/lib/db';
import { apiError, authenticateApiRequest } from '@/lib/api-keys';
import { orderCounts } from '@/lib/orders';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const caller = await authenticateApiRequest(request);
  if (!caller) return apiError('Invalid or missing API key.', 401, 'unauthorized');

  const since = new Date(Date.now() - 30 * 86_400_000);

  const [totals, last30, byMethod, products] = await Promise.all([
    orderCounts(caller.accountId),
    prisma.order.aggregate({
      where: { accountId: caller.accountId, status: 'PAID', createdAt: { gte: since } },
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
    prisma.order.groupBy({
      by: ['paymentMethod'],
      where: { accountId: caller.accountId, status: 'PAID' },
      _count: { _all: true },
      _sum: { amountCents: true },
    }),
    prisma.product.count({ where: { accountId: caller.accountId } }),
  ]);

  return Response.json({
    data: {
      revenue_all_time: totals.paidRevenue,
      orders_total: totals.total,
      orders_paid: totals.paid,
      orders_awaiting_verification: totals.awaiting,
      products: products,
      last_30_days: {
        revenue: last30._sum.amountCents ?? 0,
        paid_orders: last30._count._all,
      },
      by_method: byMethod
        .map((row) => ({
          method: row.paymentMethod ?? 'unknown',
          orders: row._count._all,
          revenue: row._sum.amountCents ?? 0,
        }))
        .sort((a, b) => b.revenue - a.revenue),
    },
  });
}
