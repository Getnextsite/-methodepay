/**
 * Money is integer minor units everywhere.
 *
 * The plugin carried DECIMAL(18,2) through PHP floats, which is survivable in
 * one language and a bug factory across a JSON API. Cents in, cents out;
 * formatting happens only at the edge.
 */

export const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'JPY',
  'INR',
  'NGN',
  'KES',
  'ZAR',
  'BRL',
  'MAD',
  'AED',
] as const;

export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

/** Currencies with no minor unit. Stripe and most rails treat these as whole. */
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'CLP', 'XAF', 'XOF']);

export function sanitizeCurrency(value: unknown): Currency {
  const code = String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(code)
    ? (code as Currency)
    : 'USD';
}

export function minorUnits(currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? 1 : 100;
}

/** "19.99" | 19.99 | "19,99" -> 1999 */
export function toCents(value: unknown, currency = 'USD'): number {
  const raw = String(value ?? '0').trim().replace(/\s/g, '').replace(',', '.');
  const num = Number.parseFloat(raw);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.round(num * minorUnits(currency));
}

/** 1999 -> "19.99" (plain, for form inputs) */
export function fromCents(cents: number, currency = 'USD'): string {
  const unit = minorUnits(currency);
  if (unit === 1) return String(Math.round(cents));
  return (cents / unit).toFixed(2);
}

export function formatMoney(cents: number, currency = 'USD', locale = 'en-US'): string {
  const unit = minorUnits(currency);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: unit === 1 ? 0 : 2,
      maximumFractionDigits: unit === 1 ? 0 : 2,
    }).format(cents / unit);
  } catch {
    return `${(cents / unit).toFixed(unit === 1 ? 0 : 2)} ${currency}`;
  }
}

/** Amount as a decimal string, for rails that want "12.50" in a query param. */
export function decimalString(cents: number, currency = 'USD'): string {
  return fromCents(cents, currency);
}

export type OrderTotals = {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
};

export function computeTotals(input: {
  subtotalCents: number;
  discountCents?: number;
  shippingCents?: number;
}): OrderTotals {
  const subtotal = Math.max(0, Math.round(input.subtotalCents));
  const discount = Math.min(subtotal, Math.max(0, Math.round(input.discountCents ?? 0)));
  const shipping = Math.max(0, Math.round(input.shippingCents ?? 0));
  return {
    subtotalCents: subtotal,
    discountCents: discount,
    shippingCents: shipping,
    totalCents: subtotal - discount + shipping,
  };
}
