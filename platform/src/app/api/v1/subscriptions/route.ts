import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { apiError, authenticateApiRequest } from '@/lib/api-keys';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const caller = await authenticateApiRequest(request);
  if (!caller) return apiError('Invalid or missing API key.', 401, 'unauthorized');

  const url = new URL(request.url);
  const bucket = (url.searchParams.get('bucket') ?? 'active').toLowerCase();
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? 50) || 50));
  const now = new Date();

  const buckets: Record<string, Prisma.OrderWhereInput> = {
    active: { serviceExpiresAt: { gt: now }, renewalState: 'ACTIVE' },
    expiring: {
      serviceExpiresAt: { gt: now, lte: new Date(Date.now() + 7 * 86_400_000) },
      renewalState: 'ACTIVE',
    },
    expired: { serviceExpiresAt: { lte: now }, renewalState: { in: ['ACTIVE', 'EXPIRED'] } },
    all: { serviceExpiresAt: { not: null } },
  };

  const where = buckets[bucket] ?? buckets.active;

  const orders = await prisma.order.findMany({
    where: { accountId: caller.accountId, status: 'PAID', ...where },
    orderBy: { serviceExpiresAt: 'asc' },
    take: limit,
    include: { product: { select: { id: true, name: true, slug: true, durationDays: true } } },
  });

  return Response.json({
    data: orders.map((order) => ({
      order_ref: order.ref,
      customer: { name: order.buyerName, email: order.buyerEmail },
      product: order.product,
      amount: order.amountCents,
      currency: order.currency,
      state: order.renewalState,
      expires_at: order.serviceExpiresAt?.toISOString() ?? null,
      days_left: order.serviceExpiresAt
        ? Math.ceil((order.serviceExpiresAt.getTime() - Date.now()) / 86_400_000)
        : null,
      renew_url: `${env.checkoutUrl}/renew/${order.ref}`,
    })),
    bucket,
    has_more: orders.length === limit,
  });
}
