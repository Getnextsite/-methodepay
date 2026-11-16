import { formatMoney } from '@/lib/money';

/*
 * Server-rendered charts for the Overview. Plain SVG and CSS: no chart
 * library, nothing to hydrate, and every mark carries a <title> so hovering
 * shows its exact figures.
 *
 * Colour: one green ramp for money in (sequential, light to dark) and one
 * orange for money out. The pair was validated for colour-blind separation;
 * every chart also has a legend and labels, so colour is never the only cue.
 */

export const GREEN = ['#e4efe9', '#c3e2d1', '#8fcaab', '#4fa680', '#1f8a62', '#0f3b33'];
export const IN = '#1f8a62';
export const OUT = '#dd7a2c';
const EMPTY = '#e7ecef';

/** "$1,240" big, ".00" quiet: the way the amount is read. */
export function Amount({ cents, currency, className = '' }: { cents: number; currency: string; className?: string }) {
  const text = formatMoney(cents, currency);
  const m = /^(.*?)([.,]\d{2})(\D*)$/.exec(text);
  return (
    <span className={`tabular-nums ${className}`}>
      {m ? (
        <>
          {m[1]}
          <span className="text-ink-400">{m[2]}</span>
          {m[3]}
        </>
      ) : (
        text
      )}
    </span>
  );
}

export function Delta({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) {
    return <span className="rounded-full bg-[#e4efe9] px-1.5 py-0.5 text-[10.5px] font-semibold text-[#14603f]">new</span>;
  }
  const pct = Math.round(((current - previous) / previous) * 1000) / 10;
  const good = invert ? pct <= 0 : pct >= 0;
  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums ${
        good ? 'bg-[#e4efe9] text-[#14603f]' : 'bg-[#fbe9dc] text-[#9a4a10]'
      }`}
    >
      {pct > 0 ? '+' : ''}
      {pct}%
    </span>
  );
}

/**
 * A sparkline as a dot matrix: one column per week, filled from the bottom
 * in proportion to the week's value, darker towards the top.
 */
export function DotBars({
  values,
  tone = 'in',
  label,
  format,
}: {
  values: number[];
  tone?: 'in' | 'out';
  label: string;
  format: (v: number) => string;
}) {
  const rows = 6;
  const max = Math.max(1, ...values);
  const size = 6;
  const gap = 2;
  const w = values.length * (size + gap) - gap;
  const h = rows * (size + gap) - gap;
  const ramp = tone === 'in' ? GREEN : ['#fbe9dc', '#f6d0b3', '#efae7f', '#e58c4e', '#dd7a2c', '#a24f12'];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} className="shrink-0">
      {values.map((v, col) => {
        const filled = v > 0 ? Math.max(1, Math.round((v / max) * rows)) : 0;
        return (
          <g key={col}>
            <title>{`${label}, week ${col + 1} of ${values.length}: ${format(v)}`}</title>
            {Array.from({ length: rows }, (_, r) => {
              const fromBottom = rows - 1 - r;
              const on = fromBottom < filled;
              return (
                <rect
                  key={r}
                  x={col * (size + gap)}
                  y={r * (size + gap)}
                  width={size}
                  height={size}
                  rx={1.5}
                  fill={on ? ramp[Math.min(ramp.length - 1, fromBottom + 1)] : EMPTY}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

type FlowRow = { key: string; label: string; cells: { month: string; cents: number; orders: number }[] };

/**
 * Money flow: a dot per payment method per month, sized by the amount.
 * Area, not radius, scales with money, so a month twice as big looks twice
 * as big. The current month is drawn solid.
 */
export function MoneyFlow({
  rows,
  refunds,
  months,
  current,
  currency,
}: {
  rows: FlowRow[];
  refunds: FlowRow;
  months: string[];
  current: string;
  currency: string;
}) {
  const all = [...rows, refunds];
  const max = Math.max(1, ...all.flatMap((r) => r.cells.map((c) => c.cents)));
  const labelW = 112;
  const colW = 64;
  const rowH = 54;
  const top = 10;
  const W = labelW + months.length * colW;
  const H = top + all.length * rowH + 26;
  const rMax = 19;
  const radius = (cents: number) => (cents <= 0 ? 0 : Math.max(3.5, Math.sqrt(cents / max) * rMax));
  const monthLabel = (m: string) =>
    new Date(m + '-01T00:00:00Z').toLocaleDateString('en', { month: 'short', timeZone: 'UTC' });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Money in per payment method per month">
      {months.map((m, i) => {
        const x = labelW + i * colW + colW / 2;
        return (
          <g key={m}>
            <line x1={x} x2={x} y1={top} y2={top + all.length * rowH} stroke={m === current ? '#cfd8de' : '#e3e9ed'} strokeWidth={m === current ? 1.5 : 1} />
            <text x={x} y={H - 6} textAnchor="middle" fontSize="12" fill={m === current ? '#0e1e1b' : '#74818d'} fontWeight={m === current ? 700 : 400}>
              {monthLabel(m)}
            </text>
          </g>
        );
      })}
      {all.map((row, ri) => {
        const y = top + ri * rowH + rowH / 2;
        const out = row.key === 'refunds';
        return (
          <g key={row.key}>
            <text x={0} y={y + 4} fontSize="12.5" fill="#52606b">
              {row.label.length > 16 ? row.label.slice(0, 15) + '…' : row.label}
            </text>
            {row.cells.map((c, ci) => {
              const x = labelW + ci * colW + colW / 2;
              const r = radius(c.cents);
              const now = c.month === current;
              if (!r) return <circle key={ci} cx={x} cy={y} r={2} fill="#d5dde2" />;
              const fill = out ? (now ? '#b8571a' : OUT) : now ? '#0f3b33' : IN;
              return (
                <g key={ci}>
                  <title>{`${row.label}, ${monthLabel(c.month)}: ${formatMoney(c.cents, currency)} (${c.orders} order${c.orders === 1 ? '' : 's'})`}</title>
                  <circle cx={x} cy={y} r={Math.max(r + 8, 14)} fill="transparent" />
                  <circle cx={x} cy={y} r={r} fill={fill} fillOpacity={now ? 1 : 0.55} stroke="#fff" strokeWidth={2} />
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Checkout conversion as a half-ring of dots: paid checkouts dark, the rest
 * light. Three rows of dots, filled left to right.
 */
export function ConversionGauge({ paid, started }: { paid: number; started: number }) {
  const share = started ? paid / started : 0;
  const rings = [{ r: 78, n: 22 }, { r: 64, n: 18 }, { r: 50, n: 14 }];
  const cx = 100;
  const cy = 94;
  return (
    <svg viewBox="0 0 200 104" className="mx-auto h-auto w-full max-w-[260px]" role="img" aria-label={`${Math.round(share * 100)}% of checkouts paid this month`}>
      <title>{`${paid} of ${started} checkouts started this month were paid`}</title>
      {rings.map(({ r, n }) =>
        Array.from({ length: n }, (_, i) => {
          const t = i / (n - 1);
          const a = Math.PI - t * Math.PI;
          const on = t <= share && share > 0;
          return (
            <circle
              key={`${r}-${i}`}
              cx={cx + r * Math.cos(a)}
              cy={cy - r * Math.sin(a)}
              r={r === 78 ? 4.6 : r === 64 ? 4.1 : 3.6}
              fill={on ? (r === 78 ? '#0f3b33' : r === 64 ? '#1f8a62' : '#4fa680') : '#d9ebe1'}
            />
          );
        }),
      )}
    </svg>
  );
}

/** Daily paid orders over the last 26 weeks, a square per day. */
export function Heatmap({ days, max, currency }: { days: { date: string; orders: number; cents: number }[]; max: number; currency: string }) {
  const size = 11;
  const gap = 3;
  const cols = Math.ceil(days.length / 7);
  const W = cols * (size + gap) - gap;
  const H = 7 * (size + gap) - gap + 18;
  const step = (n: number) => (n === 0 ? EMPTY : GREEN[Math.min(5, 1 + Math.floor((n / max) * 4.999))]);
  const monthMarks: { col: number; label: string }[] = [];
  days.forEach((d, i) => {
    if (d.date.endsWith('-01') || i === 0) {
      const col = Math.floor(i / 7);
      if (!monthMarks.some((m) => Math.abs(m.col - col) < 3)) {
        monthMarks.push({ col, label: new Date(d.date + 'T00:00:00Z').toLocaleDateString('en', { month: 'short', timeZone: 'UTC' }) });
      }
    }
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Paid orders per day, last 26 weeks">
      {days.map((d, i) => (
        <rect key={d.date} x={Math.floor(i / 7) * (size + gap)} y={(i % 7) * (size + gap)} width={size} height={size} rx={2.5} fill={step(d.orders)}>
          <title>{`${d.date}: ${d.orders} paid order${d.orders === 1 ? '' : 's'}${d.cents ? `, ${formatMoney(d.cents, currency)}` : ''}`}</title>
        </rect>
      ))}
      {monthMarks.map((m) => (
        <text key={m.col} x={m.col * (size + gap)} y={H - 3} fontSize="10" fill="#74818d">
          {m.label}
        </text>
      ))}
    </svg>
  );
}

/** The store's switched-on payment methods, fanned out like cards in a wallet. */
export function RailFan({ rails }: { rails: { key: string; label: string; kind: string }[] }) {
  const shown = rails.slice(0, 5);
  const center = Math.floor(shown.length / 2);
  const hero = 'bg-[radial-gradient(120%_120%_at_30%_20%,#4b6b70_0%,#26393d_45%,#16242a_100%)] text-[#f1f5f6]';
  const sides = [
    'bg-[linear-gradient(160deg,#cfe9d6,#9fd3b0)] text-[#123b2a]',
    'bg-[linear-gradient(150deg,#f3dc9a,#d2aa4a_55%,#b98f2f)] text-[#3b2c08]',
    'bg-[linear-gradient(160deg,#f7f9fa,#e3e9ee)] text-[#22313b]',
    'bg-[linear-gradient(160deg,#e9eef7,#cdd9ea)] text-[#22313b]',
  ];
  return (
    <div className="relative mx-auto flex h-[150px] max-w-[640px] items-end justify-center">
      {shown.map((rail, i) => {
        const offset = i - center;
        const isCenter = offset === 0;
        const look = isCenter ? hero : sides[(i < center ? i : i - 1) % sides.length];
        return (
          <div
            key={rail.key}
            className={`absolute bottom-0 flex w-[190px] flex-col justify-between rounded-[18px] p-4 shadow-[0_22px_40px_-22px_rgba(16,42,60,0.55)] ring-1 ring-[#fff]/60 ${look}`}
            style={{
              height: isCenter ? 140 : 112 - Math.abs(offset) * 8,
              transform: `translateX(${offset * 128}px)`,
              zIndex: 10 - Math.abs(offset),
            }}
          >
            <div className={`flex items-start justify-between gap-2 ${offset > 0 ? 'flex-row-reverse text-right' : ''}`}>
              <span className="truncate text-[12.5px] font-semibold">{rail.label}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{rail.kind}</span>
            </div>
            {isCenter ? (
              <div className="flex items-end justify-between">
                <span aria-hidden className="h-6 w-8 rounded-md bg-[linear-gradient(135deg,#e9e3cf,#b9ad86)] ring-1 ring-[#000]/10" />
                <span className="text-[11px] font-semibold tracking-[0.2em] opacity-80">•••• LIVE</span>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
