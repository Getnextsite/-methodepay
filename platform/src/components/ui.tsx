import Link from 'next/link';
import type { OrderStatus } from '@prisma/client';

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-ink-300">{description}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function Section({
  title,
  description,
  children,
  footer,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="card">
      {title ? (
        <div className="border-b border-ink-600/70 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {description ? <p className="mt-1 text-xs text-ink-400">{description}</p> : null}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
      {footer ? <div className="border-t border-ink-600/70 px-5 py-3.5">{footer}</div> : null}
    </section>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'good' | 'warn';
}) {
  const accent =
    tone === 'good' ? 'text-mint' : tone === 'warn' ? 'text-amber-300' : 'text-white';
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${accent}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-400">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-600 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-400">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

const STATUS_STYLES: Record<OrderStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'border-ink-500 bg-ink-700/60 text-ink-200' },
  AWAITING_VERIFICATION: {
    label: 'Awaiting verification',
    className: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
  },
  PAID: { label: 'Paid', className: 'border-mint/40 bg-mint/10 text-mint' },
  REFUNDED: { label: 'Refunded', className: 'border-violet/40 bg-violet/10 text-[#b9a8ff]' },
  CANCELLED: { label: 'Cancelled', className: 'border-ink-500 bg-ink-700/40 text-ink-300' },
  EXPIRED: { label: 'Expired', className: 'border-ink-500 bg-ink-700/40 text-ink-300' },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${style.className}`}>
      {style.label}
    </span>
  );
}

export function Banner({
  tone = 'info',
  children,
  action,
}: {
  tone?: 'info' | 'warn' | 'good';
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const styles = {
    info: 'border-ink-600 bg-ink-800/70 text-ink-200',
    warn: 'border-amber-400/40 bg-amber-400/10 text-amber-100',
    good: 'border-mint/40 bg-mint/10 text-mint',
  }[tone];
  return (
    <div className={`mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-sm ${styles}`}>
      <div>{children}</div>
      {action}
    </div>
  );
}

export function UpgradeHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex flex-wrap items-center gap-2 text-xs text-ink-400">
      <span>{children}</span>
      <Link href="/dashboard/billing" className="font-medium text-mint hover:underline">
        See plans
      </Link>
    </p>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-ink-400">{hint}</p> : null}
    </div>
  );
}

export function CopyBox({ value, label }: { value: string; label?: string }) {
  return (
    <div>
      {label ? <p className="label">{label}</p> : null}
      <code className="block overflow-x-auto rounded-xl border border-ink-600 bg-ink-950 px-3.5 py-2.5 text-xs text-mint">
        {value}
      </code>
    </div>
  );
}
