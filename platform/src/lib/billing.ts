import 'server-only';
import Stripe from 'stripe';
import type { PlanTier } from '@prisma/client';
import { prisma } from './db';
import { billingConfigured, env } from './env';

/**
 * Platform billing: what merchants pay us.
 *
 * Kept entirely separate from the merchant Stripe keys used to take buyer
 * payments. Two different accounts, two different clients, two different
 * webhook endpoints — mixing them would mean one misconfigured key could route
 * a buyer payment into our account, or our subscription charge into theirs.
 */

let client: Stripe | null = null;

export function platformStripe(): Stripe | null {
  if (!billingConfigured()) return null;
  if (!client) {
    client = new Stripe(env.platformStripeSecret, { apiVersion: '2024-12-18.acacia' });
  }
  return client;
}

export type BillingInterval = 'month' | 'year';

export function priceIdFor(tier: Exclude<PlanTier, 'FREE'>, interval: BillingInterval): string {
  return env.stripePrices[tier][interval];
}

/** Reverse lookup, for the webhook: which tier does this price represent? */
export function tierForPrice(priceId: string): { tier: PlanTier; interval: BillingInterval } | null {
  const prices = env.stripePrices;
  for (const tier of ['STARTER', 'PROFESSIONAL', 'AGENCY'] as const) {
    for (const interval of ['month', 'year'] as const) {
      if (prices[tier][interval] && prices[tier][interval] === priceId) {
        return { tier, interval };
      }
    }
  }
  return null;
}

async function ensureCustomer(accountId: string): Promise<string | null> {
  const stripe = platformStripe();
  if (!stripe) return null;

  const [account, record] = await Promise.all([
    prisma.account.findUniqueOrThrow({
      where: { id: accountId },
      include: { memberships: { where: { role: 'OWNER' }, include: { user: true }, take: 1 } },
    }),
    prisma.billingSubscription.findUnique({ where: { accountId } }),
  ]);

  if (record?.stripeCustomerId) return record.stripeCustomerId;

  const owner = account.memberships[0]?.user;
  const customer = await stripe.customers.create({
    name: account.name,
    email: owner?.email,
    metadata: { methodepay_account: accountId, methodepay_slug: account.slug },
  });

  await prisma.billingSubscription.upsert({
    where: { accountId },
    create: { accountId, stripeCustomerId: customer.id, tier: account.planTier },
    update: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export async function createPlanCheckout(
  accountId: string,
  tier: Exclude<PlanTier, 'FREE'>,
  interval: BillingInterval,
): Promise<{ url?: string; error?: string }> {
  const stripe = platformStripe();
  if (!stripe) {
    return { error: 'Billing is not configured on this deployment yet.' };
  }

  const price = priceIdFor(tier, interval);
  if (!price) {
    return {
      error: `No Stripe price is configured for ${tier} ${interval}ly. Set the matching STRIPE_PRICE_* variable.`,
    };
  }

  const customer = await ensureCustomer(accountId);
  if (!customer) return { error: 'Could not create a billing customer.' };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      // The account id travels on the subscription so the webhook never has to
      // guess which tenant a payment belongs to.
      subscription_data: { metadata: { methodepay_account: accountId } },
      metadata: { methodepay_account: accountId, methodepay_tier: tier },
      success_url: `${env.appUrl}/dashboard/billing?upgraded=1`,
      cancel_url: `${env.appUrl}/dashboard/billing`,
    });
    return { url: session.url ?? undefined };
  } catch (error) {
    return {
      error:
        error instanceof Stripe.errors.StripeError
          ? `Stripe refused the checkout: ${error.message}`
          : 'Could not reach Stripe.',
    };
  }
}

/** Stripe-hosted portal: card changes, invoices, cancellation. */
export async function createBillingPortal(accountId: string): Promise<{ url?: string; error?: string }> {
  const stripe = platformStripe();
  if (!stripe) return { error: 'Billing is not configured on this deployment yet.' };

  const record = await prisma.billingSubscription.findUnique({ where: { accountId } });
  if (!record?.stripeCustomerId) {
    return { error: 'There is no billing record for this store yet. Choose a plan first.' };
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: record.stripeCustomerId,
      return_url: `${env.appUrl}/dashboard/billing`,
    });
    return { url: session.url };
  } catch {
    return { error: 'Could not open the billing portal.' };
  }
}

const STATUS_MAP: Record<string, 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE'> = {
  trialing: 'TRIALING',
  active: 'ACTIVE',
  past_due: 'PAST_DUE',
  unpaid: 'PAST_DUE',
  canceled: 'CANCELED',
  incomplete: 'INCOMPLETE',
  incomplete_expired: 'CANCELED',
  paused: 'CANCELED',
};

/**
 * Apply a Stripe subscription to an account.
 *
 * A lapsed subscription drops the account to FREE limits rather than locking
 * it out: existing checkout links keep working on the self-serve rails. That
 * is the difference between a nudge to pay and holding a merchant business
 * hostage, and only one of those gets renewed.
 */
export async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
  const accountId =
    subscription.metadata?.methodepay_account ??
    (typeof subscription.customer === 'string'
      ? (
          await prisma.billingSubscription.findUnique({
            where: { stripeCustomerId: subscription.customer },
            select: { accountId: true },
          })
        )?.accountId
      : undefined);

  if (!accountId) {
    console.error('[billing] subscription with no resolvable account', subscription.id);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id ?? '';
  const mapped = tierForPrice(priceId);
  const status = STATUS_MAP[subscription.status] ?? 'INCOMPLETE';
  const entitled = status === 'ACTIVE' || status === 'TRIALING';
  const tier: PlanTier = entitled && mapped ? mapped.tier : 'FREE';

  await prisma.$transaction([
    prisma.billingSubscription.upsert({
      where: { accountId },
      create: {
        accountId,
        stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : null,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        tier,
        status,
        interval: mapped?.interval ?? null,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      update: {
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        tier,
        status,
        interval: mapped?.interval ?? null,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    }),
    prisma.account.update({
      where: { id: accountId },
      // A paid plan ends the trial clock; a lapse does not restart it.
      data: { planTier: tier, ...(entitled ? { trialEndsAt: null } : {}) },
    }),
  ]);
}
