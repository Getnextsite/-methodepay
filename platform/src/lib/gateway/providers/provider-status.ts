import 'server-only';
import { ONRAMP_API_HOST } from '../onramp-hosts';

/**
 * Which on-ramps are live right now, and what each one will accept.
 *
 * This used to be a table hardcoded from the provider's documentation, and it
 * had rotted badly: `interac` was listed at $1 when the real floor is CAD 100,
 * `paypal` at $70 when it is $5, and nine of the names no longer existed at
 * all. A wrong minimum fails in both directions — too low lets a buyer reach a
 * payment page that must reject them, too high hides a rail that would have
 * worked — and neither is visible from our side.
 *
 * So it is read from the upstream instead. The static table below is only a
 * cold-start fallback for when that call fails; it is a snapshot, not a
 * source of truth.
 *
 * Minimums are not all quoted in USD. Revolut is EUR, Interac is CAD, and
 * comparing those against a dollar total silently misprices the gate, so the
 * currency travels with the number and is converted before any comparison.
 */

export type OnrampProvider = {
  id: string;
  name: string;
  active: boolean;
  minimum: number;
  minimumCurrency: string;
};

type Cache = { at: number; providers: Map<string, OnrampProvider> };

let cache: Cache | null = null;

/** Long enough that a checkout burst is one call, short enough to track an outage. */
const TTL_MS = 10 * 60 * 1000;

/**
 * Snapshot taken from the live endpoint on 2026-11-21. Used only when the
 * upstream is unreachable, so that a network blip degrades to slightly stale
 * limits rather than to no on-ramp at all.
 */
const FALLBACK: Record<string, { min: number; cur: string }> = {
  stripe: { min: 2, cur: 'USD' },
  creditcard: { min: 6, cur: 'USD' },
  coinbase: { min: 2, cur: 'USD' },
  alchemypay: { min: 15, cur: 'USD' },
  paypal: { min: 5, cur: 'USD' },
  robinhood: { min: 5, cur: 'USD' },
  revolut: { min: 6, cur: 'EUR' },
  meld: { min: 30, cur: 'USD' },
  rampnow: { min: 6, cur: 'USD' },
  topper: { min: 10, cur: 'USD' },
  googlepay: { min: 10, cur: 'USD' },
  applepay: { min: 10, cur: 'USD' },
  binance: { min: 20, cur: 'USD' },
  banxa: { min: 11, cur: 'USD' },
  blockchaincom: { min: 20, cur: 'USD' },
  particle: { min: 30, cur: 'USD' },
  cashapp: { min: 2, cur: 'USD' },
  alipay: { min: 5, cur: 'USD' },
  wechat: { min: 5, cur: 'USD' },
  venmo: { min: 2, cur: 'USD' },
  sardine: { min: 30, cur: 'USD' },
  interac: { min: 100, cur: 'CAD' },
};

function fromFallback(): Map<string, OnrampProvider> {
  return new Map(
    Object.entries(FALLBACK).map(([id, v]) => [
      id,
      { id, name: id, active: true, minimum: v.min, minimumCurrency: v.cur },
    ]),
  );
}

async function load(): Promise<Map<string, OnrampProvider>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.providers;

  try {
    const res = await fetch(`https://${ONRAMP_API_HOST}/control/provider-status/`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);

    const body = (await res.json()) as { providers?: unknown };
    const rows = Array.isArray(body.providers) ? body.providers : [];
    const map = new Map<string, OnrampProvider>();

    for (const row of rows as Record<string, unknown>[]) {
      const id = String(row.id ?? '').trim();
      if (!id) continue;
      const minimum = Number(row.minimum_amount);
      map.set(id, {
        id,
        name: String(row.provider_name ?? id),
        active: String(row.status ?? '') === 'active',
        minimum: Number.isFinite(minimum) ? minimum : 0,
        minimumCurrency: String(row.minimum_currency ?? 'USD').toUpperCase(),
      });
    }

    if (map.size === 0) throw new Error('empty provider list');
    cache = { at: Date.now(), providers: map };
    return map;
  } catch (error) {
    console.error('[onramp] provider status unavailable, using fallback', error);
    // Cached as a short negative result so a sustained outage does not mean a
    // fetch on every single checkout.
    cache = { at: Date.now() - TTL_MS / 2, providers: fromFallback() };
    return cache.providers;
  }
}

export async function onrampProvider(tag: string): Promise<OnrampProvider | null> {
  return (await load()).get(tag) ?? null;
}

/**
 * A rail whose provider the upstream no longer lists cannot take a payment.
 * `upi` was exactly this: a first-class button on the checkout sending a
 * provider id that had been retired, so every buyer who picked it reached a
 * dead end.
 */
export async function isOnrampProviderLive(tag: string): Promise<boolean> {
  const provider = await onrampProvider(tag);
  return provider !== null && provider.active;
}

/**
 * The provider floor expressed in USD, which is the only currency the order
 * total has been normalised to by the time this is checked.
 */
export async function onrampMinimumUsd(
  tag: string,
  convertToUsd: (value: number, currency: string) => Promise<number | null>,
): Promise<number | null> {
  const provider = await onrampProvider(tag);
  if (!provider || provider.minimum <= 0) return null;
  if (provider.minimumCurrency === 'USD') return provider.minimum;

  const usd = await convertToUsd(provider.minimum, provider.minimumCurrency);
  // Refusing to guess: an unconvertible floor means no gate rather than a
  // gate at the wrong number in the wrong currency.
  return usd === null ? null : Math.ceil(usd * 100) / 100;
}
