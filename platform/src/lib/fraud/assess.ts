import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { parseFraud, scoreRisk, type RiskAssessment } from './score';

/** The caller's IP and the country the edge geolocated it to. */
export function requestOrigin(request: Request): { ip: string | null; ipCountry: string | null } {
  const forwarded = request.headers.get('x-forwarded-for') ?? '';
  const ip = (forwarded.split(',')[0] || request.headers.get('x-real-ip') || '').trim().slice(0, 64) || null;
  const country = (request.headers.get('x-vercel-ip-country') ?? request.headers.get('cf-ipcountry') ?? '')
    .trim()
    .toUpperCase();
  return { ip, ipCountry: /^[A-Z]{2}$/.test(country) && country !== 'XX' ? country : null };
}

/**
 * Score a checkout before the order exists.
 *
 * Everything here is read from the database the merchant already has: no
 * third-party fraud service sees their buyers. The queries are bounded to one
 * account and a short time window, so this stays fast on a busy store.
 */
export async function assessCheckout(input: {
  accountId: string;
  email: string;
  name: string;
  amountCents: number;
  buyerCountry?: string | null;
  paymentMethod: string;
  ip: string | null;
  ipCountry: string | null;
}): Promise<RiskAssessment & { enabled: boolean }> {
  const settingsRow = await prisma.notificationSettings.findUnique({
    where: { accountId: input.accountId },
    select: { fraud: true },
  });
  const settings = parseFraud(settingsRow?.fraud);
  if (!settings.enabled) return { enabled: false, score: 0, level: 'low', reasons: [], blocked: false };

  const email = input.email.trim().toLowerCase();
  const hourAgo = new Date(Date.now() - 3_600_000);
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000);

  const [emailOrdersLastHour, ipOrdersLastHour, unpaidLastWeek, paidBefore, avg] = await Promise.all([
    prisma.order.count({ where: { accountId: input.accountId, buyerEmail: email, createdAt: { gte: hourAgo } } }),
    input.ip
      ? prisma.order.count({ where: { accountId: input.accountId, buyerIp: input.ip, createdAt: { gte: hourAgo } } })
      : Promise.resolve(0),
    prisma.order.count({
      where: {
        accountId: input.accountId,
        buyerEmail: email,
        createdAt: { gte: weekAgo },
        status: { in: ['PENDING', 'EXPIRED', 'CANCELLED'] },
      },
    }),
    prisma.order.count({ where: { accountId: input.accountId, buyerEmail: email, status: 'PAID' } }),
    prisma.order.aggregate({
      where: { accountId: input.accountId, status: 'PAID', createdAt: { gte: ninetyDaysAgo } },
      _avg: { amountCents: true },
      _count: { _all: true },
    }),
  ]);

  const assessment = scoreRisk(
    {
      email,
      name: input.name,
      amountCents: input.amountCents,
      buyerCountry: input.buyerCountry,
      ipCountry: input.ipCountry,
      ip: input.ip,
      emailOrdersLastHour,
      ipOrdersLastHour,
      unpaidLastWeek,
      paidBefore,
      // Ten sales is the least that makes an average worth comparing with.
      averageOrderCents: avg._count._all >= 10 ? Math.round(avg._avg.amountCents ?? 0) : 0,
      paymentMethod: input.paymentMethod,
    },
    settings,
  );
  return { ...assessment, enabled: true };
}

/** Keep a record of a refused checkout; no order exists for it. */
export async function recordBlocked(input: {
  accountId: string;
  productId: string;
  email: string;
  ip: string | null;
  country?: string | null;
  ipCountry: string | null;
  amountCents: number;
  currency: string;
  assessment: RiskAssessment;
}): Promise<void> {
  await prisma.blockedCheckout
    .create({
      data: {
        accountId: input.accountId,
        productId: input.productId,
        email: input.email.trim().toLowerCase().slice(0, 190),
        ip: input.ip,
        country: input.country?.toUpperCase().slice(0, 2) || null,
        ipCountry: input.ipCountry,
        amountCents: input.amountCents,
        currency: input.currency,
        score: input.assessment.score,
        reasons: input.assessment.reasons,
      },
    })
    .catch(() => {});
}

/**
 * The buyer has quoted a payment reference that another order already used.
 * On a manual rail that usually means one bank transfer being claimed twice.
 */
export async function flagReusedReference(orderId: string): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, accountId: true, paymentReference: true, riskScore: true, meta: true },
  });
  const reference = order?.paymentReference?.trim() ?? '';
  if (!order || reference.length < 6) return false;

  const other = await prisma.order.findFirst({
    where: {
      accountId: order.accountId,
      id: { not: order.id },
      paymentReference: { equals: reference, mode: 'insensitive' },
    },
    select: { ref: true },
  });
  if (!other) return false;

  const meta = (order.meta && typeof order.meta === 'object' ? order.meta : {}) as Record<string, unknown>;
  const risk = (meta.risk && typeof meta.risk === 'object' ? meta.risk : {}) as Record<string, unknown>;
  const reasons = (Array.isArray(risk.reasons) ? risk.reasons : []) as Prisma.InputJsonValue[];
  const label = `The payment reference was already used on order ${other.ref}.`;
  await prisma.order.update({
    where: { id: order.id },
    data: {
      riskScore: Math.max(order.riskScore ?? 0, 80),
      riskLevel: 'high',
      meta: { ...meta, risk: { ...risk, reasons: [...reasons, { code: 'reference_reused', points: 80, label }] } } as Prisma.InputJsonObject,
      events: { create: { type: 'risk_flagged', actor: 'system', note: label } },
    },
  });
  return true;
}
