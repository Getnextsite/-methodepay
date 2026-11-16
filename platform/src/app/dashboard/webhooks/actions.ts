'use server';

import { revalidatePath } from 'next/cache';
import { requireTenant, assertRole, ForbiddenError, type Tenant } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { randomToken } from '@/lib/crypto';
import { entitlementsFor } from '@/lib/entitlements';
import { WEBHOOK_EVENTS, attemptDelivery, resendDelivery, sendTestWebhook } from '@/lib/webhooks';
import type { ActionState } from '@/components/action-form';

async function admin(): Promise<Tenant> {
  const tenant = await requireTenant();
  assertRole(tenant, 'ADMIN');
  return tenant;
}

async function guard(run: (tenant: Tenant) => Promise<ActionState>): Promise<ActionState> {
  try {
    const tenant = await admin();
    const result = await run(tenant);
    revalidatePath('/dashboard/webhooks', 'layout');
    return result;
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }
}

/** The endpoint, only if it belongs to the signed-in merchant. */
async function ownEndpoint(tenant: Tenant, id: string) {
  return prisma.webhookEndpoint.findFirst({ where: { id, accountId: tenant.account.id } });
}

async function ownDelivery(tenant: Tenant, id: string) {
  return prisma.webhookDelivery.findFirst({ where: { id, endpoint: { accountId: tenant.account.id } } });
}

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === 'localhost' ||
    h.endsWith('.localhost') ||
    h.endsWith('.local') ||
    h.endsWith('.internal') ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    h === '[::1]' ||
    h.startsWith('[fc') ||
    h.startsWith('[fd')
  );
}

export async function addEndpointAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return guard(async (tenant) => {
    const ent = entitlementsFor(tenant.account);
    if (!ent.webhooks) return { error: `Webhooks are part of the Professional plan. Your store is on ${ent.label}.` };

    const raw = String(formData.get('url') ?? '').trim();
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return { error: 'Enter a full URL, starting with https://' };
    }
    if (url.protocol !== 'https:') return { error: 'Use an https endpoint. Order data is never posted over plain http.' };
    // Webhooks are sent from our servers; an internal address would point
    // them at our own network instead of the merchant's.
    if (isPrivateHost(url.hostname)) return { error: 'That address is not reachable from the internet.' };

    const count = await prisma.webhookEndpoint.count({ where: { accountId: tenant.account.id } });
    if (count >= 10) return { error: 'You can have up to 10 endpoints. Remove one first.' };

    const events = formData
      .getAll('events')
      .map(String)
      .filter((e) => (WEBHOOK_EVENTS as readonly string[]).includes(e));
    const description = String(formData.get('description') ?? '').trim().slice(0, 120) || null;

    await prisma.webhookEndpoint.create({
      data: { accountId: tenant.account.id, url: url.toString(), secret: randomToken(24), events, description },
    });
    return { message: 'Endpoint added. Send a test event to check it.' };
  });
}

export async function updateEventsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return guard(async (tenant) => {
    const endpoint = await ownEndpoint(tenant, String(formData.get('id') ?? ''));
    if (!endpoint) return { error: 'That endpoint no longer exists.' };
    const events = formData
      .getAll('events')
      .map(String)
      .filter((e) => (WEBHOOK_EVENTS as readonly string[]).includes(e));
    await prisma.webhookEndpoint.update({ where: { id: endpoint.id }, data: { events } });
    return { message: events.length ? `Now sending ${events.length} event type${events.length === 1 ? '' : 's'}.` : 'Now sending every event.' };
  });
}

export async function deleteEndpointAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return guard(async (tenant) => {
    await prisma.webhookEndpoint.deleteMany({ where: { id: String(formData.get('id') ?? ''), accountId: tenant.account.id } });
    return { message: 'Endpoint removed, with its delivery history.' };
  });
}

export async function toggleEndpointAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return guard(async (tenant) => {
    const endpoint = await ownEndpoint(tenant, String(formData.get('id') ?? ''));
    if (!endpoint) return { error: 'That endpoint no longer exists.' };
    if (endpoint.active) {
      await prisma.webhookEndpoint.update({
        where: { id: endpoint.id },
        data: { active: false, disabledReason: 'Paused by you.' },
      });
      return { message: 'Paused. Events are not sent while it is paused.' };
    }
    await prisma.webhookEndpoint.update({
      where: { id: endpoint.id },
      data: { active: true, disabledReason: null, failureStreak: 0 },
    });
    // Anything that was waiting goes out on the next run, not in a day.
    await prisma.webhookDelivery.updateMany({
      where: { endpointId: endpoint.id, status: 'retrying' },
      data: { nextAttemptAt: new Date() },
    });
    return { message: 'Resumed. Waiting retries will be sent on the next run.' };
  });
}

export async function rotateSecretAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return guard(async (tenant) => {
    const endpoint = await ownEndpoint(tenant, String(formData.get('id') ?? ''));
    if (!endpoint) return { error: 'That endpoint no longer exists.' };
    await prisma.webhookEndpoint.update({ where: { id: endpoint.id }, data: { secret: randomToken(24) } });
    return { message: 'New signing secret created. Update it on your server; the old one no longer verifies.' };
  });
}

export async function sendTestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return guard(async (tenant) => {
    const endpoint = await ownEndpoint(tenant, String(formData.get('id') ?? ''));
    if (!endpoint) return { error: 'That endpoint no longer exists.' };
    const result = await sendTestWebhook(endpoint.id);
    const last = await prisma.webhookDelivery.findFirst({
      where: { endpointId: endpoint.id, event: 'test.ping' },
      orderBy: { createdAt: 'desc' },
      select: { responseCode: true, lastError: true, durationMs: true },
    });
    if (result.ok) return { message: `Delivered: HTTP ${last?.responseCode} in ${last?.durationMs} ms.` };
    return { error: `Not delivered: ${last?.lastError ?? 'no response'}. It will be retried on the normal schedule.` };
  });
}

export async function retryNowAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return guard(async (tenant) => {
    const delivery = await ownDelivery(tenant, String(formData.get('id') ?? ''));
    if (!delivery) return { error: 'That delivery no longer exists.' };
    if (delivery.status === 'delivered') return { message: 'Already delivered.' };
    const result = await attemptDelivery(delivery.id);
    return result.ok ? { message: 'Delivered.' } : { error: 'Still failing. See the response below.' };
  });
}

export async function resendAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return guard(async (tenant) => {
    const delivery = await ownDelivery(tenant, String(formData.get('id') ?? ''));
    if (!delivery) return { error: 'That delivery no longer exists.' };
    const result = await resendDelivery(delivery.id);
    return result?.ok ? { message: 'Sent again as a new delivery, and delivered.' } : { error: 'Sent again as a new delivery, but it failed. It will be retried.' };
  });
}

export async function retryAllFailedAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return guard(async (tenant) => {
    const endpoint = await ownEndpoint(tenant, String(formData.get('id') ?? ''));
    if (!endpoint) return { error: 'That endpoint no longer exists.' };
    const since = new Date(Date.now() - 7 * 86_400_000);
    const { count } = await prisma.webhookDelivery.updateMany({
      where: { endpointId: endpoint.id, status: { in: ['failed', 'retrying'] }, createdAt: { gte: since } },
      data: { status: 'retrying', nextAttemptAt: new Date(), attempts: 0 },
    });
    if (count === 0) return { message: 'Nothing failed in the last 7 days.' };
    return { message: `${count} deliver${count === 1 ? 'y' : 'ies'} queued. They go out on the next run, or open this page again in a moment.` };
  });
}
