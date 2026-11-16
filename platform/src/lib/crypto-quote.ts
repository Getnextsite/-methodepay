import 'server-only';
import { coinInfo } from './crypto-catalog';

/**
 * Live prices for the checkout quote, in one request for every coin a store
 * accepts, cached for a minute per server instance so a busy checkout does
 * not hit the price feed's rate limit.
 *
 * The quote is a convenience for the buyer ("send 0.00048 BTC"). Automatic
 * verification prices the payment again when it arrives, with tolerance, so
 * a stale quote can never mark an underpaid order as paid.
 */

const GECKO: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  LTC: 'litecoin',
  TRX: 'tron',
  BNB: 'binancecoin',
  SOL: 'solana',
  TON: 'the-open-network',
  DOGE: 'dogecoin',
  XRP: 'ripple',
  POL: 'polygon-ecosystem-token',
  USDT: 'tether',
  USDC: 'usd-coin',
  DAI: 'dai',
};

const cache = new Map<string, { at: number; prices: Record<string, number> }>();
const TTL_MS = 60_000;

export async function quotePrices(symbols: string[], currency: string): Promise<Record<string, number>> {
  const cur = currency.trim().toLowerCase();
  const out: Record<string, number> = {};
  const wanted = [...new Set(symbols.map((s) => s.toUpperCase()))];

  // Dollar stablecoins are worth a dollar; no request needed for a USD store.
  for (const s of wanted) if (cur === 'usd' && coinInfo(s)?.stable) out[s] = 1;
  const missing = wanted.filter((s) => out[s] === undefined && GECKO[s]);
  if (missing.length === 0) return out;

  const key = `${cur}:${missing.sort().join(',')}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return { ...hit.prices, ...out };

  try {
    const ids = missing.map((s) => GECKO[s]).join(',');
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${encodeURIComponent(cur)}`,
      { cache: 'no-store', signal: AbortSignal.timeout(3_500) },
    );
    if (!res.ok) return out;
    const json = (await res.json()) as Record<string, Record<string, number>>;
    const prices: Record<string, number> = {};
    for (const s of missing) {
      const p = json[GECKO[s]]?.[cur];
      if (typeof p === 'number' && p > 0) prices[s] = p;
    }
    cache.set(key, { at: Date.now(), prices });
    return { ...prices, ...out };
  } catch {
    // No quote is fine: the buyer is shown the fiat amount to send instead.
    return out;
  }
}
