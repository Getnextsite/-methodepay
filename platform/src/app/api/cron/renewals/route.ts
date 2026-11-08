import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { loadMerchantContext } from '@/lib/gateway/context';
import { notifyRenewalReminder } from '@/lib/notifier';
import { dispatchWebhook } from '@/lib/webhooks';
import { entitlementsFor } from '@/lib/entitlements';
import { safeEqual } from '@/lib/crypto';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Daily renewal pass.
 *
 * Idempotent by design: each order records which reminder days it has already
 * been sent, so running this twice in a day does not email a customer twice,
 * and a day the job did not run is simply caught up on the next pass.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET ?? '';
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not set, so this endpoint is disabled.' },
      { status: 503 },
    );
  }

  const header = request.headers.get('authorization') ?? '';
  const presented = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  if (!presented || !safeEqual(presented, secret)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const now = Date.now();
  let remindersSent = 0;
  let expired = 0;

  // Lapsed access first: a customer whose subscription ended yesterday should
  // not get a "3 days left" email today.
  const lapsed = await prisma.order.findMany({
    where: {
      status: 'PAID',
      renewalState: 'ACTIVE',
      serviceExpiresAt: { lte: new Date(now) },
    },
    include: { product: true },
    take: 500,
  });

  for (const order of lapsed) {
    await prisma.order.update({ where: { id: order.id }, data: { renewalState: 'EXPIRED' } });
    expired += 1;

    const ctx = await loadMerchantContext(order.accountId);
    if (ctx.notifications.renewalsEnabled && entitlementsFor(ctx.account).renewals) {
      const sent = await notifyRenewalReminder(
        ctx,
        order,
        order.product,
        0,
        `${env.checkoutUrl}/renew/${order.ref}`,
      ).catch(() => false);
      if (sent) remindersSent += 1;
    }
    await dispatchWebhook(order.accountId, 'subscription.expired', {
      order_ref: order.ref,
      customer: order.buyerEmail,
      product: order.product.name,
    });
  }

  // Upcoming expiries, inside the widest reminder window any merchant uses.
  const upcoming = await prisma.order.findMany({
    where: {
      status: 'PAID',
      renewalState: 'ACTIVE',
      serviceExpiresAt: { gt: new Date(now), lte: new Date(now + 31 * 86_400_000) },
    },
    include: { product: true },
    take: 1000,
  });

  // Group by account so settings load once per merchant, not once per order.
  const contexts = new Map<string, Awaited<ReturnType<typeof loadMerchantContext>>>();

  for (const order of upcoming) {
    let ctx = contexts.get(order.accountId);
    if (!ctx) {
      ctx = await loadMerchantContext(order.accountId);
      contexts.set(order.accountId, ctx);
    }
    if (!ctx.notifications.renewalsEnabled) continue;
    if (!entitlementsFor(ctx.account).renewals) continue;

    const days = ctx.notifications.renewReminderDays
      .split(',')
      .map((d) => Number(d.trim()))
      .filter((d) => Number.isFinite(d) && d >= 0)
      .sort((a, b) => b - a);

    const daysLeft = Math.ceil(
      ((order.serviceExpiresAt as Date).getTime() - now) / 86_400_000,
    );
    const due = days.find((d) => d === daysLeft);
    if (due === undefined) continue;

    const alreadySent = order.remindersSent.split(',').filter(Boolean);
    if (alreadySent.includes(String(due))) continue;

    const sent = await notifyRenewalReminder(
      ctx,
      order,
      order.product,
      daysLeft,
      `${env.checkoutUrl}/renew/${order.ref}`,
    ).catch(() => false);

    if (sent) {
      remindersSent += 1;
      await prisma.order.update({
        where: { id: order.id },
        data: { remindersSent: [...alreadySent, String(due)].join(',') },
      });
      await dispatchWebhook(order.accountId, 'subscription.expiring', {
        order_ref: order.ref,
        customer: order.buyerEmail,
        product: order.product.name,
        days_left: daysLeft,
      });
    }
  }

  // Abandoned checkouts: tidy them up so the orders list reflects reality.
  const staleExpired = await prisma.order.updateMany({
    where: { status: 'PENDING', expiresAt: { lt: new Date(now) } },
    data: { status: 'EXPIRED' },
  });

  return NextResponse.json({
    ok: true,
    reminders_sent: remindersSent,
    subscriptions_expired: expired,
    stale_orders_expired: staleExpired.count,
  });
}
