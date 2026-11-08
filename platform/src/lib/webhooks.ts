import 'server-only';
import { createHmac } from 'node:crypto';
import { prisma } from './db';
import { entitlementsFor } from './entitlements';

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
 * row to retry rather than a webhook that silently never happened.
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
  if (endpoints.length === 0) return;

  await Promise.all(
    endpoints
      .filter((e) => e.events.length === 0 || e.events.includes(event))
      .map((endpoint) => deliver(endpoint.id, endpoint.url, endpoint.secret, event, payload)),
  );
}

async function deliver(
  endpointId: string,
  url: string,
  secret: string,
  event: WebhookEvent,
  payload: unknown,
): Promise<void> {
  const delivery = await prisma.webhookDelivery.create({
    data: { endpointId, event, payload: payload as object },
  });

  const body = JSON.stringify({ event, created: Math.floor(Date.now() / 1000), data: payload });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MethodePay-Webhooks/1.0',
        'MethodePay-Signature': `t=${timestamp},v1=${signature}`,
        'MethodePay-Event': event,
      },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });

    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: res.ok ? 'delivered' : 'failed',
        responseCode: res.status,
        attempts: 1,
        lastError: res.ok ? null : `HTTP ${res.status}`,
      },
    });
  } catch (error) {
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'failed',
        attempts: 1,
        lastError: error instanceof Error ? error.message.slice(0, 500) : 'Unknown error',
      },
    });
  }
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
