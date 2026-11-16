/**
 * Report periods and bucketing. Pure, all in UTC so a report reads the same
 * for every team member wherever they are.
 */

export const RANGES = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'mtd', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'ytd', label: 'This year' },
  { key: '12m', label: 'Last 12 months' },
] as const;

export type RangeKey = (typeof RANGES)[number]['key'] | 'custom';

export type Period = {
  key: RangeKey;
  label: string;
  /** Inclusive start. */
  from: Date;
  /** Exclusive end. */
  to: Date;
  /** The same length immediately before, for comparison. */
  prevFrom: Date;
  prevTo: Date;
  bucket: 'day' | 'week' | 'month';
};

const DAY = 86_400_000;

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function parseDay(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(value + 'T00:00:00Z');
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function resolvePeriod(
  query: { range?: string; from?: string; to?: string },
  now = new Date(),
): Period {
  const today = startOfUtcDay(now);
  const tomorrow = new Date(today.getTime() + DAY);
  let key = (query.range ?? '30d') as RangeKey;
  let from: Date;
  let to: Date = tomorrow;
  let label: string;

  const customFrom = parseDay(query.from);
  const customTo = parseDay(query.to);
  if (key === 'custom' || (customFrom && customTo)) {
    if (customFrom && customTo && customFrom <= customTo) {
      key = 'custom';
      from = customFrom;
      to = new Date(customTo.getTime() + DAY);
      // A year and a bit is the most a single screen can show sensibly.
      if (to.getTime() - from.getTime() > 400 * DAY) from = new Date(to.getTime() - 400 * DAY);
      label = `${isoDay(from)} to ${isoDay(new Date(to.getTime() - DAY))}`;
    } else {
      key = '30d';
      from = new Date(tomorrow.getTime() - 30 * DAY);
      label = 'Last 30 days';
    }
  } else {
    switch (key) {
      case '7d':
        from = new Date(tomorrow.getTime() - 7 * DAY);
        break;
      case '90d':
        from = new Date(tomorrow.getTime() - 90 * DAY);
        break;
      case 'mtd':
        from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
        break;
      case 'last_month':
        from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
        to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
        break;
      case 'ytd':
        from = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
        break;
      case '12m':
        from = new Date(Date.UTC(today.getUTCFullYear() - 1, today.getUTCMonth() + 1, 1));
        break;
      default:
        key = '30d';
        from = new Date(tomorrow.getTime() - 30 * DAY);
    }
    label = RANGES.find((r) => r.key === key)?.label ?? 'Last 30 days';
  }

  const length = to.getTime() - from.getTime();
  const days = length / DAY;
  return {
    key,
    label,
    from,
    to,
    prevFrom: new Date(from.getTime() - length),
    prevTo: from,
    bucket: days <= 62 ? 'day' : days <= 190 ? 'week' : 'month',
  };
}

/** The bucket a timestamp falls in, as the key used on the chart. */
export function bucketKey(d: Date, bucket: Period['bucket']): string {
  if (bucket === 'month') return d.toISOString().slice(0, 7);
  if (bucket === 'week') {
    // Weeks start on Monday.
    const day = startOfUtcDay(d);
    const offset = (day.getUTCDay() + 6) % 7;
    return isoDay(new Date(day.getTime() - offset * DAY));
  }
  return isoDay(d);
}

/** Every bucket in the period, in order, so empty days still show as zero. */
export function bucketsFor(period: Period): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (let t = period.from.getTime(); t < period.to.getTime(); t += DAY) {
    const k = bucketKey(new Date(t), period.bucket);
    if (!seen.has(k)) {
      seen.add(k);
      keys.push(k);
    }
  }
  return keys;
}

/** Percentage change, or null when there is nothing to compare with. */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

/** CSV cell, quoted only when it has to be, with formula injection defused. */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  // A cell starting with = + - @ is run as a formula by spreadsheet apps.
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
