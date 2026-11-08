import 'server-only';
import { createHmac } from 'node:crypto';
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

export function initiateOnRamPay(input: InitiateInput, lockedProvider?: string): InitiateResult {
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

  const domain = String(input.config.domain ?? shared.domain ?? 'checkout.onramp-pay.com');
  const params = new URLSearchParams({
    wallet,
    amount: fromCents(input.order.amountCents, input.order.currency),
    fiat: input.order.currency,
    reference: input.order.ref,
    redirect: `${input.origin}/o/${input.order.nonce}`,
  });

  const tag = lockedProvider ?? String(input.config.onrampTag ?? '').trim();
  if (tag) params.set('provider', tag);

  const enabled = String(input.config.providers ?? shared.providers ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (!tag && enabled.length > 0) params.set('providers', enabled.join(','));

  if (input.order.buyerEmail) params.set('email', input.order.buyerEmail);
  if (input.order.buyerCountry) params.set('country', input.order.buyerCountry);

  return { kind: 'redirect', url: `https://${domain}/?${params.toString()}` };
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

/** Minimum order totals the aggregated on-ramps will accept, in USD. */
export const ONRAMP_MINIMUMS: Record<string, number> = {
  moonpay: 30,
  banxa: 30,
  transak: 30,
  binance: 15,
  revolut: 10,
  upi: 5,
  paypal: 10,
};

export function onrampMinimum(config: MethodConfig, fallback: number): number {
  const tag = String(config.onrampTag ?? '').trim();
  return ONRAMP_MINIMUMS[tag] ?? fallback;
}
