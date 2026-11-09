import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { PaymentMethodConfig } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireTenant } from '@/lib/tenancy';
import {
  canUseMethod,
  entitlementsFor,
  PLANS,
  tierUnlocking,
  type Entitlements,
} from '@/lib/entitlements';
import { configIsReady, publicConfig } from '@/lib/gateway/config';
import { defaultConfig, methodDefinition } from '@/lib/gateway/registry';
import type { MethodConfig } from '@/lib/gateway/types';
import { decryptSecret, maskSecret } from '@/lib/crypto';
import {
  nextSlug,
  prevSlug,
  RAIL_STATUS_COPY,
  stepAt,
  stepIndex,
  WIZARD_SLUGS,
  WIZARD_STEPS,
  wizardRailKeys,
  type RailSpec,
} from '@/lib/onboarding/steps';
import { ChatForm, CryptoForm, RailsForm, StoreForm } from '../forms';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: { step: string } }): Metadata {
  return { title: `${stepAt(params.step).title} · Setup` };
}

/**
 * Turn a registry rail plus the merchant row into something a client component
 * can render — and, more importantly, into an honest status.
 *
 * "Saved" and "a buyer can pay with this" are different claims, and the gap
 * between them is where a merchant loses their first sale without knowing it.
 * So each rail says which of the two it has reached and what is missing.
 */
function buildRail(
  key: string,
  askedFields: string[],
  methods: PaymentMethodConfig[],
  ent: Entitlements,
  readyOverride?: boolean,
): RailSpec | null {
  const def = methodDefinition(key);
  if (!def) return null;

  const row = methods.find((m) => m.key === key) ?? null;
  const values = publicConfig(row, key);
  const fields = def.fields
    .filter((f) => askedFields.includes(f.name))
    .map((f) => ({ ...f, value: values[f.name] ?? '' }));

  const stored: MethodConfig =
    row?.config && typeof row.config === 'object' && !Array.isArray(row.config)
      ? (row.config as MethodConfig)
      : {};

  const allowed = canUseMethod(ent, key);
  const ready = readyOverride ?? configIsReady(key, stored);

  // A merchant who clicked through a step without typing anything still leaves
  // a row behind, filled with registry defaults. Comparing against those
  // defaults is what separates "skipped" from "started and did not finish".
  const defaults = defaultConfig(key);
  const touched = Object.entries(stored).some(([name, value]) => {
    if (value === undefined || value === null || value === false || String(value).trim() === '') {
      return false;
    }
    return String(value) !== String(defaults[name] ?? '');
  });

  let status: RailSpec['status'] = 'empty';
  let note = def.setupHint;

  if (!allowed) {
    const needed = tierUnlocking(key);
    status = 'blocked';
    note = needed
      ? `Part of the ${PLANS[needed].label} plan. Fill it in now and it switches on the day you upgrade.`
      : `Not included on the ${ent.label} plan. Your details are kept either way.`;
  } else if (row?.enabled && ready) {
    status = 'live';
    note = 'Buyers can choose this at checkout right now.';
  } else if (touched || ready) {
    status = 'incomplete';
    note = def.setupHint;
  }

  return { key, label: def.defaultLabel, hint: def.setupHint, tone: def.tone, status, note, fields };
}

export default async function WizardStepPage({ params }: { params: { step: string } }) {
  if (!WIZARD_SLUGS.includes(params.step)) notFound();

  const { account } = await requireTenant();
  const step = stepAt(params.step);
  const index = stepIndex(params.step);
  const back = prevSlug(params.step);
  const next = nextSlug(params.step);
  const ent = entitlementsFor(account);

  const [settings, wallets, methods] = await Promise.all([
    prisma.notificationSettings.findUnique({ where: { accountId: account.id } }),
    prisma.wallet.findMany({
      where: { accountId: account.id, active: true },
      orderBy: [{ sortOrder: 'asc' }, { coin: 'asc' }],
    }),
    prisma.paymentMethodConfig.findMany({ where: { accountId: account.id } }),
  ]);

  const railsFor = (overrides: Record<string, boolean> = {}) =>
    step.rails
      .map((r) => buildRail(r.key, r.fields, methods, ent, overrides[r.key]))
      .filter((r): r is RailSpec => r !== null);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-mint">
          Step {index + 1} of {WIZARD_STEPS.length}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">{step.title}</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-300">{step.blurb}</p>
      </header>

      <ol className="mt-6 flex flex-wrap gap-1.5" aria-label="Setup progress">
        {WIZARD_STEPS.map((s, i) => (
          <li key={s.slug} className="flex-1 basis-16">
            <Link
              href={`/onboarding/setup/${s.slug}`}
              title={s.title}
              aria-current={i === index ? 'step' : undefined}
              className={`block h-1.5 rounded-full transition ${
                i < index ? 'bg-mint/50' : i === index ? 'bg-mint' : 'bg-ink-600 hover:bg-ink-500'
              }`}
            >
              <span className="sr-only">{s.title}</span>
            </Link>
          </li>
        ))}
      </ol>

      <div className="card mt-6 p-6">
        {step.kind === 'store' ? (
          <StoreForm
            next={next}
            values={{
              storeName: settings?.storeName || account.name,
              supportEmail: settings?.supportEmail ?? '',
              orderPrefix: settings?.orderPrefix || 'MP-',
            }}
          />
        ) : null}

        {step.kind === 'crypto' ? (
          <CryptoForm
            back={back}
            next={next}
            wallets={wallets.map((w) => ({ coin: w.coin, network: w.network, address: w.address }))}
            rail={railsFor({ crypto: wallets.length > 0 })[0]}
          />
        ) : null}

        {step.kind === 'chat' ? (
          <ChatForm
            back={back}
            next={next}
            rail={railsFor()[0]}
            values={{
              // The token is never sent back in the clear; a masked box that
              // comes back untouched means "keep what you have".
              telegramBotToken: settings?.telegramBotTokenEnc
                ? maskSecret(decryptSecret(settings.telegramBotTokenEnc))
                : '',
              telegramChatId: settings?.telegramChatId ?? '',
              confirmWhatsapp: settings?.confirmWhatsapp ?? '',
              confirmTelegram: settings?.confirmTelegram ?? '',
              channels: Array.isArray(settings?.confirmChannels)
                ? (settings?.confirmChannels as unknown[]).filter(
                    (c): c is string => typeof c === 'string',
                  )
                : [],
            }}
          />
        ) : null}

        {step.kind === 'rails' ? (
          <RailsForm step={step.slug} rails={railsFor()} back={back} next={next} />
        ) : null}

        {step.kind === 'done' ? (
          <Summary account={{ slug: account.slug }} ent={ent} methods={methods} wallets={wallets.length} />
        ) : null}
      </div>
    </main>
  );
}

/**
 * The closing screen, read back out of the database rather than from whatever
 * the merchant typed on the way through. If a rail says Live here, a buyer
 * really can pick it.
 */
function Summary({
  account,
  ent,
  methods,
  wallets,
}: {
  account: { slug: string };
  ent: Entitlements;
  methods: PaymentMethodConfig[];
  wallets: number;
}) {
  const rails = wizardRailKeys()
    .map((key) => buildRail(key, [], methods, ent, key === 'crypto' ? wallets > 0 : undefined))
    .filter((r): r is RailSpec => r !== null);

  const live = rails.filter((r) => r.status === 'live');
  // Two different things, and conflating them turns the plan into a chore
  // list: one group is waiting on the merchant, the other on their wallet.
  const unfinished = rails.filter((r) => r.status === 'incomplete');
  const upgrade = rails.filter((r) => r.status === 'blocked');

  return (
    <div className="space-y-6">
      {live.length > 0 ? (
        <div>
          <p className="text-sm font-medium text-white">
            {live.length} way{live.length === 1 ? '' : 's'} to pay, live now
          </p>
          <ul className="mt-3 space-y-1.5">
            {live.map((rail) => (
              <li key={rail.key} className="flex items-center gap-2.5 text-sm text-ink-100">
                <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: rail.tone }} />
                {rail.label}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4">
          <p className="text-sm font-medium text-amber-200">No way to pay yet</p>
          <p className="mt-1.5 text-xs leading-relaxed text-amber-200/80">
            Nothing is live, so a checkout page would have nothing to offer. Go back and finish one
            rail — a crypto address or a WhatsApp number is enough to start taking money today.
          </p>
        </div>
      )}

      {unfinished.length > 0 ? (
        <div>
          <p className="text-sm font-medium text-white">Started, not finished</p>
          <ul className="mt-3 space-y-2">
            {unfinished.map((rail) => (
              <li key={rail.key} className="flex items-start justify-between gap-3 text-xs">
                <span className="text-ink-300">
                  <span className="font-medium text-ink-100">{rail.label}</span> — {rail.note}
                </span>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    RAIL_STATUS_COPY.incomplete.className
                  }`}
                >
                  {RAIL_STATUS_COPY.incomplete.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {upgrade.length > 0 ? (
        <div>
          <p className="text-sm font-medium text-white">
            {upgrade.length} more rail{upgrade.length === 1 ? '' : 's'} your plan does not cover yet
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-400">
            Anything you typed in is saved and switches on the day you upgrade — you will not be
            asked for it twice.
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {upgrade.map((rail) => (
              <li
                key={rail.key}
                className="flex items-center gap-1.5 rounded-full border border-ink-600 bg-ink-900/60 px-2.5 py-1 text-[11px] text-ink-300"
              >
                <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: rail.tone }} />
                {rail.label}
              </li>
            ))}
          </ul>
          <Link
            href="/dashboard/billing"
            className="mt-3 inline-block text-xs font-medium text-mint hover:underline"
          >
            See what each plan covers →
          </Link>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-ink-600/70 pt-5">
        <Link href="/dashboard/products/new" className="btn-primary">
          Add your first product
        </Link>
        <Link href="/dashboard" className="btn-ghost">
          Go to the dashboard
        </Link>
        <Link
          href="/onboarding/setup/store"
          className="ml-auto text-xs text-ink-400 hover:text-white"
        >
          Run through it again
        </Link>
      </div>

      <p className="text-xs leading-relaxed text-ink-400">
        Your checkout links will look like{' '}
        <code className="rounded bg-ink-950 px-1.5 py-0.5 text-mint">/c/{account.slug}/your-product</code>
        . Everything here is editable later under Methods, Wallets and Notifications.
      </p>
    </div>
  );
}
