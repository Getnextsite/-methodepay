import Link from 'next/link';
import { requireTenant } from '@/lib/tenancy';
import { entitlementsFor } from '@/lib/entitlements';
import { prisma } from '@/lib/db';
import { signOutAction } from '../(auth)/actions';
import { NavLinks } from './nav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tenant = await requireTenant();
  const ent = entitlementsFor(tenant.account);

  const awaiting = await prisma.order.count({
    where: { accountId: tenant.account.id, status: 'AWAITING_VERIFICATION' },
  });

  const trialDaysLeft = tenant.account.trialEndsAt
    ? Math.ceil((tenant.account.trialEndsAt.getTime() - Date.now()) / 86_400_000)
    : null;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="border-b border-ink-600/70 bg-ink-900/60 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-mint text-sm font-bold text-[#06240f]">
              M
            </span>
            <span className="text-sm font-semibold tracking-tight text-white">MethodePay</span>
          </Link>
          <span className="chip">{ent.label}</span>
        </div>

        <div className="px-5 pb-4">
          <p className="truncate text-sm font-medium text-white">{tenant.account.name}</p>
          <p className="truncate text-xs text-ink-400">
            {tenant.user.email} · {tenant.role.toLowerCase()}
          </p>
        </div>

        <NavLinks awaiting={awaiting} />

        <div className="space-y-3 px-5 py-5">
          {tenant.account.planTier === 'FREE' && trialDaysLeft !== null ? (
            <div className="rounded-xl border border-ink-600 bg-ink-800/60 p-3.5">
              <p className="text-xs font-semibold text-white">
                {trialDaysLeft > 0
                  ? `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left on the trial`
                  : 'Your trial has ended'}
              </p>
              <p className="mt-1 text-xs text-ink-400">
                {trialDaysLeft > 0
                  ? 'Card rails and the full editor unlock on a paid plan.'
                  : 'Self-serve rails keep working. Upgrade to switch the rest back on.'}
              </p>
              <Link href="/dashboard/billing" className="btn-primary mt-3 w-full !py-2 !text-xs">
                Choose a plan
              </Link>
            </div>
          ) : null}

          <form action={signOutAction}>
            <button type="submit" className="btn-ghost w-full !py-2 !text-xs">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="px-5 py-7 lg:px-9 lg:py-9">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
