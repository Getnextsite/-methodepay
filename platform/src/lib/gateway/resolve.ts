import 'server-only';
import type { Product } from '@prisma/client';
import { canUseMethod, entitlementsFor } from '../entitlements';
import { readConfig } from './config';
import { METHOD_DEFINITIONS, methodDefinition } from './registry';
import type { AvailableMethod, MerchantContext, MethodConfig } from './types';

/**
 * Which rails a given buyer, on a given product, actually sees.
 *
 * Four filters stack, and the order matters:
 *   1. the merchant switched it on,
 *   2. the configuration is complete enough to take money,
 *   3. the plan allows it,
 *   4. the order and the buyer qualify (minimum, blocked country).
 *
 * The plugin only ever checked 1, 2 and 4, because a self-hosted plugin cannot
 * meaningfully enforce 3. Hosted, 3 is the business model, so it is enforced
 * here — the one code path every checkout render goes through — rather than in
 * the dashboard that draws the toggle.
 */
export function resolveMethods(
  ctx: MerchantContext,
  product: Product,
  opts: { buyerCountry?: string | null } = {},
): AvailableMethod[] {
  const ent = entitlementsFor(ctx.account);
  const byKey = new Map(ctx.methods.map((m) => [m.key, m]));
  const totalUsd = product.priceCents / 100;
  const country = (opts.buyerCountry ?? '').toUpperCase();
  const kycMethods = asStringArray(ctx.profile.kycNoticeMethods);
  const out: AvailableMethod[] = [];

  // The shared OnRamPay wallet backstops the promoted sub-provider buttons.
  const sharedOnrampWallet = String(readConfig(byKey.get('onramppay') ?? null, 'onramppay').wallet ?? '');

  for (const def of METHOD_DEFINITIONS) {
    const row = byKey.get(def.key) ?? null;
    if (!row?.enabled) continue;
    if (!canUseMethod(ent, def.key)) continue;

    const config = readConfig(row, def.key);
    if (!isLive(def.key, config, ctx, sharedOnrampWallet)) continue;
    if (totalUsd < def.minUsd) continue;
    if (isBlockedCountry(config, country)) continue;

    out.push({
      key: def.key,
      label: row.label?.trim() || def.defaultLabel,
      description: row.description?.trim() || String(config.description ?? '') || def.defaultDescription,
      group: def.group,
      flow: def.flow,
      tone: def.tone,
      iconUrl: row.iconUrl ?? null,
      // WhatsApp led the plugin list because, where WhatsApp is the shop, it
      // converts better than any card form. Keep that nudge.
      recommended: def.key === 'whatsapp',
      manualSlot: null,
      requiresGiftCard: def.key === 'amazon_giftcard',
      kycNotice:
        ctx.profile.kycNoticeEnabled && kycMethods.includes(def.key)
          ? ctx.profile.kycNoticeText ?? null
          : null,
    });
  }

  // Merchant-defined rails (M-Pesa, PIX, Orange Money, a local POS).
  for (const manual of ctx.manualMethods) {
    if (!manual.enabled || !manual.name.trim()) continue;
    if (!canUseMethod(ent, `manual_${manual.slot}`)) continue;
    out.push({
      key: `manual_${manual.slot}`,
      label: manual.name.trim(),
      description: stripTags(manual.instructions ?? '').slice(0, 160),
      group: 'manual',
      flow: 'instructions',
      tone: '#00d632',
      iconUrl: manual.iconUrl ?? null,
      recommended: false,
      manualSlot: manual.slot,
      requiresGiftCard: manual.requiresGiftCard,
      kycNotice: null,
    });
  }

  // Recommended first, then by the merchant ordering, then group.
  const order = new Map(ctx.methods.map((m) => [m.key, m.sortOrder]));
  return out.sort((a, b) => {
    if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
    const ao = order.get(a.key) ?? 500;
    const bo = order.get(b.key) ?? 500;
    if (ao !== bo) return ao - bo;
    return a.label.localeCompare(b.label);
  });
}

/**
 * Configured is not the same as live. A rail with a toggle on but no wallet
 * would send a buyer to a dead end, which is worse than not offering it.
 */
function isLive(
  key: string,
  config: MethodConfig,
  ctx: MerchantContext,
  sharedOnrampWallet: string,
): boolean {
  const def = methodDefinition(key);
  if (!def) return false;

  // Direct crypto needs at least one wallet row, not a config field.
  if (key === 'crypto') return ctx.wallets.length > 0;

  // Promoted OnRamPay buttons may borrow the shared wallet.
  if (key.startsWith('op_')) {
    return String(config.wallet ?? '').trim() !== '' || sharedOnrampWallet.trim() !== '';
  }

  return def.isReady(config);
}

function isBlockedCountry(config: MethodConfig, country: string): boolean {
  if (!country) return false;
  const blocked = String(config.blockedCountries ?? '')
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  return blocked.includes(country);
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

export function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Rails the merchant has touched but that are not live yet, for the dashboard. */
export function incompleteMethods(ctx: MerchantContext): { key: string; label: string; hint: string }[] {
  const sharedOnrampWallet = String(readConfig(
    ctx.methods.find((m) => m.key === 'onramppay') ?? null,
    'onramppay',
  ).wallet ?? '');

  return ctx.methods
    .filter((row) => row.enabled)
    .map((row) => {
      const def = methodDefinition(row.key);
      if (!def) return null;
      const config = readConfig(row, row.key);
      if (isLive(row.key, config, ctx, sharedOnrampWallet)) return null;
      return {
        key: row.key,
        label: row.label?.trim() || def.defaultLabel,
        hint: def.setupHint,
      };
    })
    .filter((v): v is { key: string; label: string; hint: string } => v !== null);
}
