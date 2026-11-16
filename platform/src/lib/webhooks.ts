import 'server-only';
import { createHmac } from 'node:crypto';
import { prisma } from './db';
import { entitlementsFor } from './entitlements';
import { afterAttempt, PAUSE_AFTER_FAILURES, type DeliveryStatus } from './webhook-schedule';

export const WEBHOOK_EVENTS = [
  'order.created',
  'order.awaiting_verification',
  'order.paid',
  'order.refunded',
  'order.cancelled',
  'order.shipped',
  'subscription.expiring',
  'subscription.expired',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/**
 * Outbound webhooks to merchant systems.
 *
 * Signed the way Stripe signs ours, because that is the scheme merchants have
 * already written a verifier for: a timestamp in the header, and an HMAC over
 * `timestamp.body` so a captured payload cannot be replayed a week later.
 *
 * Delivery is recorded before it is attempted, so a crash mid-flight leaves a
 * row to retry rather than a webhook that silently never happened. Failed
 * attempts are retried on the schedule in webhook-schedule.ts; each retry
 * carries the same delivery id so the receiver can ignore duplicates.
 */
export async function dispatchWebhook(
  accountId: string,
  event: WebhookEvent,
  payload: unknown,
): Promise<void> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { planTier: true, trialEndsAt: true },
  });
  if (!account || !entitlementsFor(account).webhooks) return;

  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { accountId, active: true },
  });
  const targets = endpoints.filter((e) => e.events.length === 0 || e.events.includes(event));
  if (targets.length > 0) {
    const deliveries = await Promise.all(
      targets.map((endpoint) =>
        prisma.webhookDelivery.create({
          data: { endpointId: endpoint.id, event, payload: payload as object, nextAttemptAt: new Date() },
          select: { id: true },
        }),
      ),
    );
    await Promise.all(deliveries.map((d) => attemptDelivery(d.id).catch(() => {})));
  }

  // Piggyback: anything of this merchant that is due a retry goes out now,
  // so retries do not depend only on the daily cron.
  await retryDueWebhooks({ accountId, limit: 5 }).catch(() => {});
}

/** Send a delivery once more and record what happened. */
export async function attemptDelivery(deliveryId: string): Promise<{ ok: boolean; status: DeliveryStatus }> {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { endpoint: true },
  });
  if (!delivery) return { ok: false, status: 'failed' };
  if (delivery.status === 'delivered') return { ok: true, status: 'delivered' };

  const { endpoint } = delivery;
  const attempts = delivery.attempts + 1;
  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({
    id: delivery.id,
    event: delivery.event,
    created: Math.floor(delivery.createdAt.getTime() / 1000),
    attempt: attempts,
    data: delivery.payload,
  });
  const signature = createHmac('sha256', endpoint.secret).update(`${timestamp}.${body}`).digest('hex');

  const started = Date.now();
  let responseCode: number | null = null;
  let responseBody: string | null = null;
  let error: string | null = null;
  try {
    const res = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MethodePay-Webhooks/1.1',
        'MethodePay-Signature': `t=${timestamp},v1=${signature}`,
        'MethodePay-Event': delivery.event,
        'MethodePay-Delivery': delivery.id,
        'MethodePay-Attempt': String(attempts),
      },
      body,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    });
    responseCode = res.status;
    responseBody = (await res.text().catch(() => '')).slice(0, 2000);
    if (!res.ok) error = `HTTP ${res.status}`;
  } catch (e) {
    error =
      e instanceof Error
        ? e.name === 'TimeoutError'
          ? 'Timed out after 10 seconds.'
          : e.message.slice(0, 500)
        : 'Unknown error';
  }

  const durationMs = Date.now() - started;
  const next = afterAttempt(attempts, responseCode);
  const now = new Date();

  await prisma.webhookDelivery.update({
    where: { id: delivery.id },
    data: {
      status: next.status,
      responseCode,
      responseBody,
      attempts,
      lastError: next.status === 'delivered' ? null : error,
      nextAttemptAt: next.nextAttemptAt,
      lastAttemptAt: now,
      deliveredAt: next.status === 'delivered' ? now : null,
      durationMs,
    },
  });

  if (next.status === 'delivered') {
    await prisma.webhookEndpoint.update({
      where: { id: endpoint.id },
      data: { failureStreak: 0, lastSuccessAt: now },
    });
  } else {
    const updated = await prisma.webhookEndpoint.update({
      where: { id: endpoint.id },
      data: { failureStreak: { increment: 1 }, lastFailureAt: now },
      select: { failureStreak: true, active: true },
    });
    // An endpoint that has been failing for a long time is paused, so its
    // backlog does not grow for ever. The merchant resumes it from the
    // webhook center once it is fixed; nothing is lost in the meantime.
    if (updated.active && updated.failureStreak >= PAUSE_AFTER_FAILURES) {
      await prisma.webhookEndpoint.update({
        where: { id: endpoint.id },
        data: {
          active: false,
          disabledReason: `Paused automatically after ${updated.failureStreak} failed attempts in a row.`,
        },
      });
    }
  }

  return { ok: next.status === 'delivered', status: next.status };
}

/**
 * Retry deliveries that are due. Called from the cron sweep, from every new
 * dispatch, and when the webhook center is opened.
 */
export async function retryDueWebhooks(
  opts: { accountId?: string; limit?: number } = {},
): Promise<{ attempted: number; delivered: number }> {
  const due = await prisma.webhookDelivery.findMany({
    where: {
      status: { in: ['retrying', 'pending'] },
      nextAttemptAt: { lte: new Date() },
      endpoint: { active: true, ...(opts.accountId ? { accountId: opts.accountId } : {}) },
    },
    orderBy: { nextAttemptAt: 'asc' },
    take: opts.limit ?? 100,
    select: { id: true },
  });
  let delivered = 0;
  for (const d of due) {
    const result = await attemptDelivery(d.id).catch(() => ({ ok: false }));
    if (result.ok) delivered += 1;
  }
  return { attempted: due.length, delivered };
}

/** A harmless event to check an endpoint, sent regardless of its filter. */
export async function sendTestWebhook(endpointId: string): Promise<{ ok: boolean; status: DeliveryStatus }> {
  const delivery = await prisma.webhookDelivery.create({
    data: {
      endpointId,
      event: 'test.ping',
      payload: { message: 'Test event from MethodePay. Reply with any 2xx status.' },
      nextAttemptAt: new Date(),
    },
    select: { id: true },
  });
  return attemptDelivery(delivery.id);
}

/** Send a delivery again as a fresh copy (a new id, a new retry budget). */
export async function resendDelivery(
  deliveryId: string,
): Promise<{ ok: boolean; status: DeliveryStatus } | null> {
  const original = await prisma.webhookDelivery.findUnique({ where: { id: deliveryId } });
  if (!original) return null;
  const copy = await prisma.webhookDelivery.create({
    data: {
      endpointId: original.endpointId,
      event: original.event,
      payload: original.payload as object,
      nextAttemptAt: new Date(),
    },
    select: { id: true },
  });
  return attemptDelivery(copy.id);
}

/**
 * Guard against a provider replaying the same event.
 *
 * Returns true the first time an event is seen and false afterwards, so a
 * caller can simply `if (!(await once(...))) return ok()`. The unique
 * constraint does the work, which means two concurrent retries cannot both
 * win the race.
 */
export async function once(source: string, externalId: string): Promise<boolean> {
  if (!externalId) return true;
  try {
    await prisma.processedEvent.create({ data: { source, externalId } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Release a claim taken by `once` when handling failed.
 *
 * The claim is taken before the work so two concurrent retries cannot both
 * process an event. If the work then throws, the claim has to go, or the
 * provider next retry would be mistaken for a duplicate and a real payment
 * would be dropped on the floor.
 */
export async function forget(source: string, externalId: string): Promise<void> {
  if (!externalId) return;
  await prisma.processedEvent
    .deleteMany({ where: { source, externalId } })
    .catch(() => {});
}
