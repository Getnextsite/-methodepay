/**
 * Where the on-ramp lives.
 *
 * MethodePay runs its own white-label of the on-ramp rather than sending
 * buyers to onramp-pay.com. Both hosts are collected here because they were
 * previously hardcoded in four places — the rail registry, the initiator, the
 * provider monitor and the setup wizard — and a rebrand that misses one of
 * them sends live traffic to the old provider.
 *
 * These are only defaults. Every merchant can override `domain` and
 * `apiDomain` on the rail, which is what makes it possible to point a single
 * store at a staging deployment without touching anybody else.
 *
 * The two hosts differ on purpose, and the asymmetry is the point.
 *
 * methodepay.com answers from Vercel nameservers, and a Cloudflare Worker
 * custom domain needs the zone on Cloudflare — a CNAME to workers.dev is
 * refused at the edge with a 403, because Cloudflare routes on the hostname it
 * is given. So the buyer-facing host is served by Vercel (see
 * `onramp-proxy/`), which rewrites every path to the Worker and sets the
 * upstream Host to match.
 *
 * The API host skips that hop. No buyer ever reads it, so a proxy in front of
 * a server-to-server call would buy nothing and add a component that can fail
 * mid-payment.
 */

/** Server-to-server only — convert and wallet registration. No buyer sees it. */
export const ONRAMP_API_HOST =
  process.env.ONRAMP_API_HOST || 'methodepay-api.hero36228.workers.dev'

/** The buyer is redirected here mid-payment, so it carries the brand. */
export const ONRAMP_CHECKOUT_HOST =
  process.env.ONRAMP_CHECKOUT_HOST || 'checkout.methodepay.com'

/** What the rail is called in merchant-facing copy. */
export const ONRAMP_BRAND = 'MethodePay On-Ramp'
