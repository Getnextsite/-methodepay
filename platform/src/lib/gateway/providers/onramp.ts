import 'server-only';
import { createHmac } from 'node:crypto';
import { prisma } from '../../db';
import { env } from '../../env';
import { fromCents } from '../../money';
import { readConfig } from '../config';
import type { InitiateInput, InitiateResult, MethodConfig } from '../types';

/**
 * The on-ramp rails: OnRamPay, its promoted sub-providers, Alchemy Pay, and
 * the FinchPay card-to-Bitcoin widget.
 *
 * All four share one shape: we hand the buyer a URL with the amount, the
 * merchant payout address and our order reference, and the provider settles
 * crypto to the merchant wallet. None of them puts us in custody of funds,
 * which is the whole reason the plugin reached for them in the first place —
 * these are the rails that work where Stripe will not open an account.
 *
 * The honest limitation, carried over from the plugin: a hosted widget URL is
 * a redirect, not a contract. Settlement is confirmed either by the provider
 * callback (where one exists) or by the merchant confirming receipt. Orders on
 * these rails land in AWAITING_VERIFICATION, never straight to PAID.
 */

/** Hostname only: strips scheme, path and anything that is not a host char. */
function cleanHost(value: unknown, fallback: string): string {
  const host = String(value ?? '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/[/?#].*$/, '')
    .replace(/[^A-Za-z0-9.-]/g, '');
  return host || fallback;
}

async function onrampGet(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Token OnRamPay echoes back on its callback. Derived from a server secret, so
 * unlike the order nonce the buyer never sees it and cannot forge "I paid".
 */
export function onrampCallbackToken(orderId: string): string {
  return createHmac('sha256', env.sessionSecret).update(`onramppay:${orderId}`).digest('hex');
}

/**
 * OnRamPay, ported from the plugin's three-step flow:
 *
 *   1. convert the order total to USD        (control/convert.php)
 *   2. register the payout wallet + callback (control/wallet.php -> address_in)
 *   3. redirect to {domain}/process-payment.php with that address_in
 *
 * Skipping 1 and 2 and sending the wallet straight to the checkout host is
 * what produces OnRamPay's "Invalid Request" page.
 */
export async function initiateOnRamPay(
  input: InitiateInput,
  lockedProvider?: string,
): Promise<InitiateResult> {
  // A promoted button (Binance Pay, Revolut, UPI, PayPal US) may carry its own
  // wallet, or borrow the shared OnRamPay one.
  const shared = readConfig(
    input.ctx.methods.find((m) => m.key === 'onramppay') ?? null,
    'onramppay',
  );
  const wallet =
    String(input.config.wallet ?? '').trim() || String(shared.wallet ?? '').trim();

  if (!wallet) {
    return { kind: 'error', message: 'This payment method is not configured for this store.' };
  }

  const apiHost = cleanHost(input.config.apiDomain ?? shared.apiDomain, 'api.onramp-pay.com');
  const domain = cleanHost(input.config.domain ?? shared.domain, 'checkout.onramp-pay.com');

  // Which on-ramp: the locked one, else the first the merchant enabled.
  const enabled = String(input.config.providers ?? shared.providers ?? '')
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  const tag =
    (lockedProvider ?? String(input.config.onrampTag ?? '').trim()) || enabled[0] || 'stripe';

  // 1. OnRamPay only prices in USD.
  let amountUsd = Number(fromCents(input.order.amountCents, input.order.currency));
  if (input.order.currency.toUpperCase() !== 'USD') {
    const conv = await onrampGet(
      `https://${apiHost}/control/convert.php?value=${encodeURIComponent(
        fromCents(input.order.amountCents, input.order.currency),
      )}&from=${encodeURIComponent(input.order.currency.toLowerCase())}`,
    );
    const converted = Number(conv?.value_coin);
    if (!Number.isFinite(converted) || converted <= 0) {
      return {
        kind: 'error',
        message: 'Currency conversion failed. Please try another payment method.',
      };
    }
    amountUsd = converted;
  }
  amountUsd = Math.round(amountUsd * 100) / 100;

  const minimum = ONRAMP_MINIMUMS[tag];
  if (minimum !== undefined && amountUsd < minimum) {
    return {
      kind: 'error',
      message: `This payment method needs an order of at least $${minimum.toFixed(2)} USD.`,
    };
  }

  // 2. Register the payout wallet. OnRamPay answers with a one-off tracking
  // address and will call us back on this URL when the buyer has paid.
  const callback =
    `${input.origin}/api/webhooks/provider/onramppay` +
    `?order=${encodeURIComponent(input.order.ref)}&token=${onrampCallbackToken(input.order.id)}`;
  const registered = await onrampGet(
    `https://${apiHost}/control/wallet.php?address=${encodeURIComponent(wallet)}` +
      `&callback=${encodeURIComponent(callback)}`,
  );
  const addressIn = String(registered?.address_in ?? '');
  if (!addressIn) {
    return {
      kind: 'error',
      message: 'Could not start this payment. The store needs to check its payout wallet address.',
    };
  }

  const previousMeta =
    input.order.meta && typeof input.order.meta === 'object' && !Array.isArray(input.order.meta)
      ? (input.order.meta as Record<string, unknown>)
      : {};
  await prisma.order.update({
    where: { id: input.order.id },
    data: {
      trackingAddress: addressIn,
      payoutAddress: String(registered?.polygon_address_in ?? '') || null,
      meta: { ...previousMeta, onrampTag: tag, onrampExpectedUsd: amountUsd },
    },
  });

  // 3. address_in arrives already URL-safe; encoding it again breaks the page.
  const url =
    `https://${domain}/process-payment.php` +
    `?address=${addressIn}` +
    `&amount=${amountUsd}` +
    `&provider=${encodeURIComponent(tag)}` +
    `&email=${encodeURIComponent(input.order.buyerEmail)}` +
    `&currency=USD`;

  return { kind: 'redirect', url };
}

/**
 * Alchemy Pay ramp, embedded rather than redirected so the buyer never leaves
 * the merchant domain. Alchemy signs the query with HMAC-SHA1 over the sorted
 * parameter string; getting the ordering wrong yields a blank iframe, which is
 * why the sort is explicit here.
 */
export function initiateAlchemyPay(input: InitiateInput): InitiateResult {
  const appId = String(input.config.appId ?? '');
  const appSecret = String(input.config.appSecret ?? '');
  const wallet = String(input.config.wallet ?? '');
  if (!appId || !appSecret || !wallet) {
    return { kind: 'error', message: 'This payment method is not configured for this store.' };
  }

  const host = input.config.test ? 'ramptest.alchemypay.org' : 'ramp.alchemypay.org';
  const query: Record<string, string> = {
    appId,
    address: wallet,
    crypto: String(input.config.crypto ?? 'USDT'),
    network: String(input.config.network ?? 'TRX'),
    fiat: input.order.currency,
    fiatAmount: fromCents(input.order.amountCents, input.order.currency),
    merchantOrderNo: input.order.ref,
    redirectUrl: `${input.origin}/o/${input.order.nonce}`,
    callbackUrl: `${input.origin}/api/webhooks/provider/alchemypay`,
    showTable: '1',
    type: 'buy',
  };
  if (input.order.buyerEmail) query.email = input.order.buyerEmail;

  const sorted = Object.keys(query)
    .sort()
    .map((k) => `${k}=${query[k]}`)
    .join('&');
  const signature = createHmac('sha1', appSecret).update(sorted).digest('base64');

  const params = new URLSearchParams(query);
  params.set('sign', signature);

  return { kind: 'iframe', url: `https://${host}/index/rampDirect?${params.toString()}`, height: 760 };
}

/**
 * FinchPay card-to-BTC. The merchant supplies nothing but a Bitcoin address,
 * which is exactly why it exists: no processor account, no company, no KYB.
 *
 * FinchPay hosted widget takes the amount but not an arbitrary destination, so
 * the buyer is walked through three steps on our own screen (note the amount,
 * copy the address, open the widget) and then tells us they are done. Honest
 * about the handoff rather than pretending it is a closed loop.
 */
export function finchpayWidgetUrl(amountCents: number, currency: string): string {
  const params = new URLSearchParams({
    a: fromCents(amountCents, currency),
    p: currency,
    c: 'BTC',
  });
  return `https://widget.finchpay.io/payment_method?${params.toString()}`;
}

/** Per-on-ramp minimum order totals in USD, as published by OnRamPay. */
export const ONRAMP_MINIMUMS: Record<string, number> = {
  interac: 1,
  upi: 1,
  stripe: 2,
  rampnetwork: 4,
  robinhood: 5,
  revolut: 8,
  bitnovo: 10,
  kryptonim: 10,
  topper: 10,
  unlimit: 10,
  binance: 15,
  transak: 15,
  banxa: 20,
  cryptix: 20,
  guardarian: 20,
  moonpay: 20,
  sardine: 30,
  simplex: 50,
  utorg: 50,
  klarna: 70,
  paypal: 70,
  transfi: 70,
};

export function onrampMinimum(config: MethodConfig, fallback: number): number {
  const tag = String(config.onrampTag ?? '').trim();
  return ONRAMP_MINIMUMS[tag] ?? fallback;
}
