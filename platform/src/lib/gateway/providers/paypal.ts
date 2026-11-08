import 'server-only';
import { prisma } from '../../db';
import { fromCents } from '../../money';
import type { InitiateInput, InitiateResult, MethodConfig } from '../types';
import { asObject } from './stripe';

/**
 * PayPal Orders v2, on the merchant own REST app.
 *
 * PayPal does not reliably webhook a capture back to us, so the return trip
 * through /api/webhooks/paypal captures explicitly and then marks the order.
 * That is why the approval link is created with intent CAPTURE rather than
 * AUTHORIZE — there is no second human step to wait for.
 */

function apiBase(config: MethodConfig): string {
  return config.sandbox
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';
}

async function accessToken(config: MethodConfig): Promise<string | null> {
  const clientId = String(config.clientId ?? '');
  const secret = String(config.clientSecret ?? '');
  if (!clientId || !secret) return null;

  const res = await fetch(`${apiBase(config)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string };
  return json.access_token ?? null;
}

export async function initiatePaypal(input: InitiateInput): Promise<InitiateResult> {
  const token = await accessToken(input.config);
  if (!token) {
    return { kind: 'error', message: 'PayPal is not configured for this store.' };
  }

  const res = await fetch(`${apiBase(input.config)}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      // Same order, same PayPal order: a buyer who double-taps pays once.
      'PayPal-Request-Id': `mp_${input.order.id}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: input.order.ref,
          custom_id: input.order.id,
          description: input.product.name.slice(0, 127),
          amount: {
            currency_code: input.order.currency,
            value: fromCents(input.order.amountCents, input.order.currency),
          },
        },
      ],
      application_context: {
        brand_name: input.ctx.notifications.storeName || input.ctx.account.name,
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',
        return_url: `${input.origin}/api/webhooks/paypal?order=${input.order.nonce}`,
        cancel_url: `${input.origin}/o/${input.order.nonce}/cancelled`,
      },
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    return { kind: 'error', message: 'PayPal refused the payment setup. Please try another method.' };
  }

  const json = (await res.json()) as {
    id?: string;
    links?: { rel: string; href: string }[];
  };
  const approve = json.links?.find((l) => l.rel === 'approve')?.href;
  if (!json.id || !approve) {
    return { kind: 'error', message: 'PayPal did not return an approval link.' };
  }

  await prisma.order.update({
    where: { id: input.order.id },
    data: { meta: { ...asObject(input.order.meta), paypal: { orderId: json.id } } },
  });

  return { kind: 'redirect', url: approve };
}

/**
 * Capture an approved PayPal order. Returns the capture id on success so the
 * caller can record it as the transaction reference.
 */
export async function capturePaypal(
  config: MethodConfig,
  paypalOrderId: string,
): Promise<{ ok: boolean; captureId?: string; status?: string; error?: string }> {
  const token = await accessToken(config);
  if (!token) return { ok: false, error: 'PayPal credentials missing.' };

  const res = await fetch(`${apiBase(config)}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `mp_capture_${paypalOrderId}`,
    },
    cache: 'no-store',
  });

  const json = (await res.json().catch(() => ({}))) as {
    status?: string;
    purchase_units?: { payments?: { captures?: { id: string; status: string }[] } }[];
    message?: string;
  };

  if (!res.ok) {
    // ORDER_ALREADY_CAPTURED is a success from our point of view: the money is
    // there, we just lost the race with our own retry.
    const alreadyDone = JSON.stringify(json).includes('ORDER_ALREADY_CAPTURED');
    return alreadyDone
      ? { ok: true, status: 'COMPLETED' }
      : { ok: false, error: json.message ?? `PayPal capture failed (${res.status}).` };
  }

  const capture = json.purchase_units?.[0]?.payments?.captures?.[0];
  return { ok: json.status === 'COMPLETED', captureId: capture?.id, status: json.status };
}
