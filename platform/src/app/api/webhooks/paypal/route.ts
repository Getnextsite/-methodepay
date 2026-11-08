import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { readConfig } from '@/lib/gateway/config';
import { capturePaypal } from '@/lib/gateway/providers/paypal';
import { markPaid } from '@/lib/orders';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * PayPal return trip.
 *
 * This is the buyer being redirected back, not a server-to-server webhook, so
 * the query string proves nothing. The order is identified by its unguessable
 * nonce and then the capture is performed against PayPal with the merchant own
 * credentials — PayPal answer is the authority, never the URL.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const nonce = url.searchParams.get('order') ?? '';
  const paypalToken = url.searchParams.get('token') ?? '';

  const order = await prisma.order.findUnique({
    where: { nonce },
    select: { id: true, nonce: true, accountId: true, status: true, meta: true },
  });

  if (!order) {
    return NextResponse.redirect(`${env.checkoutUrl}/`, { status: 302 });
  }
  if (order.status === 'PAID') {
    return NextResponse.redirect(`${env.checkoutUrl}/o/${order.nonce}`, { status: 302 });
  }

  const meta = (order.meta ?? {}) as { paypal?: { orderId?: string } };
  const paypalOrderId = meta.paypal?.orderId ?? paypalToken;
  if (!paypalOrderId) {
    return NextResponse.redirect(`${env.checkoutUrl}/o/${order.nonce}/cancelled`, { status: 302 });
  }

  const row = await prisma.paymentMethodConfig.findUnique({
    where: { accountId_key: { accountId: order.accountId, key: 'paypal' } },
  });
  const config = readConfig(row, 'paypal');

  const result = await capturePaypal(config, paypalOrderId);

  if (result.ok) {
    await markPaid(order.id, {
      txid: result.captureId,
      actor: 'paypal',
      note: 'Captured through the PayPal Orders API on return.',
    });
    return NextResponse.redirect(`${env.checkoutUrl}/o/${order.nonce}?paid=1`, { status: 302 });
  }

  await prisma.orderEvent.create({
    data: {
      orderId: order.id,
      type: 'capture_failed',
      actor: 'paypal',
      note: result.error ?? 'PayPal did not complete the capture.',
      meta: { paypalOrderId },
    },
  });

  return NextResponse.redirect(`${env.checkoutUrl}/o/${order.nonce}/cancelled`, { status: 302 });
}
