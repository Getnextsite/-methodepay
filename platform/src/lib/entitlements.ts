import type { Account, CheckoutDesign, PlanTier } from '@prisma/client';

/**
 * Plan gating, enforced server-side.
 *
 * The licensed plugin gated features per site. Hosted, the same tiers gate per
 * account — and because the checkout renders on our infrastructure, a merchant
 * cannot simply edit a PHP file to unlock a rail. Every gate is checked where
 * the action happens (server actions, the checkout renderer, the public API),
 * never only in the UI that draws the switch.
 */

export type Entitlements = {
  tier: PlanTier;
  label: string;
  /** Payment rail keys this tier may enable. */
  methods: readonly string[];
  /** Checkout designs this tier may select. */
  designs: readonly CheckoutDesign[];
  /** Merchant-defined manual rails. */
  manualMethods: number;
  /** -1 = unlimited. */
  products: number;
  seats: number;
  /** Full live editor vs colours only. */
  fullEditor: boolean;
  apiAccess: boolean;
  customDomain: boolean;
  webhooks: boolean;
  /** Subscriptions / renewal reminders. */
  renewals: boolean;
  /** Order bump + post-purchase upsell. */
  offers: boolean;
  supportSla: string;
};

const ALL_METHODS = [
  'stripe',
  'paypal',
  'alchemypay',
  'onramppay',
  'op_cashapp',
  'op_binance',
  'op_revolut',
  'op_upi',
  'op_paypalus',
  'finchpay_btc',
  'crypto',
  'whatsapp',
  'western_union',
  'bank_transfer',
  'paypal_ff',
  'bc_paypal',
  'bc_cashapp',
  'amazon_giftcard',
] as const;

/** The rails that need no processor approval — available on every tier. */
const SELF_SERVE_METHODS = ['whatsapp', 'crypto', 'bank_transfer', 'western_union'] as const;

const ALL_DESIGNS: readonly CheckoutDesign[] = [
  'CLASSIC',
  'LITE',
  'STOREFRONT',
  'EXPRESS',
  'HERO',
  'TRUST',
];

export const PLANS: Record<PlanTier, Entitlements> = {
  FREE: {
    tier: 'FREE',
    label: 'Trial',
    methods: ['whatsapp', 'crypto', 'bank_transfer'],
    designs: ['CLASSIC'],
    manualMethods: 0,
    products: 3,
    seats: 1,
    fullEditor: false,
    apiAccess: false,
    customDomain: false,
    webhooks: false,
    renewals: false,
    offers: false,
    supportSla: 'Community',
  },
  STARTER: {
    tier: 'STARTER',
    label: 'Starter',
    methods: [...SELF_SERVE_METHODS],
    designs: ['CLASSIC', 'LITE'],
    manualMethods: 1,
    products: 25,
    seats: 1,
    fullEditor: false,
    apiAccess: false,
    customDomain: false,
    webhooks: false,
    renewals: false,
    offers: false,
    supportSla: 'Email, 48h',
  },
  PROFESSIONAL: {
    tier: 'PROFESSIONAL',
    label: 'Professional',
    methods: [...ALL_METHODS],
    designs: ALL_DESIGNS,
    manualMethods: 5,
    products: 500,
    seats: 5,
    fullEditor: true,
    apiAccess: true,
    customDomain: false,
    webhooks: true,
    renewals: true,
    offers: true,
    supportSla: 'Priority email, 24h',
  },
  AGENCY: {
    tier: 'AGENCY',
    label: 'Agency',
    methods: [...ALL_METHODS],
    designs: ALL_DESIGNS,
    manualMethods: 5,
    products: -1,
    seats: 20,
    fullEditor: true,
    apiAccess: true,
    customDomain: true,
    webhooks: true,
    renewals: true,
    offers: true,
    supportSla: 'Priority + setup call',
  },
};

/** Monthly / yearly list price in minor units, mirroring the marketing site. */
export const PLAN_PRICING: Record<Exclude<PlanTier, 'FREE'>, { month: number; year: number }> = {
  STARTER: { month: 490, year: 3900 },
  PROFESSIONAL: { month: 1100, year: 8900 },
  AGENCY: { month: 2400, year: 19900 },
};

/**
 * A lapsed trial or an unpaid subscription falls back to FREE limits rather
 * than locking the merchant out: existing checkout links keep working on the
 * self-serve rails, which is the difference between a nudge and a hostage.
 */
export function entitlementsFor(account: Pick<Account, 'planTier' | 'trialEndsAt'>): Entitlements {
  if (
    account.planTier === 'FREE' &&
    account.trialEndsAt &&
    account.trialEndsAt.getTime() < Date.now()
  ) {
    return PLANS.FREE;
  }
  return PLANS[account.planTier];
}

export function canUseMethod(ent: Entitlements, key: string): boolean {
  if (key.startsWith('manual_')) {
    const slot = Number(key.slice('manual_'.length));
    return Number.isFinite(slot) && slot >= 1 && slot <= ent.manualMethods;
  }
  return ent.methods.includes(key);
}

export function canUseDesign(ent: Entitlements, design: CheckoutDesign): boolean {
  return ent.designs.includes(design);
}

export function withinProductLimit(ent: Entitlements, current: number): boolean {
  return ent.products === -1 || current < ent.products;
}

export function withinSeatLimit(ent: Entitlements, current: number): boolean {
  return current < ent.seats;
}

export class EntitlementError extends Error {
  readonly requiredTier: PlanTier | null;

  constructor(message: string, requiredTier: PlanTier | null = null) {
    super(message);
    this.name = 'EntitlementError';
    this.requiredTier = requiredTier;
  }
}

/** The cheapest tier that unlocks a given rail, for upgrade prompts. */
export function tierUnlocking(key: string): PlanTier | null {
  const order: PlanTier[] = ['FREE', 'STARTER', 'PROFESSIONAL', 'AGENCY'];
  for (const tier of order) {
    if (canUseMethod(PLANS[tier], key)) return tier;
  }
  return null;
}
