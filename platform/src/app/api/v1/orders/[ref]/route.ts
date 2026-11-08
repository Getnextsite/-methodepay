import { prisma } from '@/lib/db';
import { apiError, authenticateApiRequest } from '@/lib/api-keys';
import { serializeOrder } from '@/lib/orders';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { ref: string } }) {
  const caller = await authenticateApiRequest(request);
  if (!caller) return apiError('Invalid or missing API key.', 401, 'unauthorized');

  const order = await prisma.order.findFirst({
    where: { ref: params.ref.toUpperCase(), accountId: caller.accountId },
    include: { product: true, events: { orderBy: { createdAt: 'asc' } } },
  });
  if (!order) return apiError('No order with that reference.', 404, 'not_found');

  return Response.json({
    data: {
      ...serializeOrder(order, order.product),
      // The audit trail, because the question an integration actually has is
      // "why does this order say that?" — and a gift-card code is never in it.
      events: order.events.map((event) => ({
        type: event.type,
        note: event.note,
        actor: event.actor,
        at: event.createdAt.toISOString(),
      })),
    },
  });
}
