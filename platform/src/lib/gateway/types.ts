import type {
  Account,
  CheckoutProfile,
  ManualMethod,
  NotificationSettings,
  Order,
  PaymentMethodConfig,
  Product,
  Wallet,
} from '@prisma/client';

/** How the buyer reaches the money, once a rail is picked. */
export type FlowKind =
  /** Full-page redirect to a hosted page we created server-side. */
  | 'redirect'
  /** Embedded iframe on our own payment screen. */
  | 'iframe'
  /** Our own instructions screen: address, QR, memo, then buyer confirms. */
  | 'instructions'
  /** Hands off to a chat app (WhatsApp, Telegram) with a prefilled message. */
  | 'chat';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'url'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'secret';

export type ConfigField = {
  name: string;
  label: string;
  type: FieldType;
  /** Encrypted at rest and never returned to the browser in the clear. */
  secret?: boolean;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
  defaultValue?: string | number | boolean;
};

export type MethodGroup = 'card' | 'onramp' | 'crypto' | 'manual' | 'chat';

export type MethodDefinition = {
  key: string;
  defaultLabel: string;
  defaultDescription: string;
  group: MethodGroup;
  flow: FlowKind;
  /** Brand colour used for the method chip on checkout and in the dashboard. */
  tone: string;
  /** Lowest order total this rail will accept, in USD. */
  minUsd: number;
  /** Settles by itself (webhook/capture) vs needs a human to confirm. */
  settlement: 'automatic' | 'manual';
  fields: ConfigField[];
  /**
   * Whether the merchant has supplied enough to show this rail to a buyer.
   * Keys that are missing a wallet or a secret are configured but not live.
   */
  isReady: (config: MethodConfig) => boolean;
  /** Short line in the dashboard explaining what the merchant needs. */
  setupHint: string;
};

export type MethodConfig = Record<string, string | number | boolean | undefined>;

/** Everything the checkout and the gateway need, loaded once per request. */
export type MerchantContext = {
  account: Account;
  profile: CheckoutProfile;
  notifications: NotificationSettings;
  methods: PaymentMethodConfig[];
  manualMethods: ManualMethod[];
  wallets: Wallet[];
};

/** A rail as the buyer sees it. */
export type AvailableMethod = {
  key: string;
  label: string;
  description: string;
  group: MethodGroup;
  flow: FlowKind;
  tone: string;
  iconUrl: string | null;
  recommended: boolean;
  /** Manual rails carry their merchant-authored instructions. */
  manualSlot: number | null;
  requiresGiftCard: boolean;
  /** Set when the rail warns the buyer about identity checks up front. */
  kycNotice: string | null;
};

export type InitiateResult =
  | { kind: 'redirect'; url: string }
  | { kind: 'iframe'; url: string; height?: number }
  | { kind: 'instructions'; screen: string }
  | { kind: 'chat'; url: string }
  | { kind: 'error'; message: string };

export type InitiateInput = {
  order: Order;
  product: Product;
  ctx: MerchantContext;
  method: PaymentMethodConfig | null;
  manual: ManualMethod | null;
  config: MethodConfig;
  /** Absolute origin the buyer is on, for return URLs. */
  origin: string;
};
