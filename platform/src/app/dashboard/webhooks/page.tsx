import type { Metadata } from 'next';
import Link from 'next/link';
import { requireTenant } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { entitlementsFor } from '@/lib/entitlements';
import { WEBHOOK_EVENTS, retryDueWebhooks } from '@/lib/webhooks';
import { MAX_ATTEMPTS, RETRY_DELAYS_MS, describeDelay } from '@/lib/webhook-schedule';
import { Banner, CopyBox, Field, PageHeader, Section, StatTile } from '@/components/ui';
import { ActionForm, SubmitButton } from '@/components/action-form';
import { DeliveryStatus } from '@/components/delivery-status';
import {
  addEndpointAction,
  deleteEndpointAction,
  retryAllFailedAction,
  rotateSecretAction,
  sendTestAction,
  toggleEndpointAction,
  updateEventsAction,
} from './actions';

export const metadata: Metadata = { title: 'Webhooks' };
export const dynamic = 'force-dynamic';

function when(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 16).replace('T', ' ') : '—';
}

const PAGE_SIZE = 40;

export default async function WebhooksPage({
  searchParams,
}: {
  searchParams: { status?: string; endpoint?: string; event?: string; page?: string };
}) {
  const { account, role } = await requireTenant();
  const ent = entitlementsFor(account);
  const canEdit = role === 'OWNER' || role === 'ADMIN';

  // Anything due goes out now, so opening the page is enough to flush the
  // queue even on a plan where the scheduler only runs once a day.
  await retryDueWebhooks({ accountId: account.id, limit: 3 }).catch(() => {});

  const since = new Date(Date.now() - 7 * 86_400_000);
  const status = ['delivered', 'retrying', 'failed', 'pending'].includes(searchParams.status ?? '') ? searchParams.status : undefined;
  const page = Math.max(1, Number(searchParams.page) || 1);

  const where = {
    endpoint: { accountId: account.id },
    ...(status ? { status } : {}),
    ...(searchParams.endpoint ? { endpointId: searchParams.endpoint } : {}),
    ...(searchParams.event ? { event: searchParams.event } : {}),
  };

  const [endpoints, stats, latency, deliveries, total, queued] = await Promise.all([
    prisma.webhookEndpoint.findMany({ where: { accountId: account.id }, orderBy: { createdAt: 'asc' } }),
    prisma.webhookDelivery.groupBy({
      by: ['endpointId', 'status'],
      where: { endpoint: { accountId: account.id }, createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.webhookDelivery.groupBy({
      by: ['endpointId'],
      where: { endpoint: { accountId: account.id }, createdAt: { gte: since }, status: 'delivered' },
      _avg: { durationMs: true },
    }),
    prisma.webhookDelivery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: { endpoint: { select: { url: true } } },
    }),
    prisma.webhookDelivery.count({ where }),
    prisma.webhookDelivery.count({ where: { endpoint: { accountId: account.id }, status: 'retrying' } }),
  ]);

  const countFor = (endpointId: string | null, s?: string) =>
    stats
      .filter((r) => (endpointId === null || r.endpointId === endpointId) && (!s || r.status === s))
      .reduce((sum, r) => sum + r._count._all, 0);
  const all7 = countFor(null);
  const ok7 = countFor(null, 'delivered');
  const failed7 = countFor(null, 'failed');
  const rate = (endpointId: string | null) => {
    const finished = countFor(endpointId, 'delivered') + countFor(endpointId, 'failed');
    return finished ? Math.round((countFor(endpointId, 'delivered') / finished) * 1000) / 10 : null;
  };
  const overall = rate(null);

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status, endpoint: searchParams.endpoint, event: searchParams.event, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return `/dashboard/webhooks${s ? `?${s}` : ''}`;
  };
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Webhooks"
        description="Signed notifications to your own systems whenever something happens to an order. Failed deliveries are retried automatically."
        action={
          <Link href="/dashboard/developers" className="btn-ghost !py-2 !text-xs">
            API keys
          </Link>
        }
      />

      {!ent.webhooks ? (
        <Banner
          tone="info"
          action={
            <Link href="/dashboard/billing" className="btn-ghost !py-2 !text-xs">
              See plans
            </Link>
          }
        >
          Webhooks are part of the Professional plan. Your store is on {ent.label}.
        </Banner>
      ) : null}

      {endpoints.some((e) => !e.active && e.disabledReason?.startsWith('Paused automatically')) ? (
        <Banner tone="warn">
          An endpoint was paused because it kept failing. Fix it, then press Resume: everything that failed in the meantime can be sent again.
        </Banner>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Sent (7 days)" value={String(all7)} />
        <StatTile label="Success rate" value={overall === null ? '—' : `${overall}%`} tone={overall !== null && overall < 95 ? 'warn' : 'good'} />
        <StatTile label="Waiting to retry" value={String(queued)} tone={queued ? 'warn' : 'default'} />
        <StatTile label="Failed for good (7 days)" value={String(failed7)} tone={failed7 ? 'warn' : 'default'} hint={`${ok7} delivered`} />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Section title="Endpoints" description={endpoints.length ? undefined : 'No endpoint yet. Add one on the right.'}>
          {endpoints.length === 0 ? (
            <p className="text-sm text-ink-400">Nothing is being sent.</p>
          ) : (
            <ul className="space-y-4">
              {endpoints.map((endpoint) => {
                const r = rate(endpoint.id);
                const avg = latency.find((l) => l.endpointId === endpoint.id)?._avg.durationMs;
                return (
                  <li key={endpoint.id} className="rounded-xl border border-ink-600/70 bg-ink-900/40 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              !endpoint.active ? 'bg-ink-400' : endpoint.failureStreak >= 3 ? 'bg-red-400' : endpoint.failureStreak > 0 ? 'bg-amber-300' : 'bg-mint'
                            }`}
                            aria-hidden
                          />
                          <span className="truncate font-mono text-xs text-white">{endpoint.url}</span>
                        </p>
                        {endpoint.description ? <p className="mt-1 text-xs text-ink-300">{endpoint.description}</p> : null}
                        <p className="mt-1 text-xs text-ink-400">
                          {endpoint.active ? 'Active' : endpoint.disabledReason ?? 'Paused'} ·{' '}
                          {r === null ? 'no deliveries this week' : `${r}% delivered this week`}
                          {avg ? ` · ${Math.round(avg)} ms average` : ''}
                          {endpoint.failureStreak > 0 ? ` · ${endpoint.failureStreak} failures in a row` : ''}
                        </p>
                        <p className="mt-1 text-xs text-ink-400">
                          Last success {when(endpoint.lastSuccessAt)} · last failure {when(endpoint.lastFailureAt)}
                        </p>
                      </div>
                      {canEdit ? (
                        <div className="flex flex-wrap gap-2">
                          <ActionForm action={sendTestAction} className="">
                            <input type="hidden" name="id" value={endpoint.id} />
                            <SubmitButton variant="ghost" className="!px-2.5 !py-1.5 !text-xs">
                              Send test
                            </SubmitButton>
                          </ActionForm>
                          <ActionForm action={toggleEndpointAction} className="">
                            <input type="hidden" name="id" value={endpoint.id} />
                            <SubmitButton variant="ghost" className="!px-2.5 !py-1.5 !text-xs">
                              {endpoint.active ? 'Pause' : 'Resume'}
                            </SubmitButton>
                          </ActionForm>
                          <ActionForm action={retryAllFailedAction} className="">
                            <input type="hidden" name="id" value={endpoint.id} />
                            <SubmitButton variant="ghost" className="!px-2.5 !py-1.5 !text-xs">
                              Retry failed
                            </SubmitButton>
                          </ActionForm>
                        </div>
                      ) : null}
                    </div>

                    <details className="mt-3 text-xs">
                      <summary className="cursor-pointer text-ink-300 hover:text-white">
                        {endpoint.events.length === 0 ? 'All events' : `${endpoint.events.length} event type${endpoint.events.length === 1 ? '' : 's'}`} · signing secret
                      </summary>
                      <div className="mt-3 space-y-4">
                        <CopyBox label="Signing secret" value={endpoint.secret} />
                        {canEdit ? (
                          <>
                            <ActionForm action={updateEventsAction} className="space-y-3">
                              <input type="hidden" name="id" value={endpoint.id} />
                              <div className="grid gap-2 sm:grid-cols-2">
                                {WEBHOOK_EVENTS.map((event) => (
                                  <label key={event} className="flex items-center gap-2.5 text-ink-200">
                                    <input
                                      type="checkbox"
                                      name="events"
                                      value={event}
                                      defaultChecked={endpoint.events.includes(event)}
                                      className="h-4 w-4 accent-mint"
                                    />
                                    <code>{event}</code>
                                  </label>
                                ))}
                              </div>
                              <p className="text-ink-400">Tick none to receive every event.</p>
                              <SubmitButton variant="ghost" className="!px-2.5 !py-1.5 !text-xs">
                                Save events
                              </SubmitButton>
                            </ActionForm>
                            <div className="flex flex-wrap gap-2 border-t border-ink-600/60 pt-3">
                              <ActionForm action={rotateSecretAction} className="">
                                <input type="hidden" name="id" value={endpoint.id} />
                                <SubmitButton
                                  variant="ghost"
                                  className="!px-2.5 !py-1.5 !text-xs"
                                  confirm="Create a new signing secret? Your server must be updated, or it will reject every event."
                                >
                                  Rotate secret
                                </SubmitButton>
                              </ActionForm>
                              <ActionForm action={deleteEndpointAction} className="">
                                <input type="hidden" name="id" value={endpoint.id} />
                                <SubmitButton
                                  variant="danger"
                                  className="!px-2.5 !py-1.5 !text-xs"
                                  confirm="Remove this endpoint and its delivery history?"
                                >
                                  Remove
                                </SubmitButton>
                              </ActionForm>
                            </div>
                          </>
                        ) : null}
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <div className="space-y-6">
          {canEdit ? (
            <Section title="Add an endpoint">
              <ActionForm action={addEndpointAction} className="space-y-4">
                <Field label="Endpoint URL" htmlFor="url" hint="https only.">
                  <input id="url" name="url" type="url" required className="input" placeholder="https://your-app.example.com/hooks/methodepay" />
                </Field>
                <Field label="Description" htmlFor="description" hint="Optional, for your own reference.">
                  <input id="description" name="description" className="input" placeholder="Order sync to our CRM" />
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
                  <p className="mt-2 text-xs text-ink-400">Tick none to receive everything.</p>
                </fieldset>
                <SubmitButton>Add endpoint</SubmitButton>
              </ActionForm>
            </Section>
          ) : null}

          <Section title="How delivery works">
            <ul className="space-y-2 text-xs leading-relaxed text-ink-300">
              <li>
                Each event is a <code className="text-mint">POST</code> with a JSON body:{' '}
                <code className="text-ink-100">{'{ id, event, created, attempt, data }'}</code>.
              </li>
              <li>
                Verify <code className="text-mint">MethodePay-Signature: t=…,v1=…</code>: an HMAC-SHA256 of{' '}
                <code className="text-ink-100">timestamp.body</code> with the endpoint secret.
              </li>
              <li>
                Reply with any 2xx within 10 seconds. Use <code className="text-mint">MethodePay-Delivery</code> (the same on every retry) to ignore duplicates.
              </li>
              <li>
                Failures are retried {MAX_ATTEMPTS - 1} times, after {RETRY_DELAYS_MS.map(describeDelay).join(', ')}. A 4xx reply (except 408, 409, 425 and 429) is not retried.
              </li>
              <li>An endpoint that fails 20 times in a row is paused, and nothing is lost: resume it and retry the failures.</li>
            </ul>
          </Section>
        </div>
      </div>

      <Section title="Delivery log" description="Every attempt is kept with the response your server gave.">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          {[undefined, 'delivered', 'retrying', 'failed'].map((s) => (
            <Link
              key={s ?? 'all'}
              href={qs({ status: s, page: undefined })}
              className={`rounded-full border px-3 py-1.5 ${status === s ? 'border-mint/50 bg-mint/10 text-mint' : 'border-ink-600 text-ink-200 hover:text-white'}`}
            >
              {s ?? 'All'}
            </Link>
          ))}
          <form action="/dashboard/webhooks" className="ml-auto flex flex-wrap items-center gap-2">
            {status ? <input type="hidden" name="status" value={status} /> : null}
            <select name="endpoint" defaultValue={searchParams.endpoint ?? ''} className="input !w-auto !py-1.5 !text-xs" aria-label="Endpoint">
              <option value="">All endpoints</option>
              {endpoints.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.url.replace(/^https:\/\//, '').slice(0, 40)}
                </option>
              ))}
            </select>
            <select name="event" defaultValue={searchParams.event ?? ''} className="input !w-auto !py-1.5 !text-xs" aria-label="Event">
              <option value="">All events</option>
              {[...WEBHOOK_EVENTS, 'test.ping'].map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
            <button type="submit" className="btn-ghost !py-1.5 !text-xs">
              Filter
            </button>
          </form>
        </div>

        {deliveries.length === 0 ? (
          <p className="text-sm text-ink-400">No deliveries match.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-ink-400">
                <tr>
                  <th className="pb-2 font-medium">Event</th>
                  <th className="pb-2 font-medium">Endpoint</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Response</th>
                  <th className="pb-2 font-medium">Attempts</th>
                  <th className="pb-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id} className="border-t border-ink-600/60">
                    <td className="py-2.5 pr-3">
                      <Link href={`/dashboard/webhooks/${d.id}`} className="font-mono text-xs text-white hover:underline">
                        {d.event}
                      </Link>
                    </td>
                    <td className="max-w-[220px] truncate py-2.5 pr-3 font-mono text-xs text-ink-300">
                      {d.endpoint.url.replace(/^https:\/\//, '')}
                    </td>
                    <td className="py-2.5 pr-3">
                      <DeliveryStatus status={d.status} />
                      {d.status === 'retrying' && d.nextAttemptAt ? (
                        <span className="block text-[11px] text-ink-400">next {when(d.nextAttemptAt)}</span>
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-ink-300">
                      {d.responseCode ? `HTTP ${d.responseCode}` : d.lastError ? d.lastError.slice(0, 40) : '—'}
                      {d.durationMs !== null ? <span className="block text-ink-400">{d.durationMs} ms</span> : null}
                    </td>
                    <td className="py-2.5 pr-3 text-xs tabular-nums text-ink-300">
                      {d.attempts} / {MAX_ATTEMPTS}
                    </td>
                    <td className="py-2.5 text-xs text-ink-400">{when(d.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 ? (
          <div className="mt-4 flex items-center justify-between text-xs text-ink-300">
            <span>
              Page {page} of {pages} · {total} deliveries
            </span>
            <span className="flex gap-2">
              {page > 1 ? (
                <Link href={qs({ page: String(page - 1) })} className="btn-ghost !px-2.5 !py-1.5 !text-xs">
                  Newer
                </Link>
              ) : null}
              {page < pages ? (
                <Link href={qs({ page: String(page + 1) })} className="btn-ghost !px-2.5 !py-1.5 !text-xs">
                  Older
                </Link>
              ) : null}
            </span>
          </div>
        ) : null}
      </Section>
    </>
  );
}
