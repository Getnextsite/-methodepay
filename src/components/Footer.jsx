import { Link } from 'react-router-dom'
import Logo from './Logo.jsx'
import { openCookieSettings } from './CookieConsent.jsx'

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
      { to: '/payments', label: 'Payment methods' },
      { to: '/blog', label: 'Blog' },
      { to: '/docs', label: 'Documentation' },
      { to: '/docs#getting-started', label: 'Getting started' },
      { to: '/contact', label: 'Support' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/legal/terms', label: 'Terms of Service' },
      { to: '/legal/privacy', label: 'Privacy Policy' },
      { to: '/legal/cookies', label: 'Cookie Policy' },
      { to: '/legal/refunds', label: 'Refund Policy' },
      { to: '/contact', label: 'Contact' },
    ],
  },
]

/**
 * A handful of rails linked by name from the footer.
 *
 * Internal links are how these pages get crawled at all — a sitemap invites a
 * crawler, a link is what actually carries authority to the page.
 */
const railLinks = [
  { to: '/payments/stripe', label: 'Stripe' },
  { to: '/payments/crypto', label: 'Crypto' },
  { to: '/payments/whatsapp', label: 'WhatsApp' },
  { to: '/payments/bank-transfer', label: 'Bank transfer' },
  { to: '/payments/western-union', label: 'Western Union' },
  { to: '/payments/card-to-bitcoin', label: 'Card to Bitcoin' },
  { to: '/payments/upi', label: 'UPI' },
  { to: '/payments/amazon-gift-card', label: 'Amazon gift card' },
]

export default function Footer() {
  return (
    <footer className="relative mt-24 border-t border-white/[0.07] bg-ink-800/60">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-400">
              Hosted checkout for merchants the big processors keep turning away. Nineteen ways
              to get paid, on your own domain. No revenue share.
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

        <nav aria-label="Payment methods" className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Ways to get paid
          </h2>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            {railLinks.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-xs text-zinc-500 transition hover:text-zinc-300">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/payments" className="text-xs font-medium text-violet-300 hover:text-violet-200">
                All 19 methods →
              </Link>
            </li>
          </ul>
        </nav>

        <div className="mt-8 hairline" />

        <div className="mt-6 flex flex-col gap-3 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} MethodePay. All rights reserved.{' '}
            <button
              type="button"
              onClick={openCookieSettings}
              className="underline underline-offset-4 transition hover:text-zinc-300"
            >
              Cookie settings
            </button>
          </p>
          <p>
            WordPress is a trademark of the WordPress Foundation. MethodePay is not affiliated
            with Stripe, PayPal or WooCommerce.
          </p>
        </div>
      </div>
    </footer>
  )
}
