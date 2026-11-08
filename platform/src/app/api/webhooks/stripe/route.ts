import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { readConfig } from '@/lib/gateway/config';
import { stripeClient } from '@/lib/gateway/providers/stripe';
import { markPaid, markRefunded } from '@/lib/orders';
import { forget, once } from '@/lib/webhooks';

export const dynamic = 'force-dynamic';

/**
 * Stripe webhooks for merchant card payments.
 *
 * Multi-tenant signature verification has a chicken-and-egg problem: the
 * signing secret belongs to the merchant, and we only know which merchant an
 * event concerns by reading the event. So the body is parsed once, untrusted,
 * purely to recover the account id we put in metadata, and then verified
 * against that merchant secret before anything is believed. Nothing from the
 * unverified parse is used except to pick which key to check against.
 */
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });

  const payload = await request.text();

  let accountId: string | null = null;
  try {
    const peek = JSON.parse(payload) as {
      data?: { object?: { metadata?: Record<string, string> } };
    };
    accountId = peek.data?.object?.metadata?.methodepay_account ?? null;
  } catch {
    return NextResponse.json({ error: 'Malformed payload.' }, { status: 400 });
  }

  if (!accountId) {
    // Without our metadata we cannot attribute the event, and guessing across
    // tenants is exactly the mistake worth avoiding. 200 so Stripe stops
    // retrying something we will never be able to process.
    console.warn('[stripe] event with no methodepay_account metadata');
    return NextResponse.json({ received: true, ignored: 'no account metadata' });
  }

  const row = await prisma.paymentMethodConfig.findUnique({
    where: { accountId_key: { accountId, key: 'stripe' } },
  });
  const config = readConfig(row, 'stripe');
  const secretKey = String(config.secretKey ?? '');
  const webhookSecret = String(config.webhookSecret ?? '');

  if (!secretKey || !webhookSecret) {
    console.warn('[stripe] webhook for account without configured secrets', accountId);
    return NextResponse.json({ received: true, ignored: 'stripe not configured' });
  }

  let event: Stripe.Event;
  try {
    event = stripeClient(secretKey).webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid signature.' },
      { status: 400 },
    );
  }

  // Stripe retries on any non-2xx, so the same event can arrive repeatedly.
  if (!(await once('stripe', event.id))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.methodepay_order;
        if (!orderId) break;
        // Scope the lookup to the account the verified secret belongs to, so a
        // forged order id from another tenant cannot be settled here.
        const order = await prisma.order.findFirst({ where: { id: orderId, accountId } });
        if (!order) break;
        if (session.payment_status !== 'paid') break;

        await markPaid(order.id, {
          txid: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
          actor: 'stripe',
          note: 'Confirmed by Stripe checkout.session.completed.',
        });
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const orderId = charge.metadata?.methodepay_order;
        if (!orderId) break;
        const order = await prisma.order.findFirst({ where: { id: orderId, accountId } });
        if (!order) break;
        await markRefunded(order.id, { reason: 'Refunded in Stripe.', actor: 'stripe' });
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.methodepay_order;
        if (!orderId) break;
        await prisma.order.updateMany({
          where: { id: orderId, accountId, status: 'PENDING' },
          data: { status: 'EXPIRED' },
        });
        break;
      }

      default:
        break;
    }
  } catch (error) {
    // Release the idempotency claim and report the failure, so Stripe retries
    // rather than a real payment being dropped on the floor.
    await forget('stripe', event.id);
    console.error('[stripe] handler failed', event.type, error);
    return NextResponse.json({ error: 'Handler failed.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
