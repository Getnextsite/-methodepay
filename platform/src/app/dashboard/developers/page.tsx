import Link from 'next/link';
import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import { requireTenant, assertRole, ForbiddenError } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { mintApiKey } from '@/lib/api-keys';
import { entitlementsFor } from '@/lib/entitlements';
import { env } from '@/lib/env';
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

export default async function DevelopersPage() {
  const { account, role } = await requireTenant();
  const ent = entitlementsFor(account);

  const [keys, endpointCount] = await Promise.all([
    prisma.apiKey.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.webhookEndpoint.count({ where: { accountId: account.id } }),
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
          description="Signed notifications to your systems, with automatic retries, a delivery log and test events."
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-300">
              {endpointCount === 0
                ? 'No endpoint yet.'
                : `${endpointCount} endpoint${endpointCount === 1 ? '' : 's'} configured.`}
            </p>
            <Link href="/dashboard/webhooks" className="btn-ghost !py-2 !text-xs">
              Open the webhook center
            </Link>
          </div>
        </Section>

        <Section
          title="Scheduled jobs"
          description="Renewal reminders, abandoned checkout emails, crypto re-checks, webhook retries and provider checks run when these are called. Vercel calls them daily; an external cron calling the sweep every 5 to 15 minutes makes retries and alerts faster."
        >
          <div className="space-y-2">
            <CopyBox value={`POST ${env.appUrl}/api/cron/sweep`} />
            <CopyBox value={`POST ${env.appUrl}/api/cron/renewals`} />
          </div>
          <p className="mt-3 text-xs text-ink-400">
            Authenticate with <code className="text-mint">Authorization: Bearer $CRON_SECRET</code>,
            set in the deployment environment.
          </p>
        </Section>
      </div>
    </>
  );
}
