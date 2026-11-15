/**
 * Order bump and post-purchase upsell, ported from the plugin (v3.9.78/79).
 *
 * Both live on CheckoutProfile as JSON (`bump`, `upsell`) and are gated by the
 * `offers` entitlement.
 *
 * Order bump: one tick box above the pay button. Ticking it adds a fixed
 * amount to the order. The amount is always read from these settings on the
 * server, never from the submitted form, and coupons do not discount it.
 *
 * Upsell: an offer on the order page after the buyer has paid or reported
 * paying. Accepting opens a SECOND, separate checkout for another product,
 * prefilled with the buyer's details. Manual rails keep no reusable payment
 * credential, so nothing is ever charged silently.
 */

export type BumpSettings = {
  enabled: boolean;
  headline: string;
  title: string;
  description: string;
  /** Added to the order, in minor units of the product's currency. */
  priceCents: number;
  /** Optional "was" price shown struck through. 0 = none. */
  originalPriceCents: number;
  imageUrl: string;
  badge: string;
};

export type UpsellSettings = {
  enabled: boolean;
  productId: string;
  headline: string;
  /** Blank uses the product name. */
  title: string;
  description: string;
  originalPriceCents: number;
  /** Blank uses the product image. */
  imageUrl: string;
  acceptLabel: string;
  declineLabel: string;
};

export const DEFAULT_BUMP: BumpSettings = {
  enabled: false,
  headline: 'One-time offer — add it to your order',
  title: '',
  description: '',
  priceCents: 0,
  originalPriceCents: 0,
  imageUrl: '',
  badge: 'LIMITED OFFER',
};

export const DEFAULT_UPSELL: UpsellSettings = {
  enabled: false,
  productId: '',
  headline: 'Wait — one last offer',
  title: '',
  description: '',
  originalPriceCents: 0,
  imageUrl: '',
  acceptLabel: 'Yes, add this to my order',
  declineLabel: 'No thanks, continue',
};

function obj(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}
const str = (v: unknown, max: number, fallback = '') =>
  typeof v === 'string' ? v.trim().slice(0, max) : fallback;
const cents = (v: unknown) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
/** Only https images: an http image would break the padlock on the checkout. */
const httpsUrl = (v: unknown) => {
  const s = str(v, 500);
  return /^https:\/\//i.test(s) ? s : '';
};

export function parseBump(raw: unknown): BumpSettings {
  const o = obj(raw);
  return {
    enabled: o.enabled === true,
    headline: str(o.headline, 120, DEFAULT_BUMP.headline),
    title: str(o.title, 120),
    description: str(o.description, 400),
    priceCents: cents(o.priceCents),
    originalPriceCents: cents(o.originalPriceCents),
    imageUrl: httpsUrl(o.imageUrl),
    badge: str(o.badge, 30, DEFAULT_BUMP.badge),
  };
}

export function parseUpsell(raw: unknown): UpsellSettings {
  const o = obj(raw);
  return {
    enabled: o.enabled === true,
    productId: str(o.productId, 64),
    headline: str(o.headline, 120, DEFAULT_UPSELL.headline),
    title: str(o.title, 120),
    description: str(o.description, 400),
    originalPriceCents: cents(o.originalPriceCents),
    imageUrl: httpsUrl(o.imageUrl),
    acceptLabel: str(o.acceptLabel, 60) || DEFAULT_UPSELL.acceptLabel,
    declineLabel: str(o.declineLabel, 60) || DEFAULT_UPSELL.declineLabel,
  };
}

/** The bump a buyer should see, or null if it is off, incomplete or not on the plan. */
export function activeBump(raw: unknown, offersAllowed: boolean): BumpSettings | null {
  if (!offersAllowed) return null;
  const bump = parseBump(raw);
  return bump.enabled && bump.title && bump.priceCents > 0 ? bump : null;
}

/**
 * What the bump adds to an order. Reads only the stored settings: whatever
 * the buyer's browser claims the add-on costs is ignored.
 */
export function bumpCents(raw: unknown, offersAllowed: boolean, requested: boolean): number {
  if (!requested) return 0;
  return activeBump(raw, offersAllowed)?.priceCents ?? 0;
}

/** The order bump recorded on an order's meta, if the buyer took it. */
export function orderBumpOf(meta: unknown): { title: string; amountCents: number } | null {
  const b = obj(obj(meta).orderBump);
  const amountCents = cents(b.amountCents);
  const title = str(b.title, 120);
  return title && amountCents > 0 ? { title, amountCents } : null;
}
