import 'server-only';
import { prisma } from './db';

/**
 * Everything the Overview screen draws, in one place and a handful of
 * queries. Money is counted on the day it arrived (the "paid" event) and in
 * the store's main currency only; other currencies are never added in.
 */

const DAY = 86_400_000;

function monthKey(d: Date) {
  return d.toISOString().slice(0, 7);
}
function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export type FlowRow = { key: string; cells: { month: string; cents: number; orders: number }[]; total: number };

export type Overview = {
  currency: string;
  months: string[];
  thisMonth: string;
  moneyIn: { thisMonth: number; lastMonth: number; byMonth: number[] };
  refunds: { thisMonth: number; lastMonth: number };
  allTime: { cents: number; orders: number };
  paidOrders: { thisMonth: number; lastMonth: number };
  weekly: { revenue: number[]; refunds: number[]; orders: number[]; started: number[] };
  flow: FlowRow[];
  refundRow: FlowRow;
  conversion: { started: number; paid: number; awaiting: number };
  heatmap: { days: { date: string; orders: number; cents: number }[]; max: number };
};

export async function loadOverview(accountId: string, now = new Date()): Promise<Overview> {
  const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const flowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 6, 1));
  const today = startOfUtcDay(now);
  // 26 full weeks ending this week (weeks start on Monday).
  const weekday = (today.getUTCDay() + 6) % 7;
  const heatStart = new Date(today.getTime() - (weekday + 25 * 7) * DAY);
  const weeksStart = new Date(today.getTime() - (weekday + 11 * 7) * DAY);
  const earliest = new Date(Math.min(flowStart.getTime(), heatStart.getTime()));

  const currencies = await prisma.order.groupBy({
    by: ['currency'],
    where: { accountId, status: { in: ['PAID', 'REFUNDED'] } },
    _count: { _all: true },
  });
  let currency = currencies.sort((a, b) => b._count._all - a._count._all)[0]?.currency;
  if (!currency) {
    const p = await prisma.product.groupBy({ by: ['currency'], where: { accountId }, _count: { _all: true } });
    currency = p.sort((a, b) => b._count._all - a._count._all)[0]?.currency ?? 'USD';
  }

  const [events, allTime, started, awaiting] = await Promise.all([
    prisma.orderEvent.findMany({
      where: { type: { in: ['paid', 'refunded'] }, createdAt: { gte: earliest }, order: { accountId, currency } },
      select: { type: true, createdAt: true, order: { select: { id: true, amountCents: true, paymentMethod: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.order.aggregate({
      where: { accountId, currency, status: 'PAID' },
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
    prisma.order.findMany({
      where: { accountId, createdAt: { gte: weeksStart < thisMonthStart ? weeksStart : thisMonthStart } },
      select: { createdAt: true, status: true },
    }),
    prisma.order.count({ where: { accountId, status: 'AWAITING_VERIFICATION' } }),
  ]);

  // One paid and one refund per order at most, whatever the event log holds.
  const seen = new Set<string>();
  const rows = events.filter((e) => {
    const k = `${e.type}:${e.order.id}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const months: string[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    months.push(monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))));
  }
  const thisMonth = months[6];
  const lastMonth = months[5];

  const byMonth = months.map(() => 0);
  const weekly = {
    revenue: Array(12).fill(0) as number[],
    refunds: Array(12).fill(0) as number[],
    orders: Array(12).fill(0) as number[],
    started: Array(12).fill(0) as number[],
  };
  const methodCells = new Map<string, Map<string, { cents: number; orders: number }>>();
  const refundCells = new Map<string, { cents: number; orders: number }>();
  const heat = new Map<string, { orders: number; cents: number }>();
  let inThis = 0;
  let inLast = 0;
  let refThis = 0;
  let refLast = 0;
  let paidThis = 0;
  let paidLast = 0;

  for (const e of rows) {
    const m = monthKey(e.createdAt);
    const cents = e.order.amountCents;
    const week = Math.floor((startOfUtcDay(e.createdAt).getTime() - weeksStart.getTime()) / (7 * DAY));
    if (e.type === 'paid') {
      const mi = months.indexOf(m);
      if (mi >= 0) {
        byMonth[mi] += cents;
        const method = e.order.paymentMethod ?? 'other';
        const cells = methodCells.get(method) ?? new Map();
        const c = cells.get(m) ?? { cents: 0, orders: 0 };
        c.cents += cents;
        c.orders += 1;
        cells.set(m, c);
        methodCells.set(method, cells);
      }
      if (m === thisMonth) {
        inThis += cents;
        paidThis += 1;
      }
      if (m === lastMonth) {
        inLast += cents;
        paidLast += 1;
      }
      if (week >= 0 && week < 12) {
        weekly.revenue[week] += cents;
        weekly.orders[week] += 1;
      }
      if (e.createdAt >= heatStart) {
        const d = e.createdAt.toISOString().slice(0, 10);
        const h = heat.get(d) ?? { orders: 0, cents: 0 };
        h.orders += 1;
        h.cents += cents;
        heat.set(d, h);
      }
    } else {
      if (months.includes(m)) {
        const c = refundCells.get(m) ?? { cents: 0, orders: 0 };
        c.cents += cents;
        c.orders += 1;
        refundCells.set(m, c);
      }
      if (m === thisMonth) refThis += cents;
      if (m === lastMonth) refLast += cents;
      if (week >= 0 && week < 12) weekly.refunds[week] += cents;
    }
  }

  for (const o of started) {
    const week = Math.floor((startOfUtcDay(o.createdAt).getTime() - weeksStart.getTime()) / (7 * DAY));
    if (week >= 0 && week < 12) weekly.started[week] += 1;
  }
  const startedThisMonth = started.filter((o) => o.createdAt >= thisMonthStart);
  const paidOfStarted = startedThisMonth.filter((o) => o.status === 'PAID' || o.status === 'REFUNDED').length;

  const toRow = (key: string, cells: Map<string, { cents: number; orders: number }>): FlowRow => {
    const list = months.map((month) => ({ month, ...(cells.get(month) ?? { cents: 0, orders: 0 }) }));
    return { key, cells: list, total: list.reduce((s, c) => s + c.cents, 0) };
  };
  // The five rails that brought in the most, then everything else together.
  const ranked = [...methodCells.entries()]
    .map(([k, cells]) => toRow(k, cells))
    .sort((a, b) => b.total - a.total);
  let flow = ranked.slice(0, 5);
  if (ranked.length > 5) {
    const other = new Map<string, { cents: number; orders: number }>();
    for (const r of ranked.slice(5)) {
      for (const c of r.cells) {
        const o = other.get(c.month) ?? { cents: 0, orders: 0 };
        o.cents += c.cents;
        o.orders += c.orders;
        other.set(c.month, o);
      }
    }
    flow = [...flow, toRow('other', other)];
  }

  const days: { date: string; orders: number; cents: number }[] = [];
  for (let t = heatStart.getTime(); t <= today.getTime(); t += DAY) {
    const date = new Date(t).toISOString().slice(0, 10);
    days.push({ date, ...(heat.get(date) ?? { orders: 0, cents: 0 }) });
  }

  return {
    currency,
    months,
    thisMonth,
    moneyIn: { thisMonth: inThis, lastMonth: inLast, byMonth },
    refunds: { thisMonth: refThis, lastMonth: refLast },
    allTime: { cents: allTime._sum.amountCents ?? 0, orders: allTime._count._all },
    paidOrders: { thisMonth: paidThis, lastMonth: paidLast },
    weekly,
    flow,
    refundRow: toRow('refunds', refundCells),
    conversion: { started: startedThisMonth.length, paid: paidOfStarted, awaiting },
    heatmap: { days, max: Math.max(1, ...days.map((d) => d.orders)) },
  };
}
