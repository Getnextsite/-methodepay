import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import Logo from './Logo.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import { signInUrl, signUpUrl } from '../lib/appUrl.js'

const links = [
  { to: '/', label: 'Home' },
  { to: '/features', label: 'Features' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/docs', label: 'Docs' },
  { to: '/contact', label: 'Contact' },
]

export default function Nav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled || open
          ? 'border-b border-white/[0.07] bg-ink/80 backdrop-blur-xl'
          : 'border-b border-transparent'
      }`}
    >
      <nav className="container-page flex h-16 items-center justify-between" aria-label="Main">
        <Link to="/" className="rounded-lg" aria-label="MethodePay home">
          <Logo />
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium tracking-tight transition ${
                    isActive
                      ? 'text-white'
                      : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'
                  }`
                }
              >
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* The app is a separate deployment, so these are real URLs. */}
        <div className="hidden items-center gap-2.5 md:flex">
          <ThemeToggle />
          <a href={signInUrl} className="btn-secondary !px-4 !py-2.5">
            Sign in
          </a>
          <a href={signUpUrl} className="btn-primary !px-4 !py-2.5">
            Start free
          </a>
        </div>

        <ThemeToggle className="ml-auto mr-2 md:hidden" />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-200 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d={open ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'}
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </nav>

      {open && (
        <div id="mobile-menu" className="border-t border-white/[0.07] bg-ink/95 md:hidden">
          <ul className="container-page flex flex-col py-3">
            {links.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  end={l.to === '/'}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-3 text-base font-medium ${
                      isActive ? 'text-white' : 'text-zinc-400'
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
            <li className="mt-2 flex flex-col gap-2 px-1 pb-3">
              <a href={signInUrl} className="btn-secondary w-full">
                Sign in
              </a>
              <a href={signUpUrl} className="btn-primary w-full">
                Start free
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  )
}
