import { NextResponse } from 'next/server';
import { createHmac } from 'node:crypto';
import { prisma } from '@/lib/db';
import { readConfig } from '@/lib/gateway/config';
import { claimPayment } from '@/lib/orders';
import { safeEqual } from '@/lib/crypto';
import { once } from '@/lib/webhooks';

export const dynamic = 'force-dynamic';

/**
 * Callbacks from the on-ramp rails (Alchemy Pay today).
 *
 * These providers settle crypto to the merchant wallet, so their callback says
 * "the buyer paid us", not "the money is in your wallet". That is a meaningful
 * difference, and the order is moved to AWAITING_VERIFICATION rather than PAID
 * so a human still confirms receipt. Overstating it would mean delivering
 * goods against a payment that can still fail downstream.
 */
export async function POST(request: Request, { params }: { params: { provider: string } }) {
  const provider = params.provider;
  if (provider !== 'alchemypay') {
    return NextResponse.json({ error: 'Unknown provider.' }, { status: 404 });
  }

  const raw = await request.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Malformed payload.' }, { status: 400 });
  }

  const ref = String(body.merchantOrderNo ?? body.merchant_order_no ?? '');
  if (!ref) return NextResponse.json({ error: 'Missing order reference.' }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { ref },
    select: { id: true, accountId: true, status: true },
  });
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  if (order.status === 'PAID') return NextResponse.json({ received: true });

  const row = await prisma.paymentMethodConfig.findUnique({
    where: { accountId_key: { accountId: order.accountId, key: 'alchemypay' } },
  });
  const config = readConfig(row, 'alchemypay');
  const appSecret = String(config.appSecret ?? '');
  if (!appSecret) {
    return NextResponse.json({ error: 'Provider not configured.' }, { status: 400 });
  }

  // Alchemy signs the raw body with the app secret. Without a valid signature
  // this is an anonymous POST claiming somebody paid, which is worth nothing.
  const presented = request.headers.get('sign') ?? String(body.sign ?? '');
  const expected = createHmac('sha256', appSecret).update(raw).digest('hex');
  if (!presented || !safeEqual(presented.toLowerCase(), expected.toLowerCase())) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  const externalId = String(body.orderNo ?? body.order_no ?? `${ref}:${body.status ?? ''}`);
  if (!(await once(`provider:${provider}`, externalId))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const status = String(body.status ?? '').toUpperCase();
  const succeeded = status === 'PAY_SUCCESS' || status === 'FINISHED' || status === 'SUCCESS';

  if (succeeded) {
    await claimPayment(order.id, {
      reference: String(body.orderNo ?? body.txHash ?? ''),
      channel: provider,
      note: `${provider} reported a successful payment. Confirm the funds reached your wallet before delivering.`,
    });
  } else {
    await prisma.orderEvent.create({
      data: {
        orderId: order.id,
        type: 'provider_update',
        actor: provider,
        note: `Status reported as ${status || 'unknown'}.`,
        meta: { status },
      },
    });
  }

  return NextResponse.json({ received: true });
}
