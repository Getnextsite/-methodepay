import type { ConfigField, MethodConfig, MethodDefinition } from './types';

/**
 * Every payment rail the platform knows about.
 *
 * This is the port of the plugin providers() switchboard, with one change that
 * matters: the plugin kept rail settings in a single 200-key wp_options blob,
 * so adding a rail meant touching the global default array. Here each rail
 * declares its own fields, and the dashboard, the API validator and the
 * checkout renderer all read that declaration instead of hardcoding names.
 */

function has(config: MethodConfig, ...keys: string[]): boolean {
  return keys.every((k) => {
    const v = config[k];
    return v !== undefined && v !== null && String(v).trim() !== '';
  });
}

const walletField = (help: string): ConfigField => ({
  name: 'wallet',
  label: 'Payout wallet address',
  type: 'text',
  required: true,
  help,
});

const labelField: ConfigField = {
  name: 'label',
  label: 'Button label shown to buyers',
  type: 'text',
  placeholder: 'Leave blank for the default',
};

export const METHOD_DEFINITIONS: MethodDefinition[] = [
  // ----------------------------------------------------- processor rails
  {
    key: 'stripe',
    defaultLabel: 'Credit / Debit Card',
    defaultDescription:
      'Pay securely by card. You will be redirected to Stripe to complete payment.',
    group: 'card',
    flow: 'redirect',
    tone: '#8b83ff',
    minUsd: 1,
    settlement: 'automatic',
    setupHint: 'Needs your own Stripe secret key and webhook signing secret.',
    fields: [
      labelField,
      { name: 'publishableKey', label: 'Publishable key', type: 'text', placeholder: 'pk_live_...' },
      {
        name: 'secretKey',
        label: 'Secret key',
        type: 'secret',
        secret: true,
        required: true,
        placeholder: 'sk_live_...',
      },
      {
        name: 'webhookSecret',
        label: 'Webhook signing secret',
        type: 'secret',
        secret: true,
        help: 'From the Stripe endpoint you point at /api/webhooks/stripe. Without it, payments will not auto-confirm.',
      },
    ],
    isReady: (c) => has(c, 'secretKey'),
  },
  {
    key: 'paypal',
    defaultLabel: 'PayPal',
    defaultDescription: 'Pay with your PayPal account or card via PayPal.',
    group: 'card',
    flow: 'redirect',
    tone: '#4da3e8',
    minUsd: 1,
    settlement: 'automatic',
    setupHint: 'Needs a PayPal REST app client ID and secret.',
    fields: [
      labelField,
      { name: 'clientId', label: 'Client ID', type: 'text', required: true },
      { name: 'clientSecret', label: 'Secret', type: 'secret', secret: true, required: true },
      { name: 'sandbox', label: 'Use the PayPal sandbox', type: 'checkbox' },
    ],
    isReady: (c) => has(c, 'clientId', 'clientSecret'),
  },
  {
    key: 'alchemypay',
    defaultLabel: 'Card / Bank (Alchemy Pay)',
    defaultDescription: 'Pay by card, bank transfer or local wallet — 170+ countries.',
    group: 'onramp',
    flow: 'iframe',
    tone: '#00d4b1',
    minUsd: 1,
    settlement: 'automatic',
    setupHint: 'Needs an Alchemy Pay app ID and secret, plus a payout address.',
    fields: [
      labelField,
      { name: 'appId', label: 'App ID', type: 'text', required: true },
      { name: 'appSecret', label: 'App secret', type: 'secret', secret: true, required: true },
      {
        name: 'crypto',
        label: 'Settlement coin',
        type: 'select',
        defaultValue: 'USDT',
        options: [
          { value: 'USDT', label: 'USDT' },
          { value: 'USDC', label: 'USDC' },
          { value: 'BTC', label: 'BTC' },
          { value: 'ETH', label: 'ETH' },
        ],
      },
      { name: 'network', label: 'Network', type: 'text', defaultValue: 'TRX', placeholder: 'TRX, ETH, POLYGON' },
      walletField('Where Alchemy Pay settles your funds.'),
      { name: 'test', label: 'Sandbox mode', type: 'checkbox' },
    ],
    isReady: (c) => has(c, 'appId', 'appSecret', 'wallet'),
  },

  // ----------------------------------------------------- on-ramp rails
  {
    key: 'onramppay',
    defaultLabel: 'Cards / Bank / Crypto',
    defaultDescription: 'Pay by card, bank transfer, or crypto. Settles to USDC.',
    group: 'onramp',
    flow: 'redirect',
    tone: '#7c5cff',
    minUsd: 30,
    settlement: 'automatic',
    setupHint: 'Needs a payout wallet. Aggregates 20+ on-ramps behind one button.',
    fields: [
      labelField,
      walletField('USDC payout address, normally on Polygon.'),
      {
        name: 'domain',
        label: 'Checkout domain',
        type: 'text',
        defaultValue: 'checkout.onramp-pay.com',
      },
      {
        name: 'apiDomain',
        label: 'API domain',
        type: 'text',
        defaultValue: 'api.onramp-pay.com',
      },
      {
        name: 'providers',
        label: 'Enabled on-ramps',
        type: 'text',
        placeholder: 'moonpay, banxa, transak',
        help: 'Comma-separated. Leave blank to let OnRamPay choose.',
      },
    ],
    isReady: (c) => has(c, 'wallet'),
  },
  // The plugin promoted four OnRamPay sub-providers to first-class buttons
  // because "Cards / Bank / Crypto" tested badly against a Binance logo.
  ...(
    [
      ['op_cashapp', 'Cash App', 'cashapp', 'Pay with Cash App via Transak.', '#00d632'],
      ['op_binance', 'Binance Pay', 'binance', 'Pay with your Binance balance or Binance Pay.', '#f0b90b'],
      ['op_revolut', 'Revolut', 'revolut', 'Pay instantly with your Revolut account.', '#0075eb'],
      ['op_upi', 'UPI', 'upi', 'Pay by UPI — Google Pay, PhonePe, Paytm and more.', '#ff7a00'],
      ['op_paypalus', 'PayPal (USA)', 'paypal', 'Pay with your US PayPal account.', '#003087'],
    ] as const
  ).map<MethodDefinition>(([key, label, tag, desc, tone]) => ({
    key,
    defaultLabel: label,
    defaultDescription: desc,
    group: 'onramp',
    flow: 'redirect',
    tone,
    minUsd: 1,
    settlement: 'automatic',
    setupHint: `Routes through OnRamPay locked to ${label}. Falls back to the shared OnRamPay wallet if you leave the wallet blank.`,
    fields: [
      labelField,
      { name: 'wallet', label: 'Payout wallet address', type: 'text', help: 'Blank uses the shared OnRamPay wallet.' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'showQr', label: 'Show a QR code', type: 'checkbox' },
      { name: 'onrampTag', label: 'OnRamPay provider tag', type: 'text', defaultValue: tag },
    ],
    // Readiness is resolved against the shared OnRamPay wallet too; see
    // resolveMethods(), which is the only caller that can see both configs.
    isReady: () => true,
  })),
  {
    key: 'finchpay_btc',
    defaultLabel: 'Visa / Mastercard',
    defaultDescription:
      'Pay by card in 150+ countries. Settles to your Bitcoin address.',
    group: 'onramp',
    flow: 'instructions',
    tone: '#f7931a',
    minUsd: 1,
    settlement: 'manual',
    setupHint: 'Needs only a self-custodial BTC address. No account, no business registration.',
    fields: [
      labelField,
      walletField('A self-custodial BTC receive address. Do not use an exchange deposit address.'),
      {
        name: 'blockedCountries',
        label: 'Blocked countries',
        type: 'text',
        defaultValue: 'US',
        help: 'Comma-separated ISO codes hidden from this rail.',
      },
    ],
    isReady: (c) => has(c, 'wallet'),
  },

  // ----------------------------------------------------- crypto
  {
    key: 'crypto',
    defaultLabel: 'Pay with Crypto',
    defaultDescription:
      'Direct transfer — BTC, USDT, USDC, LTC and more. Send from your own wallet.',
    group: 'crypto',
    flow: 'instructions',
    tone: '#f7931a',
    minUsd: 1,
    settlement: 'manual',
    setupHint: 'Add at least one wallet address under Wallets.',
    fields: [
      labelField,
      { name: 'timerMinutes', label: 'Quote validity (minutes)', type: 'number', defaultValue: 15 },
      { name: 'instructions', label: 'Instructions shown to buyers', type: 'textarea' },
    ],
    // Readiness depends on the Wallets table, resolved in resolveMethods().
    isReady: () => true,
  },
  {
    key: 'bc_paypal',
    defaultLabel: 'BTC via PayPal',
    defaultDescription: 'Buy crypto inside PayPal, then send it to us. Guided steps and video.',
    group: 'crypto',
    flow: 'instructions',
    tone: '#003087',
    minUsd: 1,
    settlement: 'manual',
    setupHint: 'Needs a receive address and, ideally, a walkthrough video.',
    fields: [
      labelField,
      { name: 'coin', label: 'Coin', type: 'text', defaultValue: 'BTC' },
      { name: 'network', label: 'Network', type: 'text', defaultValue: 'Bitcoin' },
      walletField('Where the buyer sends the crypto they bought.'),
      { name: 'videoUrl', label: 'Tutorial video URL', type: 'url' },
      { name: 'instructions', label: 'Instructions', type: 'textarea' },
    ],
    isReady: (c) => has(c, 'wallet'),
  },
  {
    key: 'bc_cashapp',
    defaultLabel: 'BTC via Cash App',
    defaultDescription: 'Buy Bitcoin inside Cash App, then send it to us. Guided steps and video.',
    group: 'crypto',
    flow: 'instructions',
    tone: '#00d632',
    minUsd: 1,
    settlement: 'manual',
    setupHint: 'Needs a receive address and, ideally, a walkthrough video.',
    fields: [
      labelField,
      { name: 'coin', label: 'Coin', type: 'text', defaultValue: 'BTC' },
      { name: 'network', label: 'Network', type: 'text', defaultValue: 'Bitcoin' },
      walletField('Where the buyer sends the Bitcoin they bought.'),
      { name: 'videoUrl', label: 'Tutorial video URL', type: 'url' },
      { name: 'instructions', label: 'Instructions', type: 'textarea' },
    ],
    isReady: (c) => has(c, 'wallet'),
  },

  // ----------------------------------------------------- chat and manual
  {
    key: 'whatsapp',
    defaultLabel: 'Pay via WhatsApp',
    defaultDescription:
      'Message us on WhatsApp to complete payment. Your order details are sent automatically.',
    group: 'chat',
    flow: 'chat',
    tone: '#25d366',
    minUsd: 1,
    settlement: 'manual',
    setupHint: 'Needs the WhatsApp number buyers should message.',
    fields: [
      labelField,
      {
        name: 'number',
        label: 'WhatsApp number',
        type: 'text',
        required: true,
        placeholder: '212600000000',
        help: 'Digits only, including the country code.',
      },
      {
        name: 'messageTemplate',
        label: 'Prefilled message',
        type: 'textarea',
        help: 'Placeholders: {order_ref} {product_name} {amount} {currency} {buyer_name} {buyer_email}',
      },
      { name: 'instructions', label: 'On-screen instructions', type: 'textarea' },
    ],
    isReady: (c) => has(c, 'number'),
  },
  {
    key: 'western_union',
    defaultLabel: 'Western Union',
    defaultDescription: 'Send cash via Western Union. Submit your MTCN to confirm.',
    group: 'manual',
    flow: 'instructions',
    tone: '#ffd400',
    minUsd: 1,
    settlement: 'manual',
    setupHint: 'Needs the receiver name, city and country.',
    fields: [
      labelField,
      { name: 'firstName', label: 'Receiver first name', type: 'text', required: true },
      { name: 'lastName', label: 'Receiver last name', type: 'text', required: true },
      { name: 'country', label: 'Receiver country', type: 'text', required: true },
      { name: 'city', label: 'Receiver city', type: 'text' },
      { name: 'instructions', label: 'Instructions', type: 'textarea' },
    ],
    isReady: (c) => has(c, 'firstName', 'lastName', 'country'),
  },
  {
    key: 'bank_transfer',
    defaultLabel: 'Bank Transfer (Wire / SEPA)',
    defaultDescription: 'Pay by bank wire or SEPA. Quote the reference in the transfer memo.',
    group: 'manual',
    flow: 'instructions',
    tone: '#8aa2ff',
    minUsd: 1,
    settlement: 'manual',
    setupHint: 'Needs the account holder and an IBAN or local account number.',
    fields: [
      labelField,
      { name: 'holderName', label: 'Account holder', type: 'text', required: true },
      { name: 'iban', label: 'IBAN / account number', type: 'text', required: true },
      { name: 'swift', label: 'SWIFT / BIC', type: 'text' },
      { name: 'bankName', label: 'Bank name', type: 'text' },
      { name: 'referencePrefix', label: 'Reference prefix', type: 'text', defaultValue: 'ORD-' },
      { name: 'instructions', label: 'Instructions', type: 'textarea' },
    ],
    isReady: (c) => has(c, 'holderName', 'iban'),
  },
  {
    key: 'paypal_ff',
    defaultLabel: 'PayPal',
    defaultDescription: 'Pay via PayPal, then paste your transaction ID to confirm.',
    group: 'manual',
    flow: 'instructions',
    tone: '#4da3e8',
    minUsd: 1,
    settlement: 'manual',
    setupHint: 'A manual rail: you verify each payment by hand in your PayPal account.',
    fields: [
      labelField,
      { name: 'instructions', label: 'Instructions', type: 'textarea', required: true },
      { name: 'buttonUrl', label: 'PayPal link', type: 'url' },
      { name: 'buttonLabel', label: 'Button label', type: 'text', defaultValue: 'Pay on PayPal' },
    ],
    isReady: (c) => has(c, 'instructions'),
  },
  {
    key: 'amazon_giftcard',
    defaultLabel: 'Amazon eGift Card',
    defaultDescription: 'Submit a 16-character gift-card code for manual verification.',
    group: 'manual',
    flow: 'instructions',
    tone: '#ff9900',
    minUsd: 1,
    settlement: 'manual',
    setupHint:
      'Codes are encrypted, shown only to order managers, and erased when you mark the order paid. Nothing is redeemed automatically.',
    fields: [
      labelField,
      { name: 'purchaseUrl', label: 'Amazon purchase link', type: 'url' },
      { name: 'buttonLabel', label: 'Button label', type: 'text', defaultValue: 'Buy the gift card' },
      { name: 'instructions', label: 'Instructions', type: 'textarea' },
      {
        name: 'collectCountry',
        label: 'Ask which Amazon region the card is for',
        type: 'checkbox',
        defaultValue: true,
      },
    ],
    isReady: () => true,
  },
];

export const METHODS_BY_KEY: Record<string, MethodDefinition> = Object.fromEntries(
  METHOD_DEFINITIONS.map((m) => [m.key, m]),
);

export function methodDefinition(key: string): MethodDefinition | null {
  return METHODS_BY_KEY[key] ?? null;
}

/** Field names that must be encrypted before they touch the database. */
export function secretFieldNames(key: string): string[] {
  return (METHODS_BY_KEY[key]?.fields ?? []).filter((f) => f.secret).map((f) => f.name);
}

/** Defaults for a rail the merchant has not configured yet. */
export function defaultConfig(key: string): MethodConfig {
  const def = METHODS_BY_KEY[key];
  if (!def) return {};
  const out: MethodConfig = {};
  for (const field of def.fields) {
    if (field.defaultValue !== undefined) out[field.name] = field.defaultValue;
  }
  return out;
}
