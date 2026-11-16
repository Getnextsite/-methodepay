const STATUS_STYLE: Record<string, string> = {
  delivered: 'border-mint/40 bg-mint/10 text-mint',
  retrying: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
  pending: 'border-ink-500 bg-ink-700/60 text-ink-200',
  failed: 'border-red-400/40 bg-red-400/10 text-red-300',
};

export function DeliveryStatus({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[status] ?? STATUS_STYLE.pending}`}>
      {status}
    </span>
  );
}
