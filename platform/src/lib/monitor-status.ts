/**
 * Provider monitoring: the rules that turn probes and order flow into a
 * status. Pure, so the thresholds are tested rather than guessed at.
 */

export type ProbeStatus = 'up' | 'degraded' | 'down' | 'unconfigured' | 'manual';

export type ProviderResult = {
  status: ProbeStatus;
  message: string;
  latencyMs: number | null;
  checkedAt: string;
};

export type MonitorState = {
  /** Email / Telegram the merchant when a provider goes down or comes back. */
  alerts: boolean;
  checkedAt: string | null;
  results: Record<string, ProviderResult>;
};

const STATUSES: ProbeStatus[] = ['up', 'degraded', 'down', 'unconfigured', 'manual'];

export function parseMonitor(value: unknown): MonitorState {
  const v = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const results: Record<string, ProviderResult> = {};
  const raw = v.results && typeof v.results === 'object' ? (v.results as Record<string, unknown>) : {};
  for (const [key, r] of Object.entries(raw)) {
    if (!r || typeof r !== 'object') continue;
    const o = r as Record<string, unknown>;
    const status = STATUSES.includes(o.status as ProbeStatus) ? (o.status as ProbeStatus) : 'down';
    results[key] = {
      status,
      message: typeof o.message === 'string' ? o.message.slice(0, 300) : '',
      latencyMs: typeof o.latencyMs === 'number' ? o.latencyMs : null,
      checkedAt: typeof o.checkedAt === 'string' ? o.checkedAt : '',
    };
  }
  return {
    alerts: v.alerts !== false,
    checkedAt: typeof v.checkedAt === 'string' ? v.checkedAt : null,
    results,
  };
}

/** Checkout flow through one rail over the last day. */
export type FlowStats = {
  /** Checkouts where the rail was chosen. */
  started: number;
  /** Of those, how many failed to open the provider page. */
  failedToStart: number;
};

/** Slower than this and buyers notice. */
export const SLOW_MS = 4_000;

/**
 * Combine a live probe with real checkout traffic.
 *
 * A provider can answer a health probe and still be refusing payments (an API
 * key revoked for one product, a currency switched off), so failures seen by
 * real buyers count as much as the probe does.
 */
export function combineStatus(
  probe: { ok: boolean | null; message: string; latencyMs: number | null },
  flow: FlowStats,
): { status: ProbeStatus; message: string } {
  if (probe.ok === false) return { status: 'down', message: probe.message };

  const failRate = flow.started > 0 ? flow.failedToStart / flow.started : 0;
  if (flow.failedToStart >= 3 && failRate >= 0.5) {
    return {
      status: 'down',
      message: `${flow.failedToStart} of ${flow.started} checkouts in the last 24 h could not open the payment page.`,
    };
  }
  if (flow.failedToStart >= 2 && failRate >= 0.2) {
    return {
      status: 'degraded',
      message: `${flow.failedToStart} of ${flow.started} checkouts in the last 24 h could not open the payment page.`,
    };
  }
  if (probe.latencyMs !== null && probe.latencyMs > SLOW_MS) {
    return { status: 'degraded', message: `Responding slowly (${(probe.latencyMs / 1000).toFixed(1)} s).` };
  }
  if (probe.ok === null) return { status: 'manual', message: probe.message };
  return { status: 'up', message: probe.message };
}

/** Rails whose status changed between two runs in a way worth an alert. */
export function alertTransitions(
  previous: Record<string, ProviderResult>,
  next: Record<string, ProviderResult>,
): { key: string; from: ProbeStatus | null; to: ProbeStatus }[] {
  const changes: { key: string; from: ProbeStatus | null; to: ProbeStatus }[] = [];
  for (const [key, result] of Object.entries(next)) {
    const before = previous[key]?.status ?? null;
    const wasDown = before === 'down';
    const isDown = result.status === 'down';
    // Alert on going down, and on recovering from down. Degraded is shown on
    // the page but is not worth waking someone up for.
    if (isDown && !wasDown) changes.push({ key, from: before, to: result.status });
    if (wasDown && result.status === 'up') changes.push({ key, from: before, to: result.status });
  }
  return changes;
}
