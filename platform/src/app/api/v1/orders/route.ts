import type { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { apiError, authenticateApiRequest } from '@/lib/api-keys';
import { serializeOrder } from '@/lib/orders';

export const dynamic = 'force-dynamic';

const STATUSES: OrderStatus[] = [
  'PENDING',
  'AWAITING_VERIFICATION',
  'PAID',
  'REFUNDED',
  'CANCELLED',
  'EXPIRED',
];

export async function GET(request: Request) {
  const caller = await authenticateApiRequest(request);
  if (!caller) return apiError('Invalid or missing API key.', 401, 'unauthorized');

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 50) || 50));
  const cursor = url.searchParams.get('starting_after');
  const statusParam = url.searchParams.get('status')?.toUpperCase() ?? '';
  const email = url.searchParams.get('email')?.trim().toLowerCase();

  const where: Prisma.OrderWhereInput = {
    accountId: caller.accountId,
    ...(STATUSES.includes(statusParam as OrderStatus) ? { status: statusParam as OrderStatus } : {}),
    ...(email ? { buyerEmail: email } : {}),
  };

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    // Cursor pagination rather than offset: a merchant walking 50,000 orders
    // should not get slower with every page, nor skip rows as new ones land.
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: { product: true },
  });

  return Response.json({
    data: orders.map((order) => serializeOrder(order, order.product)),
    has_more: orders.length === limit,
    next_cursor: orders.length === limit ? orders[orders.length - 1].id : null,
  });
}
