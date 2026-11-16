/**
 * The coins and networks merchants can accept, with what buyers need to know
 * about each. Pure data, shared by the Wallets screen and the checkout.
 *
 * Address patterns catch the most expensive mistake there is: a TRON address
 * saved under Ethereum, or a Bitcoin address under Litecoin. Funds sent there
 * are gone, so the dashboard refuses an address that cannot belong to the
 * network it is saved under.
 */

export type NetworkInfo = {
  /** Stored on the wallet row. */
  id: string;
  /** What buyers see: "Tron (TRC-20)". */
  label: string;
  /** One line on fees or speed. */
  hint: string;
  pattern?: RegExp;
  /** What the address should look like, for the error message. */
  format?: string;
};

export type CoinInfo = {
  symbol: string;
  name: string;
  /** Brand colour for the coin badge. */
  color: string;
  /** One character for the badge. */
  glyph: string;
  /** Decimals shown in the amount to send. */
  decimals: number;
  stable: boolean;
  networks: NetworkInfo[];
};

const EVM = /^0x[0-9a-fA-F]{40}$/;
const EVM_FORMAT = '0x followed by 40 hex characters';
const TRON = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const TRON_FORMAT = 'a 34-character address starting with T';
const SOLANA = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SOLANA_FORMAT = 'a 32 to 44 character base58 address';
const TON = /^(EQ|UQ|kQ|0Q)[A-Za-z0-9_-]{46}$/;
const TON_FORMAT = 'a 48-character address starting with EQ or UQ';

const evm = (id: string, label: string, hint: string): NetworkInfo => ({ id, label, hint, pattern: EVM, format: EVM_FORMAT });

export const CRYPTO_CATALOG: CoinInfo[] = [
  {
    symbol: 'USDT',
    glyph: '₮',
    name: 'Tether',
    color: '#26A17B',
    decimals: 2,
    stable: true,
    networks: [
      { id: 'TRC20', label: 'Tron (TRC-20)', hint: 'Lowest fees, about a minute', pattern: TRON, format: TRON_FORMAT },
      evm('BEP20', 'BNB Smart Chain (BEP-20)', 'Low fees, under a minute'),
      evm('ERC20', 'Ethereum (ERC-20)', 'Higher fees, a few minutes'),
      evm('Polygon', 'Polygon', 'Very low fees'),
      { id: 'Solana', label: 'Solana (SPL)', hint: 'Very low fees, seconds', pattern: SOLANA, format: SOLANA_FORMAT },
      { id: 'TON', label: 'TON', hint: 'Low fees', pattern: TON, format: TON_FORMAT },
      evm('Arbitrum', 'Arbitrum One', 'Low fees'),
    ],
  },
  {
    symbol: 'USDC',
    glyph: '$',
    name: 'USD Coin',
    color: '#2775CA',
    decimals: 2,
    stable: true,
    networks: [
      evm('ERC20', 'Ethereum (ERC-20)', 'Higher fees, a few minutes'),
      evm('Polygon', 'Polygon', 'Very low fees'),
      evm('BEP20', 'BNB Smart Chain (BEP-20)', 'Low fees'),
      evm('Base', 'Base', 'Very low fees'),
      evm('Arbitrum', 'Arbitrum One', 'Low fees'),
      { id: 'Solana', label: 'Solana (SPL)', hint: 'Very low fees, seconds', pattern: SOLANA, format: SOLANA_FORMAT },
      { id: 'TRC20', label: 'Tron (TRC-20)', hint: 'Low fees', pattern: TRON, format: TRON_FORMAT },
    ],
  },
  {
    symbol: 'BTC',
    glyph: '₿',
    name: 'Bitcoin',
    color: '#F7931A',
    decimals: 8,
    stable: false,
    networks: [
      {
        id: 'Bitcoin',
        label: 'Bitcoin',
        hint: 'About 10 to 30 minutes',
        pattern: /^(bc1[02-9ac-hj-np-z]{11,71}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$/,
        format: 'an address starting with bc1, 1 or 3',
      },
      { id: 'Lightning', label: 'Lightning', hint: 'Instant, tiny fees' },
      evm('BEP20', 'BNB Smart Chain (BEP-20)', 'Wrapped BTC, low fees'),
    ],
  },
  {
    symbol: 'ETH',
    glyph: 'Ξ',
    name: 'Ethereum',
    color: '#627EEA',
    decimals: 6,
    stable: false,
    networks: [
      evm('ERC20', 'Ethereum', 'A few minutes'),
      evm('Base', 'Base', 'Very low fees'),
      evm('Arbitrum', 'Arbitrum One', 'Low fees'),
      evm('Optimism', 'Optimism', 'Low fees'),
      evm('BEP20', 'BNB Smart Chain (BEP-20)', 'Low fees'),
    ],
  },
  {
    symbol: 'LTC',
    glyph: 'Ł',
    name: 'Litecoin',
    color: '#345D9D',
    decimals: 6,
    stable: false,
    networks: [
      {
        id: 'Litecoin',
        label: 'Litecoin',
        hint: 'About 5 minutes, low fees',
        pattern: /^(ltc1[02-9ac-hj-np-z]{11,71}|[LM3][1-9A-HJ-NP-Za-km-z]{26,33})$/,
        format: 'an address starting with ltc1, L or M',
      },
    ],
  },
  {
    symbol: 'TRX',
    glyph: 'T',
    name: 'TRON',
    color: '#EB0029',
    decimals: 2,
    stable: false,
    networks: [{ id: 'TRC20', label: 'Tron', hint: 'About a minute', pattern: TRON, format: TRON_FORMAT }],
  },
  {
    symbol: 'BNB',
    glyph: 'B',
    name: 'BNB',
    color: '#F3BA2F',
    decimals: 5,
    stable: false,
    networks: [evm('BEP20', 'BNB Smart Chain (BEP-20)', 'Under a minute')],
  },
  {
    symbol: 'SOL',
    glyph: '◎',
    name: 'Solana',
    color: '#9945FF',
    decimals: 4,
    stable: false,
    networks: [{ id: 'Solana', label: 'Solana', hint: 'Seconds, tiny fees', pattern: SOLANA, format: SOLANA_FORMAT }],
  },
  {
    symbol: 'TON',
    glyph: '◇',
    name: 'Toncoin',
    color: '#0098EA',
    decimals: 3,
    stable: false,
    networks: [{ id: 'TON', label: 'TON', hint: 'Seconds, low fees', pattern: TON, format: TON_FORMAT }],
  },
  {
    symbol: 'DOGE',
    glyph: 'Ð',
    name: 'Dogecoin',
    color: '#C2A633',
    decimals: 2,
    stable: false,
    networks: [
      {
        id: 'Dogecoin',
        label: 'Dogecoin',
        hint: 'A few minutes',
        pattern: /^[DA9][1-9A-HJ-NP-Za-km-z]{25,34}$/,
        format: 'an address starting with D',
      },
    ],
  },
  {
    symbol: 'XRP',
    glyph: 'X',
    name: 'XRP',
    color: '#23292F',
    decimals: 2,
    stable: false,
    networks: [
      {
        id: 'XRP Ledger',
        label: 'XRP Ledger',
        hint: 'Seconds. Add the destination tag if your exchange asks for one',
        pattern: /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/,
        format: 'an address starting with r',
      },
    ],
  },
  {
    symbol: 'POL',
    glyph: 'P',
    name: 'Polygon',
    color: '#8247E5',
    decimals: 3,
    stable: false,
    networks: [evm('Polygon', 'Polygon', 'Very low fees')],
  },
  {
    symbol: 'DAI',
    glyph: '◈',
    name: 'Dai',
    color: '#F5AC37',
    decimals: 2,
    stable: true,
    networks: [evm('ERC20', 'Ethereum (ERC-20)', 'A few minutes'), evm('Polygon', 'Polygon', 'Very low fees')],
  },
];

export const COINS_BY_SYMBOL: Record<string, CoinInfo> = Object.fromEntries(
  CRYPTO_CATALOG.map((c) => [c.symbol, c]),
);

export function coinInfo(symbol: string): CoinInfo | null {
  return COINS_BY_SYMBOL[symbol.trim().toUpperCase()] ?? null;
}

/** Look a network up by its stored id, tolerating older free-text values. */
export function networkInfo(symbol: string, network: string): NetworkInfo | null {
  const coin = coinInfo(symbol);
  if (!coin) return null;
  const n = network.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return (
    coin.networks.find((x) => x.id.toLowerCase().replace(/[^a-z0-9]/g, '') === n) ??
    coin.networks.find((x) => x.label.toLowerCase().replace(/[^a-z0-9]/g, '').includes(n) && n.length >= 3) ??
    null
  );
}

/**
 * Null when the address can belong to the network, otherwise a sentence
 * explaining what was expected. Unknown coins and networks are not checked.
 */
export function addressProblem(symbol: string, network: string, address: string): string | null {
  const a = address.trim();
  if (!a) return 'The address is empty.';
  if (/\s/.test(a)) return 'The address contains spaces.';
  const info = networkInfo(symbol, network);
  if (!info?.pattern) return null;
  if (info.pattern.test(a)) return null;
  return `This does not look like a ${symbol} address on ${info.label}. Expected ${info.format}.`;
}

/**
 * The amount of coin to send for a fiat total, rounded up to the coin's
 * display precision so the buyer never sends a hair too little.
 */
export function coinAmount(fiatMinor: number, fiatDecimals: number, pricePerCoin: number, decimals: number): string {
  const fiat = fiatMinor / 10 ** fiatDecimals;
  const raw = fiat / pricePerCoin;
  const factor = 10 ** decimals;
  const up = Math.ceil(raw * factor - 1e-9) / factor;
  return up.toFixed(decimals);
}

/** Sort wallet rows of one coin in catalog order (most used network first). */
export function byNetworkOrder<T extends { network: string }>(symbol: string, rows: T[]): T[] {
  const coin = coinInfo(symbol);
  if (!coin) return rows;
  const rank = (network: string) => {
    const id = networkInfo(symbol, network)?.id;
    const i = id ? coin.networks.findIndex((n) => n.id === id) : -1;
    return i < 0 ? 99 : i;
  };
  return [...rows].sort((a, b) => rank(a.network) - rank(b.network));
}
