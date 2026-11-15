import 'server-only';
import type { Order } from '@prisma/client';
import { prisma } from '../db';
import { loadMerchantContext } from '../gateway/context';
import { readConfig } from '../gateway/config';
import { markPaid } from '../orders';
import { cleanTxid, verifyPayment, type ChainResult, type ReceiveAddress } from './verify';
import { parseChainVerify } from './settings';

export { parseChainVerify, type ChainVerifySettings } from './settings';

/**
 * Automatic crypto verification, applied to orders.
 *
 * Settings live in NotificationSettings.chainVerify:
 *   enabled  check crypto payments on the blockchain at all (default on)
 *   mode     'auto'   mark the order paid once verified (delivery goes out)
 *            'review' record the verification; a human still confirms
 */
/** Rails a buyer pays by sending crypto to an address of the merchant's. */
const CRYPTO_RAILS = new Set(['crypto', 'bc_paypal', 'bc_cashapp', 'finchpay_btc']);

export type StoredCheck = ChainResult & { checkedAt: string };

export function storedCheck(meta: unknown): StoredCheck | null {
  const o = meta && typeof meta === 'object' && !Array.isArray(meta) ? (meta as Record<string, unknown>) : {};
  const c = o.chain;
  return c && typeof c === 'object' && !Array.isArray(c) ? (c as StoredCheck) : null;
}

/** Statuses worth looking at again later; the others are final. */
const RETRY = new Set(['pending', 'not_found', 'error']);

/**
 * Should a page view or the sweep re-check this order now? Only crypto
 * orders the buyer has reported, not too often, and not for ever.
 */
export function dueForCheck(order: Pick<Order, 'status' | 'paymentMethod' | 'paymentReference' | 'meta' | 'updatedAt'>): boolean {
  if (order.status !== 'AWAITING_VERIFICATION') return false;
  if (!order.paymentMethod || !CRYPTO_RAILS.has(order.paymentMethod)) return false;
  if (!order.paymentReference || !cleanTxid(order.paymentReference)) return false;
  const last = storedCheck(order.meta);
  if (!last) return true;
  if (!RETRY.has(last.status)) return false;
  const age = Date.now() - new Date(last.checkedAt).getTime();
  return age > 90_000 && Date.now() - order.updatedAt.getTime() < 7 * 86_400_000;
}

/**
 * Check one order's transaction on the blockchain and act on the result.
 * Returns the result, or null when there is nothing to check.
 */
export async function checkOrderOnChain(orderId: string, actor = 'blockchain'): Promise<ChainResult | null> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || !order.paymentMethod || !CRYPTO_RAILS.has(order.paymentMethod)) return null;
  if (order.status !== 'AWAITING_VERIFICATION' && order.status !== 'PENDING') return null;

  const ctx = await loadMerchantContext(order.accountId);
  const settings = parseChainVerify(ctx.notifications.chainVerify);
  if (!settings.enabled) return null;

  const txid = cleanTxid(order.paymentReference ?? '');
  if (!txid) return null;

  // The merchant's receive addresses for this rail.
  let wallets: ReceiveAddress[] = [];
  if (order.paymentMethod === 'crypto') {
    wallets = ctx.wallets.filter((w) => w.active).map((w) => ({ coin: w.coin, network: w.network, address: w.address }));
  } else {
    const config = readConfig(ctx.methods.find((m) => m.key === order.paymentMethod) ?? null, order.paymentMethod);
    wallets = [
      {
        coin: String(config.coin ?? 'BTC'),
        network: String(config.network ?? 'Bitcoin'),
        address: String(config.wallet ?? ''),
      },
    ];
  }

  // One transaction pays for one order. Anyone can paste a famous TXID.
  const reused = await prisma.order.findFirst({
    where: {
      id: { not: order.id },
      status: 'PAID',
      OR: [{ txid: { in: [txid, `0x${txid}`] } }, { paymentReference: { in: [txid, `0x${txid}`] } }],
    },
    select: { id: true },
  });

  const result: ChainResult = reused
    ? { status: 'failed', message: 'This transaction has already been used to pay another order.', txid }
    : await verifyPayment({ txid, wallets, order });

  const previous = storedCheck(order.meta);
  const meta = order.meta && typeof order.meta === 'object' && !Array.isArray(order.meta) ? (order.meta as Record<string, unknown>) : {};
  await prisma.order.update({
    where: { id: order.id },
    data: { meta: { ...meta, chain: { ...result, checkedAt: new Date().toISOString() } } as object },
  });

  // Log changes, not every poll.
  if (!previous || previous.status !== result.status) {
    await prisma.orderEvent.create({
      data: {
        orderId: order.id,
        type: 'chain_check',
        actor,
        note: result.message,
        meta: { status: result.status, chain: result.chain ?? null, amount: result.amount ?? null, coin: result.coin ?? null },
      },
    });
  }

  if (result.status === 'verified' && settings.mode === 'auto') {
    await markPaid(order.id, {
      txid: result.chain && ['eth', 'bsc', 'polygon'].includes(result.chain) ? `0x${txid}` : txid,
      actor: 'blockchain',
      note: `Paid automatically. ${result.message}`,
    });
  }
  return result;
}

/** Run a check, but give up waiting after `ms` so a page never hangs on it. */
export async function checkOrderOnChainWithin(orderId: string, ms: number): Promise<ChainResult | null> {
  return Promise.race([
    checkOrderOnChain(orderId).catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/** Re-check every reported crypto order still waiting. Used by the daily sweep. */
export async function sweepChainChecks(accountId?: string): Promise<{ checked: number; paid: number }> {
  const candidates = await prisma.order.findMany({
    where: {
      ...(accountId ? { accountId } : {}),
      status: 'AWAITING_VERIFICATION',
      paymentMethod: { in: [...CRYPTO_RAILS] },
      paymentReference: { not: null },
      updatedAt: { gte: new Date(Date.now() - 7 * 86_400_000) },
    },
    select: { id: true, status: true, paymentMethod: true, paymentReference: true, meta: true, updatedAt: true },
    take: 200,
  });
  let checked = 0;
  let paid = 0;
  for (const order of candidates) {
    if (!dueForCheck(order)) continue;
    const result = await checkOrderOnChain(order.id).catch(() => null);
    checked += 1;
    if (result?.status === 'verified') paid += 1;
  }
  return { checked, paid };
}
