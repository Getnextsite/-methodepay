import 'server-only';
import { createHmac } from 'node:crypto';
import type { PlanTier, SubscriptionStatus } from '@prisma/client';
import { prisma } from './db';
import { env, freemiusConfigured } from './env';
import { safeEqual } from './crypto';

/**
 * Platform billing through Freemius: what merchants pay us.
 *
 * Freemius hosts the checkout, the card, the tax handling and the customer
 * portal, which is the whole reason to use it — we never see a card and there
 * is no portal to build. What it does not give us is the thing Stripe does:
 * Freemius webhooks carry no custom metadata, so a payment arrives with no
 * mention of which MethodePay account it belongs to.
 *
 * So the account is bound to a Freemius identity at the one moment we know
 * both: when the buyer lands back on the billing page in their own session.
 * The webhook is still the only thing that grants a plan — the return URL just
 * says who to look for.
 */

export const FREEMIUS_CHECKOUT_HOST = 'https://checkout.freemius.com';

/** Freemius hosts the customer portal; there is nothing for us to build. */
export const FREEMIUS_PORTAL_URL = 'https://users.freemius.com/';

export type BillingInterval = 'month' | 'year';

/** Freemius calls these `monthly` and `annual`; it also accepts `lifetime`. */
function billingCycle(interval: BillingInterval): 'monthly' | 'annual' {
  return interval === 'month' ? 'monthly' : 'annual';
}

export function freemiusPlanId(tier: Exclude<PlanTier, 'FREE'>): string {
  return env.freemius.plans[tier];
}

/** Reverse lookup for the webhook: which tier is this Freemius plan? */
export function tierForFreemiusPlan(planId: string | number | null | undefined): PlanTier | null {
  if (planId === null || planId === undefined) return null;
  const id = String(planId);
  for (const tier of ['STARTER', 'PROFESSIONAL', 'AGENCY'] as const) {
    if (env.freemius.plans[tier] && env.freemius.plans[tier] === id) return tier;
  }
  return null;
}

/**
 * Where to send a merchant to pay.
 *
 * Nothing is created server-side first — a Freemius checkout is just a URL, so
 * there is no customer object to keep in step and no API call that can fail
 * between the button and the page.
 */
export function createFreemiusCheckout(
  tier: Exclude<PlanTier, 'FREE'>,
  interval: BillingInterval,
  buyerEmail: string,
): { url?: string; error?: string } {
  if (!freemiusConfigured()) {
    return { error: 'Freemius billing is not configured on this deployment yet.' };
  }

  const planId = freemiusPlanId(tier);
  if (!planId) {
    return { error: `No Freemius plan id is set for ${tier}. Set FREEMIUS_PLAN_${tier}.` };
  }

  const url = new URL(`${FREEMIUS_CHECKOUT_HOST}/product/${env.freemius.productId}/plan/${planId}/`);
  url.searchParams.set('billing_cycle', billingCycle(interval));
  if (buyerEmail) {
    url.searchParams.set('user_email', buyerEmail);
    // The email is who we will match the webhook against, so it must not be
    // edited on the payment page into one we cannot resolve.
    url.searchParams.set('readonly_user', 'true');
  }
  url.searchParams.set('cancel_url', `${env.appUrl}/dashboard/billing`);

  return { url: url.toString() };
}

// ---------------------------------------------------------------- webhooks

/**
 * Verify an inbound webhook.
 *
 * HMAC-SHA256 of the raw request body, keyed with the product secret, compared
 * against the `x-signature` header. It has to be the raw bytes: a body that has
 * been parsed and re-serialised is a different sequence and will never match.
 */
export function verifyFreemiusSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !freemiusConfigured()) return false;
  const expected = createHmac('sha256', env.freemius.secretKey).update(rawBody).digest('hex');
  return safeEqual(expected, signature.trim());
}

/** The slice of the payload we rely on. Freemius sends a great deal more. */
type FreemiusObject = Record<string, unknown>;

export type FreemiusEvent = {
  id?: string | number;
  type?: string;
  objects?: Record<string, FreemiusObject>;
};

function str(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

function date(value: unknown): Date | null {
  const s = str(value);
  if (!s) return null;
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * What a Freemius event means for a plan.
 *
 * Only two questions matter: is this account entitled right now, and to what.
 * Everything else Freemius reports is bookkeeping it already does better than
 * we would.
 */
const ENDS_ENTITLEMENT = new Set([
  'license.expired',
  'license.cancelled',
  'license.deleted',
  'subscription.cancelled',
  'payment.refund',
]);

const PAST_DUE = new Set([
  'subscription.renewal.failed',
  'subscription.renewal.failed.last',
]);

export type ApplyResult = 'applied' | 'ignored' | 'unresolved';

export async function applyFreemiusEvent(event: FreemiusEvent): Promise<ApplyResult> {
  const type = str(event.type) ?? '';
  const objects = event.objects ?? {};
  const license = objects.license ?? null;
  const subscription = objects.subscription ?? null;
  const user = objects.user ?? null;

  // Events that touch neither a licence nor a subscription cannot change what
  // a merchant is entitled to, so they are acknowledged and dropped.
  if (!license && !subscription) return 'ignored';

  const freemiusUserId =
    str(user?.id) ?? str(license?.user_id) ?? str(subscription?.user_id) ?? null;
  const email = str(user?.email);
  const licenseId = str(license?.id);
  const subscriptionId = str(subscription?.id);
  const planId = str(license?.plan_id) ?? str(subscription?.plan_id);

  const accountId = await resolveAccount({ freemiusUserId, email, licenseId, subscriptionId });
  if (!accountId) return 'unresolved';

  const expires = date(license?.expiration) ?? date(subscription?.next_payment);
  const expired = expires !== null && expires.getTime() < Date.now();

  let status: SubscriptionStatus;
  if (ENDS_ENTITLEMENT.has(type) || expired) {
    status = 'CANCELED';
  } else if (PAST_DUE.has(type)) {
    status = 'PAST_DUE';
  } else {
    status = 'ACTIVE';
  }

  const mapped = tierForFreemiusPlan(planId);
  const entitled = status === 'ACTIVE';
  // An unrecognised plan id is not a reason to hand out a tier. It means the
  // FREEMIUS_PLAN_* variables and the Freemius dashboard have drifted, and
  // guessing would either overcharge the merchant in features or undercharge.
  const tier: PlanTier = entitled && mapped ? mapped : 'FREE';

  if (entitled && !mapped) {
    console.error('[freemius] no tier mapped for plan id', planId, '- account stays on FREE');
  }

  // Only overwrite what this event actually carried. A subscription event
  // mentions no licence, and blanking the stored licence id would throw away
  // the strongest key we have for resolving the next event.
  const identifiers = {
    ...(freemiusUserId ? { freemiusUserId } : {}),
    ...(licenseId ? { freemiusLicenseId: licenseId } : {}),
    ...(subscriptionId ? { freemiusSubscriptionId: subscriptionId } : {}),
    ...(planId ? { freemiusPlanId: planId } : {}),
  };

  const values = {
    ...identifiers,
    provider: 'freemius',
    tier,
    status,
    // A cancellation says nothing about when the term ends; the licence keeps
    // the date it already had.
    ...(expires ? { currentPeriodEnd: expires } : {}),
    cancelAtPeriodEnd: type === 'subscription.cancelled',
  };

  await prisma.$transaction([
    prisma.billingSubscription.upsert({
      where: { accountId },
      create: { accountId, ...values },
      update: values,
    }),
    prisma.account.update({
      where: { id: accountId },
      // A paid plan ends the trial clock; a lapse never restarts it, and never
      // locks the merchant out — FREE still sells on the self-serve rails.
      data: { planTier: tier, ...(entitled ? { trialEndsAt: null } : {}) },
    }),
  ]);

  return 'applied';
}

/**
 * Find the account a Freemius event belongs to.
 *
 * Tried in order of how hard each is to forge. A licence or subscription id we
 * stored ourselves is strongest; the owner email is last, and is what carries
 * the very first purchase, before any binding exists.
 */
async function resolveAccount(keys: {
  freemiusUserId: string | null;
  email: string | null;
  licenseId: string | null;
  subscriptionId: string | null;
}): Promise<string | null> {
  const { freemiusUserId, email, licenseId, subscriptionId } = keys;

  for (const where of [
    licenseId ? { freemiusLicenseId: licenseId } : null,
    subscriptionId ? { freemiusSubscriptionId: subscriptionId } : null,
    freemiusUserId ? { freemiusUserId } : null,
  ]) {
    if (!where) continue;
    const row = await prisma.billingSubscription.findFirst({
      where,
      select: { accountId: true },
    });
    if (row) return row.accountId;
  }

  if (email) {
    const membership = await prisma.membership.findFirst({
      where: { role: 'OWNER', user: { email: email.toLowerCase() } },
      select: { accountId: true },
      orderBy: { createdAt: 'asc' },
    });
    if (membership) return membership.accountId;
  }

  return null;
}

/**
 * Bind the Freemius identity to the account, on return from checkout.
 *
 * Freemius appends the buyer identity to the return URL. That is a URL the
 * merchant can type by hand, so it grants nothing: the binding is accepted
 * only when the email on it is the email we already have for the account
 * owner, which stops one merchant claiming another merchant licence and
 * collecting their plan when the webhook lands.
 */
export async function bindFreemiusReturn(
  accountId: string,
  params: { userId?: string; licenseId?: string; email?: string },
): Promise<boolean> {
  const email = params.email?.trim().toLowerCase();
  if (!email || (!params.userId && !params.licenseId)) return false;

  const owner = await prisma.membership.findFirst({
    where: { accountId, role: 'OWNER' },
    select: { user: { select: { email: true } } },
    orderBy: { createdAt: 'asc' },
  });
  if (!owner || owner.user.email.toLowerCase() !== email) return false;

  // Never steal an id another account already holds.
  const taken = await prisma.billingSubscription.findFirst({
    where: {
      accountId: { not: accountId },
      OR: [
        params.licenseId ? { freemiusLicenseId: params.licenseId } : {},
        params.userId ? { freemiusUserId: params.userId } : {},
      ].filter((c) => Object.keys(c).length > 0),
    },
    select: { id: true },
  });
  if (taken) return false;

  const values = {
    freemiusUserId: params.userId ?? null,
    freemiusLicenseId: params.licenseId ?? null,
    provider: 'freemius',
  };

  await prisma.billingSubscription.upsert({
    where: { accountId },
    create: { accountId, ...values },
    update: values,
  });

  return true;
}
