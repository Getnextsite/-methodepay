'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/dash-icons';

type Item = { href: string; label: string; icon: IconName; badgeKey?: 'awaiting' };

const GROUPS: { heading: string; items: Item[] }[] = [
  {
    heading: 'Selling',
    items: [
      { href: '/dashboard', label: 'Overview', icon: 'home' },
      { href: '/dashboard/orders', label: 'Orders', icon: 'orders', badgeKey: 'awaiting' },
      { href: '/dashboard/products', label: 'Products', icon: 'box' },
      { href: '/dashboard/subscriptions', label: 'Subscriptions', icon: 'repeat' },
      { href: '/dashboard/coupons', label: 'Coupons', icon: 'tag' },
      { href: '/dashboard/recovery', label: 'Abandoned checkouts', icon: 'cart' },
    ],
  },
  {
    heading: 'Insights',
    items: [
      { href: '/dashboard/reports', label: 'Financial reports', icon: 'chart' },
      { href: '/dashboard/fraud', label: 'Fraud & risk', icon: 'shield' },
      { href: '/dashboard/monitoring', label: 'Provider status', icon: 'pulse' },
    ],
  },
  {
    heading: 'Checkout',
    items: [
      { href: '/dashboard/methods', label: 'Payment methods', icon: 'card' },
      { href: '/dashboard/wallets', label: 'Wallets', icon: 'wallet' },
      { href: '/dashboard/design', label: 'Checkout design', icon: 'palette' },
      { href: '/dashboard/offers', label: 'Order bump & upsell', icon: 'gift' },
    ],
  },
  {
    heading: 'Account',
    items: [
      { href: '/dashboard/notifications', label: 'Notifications', icon: 'bell' },
      { href: '/dashboard/webhooks', label: 'Webhooks', icon: 'plug' },
      { href: '/dashboard/developers', label: 'Developers', icon: 'code' },
      { href: '/dashboard/team', label: 'Team', icon: 'users' },
      { href: '/dashboard/billing', label: 'Plan & billing', icon: 'receipt' },
    ],
  },
];

function isActive(pathname: string, href: string) {
  // Exact match for the index, prefix match for the rest, so
  // /dashboard/orders/abc keeps Orders highlighted.
  return href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
}

export function NavLinks({ awaiting }: { awaiting: number }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard" className="px-3 pb-2">
      {GROUPS.map((group) => (
        <div key={group.heading} className="mb-3">
          <p className="px-3 pb-1 pt-2 text-[11px] font-medium text-ink-400">{group.heading}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const badge = item.badgeKey === 'awaiting' && awaiting > 0 ? awaiting : null;
              const I = Icon[item.icon];
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] transition ${
                      active
                        ? 'bg-ink-800 font-semibold text-white shadow-[0_6px_18px_-12px_rgba(16,42,60,0.6)]'
                        : 'text-ink-200 hover:bg-ink-800/60 hover:text-white'
                    }`}
                  >
                    <I className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-white' : 'text-ink-300'}`} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {badge ? (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#0f3b33] px-1.5 text-[10.5px] font-semibold text-[#fff]">
                        {badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

const TABS: { href: string; label: string; icon: IconName; match: string[] }[] = [
  { href: '/dashboard', label: 'Overview', icon: 'home', match: ['/dashboard'] },
  { href: '/dashboard/orders', label: 'Activity', icon: 'orders', match: ['/dashboard/orders', '/dashboard/recovery', '/dashboard/subscriptions'] },
  { href: '/dashboard/reports', label: 'Reports', icon: 'chart', match: ['/dashboard/reports', '/dashboard/fraud', '/dashboard/monitoring'] },
  { href: '/dashboard/methods', label: 'Checkout', icon: 'card', match: ['/dashboard/methods', '/dashboard/wallets', '/dashboard/design', '/dashboard/offers'] },
  { href: '/dashboard/notifications', label: 'Settings', icon: 'bell', match: ['/dashboard/notifications', '/dashboard/webhooks', '/dashboard/developers', '/dashboard/team', '/dashboard/billing'] },
];

/** The pill tabs across the top: one per area of the dashboard. */
export function TopTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Sections" className="flex flex-wrap items-center gap-2">
      {TABS.map((tab) => {
        const active = tab.match.some((m) => isActive(pathname, m));
        const I = Icon[tab.icon];
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`glass flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-[13px] font-medium transition ${
              active ? 'text-white' : 'text-ink-200 hover:text-white'
            }`}
          >
            <span
              className={`grid h-8 w-8 place-items-center rounded-full ${
                active ? 'bg-[#0f3b33] text-[#fff]' : 'bg-ink-800/80 text-ink-300'
              }`}
            >
              <I className="h-4 w-4" />
            </span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
