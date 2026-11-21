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
 * The workers.dev hostname is deliberate, not a placeholder. The branded
 * `api.` and `checkout.` records cannot resolve to the Worker while
 * methodepay.com answers from Vercel nameservers: a CNAME to workers.dev is
 * refused by Cloudflare with a 403, because the edge routes on the hostname it
 * was given. Until that is resolved, the Worker's own hostname is the one that
 * actually serves.
 */

/** Server-to-server only — convert and wallet registration. No buyer sees it. */
export const ONRAMP_API_HOST =
  process.env.ONRAMP_API_HOST || 'methodepay-api.hero36228.workers.dev'

/** The buyer is redirected here, so this one is worth branding when it can be. */
export const ONRAMP_CHECKOUT_HOST =
  process.env.ONRAMP_CHECKOUT_HOST || 'methodepay-api.hero36228.workers.dev'

/** What the rail is called in merchant-facing copy. */
export const ONRAMP_BRAND = 'MethodePay On-Ramp'
