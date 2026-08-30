import { Link } from 'react-router-dom'
import Logo from './Logo.jsx'

const columns = [
  {
    title: 'Product',
    links: [
      { to: '/features', label: 'Features' },
      { to: '/features#design', label: 'Checkout designs' },
      { to: '/features#automation', label: 'Automation' },
      { to: '/pricing', label: 'Pricing' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { to: '/docs', label: 'Documentation' },
      { to: '/docs#getting-started', label: 'Getting started' },
      { to: '/docs#methods', label: 'Method setup guides' },
      { to: '/contact', label: 'Support' },
    ],
  },
  {
    title: 'Company',
    links: [
      { to: '/contact', label: 'Contact' },
      { to: '/pricing#faq', label: 'Pricing FAQ' },
      { to: '/contact#legal', label: 'Privacy & terms' },
      { to: '/contact#affiliate', label: 'Affiliates' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="relative mt-24 border-t border-white/[0.07] bg-ink-800/60">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-400">
              A standalone WordPress payment plugin for merchants the big processors keep
              turning away. No WooCommerce. No revenue share.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-success">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-success" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              Serving merchants in 40+ countries
            </p>
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                {col.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="rounded text-sm text-zinc-400 transition hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 hairline" />

        <div className="mt-6 flex flex-col gap-3 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} MethodePay. All rights reserved.</p>
          <p>
            WordPress is a trademark of the WordPress Foundation. MethodePay is not affiliated
            with Stripe, PayPal or WooCommerce.
          </p>
        </div>
      </div>
    </footer>
  )
}
