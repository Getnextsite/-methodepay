import 'server-only';
import type { Product } from '@prisma/client';
import { prisma } from './db';
import { readConfig } from './gateway/config';
import type { MerchantContext } from './gateway/types';

/**
 * Shipping and stock for physical goods.
 *
 * Rates live on a `shipping` pseudo-rail in PaymentMethodConfig rather than a
 * table of their own: it is a handful of settings, and reusing the config row
 * keeps one upsert path instead of two.
 */

export type ShippingQuote = {
  amountCents: number;
  label: string;
  free: boolean;
};

function parseCountryRates(raw: string): Record<string, number> {
  // "US:500, FR:750, *:1200" — one line, pasted, forgiving about spaces.
  const out: Record<string, number> = {};
  for (const part of raw.split(/[,\n]/)) {
    const [code, value] = part.split(':');
    if (!code || value === undefined) continue;
    const cents = Math.round(Number(value.trim()) * 100);
    if (!Number.isFinite(cents)) continue;
    out[code.trim().toUpperCase()] = cents;
  }
  return out;
}

export async function quoteShipping(
  ctx: MerchantContext,
  product: Product,
  opts: { country?: string | null; subtotalCents: number },
): Promise<ShippingQuote> {
  if (!product.requiresShipping) return { amountCents: 0, label: '', free: false };

  const row = ctx.methods.find((m) => m.key === 'shipping') ?? null;
  if (!row?.enabled) return { amountCents: 0, label: '', free: false };

  const config = readConfig(row, 'shipping');
  const flatCents = Math.round(Number(config.flatRate ?? 0) * 100);
  const freeOverCents = Math.round(Number(config.freeOver ?? 0) * 100);
  const rates = parseCountryRates(String(config.countryRates ?? ''));
  const country = (opts.country ?? '').toUpperCase();

  if (freeOverCents > 0 && opts.subtotalCents >= freeOverCents) {
    return {
      amountCents: 0,
      label: String(config.freeLabel ?? 'Free shipping'),
      free: true,
    };
  }

  const amountCents = rates[country] ?? rates['*'] ?? flatCents;
  return {
    amountCents: Math.max(0, amountCents),
    label: String(config.label ?? 'Shipping'),
    free: amountCents === 0,
  };
}

export function inStock(product: Product, qty = 1): boolean {
  if (!product.manageStock) return true;
  return product.stock >= qty;
}

export const LOW_STOCK_THRESHOLD = 3;

/**
 * Take stock and report whether the product has crossed into "nearly gone".
 * The caller decides whether to alert; a stock warning must never be able to
 * fail the sale that triggered it.
 */
export async function reduceStock(
  product: Product,
  qty = 1,
): Promise<{ remaining: number; low: boolean } | null> {
  if (!product.manageStock) return null;
  const updated = await prisma.product
    .update({ where: { id: product.id }, data: { stock: { decrement: qty } } })
    .catch(() => null);
  if (!updated) return null;
  return { remaining: updated.stock, low: updated.stock <= LOW_STOCK_THRESHOLD };
}

export async function restoreStock(product: Product, qty = 1): Promise<void> {
  if (!product.manageStock) return;
  await prisma.product
    .update({ where: { id: product.id }, data: { stock: { increment: qty } } })
    .catch(() => {});
}

export const CARRIERS = [
  { value: 'dhl', label: 'DHL', url: 'https://www.dhl.com/en/express/tracking.html?AWB={n}' },
  { value: 'ups', label: 'UPS', url: 'https://www.ups.com/track?tracknum={n}' },
  { value: 'fedex', label: 'FedEx', url: 'https://www.fedex.com/fedextrack/?trknbr={n}' },
  { value: 'usps', label: 'USPS', url: 'https://tools.usps.com/go/TrackConfirmAction?tLabels={n}' },
  { value: 'royalmail', label: 'Royal Mail', url: 'https://www.royalmail.com/track-your-item#/tracking-results/{n}' },
  { value: 'other', label: 'Other', url: '' },
] as const;

export function trackingUrl(carrier: string | null, number: string | null): string | null {
  if (!carrier || !number) return null;
  const match = CARRIERS.find((c) => c.value === carrier);
  if (!match?.url) return null;
  return match.url.replace('{n}', encodeURIComponent(number));
}
