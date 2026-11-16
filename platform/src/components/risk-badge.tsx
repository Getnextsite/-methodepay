const STYLES: Record<string, string> = {
  low: 'border-ink-500 bg-ink-700/50 text-ink-200',
  medium: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
  high: 'border-red-400/50 bg-red-400/10 text-red-300',
};

/** Fraud risk on an order. Renders nothing for orders that were never screened. */
export function RiskBadge({
  level,
  score,
  hideLow = false,
}: {
  level: string | null | undefined;
  score?: number | null;
  hideLow?: boolean;
}) {
  if (!level || (hideLow && level === 'low')) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${STYLES[level] ?? STYLES.low}`}
      title={score !== null && score !== undefined ? `Risk score ${score} of 100` : undefined}
    >
      {level === 'low' ? 'Low risk' : level === 'medium' ? 'Medium risk' : 'High risk'}
      {score !== null && score !== undefined ? <span className="opacity-70">{score}</span> : null}
    </span>
  );
}
