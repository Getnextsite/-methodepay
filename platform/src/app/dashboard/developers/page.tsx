import Link from 'next/link';
import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import { requireTenant, assertRole, ForbiddenError } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { mintApiKey } from '@/lib/api-keys';
import { randomToken } from '@/lib/crypto';
import { entitlementsFor } from '@/lib/entitlements';
import { env } from '@/lib/env';
import { WEBHOOK_EVENTS } from '@/lib/webhooks';
import { Banner, CopyBox, Field, PageHeader, Section } from '@/components/ui';
import { ActionForm, SubmitButton, type ActionState } from '@/components/action-form';

export const metadata: Metadata = { title: 'Developers' };

async function createKeyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  'use server';
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'OWNER');
    const ent = entitlementsFor(tenant.account);
    if (!ent.apiAccess) {
      return { error: `API access is part of the Professional plan. Your store is on ${ent.label}.` };
    }

    const scopes = formData.get('readOnly') === 'on' ? ['read'] : ['read', 'write'];
    const minted = await mintApiKey(tenant.account.id, String(formData.get('name') ?? ''), scopes);

    revalidatePath('/dashboard/developers');
    // Shown exactly once. We store only a hash, so this is genuinely the only
    // chance to copy it — and we can honestly say we cannot recover it later.
    return {
      message: `${minted.token}\n\nCopy it now. Only a hash is stored, so this key cannot be shown again.`,
    };
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }
}

async function revokeKeyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  'use server';
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'OWNER');
    await prisma.apiKey.updateMany({
      where: { id: String(formData.get('id') ?? ''), accountId: tenant.account.id },
      data: { revokedAt: new Date() },
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }
  revalidatePath('/dashboard/developers');
  return { message: 'Key revoked. Any call using it now fails.' };
}

async function saveWebhookAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  'use server';
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'ADMIN');
    const ent = entitlementsFor(tenant.account);
    if (!ent.webhooks) {
      return { error: `Webhooks are part of the Professional plan. Your store is on ${ent.label}.` };
    }

    const url = String(formData.get('url') ?? '').trim();
    if (!/^https:\/\//.test(url)) {
      return { error: 'Use an https endpoint — we will not post order data over plain http.' };
    }

    const events = formData.getAll('events').map(String).filter((e) => WEBHOOK_EVENTS.includes(e as never));

    await prisma.webhookEndpoint.create({
      data: { accountId: tenant.account.id, url, secret: randomToken(24), events },
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }
  revalidatePath('/dashboard/developers');
  return { message: 'Endpoint added.' };
}

async function deleteWebhookAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  'use server';
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'ADMIN');
    await prisma.webhookEndpoint.deleteMany({
      where: { id: String(formData.get('id') ?? ''), accountId: tenant.account.id },
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }
  revalidatePath('/dashboard/developers');
  return { message: 'Endpoint removed.' };
}

export default async function DevelopersPage() {
  const { account, role } = await requireTenant();
  const ent = entitlementsFor(account);

  const [keys, endpoints, deliveries] = await Promise.all([
    prisma.apiKey.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.webhookEndpoint.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.webhookDelivery.findMany({
      where: { endpoint: { accountId: account.id } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Developers"
        description="A REST API over your products, orders, subscriptions and coupons, plus signed webhooks when something happens."
      />

      {!ent.apiAccess ? (
        <Banner
          tone="info"
          action={
            <Link href="/dashboard/billing" className="btn-ghost !py-2 !text-xs">
              See plans
            </Link>
          }
        >
          The API and webhooks are part of the Professional plan. Your store is on {ent.label}.
        </Banner>
      ) : null}

      <div className="space-y-6">
        <Section title="API base" description="Authenticate with a bearer token.">
          <CopyBox value={`${env.appUrl}/api/v1`} />
          <pre className="mt-4 overflow-x-auto rounded-xl border border-ink-600 bg-ink-950 p-3.5 text-[11px] leading-relaxed text-ink-200">
            {`curl ${env.appUrl}/api/v1/orders?status=AWAITING_VERIFICATION \\
  -H "Authorization: Bearer mp_live_…"`}
          </pre>
          <ul className="mt-4 space-y-1 text-xs text-ink-300">
            <li><code className="text-mint">GET /v1/ping</code> — check a key and see your plan</li>
            <li><code className="text-mint">GET /v1/products</code> · <code className="text-mint">POST /v1/products</code></li>
            <li><code className="text-mint">GET /v1/orders</code> · <code className="text-mint">GET /v1/orders/:ref</code></li>
            <li><code className="text-mint">POST /v1/orders/:ref/paid</code> · <code className="text-mint">POST /v1/orders/:ref/refund</code></li>
            <li><code className="text-mint">GET /v1/subscriptions</code> · <code className="text-mint">GET /v1/customers</code></li>
            <li><code className="text-mint">GET /v1/coupons</code> · <code className="text-mint">POST /v1/coupons</code></li>
            <li><code className="text-mint">GET /v1/stats</code> — revenue and counts</li>
          </ul>
        </Section>

        {role === 'OWNER' ? (
          <Section
            title="API keys"
            description="Shown once at creation. Only a hash is stored, so a database leak hands over nothing usable."
          >
            <ActionForm action={createKeyAction} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[2fr_auto] sm:items-end">
                <Field label="Label" htmlFor="name" hint="What this key is for.">
                  <input id="name" name="name" className="input" placeholder="Zapier integration" />
                </Field>
                <SubmitButton>Create key</SubmitButton>
              </div>
              <label className="flex items-center gap-2.5 text-sm text-ink-200">
                <input type="checkbox" name="readOnly" className="h-4 w-4 accent-mint" />
                Read-only — cannot mark orders paid or change anything
              </label>
            </ActionForm>

            {keys.length > 0 ? (
              <ul className="mt-5 space-y-2.5 border-t border-ink-600/70 pt-5">
                {keys.map((key) => (
                  <li
                    key={key.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-ink-600/70 bg-ink-900/40 px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{key.name}</p>
                      <p className="font-mono text-xs text-ink-400">
                        mp_live_{key.prefix}… · {key.scopes.join(', ') || 'read, write'}
                        {key.lastUsedAt
                          ? ` · last used ${key.lastUsedAt.toISOString().slice(0, 10)}`
                          : ' · never used'}
                      </p>
                    </div>
                    {key.revokedAt ? (
                      <span className="chip shrink-0">Revoked</span>
                    ) : (
                      <ActionForm action={revokeKeyAction} className="shrink-0">
                        <input type="hidden" name="id" value={key.id} />
                        <SubmitButton
                          variant="danger"
                          className="!px-2.5 !py-1.5 !text-xs"
                          confirm="Revoke this key? Anything using it stops working immediately."
                        >
                          Revoke
                        </SubmitButton>
                      </ActionForm>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </Section>
        ) : null}

        <Section
          title="Webhooks"
          description="Signed the way Stripe signs theirs: MethodePay-Signature: t=…,v1=HMAC-SHA256 over timestamp.body, so a captured payload cannot be replayed later."
        >
          <ActionForm action={saveWebhookAction} className="space-y-4">
            <Field label="Endpoint URL" htmlFor="url" hint="https only.">
              <input
                id="url"
                name="url"
                type="url"
                className="input"
                placeholder="https://your-app.example.com/hooks/methodepay"
              />
            </Field>
            <fieldset>
              <legend className="label">Events</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <label key={event} className="flex items-center gap-2.5 text-xs text-ink-200">
                    <input type="checkbox" name="events" value={event} className="h-4 w-4 accent-mint" />
                    <code>{event}</code>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-400">Select none to receive everything.</p>
            </fieldset>
            <SubmitButton variant="ghost">Add endpoint</SubmitButton>
          </ActionForm>

          {endpoints.length > 0 ? (
            <ul className="mt-5 space-y-2.5 border-t border-ink-600/70 pt-5">
              {endpoints.map((endpoint) => (
                <li key={endpoint.id} className="rounded-xl border border-ink-600/70 bg-ink-900/40 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-white">{endpoint.url}</p>
                      <p className="mt-1 text-xs text-ink-400">
                        {endpoint.events.length === 0 ? 'all events' : endpoint.events.join(', ')}
                      </p>
                    </div>
                    <ActionForm action={deleteWebhookAction} className="shrink-0">
                      <input type="hidden" name="id" value={endpoint.id} />
                      <SubmitButton variant="danger" className="!px-2.5 !py-1.5 !text-xs" confirm="Remove this endpoint?">
                        Remove
                      </SubmitButton>
                    </ActionForm>
                  </div>
                  <div className="mt-3">
                    <CopyBox label="Signing secret" value={endpoint.secret} />
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>

        {deliveries.length > 0 ? (
          <Section title="Recent deliveries">
            <ul className="space-y-1.5 text-xs">
              {deliveries.map((delivery) => (
                <li key={delivery.id} className="flex items-center justify-between gap-3">
                  <code className="text-ink-200">{delivery.event}</code>
                  <span className="text-ink-400">
                    {delivery.createdAt.toISOString().slice(5, 16).replace('T', ' ')}
                  </span>
                  <span
                    className={
                      delivery.status === 'delivered' ? 'text-mint' : 'text-red-300'
                    }
                  >
                    {delivery.status}
                    {delivery.responseCode ? ` ${delivery.responseCode}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        <Section
          title="Scheduled jobs"
          description="Renewal reminders and expiry sweeps run when this endpoint is called. Point a cron service at it once a day."
        >
          <CopyBox value={`POST ${env.appUrl}/api/cron/renewals`} />
          <p className="mt-3 text-xs text-ink-400">
            Authenticate with <code className="text-mint">Authorization: Bearer $CRON_SECRET</code>,
            set in the deployment environment.
          </p>
        </Section>
      </div>
    </>
  );
}
