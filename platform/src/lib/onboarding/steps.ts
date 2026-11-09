/**
 * The setup wizard, declared once.
 *
 * A new merchant has a store and no way to take money. The dashboard exposes
 * every rail, every wallet and every notification channel as its own screen,
 * which is right for someone changing one thing and wrong for someone starting
 * from nothing. This is the same data in the order a person actually has it:
 * the crypto address they already own, the WhatsApp number they already give
 * out, then the processor accounts they may or may not have.
 *
 * The steps name rails and field names only. Labels, help text, types and
 * encryption all still come from `METHOD_DEFINITIONS`, so a rail that gains a
 * field gains it here too and there is no second copy to drift.
 */
import type { ConfigField } from '@/lib/gateway/types';

export type WizardStepKind = 'store' | 'crypto' | 'chat' | 'rails' | 'done';

/**
 * A rail prepared for the browser.
 *
 * Built on the server from the registry plus the merchant row, because the
 * registry entry itself carries an `isReady` function and cannot cross into a
 * client component. Secret values arrive masked — the same shape the rest of
 * the dashboard sends, so an untouched box round-trips as "unchanged".
 */
export type RailStatus = 'live' | 'incomplete' | 'blocked' | 'empty';

export type RailFieldSpec = ConfigField & { value: string | number | boolean };

export type RailSpec = {
  key: string;
  label: string;
  hint: string;
  tone: string;
  status: RailStatus;
  note: string;
  fields: RailFieldSpec[];
};

export const RAIL_STATUS_COPY: Record<RailStatus, { label: string; className: string }> = {
  live: { label: 'Live', className: 'border-mint/40 bg-mint/10 text-mint' },
  incomplete: { label: 'Needs more', className: 'border-amber-400/40 bg-amber-400/10 text-amber-300' },
  blocked: { label: 'Plan', className: 'border-violet-400/40 bg-violet-400/10 text-violet-300' },
  empty: { label: 'Not set up', className: 'border-ink-600 bg-ink-900/60 text-ink-400' },
};

export type WizardRail = {
  key: string;
  /**
   * Registry field names worth asking at setup. Anything omitted keeps its
   * stored value, or its registry default on a fresh account — the merchant
   * tunes the rest later on the rail's own page.
   */
  fields: string[];
};

export type WizardStep = {
  slug: string;
  title: string;
  blurb: string;
  kind: WizardStepKind;
  rails: WizardRail[];
};

export const WIZARD_STEPS: WizardStep[] = [
  {
    slug: 'store',
    title: 'Your store',
    blurb: 'The name buyers see at checkout, and where their questions reach you.',
    kind: 'store',
    rails: [],
  },
  {
    slug: 'crypto',
    title: 'Take crypto directly',
    blurb:
      'One receive address per coin and network. Buyers get the address, a QR code we generate, and a reference to quote — nothing is custodied by us.',
    kind: 'crypto',
    rails: [{ key: 'crypto', fields: ['timerMinutes', 'instructions'] }],
  },
  {
    slug: 'chat',
    title: 'WhatsApp and Telegram',
    blurb:
      'The rail that closes sales where cards get declined, plus where we ping you the moment an order lands.',
    kind: 'chat',
    rails: [{ key: 'whatsapp', fields: ['number', 'messageTemplate'] }],
  },
  {
    slug: 'cards',
    title: 'Card processors',
    blurb:
      'Your own Stripe and PayPal accounts. Money moves straight between buyer and you — we are never in the flow of funds.',
    kind: 'rails',
    rails: [
      { key: 'stripe', fields: ['publishableKey', 'secretKey', 'webhookSecret'] },
      { key: 'paypal', fields: ['clientId', 'clientSecret', 'sandbox'] },
    ],
  },
  {
    slug: 'onramps',
    title: 'Cards without a merchant account',
    blurb:
      'The buyer pays by card or a local method; you receive crypto at your own address. These are the rails that work where Stripe will not open an account.',
    kind: 'rails',
    rails: [
      { key: 'onramppay', fields: ['wallet', 'providers'] },
      { key: 'finchpay_btc', fields: ['wallet', 'blockedCountries'] },
      { key: 'alchemypay', fields: ['appId', 'appSecret', 'crypto', 'network', 'wallet'] },
    ],
  },
  {
    slug: 'manual',
    title: 'Bank, cash and gift cards',
    blurb:
      'Unglamorous, slow, and the reason a lot of stores exist at all. You confirm each one by hand from the orders screen.',
    kind: 'rails',
    rails: [
      { key: 'bank_transfer', fields: ['holderName', 'iban', 'swift', 'bankName'] },
      { key: 'western_union', fields: ['firstName', 'lastName', 'country', 'city'] },
      { key: 'paypal_ff', fields: ['instructions', 'buttonUrl'] },
      { key: 'amazon_giftcard', fields: ['purchaseUrl', 'instructions'] },
    ],
  },
  {
    slug: 'done',
    title: 'You are set up',
    blurb: 'What is live, what is waiting on you, and what to do next.',
    kind: 'done',
    rails: [],
  },
];

export const WIZARD_SLUGS = WIZARD_STEPS.map((s) => s.slug);

export function stepIndex(slug: string | undefined): number {
  const i = WIZARD_SLUGS.indexOf(String(slug));
  return i === -1 ? 0 : i;
}

export function stepAt(slug: string | undefined): WizardStep {
  return WIZARD_STEPS[stepIndex(slug)];
}

export function nextSlug(slug: string | undefined): string | null {
  const i = stepIndex(slug);
  return i + 1 < WIZARD_STEPS.length ? WIZARD_STEPS[i + 1].slug : null;
}

export function prevSlug(slug: string | undefined): string | null {
  const i = stepIndex(slug);
  return i > 0 ? WIZARD_STEPS[i - 1].slug : null;
}

/** Every rail the wizard can configure, in the order it asks for them. */
export function wizardRailKeys(): string[] {
  return WIZARD_STEPS.flatMap((s) => s.rails.map((r) => r.key));
}
