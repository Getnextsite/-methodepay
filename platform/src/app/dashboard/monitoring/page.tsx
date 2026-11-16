import type { Metadata } from 'next';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { requireTenant, assertRole, ForbiddenError } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { runMonitor, type MonitorRow } from '@/lib/monitor';
import { parseMonitor, type ProbeStatus } from '@/lib/monitor-status';
import { methodName } from '@/lib/labels';
import { Banner, PageHeader, Section, StatTile } from '@/components/ui';
import { ActionForm, SubmitButton, type ActionState } from '@/components/action-form';

export const metadata: Metadata = { title: 'Provider status' };
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function runNowAction(_prev: ActionState): Promise<ActionState> {
  'use server';
  try {
    const tenant = await requireTenant();
    const rows = await runMonitor(tenant.account.id);
    revalidatePath('/dashboard/monitoring');
    const down = rows.filter((r) => r.status === 'down').length;
    return down ? { error: `${down} provider${down === 1 ? ' is' : 's are'} down. Details below.` } : { message: 'All checks ran. Results below.' };
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }
}

async function toggleAlertsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  'use server';
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'ADMIN');
    const row = await prisma.notificationSettings.findUnique({ where: { accountId: tenant.account.id }, select: { monitor: true } });
    const state = parseMonitor(row?.monitor);
    const alerts = formData.get('alerts') === 'on';
    await prisma.notificationSettings.upsert({
      where: { accountId: tenant.account.id },
      create: { accountId: tenant.account.id, monitor: { ...state, alerts } },
      update: { monitor: { ...state, alerts } },
    });
    revalidatePath('/dashboard/monitoring');
    return { message: alerts ? 'You will be alerted when a provider goes down or comes back.' : 'Alerts are off.' };
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }
}

const DOT: Record<ProbeStatus, string> = {
  up: 'bg-mint',
  degraded: 'bg-amber-300',
  down: 'bg-red-400',
  unconfigured: 'bg-ink-400',
  manual: 'bg-ink-400',
};
const WORD: Record<ProbeStatus, string> = {
  up: 'Operational',
  degraded: 'Degraded',
  down: 'Down',
  unconfigured: 'Incomplete setup',
  manual: 'Confirmed by you',
};
const WORD_STYLE: Record<ProbeStatus, string> = {
  up: 'text-mint',
  degraded: 'text-amber-200',
  down: 'text-red-300',
  unconfigured: 'text-ink-300',
  manual: 'text-ink-300',
};

function ago(iso: string | null): string {
  if (!iso) return 'never';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours < 48 ? `${hours} h ago` : `${Math.round(hours / 24)} days ago`;
}

function Row({ row }: { row: MonitorRow }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 border-t border-ink-600/60 py-3.5 first:border-t-0 first:pt-0">
      <div className="flex min-w-0 items-start gap-3">
        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[row.status]}`} aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">{row.label}</p>
          <p className="mt-0.5 text-xs text-ink-300">{row.message}</p>
          {row.kind === 'rail' && (row.flow.started > 0 || row.flow.failedToStart > 0) ? (
            <p className="mt-0.5 text-xs text-ink-400">
              Last 24 h: {row.flow.started} checkout{row.flow.started === 1 ? '' : 's'}
              {row.flow.failedToStart ? `, ${row.flow.failedToStart} could not open the payment page` : ', none failed to open'}
            </p>
          ) : null}
        </div>
      </div>
      <div className="text-right">
        <p className={`text-xs font-medium ${WORD_STYLE[row.status]}`}>{WORD[row.status]}</p>
        {row.latencyMs !== null ? <p className="text-[11px] text-ink-400">{row.latencyMs} ms</p> : null}
      </div>
    </li>
  );
}

export default async function MonitoringPage() {
  const { account, role } = await requireTenant();
  const settings = await prisma.notificationSettings.findUnique({ where: { accountId: account.id }, select: { monitor: true } });
  const state = parseMonitor(settings?.monitor);

  // Fresh results when the page is opened, unless a run happened in the last
  // ten minutes. Alerts are left to the scheduled run.
  const stale = !state.checkedAt || Date.now() - new Date(state.checkedAt).getTime() > 10 * 60_000;
  let rows: MonitorRow[];
  if (stale) {
    rows = await runMonitor(account.id, { alert: false }).catch(() => []);
  } else {
    rows = Object.entries(state.results).map(([key, r]) => ({
      ...r,
      key,
      kind: key.startsWith('chain:') ? ('chain' as const) : ('rail' as const),
      label: key.startsWith('chain:') ? labelForChain(key.slice(6)) : methodName(key),
      flow: { started: 0, failedToStart: 0 },
    }));
  }
  const checkedAt = stale ? new Date().toISOString() : state.checkedAt;

  const rails = rows.filter((r) => r.kind === 'rail');
  const chains = rows.filter((r) => r.kind === 'chain');
  const down = rows.filter((r) => r.status === 'down');
  const degraded = rows.filter((r) => r.status === 'degraded');
  const live = rows.filter((r) => r.status === 'up');
  const canEdit = role === 'OWNER' || role === 'ADMIN';

  return (
    <>
      <PageHeader
        title="Provider status"
        description="Each payment method you have switched on is checked with your own credentials (read-only, no payment is created), alongside what real buyers ran into in the last 24 hours."
        action={
          <ActionForm action={runNowAction} className="">
            <SubmitButton variant="ghost" className="!py-2 !text-xs">
              Run checks now
            </SubmitButton>
          </ActionForm>
        }
      />

      {down.length ? (
        <Banner tone="warn">
          {down.map((d) => d.label).join(', ')} {down.length === 1 ? 'is' : 'are'} down. Buyers who pick {down.length === 1 ? 'it' : 'them'} cannot pay right now; consider switching {down.length === 1 ? 'it' : 'them'} off under{' '}
          <Link href="/dashboard/methods" className="underline">
            Payment methods
          </Link>{' '}
          until {down.length === 1 ? 'it is' : 'they are'} fixed.
        </Banner>
      ) : rows.length && !degraded.length ? (
        <Banner tone="good">Everything that can be checked is working.</Banner>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Operational" value={String(live.length)} tone="good" />
        <StatTile label="Degraded" value={String(degraded.length)} tone={degraded.length ? 'warn' : 'default'} />
        <StatTile label="Down" value={String(down.length)} tone={down.length ? 'warn' : 'default'} />
        <StatTile label="Last checked" value={ago(checkedAt)} hint="Also checked automatically every day" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Section title="Payment methods">
            {rails.length === 0 ? (
              <p className="text-sm text-ink-400">
                No payment method is switched on.{' '}
                <Link href="/dashboard/methods" className="text-mint hover:underline">
                  Set one up
                </Link>
                .
              </p>
            ) : (
              <ul>
                {rails.map((r) => (
                  <Row key={r.key} row={r} />
                ))}
              </ul>
            )}
          </Section>

          {chains.length ? (
            <Section title="Blockchain verification" description="The public nodes and price feed used to verify crypto payments automatically.">
              <ul>
                {chains.map((r) => (
                  <Row key={r.key} row={r} />
                ))}
              </ul>
            </Section>
          ) : null}
        </div>

        <div className="space-y-6">
          <Section title="Alerts">
            <ActionForm action={toggleAlertsAction} className="space-y-3">
              <label className="flex items-start gap-2.5 text-sm text-ink-100">
                <input type="checkbox" name="alerts" defaultChecked={state.alerts} disabled={!canEdit} className="mt-0.5 h-4 w-4 accent-mint" />
                <span>
                  Email and Telegram me when a provider goes down or comes back
                  <span className="block text-xs text-ink-400">Sent to your notification addresses. One message per change, never a flood.</span>
                </span>
              </label>
              {canEdit ? (
                <SubmitButton variant="ghost" className="!py-2 !text-xs">
                  Save
                </SubmitButton>
              ) : null}
            </ActionForm>
          </Section>

          <Section title="What the statuses mean">
            <dl className="space-y-2.5 text-xs text-ink-300">
              {(['up', 'degraded', 'down', 'unconfigured', 'manual'] as ProbeStatus[]).map((s) => (
                <div key={s} className="flex gap-2.5">
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${DOT[s]}`} aria-hidden />
                  <div>
                    <dt className={`font-medium ${WORD_STYLE[s]}`}>{WORD[s]}</dt>
                    <dd>
                      {
                        {
                          up: 'The provider accepted your credentials and checkouts are opening normally.',
                          degraded: 'Working, but slow, or some buyers could not open the payment page.',
                          down: 'Credentials rejected, provider unreachable, or most checkouts failing.',
                          unconfigured: 'Switched on but missing settings, so buyers do not see it.',
                          manual: 'Payments you confirm yourself (bank transfer, WhatsApp…): nothing to probe.',
                        }[s]
                      }
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </Section>
        </div>
      </div>
    </>
  );
}

function labelForChain(chain: string): string {
  return (
    {
      btc: 'Bitcoin node',
      ltc: 'Litecoin node',
      eth: 'Ethereum node',
      bsc: 'BNB Chain node',
      polygon: 'Polygon node',
      tron: 'TRON node',
      prices: 'Price feed',
    } as Record<string, string>
  )[chain] ?? chain;
}
