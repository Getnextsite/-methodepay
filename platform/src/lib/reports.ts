import 'server-only';
import { prisma } from './db';
import { bucketKey, bucketsFor, pctChange, type Period } from './reports-period';

/**
 * Financial reports.
 *
 * Revenue is counted when money arrived (the order's "paid" event), not when
 * the checkout was started, and refunds when they happened. That is how an
 * accountant reads a period: a sale started on the 31st and paid on the 1st
 * belongs to the new month.
 *
 * Amounts are kept per currency and never added across currencies; the
 * screen shows the store's main currency and lists the others separately.
 */

export type Money = Record<string, number>;

export type Breakdown = {
  key: string;
  label: string;
  orders: number;
  gross: Money;
};

export type ReportTotals = {
  gross: Money;
  refunds: Money;
  net: Money;
  discounts: Money;
  shipping: Money;
  paidOrders: number;
  refundedOrders: number;
  checkoutsStarted: number;
  /** Checkouts started in the period that ended up paid. */
  checkoutsPaid: number;
  newCustomers: number;
  returningCustomers: number;
};

export type Report = {
  period: Period;
  currencies: string[];
  primary: string;
  totals: ReportTotals;
  previous: ReportTotals;
  series: { key: string; gross: number; refunds: number; orders: number }[];
  byMethod: Breakdown[];
  byProduct: Breakdown[];
  byCountry: Breakdown[];
  byCoupon: Breakdown[];
  rows: ReportRow[];
};

export type ReportRow = {
  at: Date;
  kind: 'sale' | 'refund';
  ref: string;
  orderId: string;
  product: string;
  buyerEmail: string;
  buyerCountry: string | null;
  method: string | null;
  coupon: string | null;
  currency: string;
  amountCents: number;
  discountCents: number;
  shippingCents: number;
};

function add(m: Money, currency: string, cents: number) {
  m[currency] = (m[currency] ?? 0) + cents;
}

async function totalsFor(accountId: string, from: Date, to: Date): Promise<{ totals: ReportTotals; rows: ReportRow[] }> {
  const events = await prisma.orderEvent.findMany({
    where: {
      type: { in: ['paid', 'refunded'] },
      createdAt: { gte: from, lt: to },
      order: { accountId },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      type: true,
      createdAt: true,
      order: {
        select: {
          id: true,
          ref: true,
          buyerEmail: true,
          buyerCountry: true,
          paymentMethod: true,
          couponCode: true,
          currency: true,
          amountCents: true,
          discountCents: true,
          shippingCents: true,
          product: { select: { name: true } },
        },
      },
    },
  });

  // An order can only be paid once and refunded once; a repeated event (a
  // provider retry that slipped through) must not count twice.
  const seen = new Set<string>();
  const rows: ReportRow[] = [];
  for (const e of events) {
    const kind = e.type === 'paid' ? 'sale' : 'refund';
    const id = `${kind}:${e.order.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push({
      at: e.createdAt,
      kind,
      ref: e.order.ref,
      orderId: e.order.id,
      product: e.order.product.name,
      buyerEmail: e.order.buyerEmail,
      buyerCountry: e.order.buyerCountry,
      method: e.order.paymentMethod,
      coupon: e.order.couponCode,
      currency: e.order.currency,
      amountCents: e.order.amountCents,
      discountCents: e.order.discountCents,
      shippingCents: e.order.shippingCents,
    });
  }

  const totals: ReportTotals = {
    gross: {},
    refunds: {},
    net: {},
    discounts: {},
    shipping: {},
    paidOrders: 0,
    refundedOrders: 0,
    checkoutsStarted: 0,
    checkoutsPaid: 0,
    newCustomers: 0,
    returningCustomers: 0,
  };
  for (const r of rows) {
    if (r.kind === 'sale') {
      totals.paidOrders += 1;
      add(totals.gross, r.currency, r.amountCents);
      add(totals.net, r.currency, r.amountCents);
      add(totals.discounts, r.currency, r.discountCents);
      add(totals.shipping, r.currency, r.shippingCents);
    } else {
      totals.refundedOrders += 1;
      add(totals.refunds, r.currency, r.amountCents);
      add(totals.net, r.currency, -r.amountCents);
    }
  }

  const [started, startedPaid] = await Promise.all([
    prisma.order.count({ where: { accountId, createdAt: { gte: from, lt: to } } }),
    prisma.order.count({
      where: { accountId, createdAt: { gte: from, lt: to }, status: { in: ['PAID', 'REFUNDED'] } },
    }),
  ]);
  totals.checkoutsStarted = started;
  totals.checkoutsPaid = startedPaid;

  // New vs returning: a buyer is new if this period holds their first sale.
  const buyers = [...new Set(rows.filter((r) => r.kind === 'sale').map((r) => r.buyerEmail))];
  if (buyers.length > 0) {
    const earlier = await prisma.order.findMany({
      where: {
        accountId,
        buyerEmail: { in: buyers },
        status: { in: ['PAID', 'REFUNDED'] },
        createdAt: { lt: from },
      },
      distinct: ['buyerEmail'],
      select: { buyerEmail: true },
    });
    totals.returningCustomers = earlier.length;
    totals.newCustomers = buyers.length - earlier.length;
  }

  return { totals, rows };
}

function breakdown(rows: ReportRow[], keyOf: (r: ReportRow) => string | null, labelOf: (key: string) => string): Breakdown[] {
  const map = new Map<string, Breakdown>();
  for (const r of rows) {
    if (r.kind !== 'sale') continue;
    const key = keyOf(r);
    if (!key) continue;
    const b = map.get(key) ?? { key, label: labelOf(key), orders: 0, gross: {} };
    b.orders += 1;
    add(b.gross, r.currency, r.amountCents);
    map.set(key, b);
  }
  return [...map.values()].sort((a, b) => b.orders - a.orders);
}

export async function buildReport(
  accountId: string,
  period: Period,
  labels: { method: (key: string) => string; country: (code: string) => string },
): Promise<Report> {
  const [current, prev] = await Promise.all([
    totalsFor(accountId, period.from, period.to),
    totalsFor(accountId, period.prevFrom, period.prevTo),
  ]);

  const currencies = [...new Set([...Object.keys(current.totals.gross), ...Object.keys(current.totals.refunds)])];
  // The main currency is the one with the most sales, falling back to the
  // currency most products are priced in.
  let primary = currencies.sort((a, b) => (current.totals.gross[b] ?? 0) - (current.totals.gross[a] ?? 0))[0];
  if (!primary) {
    const p = await prisma.product.groupBy({ by: ['currency'], where: { accountId }, _count: { _all: true } });
    primary = p.sort((a, b) => b._count._all - a._count._all)[0]?.currency ?? 'USD';
  }

  const buckets = bucketsFor(period);
  const index = new Map(buckets.map((k, i) => [k, i]));
  const series = buckets.map((key) => ({ key, gross: 0, refunds: 0, orders: 0 }));
  for (const r of current.rows) {
    if (r.currency !== primary) continue;
    const i = index.get(bucketKey(r.at, period.bucket));
    if (i === undefined) continue;
    if (r.kind === 'sale') {
      series[i].gross += r.amountCents;
      series[i].orders += 1;
    } else {
      series[i].refunds += r.amountCents;
    }
  }

  return {
    period,
    currencies: currencies.length ? currencies : [primary],
    primary,
    totals: current.totals,
    previous: prev.totals,
    series,
    byMethod: breakdown(current.rows, (r) => r.method, labels.method),
    byProduct: breakdown(current.rows, (r) => r.product, (k) => k),
    byCountry: breakdown(current.rows, (r) => r.buyerCountry, labels.country),
    byCoupon: breakdown(current.rows, (r) => r.coupon, (k) => k),
    rows: current.rows,
  };
}

export { pctChange };
