import 'server-only';
import { chainOf, cleanTxid, normalizeCoin, tronAddress, type ChainId } from './networks';

export { chainOf, cleanTxid, normalizeCoin, tronAddress, type ChainId };

/**
 * On-chain payment verification.
 *
 * Given a transaction ID a buyer pasted and the merchant's receive addresses,
 * look the transaction up on a public node or explorer and decide whether it
 * paid this order: right address, right coin, enough of it, recent enough,
 * and with enough confirmations.
 *
 * Every data source here is public and keyless:
 *   BTC   mempool.space          LTC   litecoinspace.org
 *   ETH   publicnode JSON-RPC    BSC   publicnode JSON-RPC
 *   POLY  publicnode JSON-RPC    TRON  TronGrid (optional TRONGRID_API_KEY)
 *   price CoinGecko simple/price
 *
 * Tokens are recognised by contract address only. A token that merely calls
 * itself "USDT" is ignored, because anyone can deploy one.
 */


export type ReceiveAddress = { coin: string; network: string; address: string };

export type ChainStatus =
  | 'verified'
  | 'pending'
  | 'underpaid'
  | 'wrong_recipient'
  | 'too_old'
  | 'failed'
  | 'not_found'
  | 'unsupported'
  | 'error';

export type ChainResult = {
  status: ChainStatus;
  message: string;
  chain?: ChainId;
  coin?: string;
  /** Amount of `coin` received by the merchant's address(es). */
  amount?: number;
  /** That amount valued in the order currency, minor units. */
  valueCents?: number;
  confirmations?: number;
  required?: number;
  explorerUrl?: string;
  txid?: string;
};

// ---------------------------------------------------------------- networks

const CHAIN_INFO: Record<
  ChainId,
  { name: string; native: string; decimals: number; confirmations: number; explorer: string; evm: boolean }
> = {
  btc: { name: 'Bitcoin', native: 'BTC', decimals: 8, confirmations: 1, explorer: 'https://mempool.space/tx/', evm: false },
  ltc: { name: 'Litecoin', native: 'LTC', decimals: 8, confirmations: 2, explorer: 'https://litecoinspace.org/tx/', evm: false },
  eth: { name: 'Ethereum', native: 'ETH', decimals: 18, confirmations: 6, explorer: 'https://etherscan.io/tx/', evm: true },
  bsc: { name: 'BNB Smart Chain', native: 'BNB', decimals: 18, confirmations: 10, explorer: 'https://bscscan.com/tx/', evm: true },
  polygon: { name: 'Polygon', native: 'POL', decimals: 18, confirmations: 30, explorer: 'https://polygonscan.com/tx/', evm: true },
  tron: { name: 'TRON', native: 'TRX', decimals: 6, confirmations: 19, explorer: 'https://tronscan.org/#/transaction/', evm: false },
};

const EVM_RPC: Record<'eth' | 'bsc' | 'polygon', string> = {
  eth: 'https://ethereum-rpc.publicnode.com',
  bsc: 'https://bsc-rpc.publicnode.com',
  polygon: 'https://polygon-bor-rpc.publicnode.com',
};

/** Known stablecoin contracts. Lower-case EVM addresses; base58 for TRON. */
const TOKENS: Record<ChainId, Record<string, { coin: string; decimals: number }>> = {
  btc: {},
  ltc: {},
  eth: {
    '0xdac17f958d2ee523a2206206994597c13d831ec7': { coin: 'USDT', decimals: 6 },
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { coin: 'USDC', decimals: 6 },
  },
  bsc: {
    '0x55d398326f99059ff775485246999027b3197955': { coin: 'USDT', decimals: 18 },
    '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': { coin: 'USDC', decimals: 18 },
  },
  polygon: {
    '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': { coin: 'USDT', decimals: 6 },
    '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359': { coin: 'USDC', decimals: 6 },
    '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': { coin: 'USDC', decimals: 6 },
  },
  tron: {
    TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t: { coin: 'USDT', decimals: 6 },
    TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8: { coin: 'USDC', decimals: 6 },
  },
};

const TRANSFER_TOPIC = 'ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const STABLE = new Set(['USDT', 'USDC']);

export function explorerUrl(chain: ChainId, txid: string): string {
  return CHAIN_INFO[chain].explorer + txid;
}

function sameAddress(chain: ChainId, a: string, b: string): boolean {
  if (!a || !b) return false;
  const x = a.trim();
  const y = b.trim();
  if (CHAIN_INFO[chain].evm) return x.toLowerCase() === y.toLowerCase();
  // bech32 is case-insensitive; base58 (legacy BTC/LTC, TRON) is not.
  if (/^(bc1|ltc1|tb1)/i.test(x)) return x.toLowerCase() === y.toLowerCase();
  return x === y;
}

// ---------------------------------------------------------------- http

const TIMEOUT_MS = 8000;

async function http(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
}

async function rpc(chain: 'eth' | 'bsc' | 'polygon', method: string, params: unknown[]): Promise<any> {
  const res = await http(EVM_RPC[chain], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`${chain} rpc ${res.status}`);
  const json = (await res.json()) as { result?: unknown; error?: { message?: string } };
  if (json.error) throw new Error(json.error.message ?? 'rpc error');
  return json.result;
}

async function tronApi(path: string, body: unknown): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.TRONGRID_API_KEY) headers['TRON-PRO-API-KEY'] = process.env.TRONGRID_API_KEY;
  // Keyless TronGrid throttles bursts; back off briefly rather than give up.
  for (let attempt = 0; ; attempt += 1) {
    const res = await http(`https://api.trongrid.io${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
    if (res.ok) return res.json();
    if (attempt >= 2 || ![403, 429, 503].includes(res.status)) throw new Error(`tron ${res.status}`);
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
}

// ---------------------------------------------------------------- fetchers

type Transfer = { to: string; coin: string; amount: number };
type FetchedTx = {
  found: boolean;
  success: boolean;
  confirmations: number;
  /** Seconds since epoch, or null while unconfirmed. */
  time: number | null;
  transfers: Transfer[];
};

const NOT_FOUND: FetchedTx = { found: false, success: false, confirmations: 0, time: null, transfers: [] };

async function fetchUtxo(chain: 'btc' | 'ltc', txid: string): Promise<FetchedTx> {
  const base = chain === 'btc' ? 'https://mempool.space/api' : 'https://litecoinspace.org/api';
  const res = await http(`${base}/tx/${txid}`);
  if (res.status === 404 || res.status === 400) return NOT_FOUND;
  if (!res.ok) throw new Error(`${chain} ${res.status}`);
  const tx = (await res.json()) as {
    status: { confirmed: boolean; block_height?: number; block_time?: number };
    vout: { scriptpubkey_address?: string; value: number }[];
  };
  let confirmations = 0;
  if (tx.status.confirmed && tx.status.block_height) {
    const tip = Number(await (await http(`${base}/blocks/tip/height`)).text());
    confirmations = Math.max(1, tip - tx.status.block_height + 1);
  }
  const coin = CHAIN_INFO[chain].native;
  return {
    found: true,
    success: true,
    confirmations,
    time: tx.status.block_time ?? null,
    transfers: tx.vout
      .filter((v) => v.scriptpubkey_address)
      .map((v) => ({ to: v.scriptpubkey_address!, coin, amount: v.value / 1e8 })),
  };
}

function units(raw: string | bigint, decimals: number): number {
  const big = typeof raw === 'bigint' ? raw : BigInt(raw);
  return Number(big) / 10 ** decimals;
}

async function fetchEvm(chain: 'eth' | 'bsc' | 'polygon', hash: string): Promise<FetchedTx> {
  const tx = await rpc(chain, 'eth_getTransactionByHash', [hash]);
  if (!tx) return NOT_FOUND;
  const receipt = await rpc(chain, 'eth_getTransactionReceipt', [hash]);
  const transfers: Transfer[] = [];

  if (tx.to && tx.value && BigInt(tx.value) > 0n) {
    transfers.push({ to: tx.to, coin: CHAIN_INFO[chain].native, amount: units(tx.value, 18) });
  }
  for (const log of receipt?.logs ?? []) {
    const token = TOKENS[chain][String(log.address).toLowerCase()];
    if (!token || !log.topics || log.topics.length < 3) continue;
    if (String(log.topics[0]).toLowerCase().replace(/^0x/, '') !== TRANSFER_TOPIC) continue;
    transfers.push({
      to: '0x' + String(log.topics[2]).slice(-40),
      coin: token.coin,
      amount: units(log.data, token.decimals),
    });
  }

  if (!receipt || !receipt.blockNumber) {
    return { found: true, success: true, confirmations: 0, time: null, transfers };
  }
  const head = Number(BigInt(await rpc(chain, 'eth_blockNumber', [])));
  const blockNo = Number(BigInt(receipt.blockNumber));
  const block = await rpc(chain, 'eth_getBlockByNumber', [receipt.blockNumber, false]);
  return {
    found: true,
    success: receipt.status === '0x1',
    confirmations: Math.max(1, head - blockNo + 1),
    time: block?.timestamp ? Number(BigInt(block.timestamp)) : null,
    transfers,
  };
}

async function fetchTron(txid: string): Promise<FetchedTx> {
  const tx = await tronApi('/wallet/gettransactionbyid', { value: txid });
  const info = tx?.txID ? await tronApi('/wallet/gettransactioninfobyid', { value: txid }) : null;
  if (!tx || !tx.txID) return NOT_FOUND;

  const transfers: Transfer[] = [];
  const contract = tx.raw_data?.contract?.[0];
  if (contract?.type === 'TransferContract') {
    const v = contract.parameter?.value ?? {};
    transfers.push({ to: tronAddress(String(v.to_address ?? '')), coin: 'TRX', amount: Number(v.amount ?? 0) / 1e6 });
  }
  for (const log of info?.log ?? []) {
    const token = TOKENS.tron[tronAddress(String(log.address ?? ''))];
    if (!token || !log.topics || log.topics.length < 3) continue;
    if (String(log.topics[0]).toLowerCase() !== TRANSFER_TOPIC) continue;
    transfers.push({
      to: tronAddress(String(log.topics[2]).slice(-40)),
      coin: token.coin,
      amount: units('0x' + (log.data || '0'), token.decimals),
    });
  }

  const success =
    contract?.type === 'TransferContract'
      ? tx.ret?.[0]?.contractRet === 'SUCCESS'
      : info?.receipt?.result === 'SUCCESS';

  if (!info?.blockNumber) return { found: true, success, confirmations: 0, time: null, transfers };
  const now = await tronApi('/wallet/getnowblock', {});
  const head = Number(now?.block_header?.raw_data?.number ?? info.blockNumber);
  return {
    found: true,
    success,
    confirmations: Math.max(1, head - Number(info.blockNumber) + 1),
    time: info.blockTimeStamp ? Math.floor(Number(info.blockTimeStamp) / 1000) : null,
    transfers,
  };
}

async function fetchTx(chain: ChainId, txid: string): Promise<FetchedTx> {
  switch (chain) {
    case 'btc':
    case 'ltc':
      return fetchUtxo(chain, txid);
    case 'eth':
    case 'bsc':
    case 'polygon':
      return fetchEvm(chain, '0x' + txid);
    case 'tron':
      return fetchTron(txid);
  }
}

// ---------------------------------------------------------------- prices

const GECKO: Record<string, string> = {
  BTC: 'bitcoin',
  LTC: 'litecoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  POL: 'polygon-ecosystem-token',
  TRX: 'tron',
  USDT: 'tether',
  USDC: 'usd-coin',
};

/** Price of one `coin` in `currency`, or null if it cannot be priced right now. */
export async function priceIn(coin: string, currency: string): Promise<number | null> {
  const cur = currency.trim().toLowerCase();
  if (STABLE.has(coin) && cur === 'usd') return 1;
  const id = GECKO[coin];
  if (!id) return null;
  try {
    const res = await http(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=${cur}`);
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, Record<string, number>>;
    const price = json[id]?.[cur];
    return typeof price === 'number' && price > 0 ? price : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- the decision

/** Share of the order total that must arrive. Volatile coins get more room. */
export function tolerance(coin: string): number {
  return STABLE.has(coin) ? 0.98 : 0.95;
}

/** Minor units for an amount in a given currency (most fiat: 2 decimals). */
function toMinor(amount: number, currency: string): number {
  const zeroDecimal = new Set(['JPY', 'KRW', 'VND', 'CLP', 'XOF', 'XAF', 'UGX', 'RWF']);
  return Math.round(amount * (zeroDecimal.has(currency.toUpperCase()) ? 1 : 100));
}

export async function verifyPayment(input: {
  txid: string;
  wallets: ReceiveAddress[];
  order: { amountCents: number; currency: string; createdAt: Date };
}): Promise<ChainResult> {
  const txid = cleanTxid(input.txid);
  if (!txid) {
    return { status: 'unsupported', message: 'That does not look like a blockchain transaction ID.' };
  }

  // Which chains could this be? Only the ones this store actually receives on.
  const byChain = new Map<ChainId, ReceiveAddress[]>();
  for (const w of input.wallets) {
    const chain = chainOf(w.coin, w.network);
    if (!chain || !w.address.trim()) continue;
    byChain.set(chain, [...(byChain.get(chain) ?? []), w]);
  }
  if (byChain.size === 0) {
    return { status: 'unsupported', message: 'None of this store’s wallets are on a network we can check automatically.' };
  }
  // A 0x-prefixed hash can only be EVM; try those first.
  const evmFirst = /^0x/i.test(input.txid.trim());
  const chains = [...byChain.keys()].sort((a, b) =>
    evmFirst ? Number(CHAIN_INFO[b].evm) - Number(CHAIN_INFO[a].evm) : 0,
  );

  let lastError: string | null = null;
  for (const chain of chains) {
    let tx: FetchedTx;
    try {
      tx = await fetchTx(chain, txid);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      continue;
    }
    if (!tx.found) continue;

    const info = CHAIN_INFO[chain];
    const base = { chain, txid, explorerUrl: explorerUrl(chain, CHAIN_INFO[chain].evm ? '0x' + txid : txid) };
    if (!tx.success) {
      return { ...base, status: 'failed', message: `The transaction failed on ${info.name}.` };
    }

    // Payments to this store's addresses, in the coin each address expects.
    const wallets = byChain.get(chain) ?? [];
    const matched = tx.transfers.filter((t) =>
      wallets.some((w) => sameAddress(chain, w.address, t.to) && normalizeCoin(w.coin) === t.coin),
    );
    if (matched.length === 0) {
      return {
        ...base,
        status: 'wrong_recipient',
        message: `The transaction exists on ${info.name} but did not pay this store’s ${info.name} address.`,
      };
    }

    const coin = matched[0].coin;
    const amount = matched.filter((t) => t.coin === coin).reduce((sum, t) => sum + t.amount, 0);
    const result: ChainResult = {
      ...base,
      status: 'verified',
      message: '',
      coin,
      amount,
      confirmations: tx.confirmations,
      required: info.confirmations,
    };

    // A payment made before the order existed is somebody else's payment.
    if (tx.time && tx.time * 1000 < input.order.createdAt.getTime() - 15 * 60_000) {
      return { ...result, status: 'too_old', message: 'This transaction was made before the order was placed.' };
    }

    const price = await priceIn(coin, input.order.currency);
    if (price === null) {
      return { ...result, status: 'error', message: `Could not price ${coin} in ${input.order.currency} right now. It will be checked again.` };
    }
    result.valueCents = toMinor(amount * price, input.order.currency);

    if (result.valueCents < input.order.amountCents * tolerance(coin)) {
      return { ...result, status: 'underpaid', message: `Received ${amount} ${coin}, which is less than the order total.` };
    }
    if (tx.confirmations < info.confirmations) {
      return {
        ...result,
        status: 'pending',
        message: `Payment found: ${amount} ${coin}. Waiting for confirmations (${tx.confirmations}/${info.confirmations}).`,
      };
    }
    return { ...result, message: `Verified on ${info.name}: ${amount} ${coin}, ${tx.confirmations} confirmations.` };
  }

  if (lastError) {
    return { status: 'error', message: 'A blockchain service did not answer. It will be checked again.' };
  }
  return { status: 'not_found', message: 'No transaction with that ID on this store’s networks yet.' };
}
