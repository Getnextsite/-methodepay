'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const GROUPS: { heading: string; items: { href: string; label: string; badgeKey?: 'awaiting' }[] }[] = [
  {
    heading: 'Selling',
    items: [
      { href: '/dashboard', label: 'Overview' },
      { href: '/dashboard/orders', label: 'Orders', badgeKey: 'awaiting' },
      { href: '/dashboard/products', label: 'Products' },
      { href: '/dashboard/subscriptions', label: 'Subscriptions' },
      { href: '/dashboard/coupons', label: 'Coupons' },
    ],
  },
  {
    heading: 'Checkout',
    items: [
      { href: '/dashboard/methods', label: 'Payment methods' },
      { href: '/dashboard/wallets', label: 'Wallets' },
      { href: '/dashboard/design', label: 'Checkout design' },
    ],
  },
  {
    heading: 'Account',
    items: [
      { href: '/dashboard/notifications', label: 'Notifications' },
      { href: '/dashboard/developers', label: 'Developers' },
      { href: '/dashboard/team', label: 'Team' },
      { href: '/dashboard/billing', label: 'Plan & billing' },
    ],
  },
];

export function NavLinks({ awaiting }: { awaiting: number }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard" className="px-3 pb-2">
      {GROUPS.map((group) => (
        <div key={group.heading} className="mb-4">
          <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            {group.heading}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              // Exact match for the index, prefix match for the rest, so
              // /dashboard/orders/abc keeps Orders highlighted.
              const active =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href);
              const badge = item.badgeKey === 'awaiting' && awaiting > 0 ? awaiting : null;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-sm transition ${
                      active
                        ? 'bg-mint/10 font-medium text-mint'
                        : 'text-ink-200 hover:bg-ink-700/50 hover:text-white'
                    }`}
                  >
                    <span>{item.label}</span>
                    {badge ? (
                      <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[11px] font-semibold text-amber-200">
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
