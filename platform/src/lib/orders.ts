import 'server-only';
import type { Order, OrderStatus, Product } from '@prisma/client';
import { prisma } from './db';
import { orderRef, randomToken } from './crypto';
import { computeTotals, sanitizeCurrency } from './money';
import { loadMerchantContext } from './gateway/context';
import { notifyBuyerDelivery, notifyBuyerRefund, notifyMerchantNewOrder } from './notifier';
import { dispatchWebhook } from './webhooks';
import { validateCoupon } from './coupons';
import { quoteShipping, reduceStock, restoreStock } from './shipping';
import { encryptSecret } from './crypto';

export type CreateOrderInput = {
  accountId: string;
  product: Product;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  buyerCountry?: string;
  buyerState?: string;
  buyerCity?: string;
  buyerPostalCode?: string;
  buyerAddress1?: string;
  buyerAddress2?: string;
  buyerCompany?: string;
  buyerNote?: string;
  couponCode?: string;
  paymentMethod: string;
  giftCardCode?: string;
  giftCardCountry?: string;
  customFields?: Record<string, string>;
  renewalOfId?: string;
};

/**
 * Create an order.
 *
 * Pricing is recomputed here from the product row and the coupon table, never
 * taken from the submitted form. The plugin trusted a posted amount in one
 * code path; hosted, that would let anyone buy anything for a cent.
 */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const ctx = await loadMerchantContext(input.accountId);
  const currency = sanitizeCurrency(input.product.currency);
  const prefix = ctx.notifications.orderPrefix || 'MP-';

  let discountCents = 0;
  let appliedCoupon: string | null = null;
  if (input.couponCode) {
    const result = await validateCoupon(input.accountId, input.couponCode, input.product.priceCents);
    if (result.valid) {
      discountCents = result.discountCents;
      appliedCoupon = result.code;
    }
  }

  const shipping = await quoteShipping(ctx, input.product, {
    country: input.buyerCountry,
    subtotalCents: input.product.priceCents - discountCents,
  });

  const totals = computeTotals({
    subtotalCents: input.product.priceCents,
    discountCents,
    shippingCents: shipping.amountCents,
  });

  const order = await prisma.order.create({
    data: {
      accountId: input.accountId,
      productId: input.product.id,
      ref: await uniqueRef(prefix),
      nonce: randomToken(24),
      buyerName: input.buyerName.trim().slice(0, 190),
      buyerEmail: input.buyerEmail.trim().toLowerCase().slice(0, 190),
      buyerPhone: input.buyerPhone?.trim() || null,
      buyerCountry: input.buyerCountry?.trim().toUpperCase().slice(0, 2) || null,
      buyerState: input.buyerState?.trim() || null,
      buyerCity: input.buyerCity?.trim() || null,
      buyerPostalCode: input.buyerPostalCode?.trim() || null,
      buyerAddress1: input.buyerAddress1?.trim() || null,
      buyerAddress2: input.buyerAddress2?.trim() || null,
      buyerCompany: input.buyerCompany?.trim() || null,
      buyerNote: input.buyerNote?.trim() || null,
      amountCents: totals.totalCents,
      discountCents: totals.discountCents,
      shippingCents: totals.shippingCents,
      currency,
      couponCode: appliedCoupon,
      paymentMethod: input.paymentMethod,
      shippingMethod: shipping.label || null,
      renewalOfId: input.renewalOfId ?? null,
      // Gift-card codes are bearer credentials from the moment they are typed.
      giftCardCodeEnc: input.giftCardCode ? encryptSecret(input.giftCardCode) : null,
      giftCardCountry: input.giftCardCountry?.trim().toUpperCase() || null,
      // A pending order should not hold stock or a quote for ever.
      expiresAt: new Date(Date.now() + 24 * 3600_000),
      meta: { customFields: input.customFields ?? {} },
      events: {
        create: {
          type: 'created',
          actor: 'buyer',
          note: `Order created for ${input.product.name}.`,
          meta: { method: input.paymentMethod, subtotal: totals.subtotalCents },
        },
      },
    },
  });

  await notifyMerchantNewOrder(ctx, order, input.product).catch(() => {});
  await dispatchWebhook(input.accountId, 'order.created', serializeOrder(order, input.product));

  return order;
}

async function uniqueRef(prefix: string): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = orderRef(prefix);
    const clash = await prisma.order.findUnique({ where: { ref: candidate }, select: { id: true } });
    if (!clash) return candidate;
  }
  // Astronomically unlikely; a longer ref beats failing the sale.
  return orderRef(prefix, 10);
}

/**
 * Mark an order paid.
 *
 * Idempotent, because every automatic rail retries its webhook. Side effects
 * in order: start the subscription clock, deliver, take stock, erase the
 * gift-card code, supersede the renewed order, notify.
 */
export async function markPaid(
  orderId: string,
  opts: { txid?: string; actor?: string; note?: string } = {},
): Promise<{ ok: boolean; alreadyPaid?: boolean }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true },
  });
  if (!order) return { ok: false };
  if (order.status === 'PAID') return { ok: true, alreadyPaid: true };

  const product = order.product;
  const data: Record<string, unknown> = {
    status: 'PAID' satisfies OrderStatus,
    txid: opts.txid?.slice(0, 190) || order.txid,
    // The code has served its purpose; keep the order, drop the credential.
    giftCardCodeEnc: null,
  };

  // Subscription clock. A customer who renews early keeps the days they have
  // already paid for: extend from the old expiry, not from today.
  if (product.durationDays > 0) {
    let from = Date.now();
    if (order.renewalOfId) {
      const previous = await prisma.order.findUnique({
        where: { id: order.renewalOfId },
        select: { serviceExpiresAt: true },
      });
      const previousEnd = previous?.serviceExpiresAt?.getTime() ?? 0;
      if (previousEnd > from) from = previousEnd;
    }
    data.serviceExpiresAt = new Date(from + product.durationDays * 86_400_000);
    data.renewalState = 'ACTIVE';
    data.remindersSent = '';
  }

  const updated = await prisma.order.update({ where: { id: orderId }, data });

  await prisma.orderEvent.create({
    data: {
      orderId,
      type: 'paid',
      actor: opts.actor ?? 'system',
      note: opts.note ?? 'Payment confirmed.',
      meta: { txid: opts.txid ?? null, amount: order.amountCents },
    },
  });

  // Stock comes off at payment, not at checkout: an abandoned cart should not
  // quietly eat inventory. A limited-use coupon is counted on the same
  // principle — a code capped at 100 uses should buy 100 sales, not be burned
  // by 100 people who opened the page and left.
  await reduceStock(product, 1);

  if (order.couponCode) {
    await prisma.coupon
      .update({
        where: { accountId_code: { accountId: order.accountId, code: order.couponCode } },
        data: { usageCount: { increment: 1 } },
      })
      .catch(() => {
        // The coupon may have been deleted since the order was placed. The
        // order keeps its discount either way; losing the tally is not worth
        // failing a settled payment over.
      });
  }

  const ctx = await loadMerchantContext(order.accountId);
  const delivered = await notifyBuyerDelivery(ctx, updated, product).catch(() => false);
  if (delivered) {
    await prisma.order.update({ where: { id: orderId }, data: { deliveredAt: new Date() } });
  }

  if (order.renewalOfId) {
    await prisma.order
      .update({ where: { id: order.renewalOfId }, data: { renewalState: 'RENEWED' } })
      .catch(() => {});
  }

  await dispatchWebhook(order.accountId, 'order.paid', serializeOrder(updated, product));
  return { ok: true };
}

/** Buyer says they have paid on a manual rail. Not the same as being paid. */
export async function claimPayment(
  orderId: string,
  input: { reference?: string; channel?: string; note?: string },
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true },
  });
  if (!order || order.status === 'PAID') return;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'AWAITING_VERIFICATION',
      paymentReference: input.reference?.slice(0, 64) || order.paymentReference,
    },
  });

  await prisma.orderEvent.create({
    data: {
      orderId,
      type: 'payment_claimed',
      actor: 'buyer',
      note: input.note ?? 'Buyer reported that payment was sent.',
      meta: { reference: input.reference ?? null, channel: input.channel ?? null },
    },
  });

  const ctx = await loadMerchantContext(order.accountId);
  await dispatchWebhook(
    order.accountId,
    'order.awaiting_verification',
    serializeOrder({ ...order, status: 'AWAITING_VERIFICATION' }, order.product),
  );
  await notifyMerchantNewOrder(ctx, order, order.product, { claimed: true }).catch(() => {});
}

export async function markRefunded(
  orderId: string,
  opts: { reason?: string; actor?: string; notify?: boolean } = {},
): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true },
  });
  if (!order) return false;
  if (order.status === 'REFUNDED') return true;

  await prisma.order.update({ where: { id: orderId }, data: { status: 'REFUNDED' } });
  await prisma.orderEvent.create({
    data: {
      orderId,
      type: 'refunded',
      actor: opts.actor ?? 'system',
      note: opts.reason ?? '',
      meta: { amount: order.amountCents },
    },
  });

  await restoreStock(order.product, 1);

  // A refund the buyer never hears about becomes a chargeback anyway, because
  // they assume they were ignored.
  if (opts.notify !== false) {
    const ctx = await loadMerchantContext(order.accountId);
    await notifyBuyerRefund(ctx, order, order.product, opts.reason ?? '').catch(() => {});
  }

  await dispatchWebhook(order.accountId, 'order.refunded', serializeOrder(order, order.product));
  return true;
}

export async function markCancelled(orderId: string, actor = 'system'): Promise<void> {
  await prisma.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } });
  await prisma.orderEvent.create({
    data: { orderId, type: 'cancelled', actor, note: 'Order cancelled.' },
  });
}

/** The shape merchants receive on webhooks and through the public API. */
export function serializeOrder(order: Order, product?: Product | null) {
  return {
    id: order.id,
    ref: order.ref,
    status: order.status,
    amount: order.amountCents,
    discount: order.discountCents,
    shipping: order.shippingCents,
    currency: order.currency,
    payment_method: order.paymentMethod,
    payment_reference: order.paymentReference,
    txid: order.txid,
    coupon_code: order.couponCode,
    buyer: {
      name: order.buyerName,
      email: order.buyerEmail,
      phone: order.buyerPhone,
      country: order.buyerCountry,
      city: order.buyerCity,
    },
    product: product ? { id: product.id, name: product.name, slug: product.slug } : null,
    service_expires_at: order.serviceExpiresAt?.toISOString() ?? null,
    delivered_at: order.deliveredAt?.toISOString() ?? null,
    created_at: order.createdAt.toISOString(),
  };
}

/** Counts for the dashboard header, in one query per bucket. */
export async function orderCounts(accountId: string) {
  const grouped = await prisma.order.groupBy({
    by: ['status'],
    where: { accountId },
    _count: { _all: true },
    _sum: { amountCents: true },
  });

  const counts: Record<string, number> = {};
  let paidRevenue = 0;
  for (const row of grouped) {
    counts[row.status] = row._count._all;
    if (row.status === 'PAID') paidRevenue = row._sum.amountCents ?? 0;
  }
  return {
    counts,
    total: grouped.reduce((sum, r) => sum + r._count._all, 0),
    awaiting: counts.AWAITING_VERIFICATION ?? 0,
    paid: counts.PAID ?? 0,
    paidRevenue,
  };
}
