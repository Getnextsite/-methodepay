import Link from 'next/link';
import { requireTenant } from '@/lib/tenancy';
import { entitlementsFor } from '@/lib/entitlements';
import { prisma } from '@/lib/db';
import { Icon } from '@/components/dash-icons';
import { signOutAction } from '../(auth)/actions';
import { NavLinks, TopTabs } from './nav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tenant = await requireTenant();
  const ent = entitlementsFor(tenant.account);

  const awaiting = await prisma.order.count({
    where: { accountId: tenant.account.id, status: 'AWAITING_VERIFICATION' },
  });

  const trialDaysLeft = tenant.account.trialEndsAt
    ? Math.ceil((tenant.account.trialEndsAt.getTime() - Date.now()) / 86_400_000)
    : null;
  const initials = (tenant.user.name || tenant.user.email)
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
  const topTier = tenant.account.planTier === 'AGENCY';

  return (
    <div className="theme-light dash-sky min-h-screen lg:grid lg:grid-cols-[272px_1fr]">
      <aside className="hidden p-4 pr-0 lg:sticky lg:top-0 lg:block lg:h-screen">
        <div className="glass flex h-full flex-col overflow-y-auto rounded-[26px]">
          <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#0f3b33] text-sm font-bold text-[#fff]">M</span>
              <span className="text-[15px] font-semibold tracking-tight text-white">MethodePay</span>
            </Link>
            <span className="chip !py-0.5 !text-[11px]">{ent.label}</span>
          </div>

          <form action="/dashboard/orders" className="px-4 pb-2" role="search">
            <label className="flex items-center gap-2 rounded-xl px-3 py-2 text-ink-400 transition focus-within:bg-ink-800/80 hover:bg-ink-800/60">
              <Icon.search className="h-4 w-4 shrink-0" />
              <input
                name="q"
                placeholder="Search orders…"
                aria-label="Search orders"
                className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-ink-400"
              />
            </label>
          </form>

          <NavLinks awaiting={awaiting} />

          <div className="mt-auto space-y-3 px-4 pb-4 pt-2">
            <div className="px-1">
              <p className="truncate text-[13px] font-semibold text-white">{tenant.account.name}</p>
              <p className="truncate text-[11.5px] text-ink-400">
                {tenant.user.email} · {tenant.role.toLowerCase()}
              </p>
            </div>

            {!topTier ? (
              <div className="relative overflow-hidden rounded-[20px] bg-[radial-gradient(120%_90%_at_100%_0%,#2f7a5b_0%,#0f3b33_55%,#0a2a24_100%)] p-4 text-[#fff]">
                <svg aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 opacity-25" viewBox="0 0 100 100" fill="none" stroke="#fff">
                  {[18, 28, 38, 48].map((r) => (
                    <circle key={r} cx="70" cy="30" r={r} strokeWidth="0.6" />
                  ))}
                </svg>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#fff] text-[#0f3b33]">
                  <Icon.sparkle className="h-4 w-4" />
                </span>
                <p className="mt-3 text-[15px] font-semibold">
                  {tenant.account.planTier === 'FREE' && trialDaysLeft !== null
                    ? trialDaysLeft > 0
                      ? `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} of trial left`
                      : 'Your trial has ended'
                    : `Upgrade to ${tenant.account.planTier === 'PROFESSIONAL' ? 'Agency' : 'Professional'}`}
                </p>
                <p className="mt-0.5 text-[11.5px] text-[#fff]/70">
                  {tenant.account.planTier === 'PROFESSIONAL'
                    ? 'More stores, more seats, priority support'
                    : 'Card rails, webhooks, the full editor & more'}
                </p>
                <Link
                  href="/dashboard/billing"
                  className="mt-3 flex w-full items-center justify-center rounded-full border border-[#fff]/25 bg-[#fff]/10 py-2 text-[12.5px] font-semibold text-[#fff] transition hover:bg-[#fff]/20"
                >
                  {tenant.account.planTier === 'FREE' ? 'Choose a plan' : 'Upgrade'}
                </Link>
              </div>
            ) : null}

            <form action={signOutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-ink-300 transition hover:bg-ink-800/60 hover:text-white"
              >
                <Icon.logout className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="min-w-0 px-4 pb-10 pt-3 lg:px-8 lg:pt-4">
        <details className="glass mb-3 rounded-[22px] lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#0f3b33] text-sm font-bold text-[#fff]">M</span>
              <span className="text-[15px] font-semibold text-white">MethodePay</span>
            </span>
            <span className="rounded-full bg-ink-800 px-3 py-1.5 text-[12.5px] font-medium text-ink-200">Menu</span>
          </summary>
          <NavLinks awaiting={awaiting} />
          <form action={signOutAction} className="px-4 pb-4">
            <button type="submit" className="btn-ghost w-full !py-2 !text-xs">Sign out</button>
          </form>
        </details>

        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <TopTabs />
          <div className="flex items-center gap-2">
            <Link
              href="https://methodepay.com/docs"
              className="glass grid h-10 w-10 place-items-center rounded-full text-ink-200 transition hover:text-white"
              aria-label="Help and documentation"
            >
              <Icon.help className="h-[18px] w-[18px]" />
            </Link>
            <Link
              href="/dashboard/orders?status=AWAITING_VERIFICATION"
              className="glass relative grid h-10 w-10 place-items-center rounded-full text-ink-200 transition hover:text-white"
              aria-label={awaiting ? `${awaiting} orders awaiting verification` : 'No orders awaiting verification'}
            >
              <Icon.bell className="h-[18px] w-[18px]" />
              {awaiting ? <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#e5484d] ring-2 ring-[#fff]" /> : null}
            </Link>
            <Link
              href="/dashboard/team"
              className="grid h-10 w-10 place-items-center rounded-full bg-[linear-gradient(135deg,#0f3b33,#2f7a5b)] text-[13px] font-semibold text-[#fff] ring-2 ring-[#fff]"
              aria-label="Your account"
              title={tenant.user.email}
            >
              {initials || 'M'}
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-[1280px]">{children}</div>
      </main>
    </div>
  );
}
