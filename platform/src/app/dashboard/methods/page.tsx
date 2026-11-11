import Link from 'next/link';
import type { Metadata } from 'next';
import { requireTenant } from '@/lib/tenancy';
import { loadMerchantContext } from '@/lib/gateway/context';
import { METHOD_DEFINITIONS } from '@/lib/gateway/registry';
import { readConfig } from '@/lib/gateway/config';
import { canUseMethod, entitlementsFor, PLANS, tierUnlocking } from '@/lib/entitlements';
import type { MethodGroup } from '@/lib/gateway/types';
import { PageHeader, Section } from '@/components/ui';
import { MethodIcon } from '@/components/checkout/method-icon';
import { ToggleMethod } from './toggle';

export const metadata: Metadata = { title: 'Payment methods' };

const GROUP_COPY: Record<MethodGroup, { title: string; blurb: string }> = {
  chat: {
    title: 'Chat',
    blurb: 'Where the conversation is the shop. One tap opens a thread that already knows the order.',
  },
  card: {
    title: 'Card processors',
    blurb: 'For merchants the big processors have already approved. Money moves on your own account.',
  },
  onramp: {
    title: 'On-ramps',
    blurb:
      'Buyers pay by card or local method, you receive crypto. These are the rails that work in regions Stripe and PayPal will not open.',
  },
  crypto: {
    title: 'Crypto',
    blurb: 'Your own addresses. No custodian, no exchange account, nobody taking a cut in the middle.',
  },
  manual: {
    title: 'Manual rails',
    blurb: 'You publish the details, the buyer pays, you verify. Slow, unglamorous and unstoppable.',
  },
};

const GROUP_ORDER: MethodGroup[] = ['chat', 'card', 'onramp', 'crypto', 'manual'];

export default async function MethodsPage() {
  const { account } = await requireTenant();
  const ent = entitlementsFor(account);
  const ctx = await loadMerchantContext(account.id);
  const byKey = new Map(ctx.methods.map((m) => [m.key, m]));
  const sharedOnramp = String(readConfig(byKey.get('onramppay') ?? null, 'onramppay').wallet ?? '');

  return (
    <>
      <PageHeader
        title="Payment methods"
        description="Switch on everything your buyers can actually use. A method only appears at checkout once it has what it needs to take money."
      />

      <div className="space-y-6">
        {GROUP_ORDER.map((group) => {
          const definitions = METHOD_DEFINITIONS.filter((d) => d.group === group);
          if (definitions.length === 0) return null;

          return (
            <Section key={group} title={GROUP_COPY[group].title} description={GROUP_COPY[group].blurb}>
              <ul className="grid gap-3 sm:grid-cols-2">
                {definitions.map((def) => {
                  const row = byKey.get(def.key) ?? null;
                  const config = readConfig(row, def.key);
                  const allowed = canUseMethod(ent, def.key);
                  const needed = tierUnlocking(def.key);

                  const live = row?.enabled
                    ? def.key === 'crypto'
                      ? ctx.wallets.length > 0
                      : def.key.startsWith('op_')
                        ? Boolean(String(config.wallet ?? '').trim() || sharedOnramp.trim())
                        : def.isReady(config)
                    : false;

                  return (
                    <li
                      key={def.key}
                      className="flex items-start gap-3 rounded-xl border border-ink-600/70 bg-ink-900/40 p-4"
                    >
                      <span className="mt-0.5">
                        <MethodIcon rail={def.key} tone={def.tone} size={22} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link
                              href={`/dashboard/methods/${def.key}`}
                              className="block truncate text-sm font-medium text-white hover:text-mint"
                            >
                              {row?.label?.trim() || def.defaultLabel}
                            </Link>
                            <p className="mt-0.5 text-xs text-ink-400">
                              {def.settlement === 'automatic'
                                ? 'Settles automatically'
                                : 'You confirm each payment'}
                            </p>
                          </div>
                          <ToggleMethod
                            methodKey={def.key}
                            enabled={Boolean(row?.enabled)}
                            disabled={!allowed}
                          />
                        </div>

                        <p className="mt-2 text-xs leading-relaxed text-ink-300">
                          {row?.description?.trim() || def.defaultDescription}
                        </p>

                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          {!allowed && needed ? (
                            <Link
                              href="/dashboard/billing"
                              className="chip border-violet/40 bg-violet/10 text-[#c6b8ff] hover:border-violet"
                            >
                              {PLANS[needed].label} plan
                            </Link>
                          ) : live ? (
                            <span className="chip border-mint/40 bg-mint/10 text-mint">Live</span>
                          ) : row?.enabled ? (
                            <span className="chip border-amber-400/40 bg-amber-400/10 text-amber-200">
                              Needs setup
                            </span>
                          ) : (
                            <span className="chip">Off</span>
                          )}
                          {def.minUsd > 1 ? (
                            <span className="chip">Min ${def.minUsd}</span>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Section>
          );
        })}

        <Section
          title="Your own payment methods"
          description="M-Pesa, PIX, Orange Money, Vodafone Cash, a cousin with a POS terminal. You write the steps; MethodePay does not care what the rail is called."
        >
          <ul className="space-y-2.5">
            {ctx.manualMethods.map((manual) => {
              const allowed = canUseMethod(ent, `manual_${manual.slot}`);
              return (
                <li
                  key={manual.slot}
                  className="flex items-center justify-between gap-4 rounded-xl border border-ink-600/70 bg-ink-900/40 px-4 py-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/methods/manual/${manual.slot}`}
                      className="truncate text-sm font-medium text-white hover:text-mint"
                    >
                      {manual.name.trim() || `Slot ${manual.slot} — unused`}
                    </Link>
                    <p className="text-xs text-ink-400">
                      {manual.enabled ? 'Shown at checkout' : 'Not shown'}
                      {manual.requiresGiftCard ? ' · collects a gift-card code' : ''}
                    </p>
                  </div>
                  {allowed ? (
                    manual.enabled ? (
                      <span className="chip border-mint/40 bg-mint/10 text-mint">On</span>
                    ) : (
                      <span className="chip">Off</span>
                    )
                  ) : (
                    <Link href="/dashboard/billing" className="chip border-violet/40 bg-violet/10 text-[#c6b8ff]">
                      Upgrade
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-3.5 text-xs text-ink-400">
            Your plan covers {ent.manualMethods} custom method{ent.manualMethods === 1 ? '' : 's'}.
          </p>
        </Section>
      </div>
    </>
  );
}
