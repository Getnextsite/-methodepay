import { createHash } from 'node:crypto';

/**
 * Pure helpers for on-chain verification: no network, no Next.js, so the
 * logic test suite can exercise them directly.
 */
export type ChainId = 'btc' | 'ltc' | 'eth' | 'bsc' | 'polygon' | 'tron';

/** Map a wallet's free-text coin and network to a chain, or null if unsure. */
export function chainOf(coin: string, network: string): ChainId | null {
  const n = ` ${network} `.toLowerCase();
  const c = coin.trim().toUpperCase();
  // Networks we cannot read yet. Never guess: ETH on Base is not ETH on Ethereum.
  if (/base|arbitrum|optimism|solana|\bsol\b|lightning|avax|avalanche|ton\b/.test(n) || c === 'SOL') return null;
  if (/trc|tron|\btrx\b/.test(n) || c === 'TRX') return 'tron';
  if (/bep|bsc|bnb/.test(n) || c === 'BNB') return 'bsc';
  if (/polygon|matic|\bpol\b/.test(n) || c === 'POL' || c === 'MATIC') return 'polygon';
  if (/erc|ethereum|\beth\b/.test(n) || c === 'ETH') return 'eth';
  if (/litecoin|\bltc\b/.test(n) || c === 'LTC') return 'ltc';
  if (/bitcoin|\bbtc\b|segwit|bech32/.test(n) || c === 'BTC') return 'btc';
  return null;
}

export function normalizeCoin(coin: string): string {
  const c = coin.trim().toUpperCase().replace(/[^A-Z]/g, '');
  if (c.startsWith('USDC')) return 'USDC';
  if (c.startsWith('USDT') || c === 'TETHER') return 'USDT';
  if (c === 'MATIC') return 'POL';
  return c;
}

export function cleanTxid(raw: string): string | null {
  const t = raw.trim().replace(/^0x/i, '').toLowerCase();
  return /^[0-9a-f]{64}$/.test(t) ? t : null;
}

// ---------------------------------------------------------------- base58 (TRON addresses)

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58(bytes: Buffer): string {
  let n = BigInt('0x' + (bytes.toString('hex') || '0'));
  let out = '';
  while (n > 0n) {
    out = B58[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of bytes) {
    if (b !== 0) break;
    out = '1' + out;
  }
  return out;
}

/** TRON hex address (41 + 20 bytes, or the bare 20 bytes) to base58check. */
export function tronAddress(hex: string): string {
  let h = hex.toLowerCase().replace(/^0x/, '');
  if (h.length === 40) h = '41' + h;
  const payload = Buffer.from(h, 'hex');
  const sha = (b: Buffer) => createHash('sha256').update(b).digest();
  const check = sha(sha(payload)).subarray(0, 4);
  return base58(Buffer.concat([payload, check]));
}


const NATIVE: Record<ChainId, string> = { btc: 'BTC', ltc: 'LTC', eth: 'ETH', bsc: 'BNB', polygon: 'POL', tron: 'TRX' };

/**
 * Whether a payment in this coin on this network can be verified on the
 * blockchain: the chain is readable AND the coin is either its native coin or
 * a stablecoin whose contract the verifier knows (USDT, USDC). BTC on BNB
 * Chain is readable but not verifiable, so it must not be promised as such.
 */
export function autoVerifiable(coin: string, network: string): boolean {
  const chain = chainOf(coin, network);
  if (!chain) return false;
  const c = normalizeCoin(coin);
  if (c === NATIVE[chain]) return true;
  if (chain === 'btc' || chain === 'ltc') return false;
  return c === 'USDT' || c === 'USDC';
}
