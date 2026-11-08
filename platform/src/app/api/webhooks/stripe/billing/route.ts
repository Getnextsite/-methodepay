import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { platformStripe, syncSubscription } from '@/lib/billing';
import { env } from '@/lib/env';
import { forget, once } from '@/lib/webhooks';

export const dynamic = 'force-dynamic';

/**
 * Platform billing webhooks — our own Stripe account, not a merchant one.
 *
 * Separate endpoint and separate secret from /api/webhooks/stripe on purpose.
 * One of these decides what a merchant may use; the other settles a buyer
 * payment. Letting a single endpoint do both would mean a misconfigured key
 * could cross the two.
 */
export async function POST(request: Request) {
  const stripe = platformStripe();
  const secret = env.platformStripeWebhookSecret;
  if (!stripe || !secret) {
    return NextResponse.json({ error: 'Billing is not configured.' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid signature.' },
      { status: 400 },
    );
  }

  if (!(await once('stripe_billing', event.id))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription' || typeof session.subscription !== 'string') break;
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        // Carry the account id across in case the session had it and the
        // subscription did not.
        if (!subscription.metadata?.methodepay_account && session.metadata?.methodepay_account) {
          subscription.metadata = {
            ...subscription.metadata,
            methodepay_account: session.metadata.methodepay_account,
          };
        }
        await syncSubscription(subscription);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed': {
        // Stripe will mark the subscription past_due and send its own
        // subscription.updated, which is what actually changes the plan. Log
        // it so a dunning problem is visible in our own records too.
        const invoice = event.data.object as Stripe.Invoice;
        console.warn('[billing] invoice payment failed', invoice.customer, invoice.id);
        break;
      }

      default:
        break;
    }
  } catch (error) {
    await forget('stripe_billing', event.id);
    console.error('[billing] handler failed', event.type, error);
    return NextResponse.json({ error: 'Handler failed.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
