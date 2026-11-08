import { prisma } from '@/lib/db';
import { apiError, authenticateApiRequest, hasScope } from '@/lib/api-keys';
import { markPaid, serializeOrder } from '@/lib/orders';

export const dynamic = 'force-dynamic';

/**
 * Confirm a payment from an integration.
 *
 * Idempotent: calling it twice on a settled order returns the order and does
 * not deliver twice. A merchant reconciliation script that runs every ten
 * minutes should be safe to run every ten minutes.
 */
export async function POST(request: Request, { params }: { params: { ref: string } }) {
  const caller = await authenticateApiRequest(request);
  if (!caller) return apiError('Invalid or missing API key.', 401, 'unauthorized');
  if (!hasScope(caller, 'write')) return apiError('This key is read-only.', 403, 'forbidden');

  const body = (await request.json().catch(() => ({}))) as { txid?: string; note?: string };

  const order = await prisma.order.findFirst({
    where: { ref: params.ref.toUpperCase(), accountId: caller.accountId },
    select: { id: true, status: true },
  });
  if (!order) return apiError('No order with that reference.', 404, 'not_found');
  if (order.status === 'REFUNDED') {
    return apiError('That order has been refunded.', 409, 'conflict');
  }

  const result = await markPaid(order.id, {
    txid: typeof body.txid === 'string' ? body.txid : undefined,
    actor: `api:${caller.keyId.slice(0, 8)}`,
    note: typeof body.note === 'string' && body.note ? body.note : 'Confirmed through the API.',
  });
  if (!result.ok) return apiError('Could not confirm that order.', 500, 'internal_error');

  const updated = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { product: true },
  });

  return Response.json({
    data: serializeOrder(updated, updated.product),
    already_paid: result.alreadyPaid ?? false,
  });
}
