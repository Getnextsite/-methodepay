import { prisma } from '@/lib/db';
import { apiError, authenticateApiRequest, hasScope } from '@/lib/api-keys';
import { markRefunded, serializeOrder } from '@/lib/orders';

export const dynamic = 'force-dynamic';

/**
 * Record a refund.
 *
 * This marks the order and emails the buyer. It does not move money: the
 * platform is never in the flow of funds, so the actual refund happens in the
 * merchant own processor or wallet. The response says so explicitly rather
 * than letting an integration assume otherwise.
 */
export async function POST(request: Request, { params }: { params: { ref: string } }) {
  const caller = await authenticateApiRequest(request);
  if (!caller) return apiError('Invalid or missing API key.', 401, 'unauthorized');
  if (!hasScope(caller, 'write')) return apiError('This key is read-only.', 403, 'forbidden');

  const body = (await request.json().catch(() => ({}))) as { reason?: string; notify?: boolean };

  const order = await prisma.order.findFirst({
    where: { ref: params.ref.toUpperCase(), accountId: caller.accountId },
    select: { id: true, status: true },
  });
  if (!order) return apiError('No order with that reference.', 404, 'not_found');

  await markRefunded(order.id, {
    reason: typeof body.reason === 'string' ? body.reason : '',
    actor: `api:${caller.keyId.slice(0, 8)}`,
    notify: body.notify !== false,
  });

  const updated = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { product: true },
  });

  return Response.json({
    data: serializeOrder(updated, updated.product),
    note: 'Recorded and the buyer notified. Issue the actual refund in your processor or wallet — MethodePay never holds the funds.',
  });
}
