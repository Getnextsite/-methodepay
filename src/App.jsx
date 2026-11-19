import { Suspense, createElement, lazy, useEffect, useMemo } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Nav from './components/Nav.jsx'
import Footer from './components/Footer.jsx'
import CookieConsent from './components/CookieConsent.jsx'
import { routes } from './routes.js'


/** Restores scroll on navigation and honours #hash targets. */
function ScrollManager() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const jump = () => {
      const el = document.getElementById(hash.slice(1))
      if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY - 72
      window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' })
    }
    jump()
    // On a cross-page hash link the target has only just been committed, and
    // the browser's own scroll restoration can undo the first attempt.
    const t = setTimeout(jump, 0)
    return () => clearTimeout(t)
  }, [pathname, hash])

  return null
}

function PageFallback() {
  return (
    <div className="container-page py-32 text-center text-sm text-zinc-500" role="status">
      Loading…
    </div>
  )
}

export default function App({ pages: resolved }) {
  // Code-split on the client. The server passes concrete components instead:
  // a React.lazy wrapper suspends on its first render even when the import
  // has already resolved, so renderToString would emit the Suspense fallback
  // and every prerendered page would say "Loading…" under a real-looking
  // shell — which is worse than not prerendering, because it looks fine.
  const pages = useMemo(
    () => resolved ?? routes.map((r) => ({ path: r.path, Component: lazy(r.load) })),
    [resolved],
  )

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-violet-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-onaccent"
      >
        Skip to content
      </a>

      <ScrollManager />
      <Nav />

      <main id="main" className="flex-1">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {pages.map((r) => (
              <Route key={r.path} path={r.path} element={createElement(r.Component)} />
            ))}
          </Routes>
        </Suspense>
      </main>

      <Footer />
      <CookieConsent />
    </div>
  )
}
