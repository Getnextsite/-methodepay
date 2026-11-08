import 'server-only';
import Stripe from 'stripe';
import { prisma } from '../../db';
import type { InitiateInput, InitiateResult } from '../types';

/**
 * Stripe hosted Checkout, on the merchant own account.
 *
 * Each merchant supplies their own secret key, so money moves directly between
 * the buyer and the merchant and we are never in the flow of funds. That keeps
 * the platform out of money-transmission territory, and it means a merchant
 * who leaves takes their Stripe relationship with them.
 */

export function stripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    apiVersion: '2024-12-18.acacia',
    // A buyer waiting on a redirect should see an error, not a spinner.
    timeout: 20_000,
    maxNetworkRetries: 2,
  });
}

export async function initiateStripe(input: InitiateInput): Promise<InitiateResult> {
  const secretKey = String(input.config.secretKey ?? '');
  if (!secretKey) {
    return { kind: 'error', message: 'Card payments are not configured for this store.' };
  }

  const stripe = stripeClient(secretKey);
  const total = input.order.amountCents;

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        client_reference_id: input.order.ref,
        customer_email: input.order.buyerEmail || undefined,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: input.order.currency.toLowerCase(),
              unit_amount: total,
              product_data: {
                name: input.product.name,
                description: input.product.description
                  ? input.product.description.replace(/<[^>]*>/g, ' ').slice(0, 300)
                  : undefined,
                images: input.product.imageUrl ? [input.product.imageUrl] : undefined,
              },
            },
          },
        ],
        // The order ref travels on the PaymentIntent too, because refunds and
        // disputes surface there rather than on the session.
        payment_intent_data: {
          metadata: {
            methodepay_order: input.order.id,
            methodepay_ref: input.order.ref,
            methodepay_account: input.order.accountId,
          },
        },
        metadata: {
          methodepay_order: input.order.id,
          methodepay_ref: input.order.ref,
          methodepay_account: input.order.accountId,
        },
        success_url: `${input.origin}/o/${input.order.nonce}?paid=1`,
        cancel_url: `${input.origin}/o/${input.order.nonce}/cancelled`,
      },
      // Replaying the same order must not create a second session.
      { idempotencyKey: `mp_session_${input.order.id}` },
    );

    if (!session.url) {
      return { kind: 'error', message: 'Stripe did not return a checkout URL.' };
    }

    await prisma.order.update({
      where: { id: input.order.id },
      data: {
        meta: {
          ...asObject(input.order.meta),
          stripe: { sessionId: session.id, paymentIntent: asId(session.payment_intent) },
        },
      },
    });

    return { kind: 'redirect', url: session.url };
  } catch (error) {
    return {
      kind: 'error',
      message:
        error instanceof Stripe.errors.StripeError
          ? `Stripe refused the payment setup: ${error.message}`
          : 'Could not reach Stripe. Please try another payment method.',
    };
  }
}

export function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}
