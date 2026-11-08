import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { PlanTier } from '@prisma/client';
import { requireTenant, assertRole, ForbiddenError } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { entitlementsFor, PLANS, PLAN_PRICING } from '@/lib/entitlements';
import { createBillingPortal, createPlanCheckout, type BillingInterval } from '@/lib/billing';
import { billingConfigured } from '@/lib/env';
import { formatMoney } from '@/lib/money';
import { Banner, PageHeader, Section, StatTile } from '@/components/ui';
import { ActionForm, SubmitButton, type ActionState } from '@/components/action-form';

export const metadata: Metadata = { title: 'Plan & billing' };

const PAID_TIERS: Exclude<PlanTier, 'FREE'>[] = ['STARTER', 'PROFESSIONAL', 'AGENCY'];

const TAGLINES: Record<Exclude<PlanTier, 'FREE'>, string> = {
  STARTER: 'The rails that never say no.',
  PROFESSIONAL: 'Every method, every design, delivery on autopilot.',
  AGENCY: 'Unlimited products and a human on setup day.',
};

async function startCheckoutAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  'use server';
  let destination: string;
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'OWNER');

    const tier = String(formData.get('tier') ?? '') as Exclude<PlanTier, 'FREE'>;
    if (!PAID_TIERS.includes(tier)) return { error: 'Pick a plan.' };
    const interval: BillingInterval = formData.get('interval') === 'year' ? 'year' : 'month';

    const result = await createPlanCheckout(tenant.account.id, tier, interval);
    if (result.error || !result.url) return { error: result.error ?? 'Could not start checkout.' };
    destination = result.url;
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }
  redirect(destination);
}

async function openPortalAction(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  'use server';
  let destination: string;
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'OWNER');
    const result = await createBillingPortal(tenant.account.id);
    if (result.error || !result.url) return { error: result.error ?? 'Could not open the portal.' };
    destination = result.url;
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }
  redirect(destination);
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { upgraded?: string };
}) {
  const { account, role } = await requireTenant();
  const ent = entitlementsFor(account);
  const subscription = await prisma.billingSubscription.findUnique({
    where: { accountId: account.id },
  });

  const isOwner = role === 'OWNER';

  return (
    <>
      <PageHeader
        title="Plan & billing"
        description="Plans gate which payment rails, designs and automations your store can use. Nothing about your data is held back."
      />

      {searchParams.upgraded ? (
        <Banner tone="good">
          Payment received. If the plan below still looks old, give the Stripe webhook a few seconds
          and reload — the plan changes when the webhook lands, not when the redirect does.
        </Banner>
      ) : null}

      {!billingConfigured() ? (
        <Banner tone="warn">
          Platform billing is not wired up on this deployment. Set{' '}
          <code className="text-xs">PLATFORM_STRIPE_SECRET_KEY</code>, the{' '}
          <code className="text-xs">STRIPE_PRICE_*</code> ids and{' '}
          <code className="text-xs">PLATFORM_STRIPE_WEBHOOK_SECRET</code> to take subscriptions. Plan
          gating already works — you can set a tier directly in the database meanwhile.
        </Banner>
      ) : null}

      {!isOwner ? (
        <Banner tone="info">Only an owner can change the plan.</Banner>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Current plan" value={ent.label} tone="good" />
        <StatTile
          label="Status"
          value={subscription ? humanStatus(subscription.status) : account.planTier === 'FREE' ? 'Trial' : '—'}
          hint={
            subscription?.currentPeriodEnd
              ? `${subscription.cancelAtPeriodEnd ? 'Ends' : 'Renews'} ${subscription.currentPeriodEnd.toISOString().slice(0, 10)}`
              : account.trialEndsAt
                ? `Trial ends ${account.trialEndsAt.toISOString().slice(0, 10)}`
                : undefined
          }
        />
        <StatTile label="Support" value={ent.supportSla} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {PAID_TIERS.map((tier) => {
          const plan = PLANS[tier];
          const pricing = PLAN_PRICING[tier];
          const current = account.planTier === tier;

          return (
            <section
              key={tier}
              className={`card flex flex-col p-5 ${
                tier === 'PROFESSIONAL' ? 'border-mint/40' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base font-semibold text-white">{plan.label}</h2>
                {tier === 'PROFESSIONAL' ? (
                  <span className="chip border-mint/40 bg-mint/10 text-mint">Most picked</span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-ink-400">{TAGLINES[tier]}</p>

              <p className="mt-4">
                <span className="text-2xl font-semibold text-white">
                  {formatMoney(pricing.month, 'USD')}
                </span>
                <span className="text-sm text-ink-400"> /month</span>
              </p>
              <p className="text-xs text-ink-400">
                or {formatMoney(pricing.year, 'USD')} a year — two months off
              </p>

              <ul className="mt-4 flex-1 space-y-1.5 text-xs text-ink-200">
                <Li>{plan.products === -1 ? 'Unlimited products' : `${plan.products} products`}</Li>
                <Li>
                  {plan.methods.length >= 15
                    ? 'All payment methods, including Stripe, PayPal, Alchemy Pay and the on-ramps'
                    : 'WhatsApp, direct crypto, bank transfer and Western Union'}
                </Li>
                <Li>
                  {plan.designs.length} checkout design{plan.designs.length === 1 ? '' : 's'}
                  {plan.fullEditor ? ' · full live editor' : ' · colours and copy'}
                </Li>
                <Li>
                  {plan.manualMethods} custom payment method{plan.manualMethods === 1 ? '' : 's'}
                </Li>
                <Li>
                  {plan.seats} team seat{plan.seats === 1 ? '' : 's'}
                </Li>
                {plan.renewals ? <Li>Renewal reminders and subscription tracking</Li> : null}
                {plan.apiAccess ? <Li>REST API and signed webhooks</Li> : null}
                {plan.customDomain ? <Li>Your own checkout domain</Li> : null}
                <Li>{plan.supportSla}</Li>
              </ul>

              {current ? (
                <p className="mt-5 rounded-xl border border-mint/40 bg-mint/10 px-3.5 py-2.5 text-center text-xs font-medium text-mint">
                  Your current plan
                </p>
              ) : isOwner ? (
                <ActionForm action={startCheckoutAction} className="mt-5 space-y-2">
                  <input type="hidden" name="tier" value={tier} />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="submit"
                      name="interval"
                      value="month"
                      className="btn-ghost !py-2 !text-xs"
                    >
                      Monthly
                    </button>
                    <button
                      type="submit"
                      name="interval"
                      value="year"
                      className="btn-primary !py-2 !text-xs"
                    >
                      Yearly
                    </button>
                  </div>
                </ActionForm>
              ) : null}
            </section>
          );
        })}
      </div>

      {isOwner && subscription?.stripeCustomerId ? (
        <div className="mt-6">
          <Section
            title="Manage your subscription"
            description="Cards, invoices and cancellation are handled by Stripe, so your payment details never touch our servers."
          >
            <ActionForm action={openPortalAction}>
              <SubmitButton variant="ghost">Open the billing portal</SubmitButton>
            </ActionForm>
          </Section>
        </div>
      ) : null}

      <p className="mt-6 text-xs text-ink-400">
        Cancelling drops the store to trial limits rather than switching it off: your checkout links
        keep working on WhatsApp, direct crypto and bank transfer, and your orders stay yours.
      </p>
    </>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-mint" />
      <span>{children}</span>
    </li>
  );
}

function humanStatus(status: string): string {
  const map: Record<string, string> = {
    TRIALING: 'Trialing',
    ACTIVE: 'Active',
    PAST_DUE: 'Past due',
    CANCELED: 'Cancelled',
    INCOMPLETE: 'Incomplete',
  };
  return map[status] ?? status;
}
