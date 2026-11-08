/**
 * Environment access, validated once at module load.
 *
 * Secrets are read through here rather than scattered `process.env` reads so a
 * missing key fails loudly at boot instead of silently at the moment a buyer
 * is trying to pay.
 */

function required(name: string, fallbackInDev?: string): string {
  const value = process.env[name];
  if (value && value.length > 0) return value;
  if (process.env.NODE_ENV !== 'production' && fallbackInDev !== undefined) {
    return fallbackInDev;
  }
  throw new Error(
    `Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`,
  );
}

function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

/** Lazily evaluated so importing this module never throws during a build. */
export const env = {
  get databaseUrl() {
    return required('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/methodepay');
  },
  /** 32-byte key, base64 or hex, used for AES-256-GCM of merchant secrets. */
  get encryptionKey() {
    return required(
      'ENCRYPTION_KEY',
      // Development-only placeholder. Never ships to production: `required`
      // refuses the fallback when NODE_ENV === "production".
      'ZGV2LW9ubHktaW5zZWN1cmUta2V5LTMyLWJ5dGVzIQ==',
    );
  },
  get sessionSecret() {
    return required('SESSION_SECRET', 'dev-only-session-secret-change-me');
  },
  get appUrl() {
    return optional('APP_URL', 'http://localhost:3000').replace(/\/$/, '');
  },
  get checkoutUrl() {
    // Hosted checkout may live on its own host (pay.methodepay.io).
    return optional('CHECKOUT_URL', optional('APP_URL', 'http://localhost:3000')).replace(/\/$/, '');
  },

  // --- platform billing (what merchants pay us) ---
  get platformStripeSecret() {
    return optional('PLATFORM_STRIPE_SECRET_KEY');
  },
  get platformStripeWebhookSecret() {
    return optional('PLATFORM_STRIPE_WEBHOOK_SECRET');
  },
  get stripePrices() {
    return {
      STARTER: {
        month: optional('STRIPE_PRICE_STARTER_MONTHLY'),
        year: optional('STRIPE_PRICE_STARTER_YEARLY'),
      },
      PROFESSIONAL: {
        month: optional('STRIPE_PRICE_PRO_MONTHLY'),
        year: optional('STRIPE_PRICE_PRO_YEARLY'),
      },
      AGENCY: {
        month: optional('STRIPE_PRICE_AGENCY_MONTHLY'),
        year: optional('STRIPE_PRICE_AGENCY_YEARLY'),
      },
    } as const;
  },

  // --- outbound email ---
  get smtp() {
    return {
      host: optional('SMTP_HOST'),
      port: Number(optional('SMTP_PORT', '587')),
      user: optional('SMTP_USER'),
      pass: optional('SMTP_PASS'),
      from: optional('SMTP_FROM', 'MethodePay <no-reply@methodepay.io>'),
      secure: optional('SMTP_SECURE', 'false') === 'true',
    };
  },

  get isProduction() {
    return process.env.NODE_ENV === 'production';
  },
};

/** True when platform billing is wired up; the UI degrades gracefully if not. */
export function billingConfigured(): boolean {
  return env.platformStripeSecret.length > 0;
}

export function emailConfigured(): boolean {
  return env.smtp.host.length > 0;
}
