import { Suspense, lazy, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Nav from './components/Nav.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'

const Features = lazy(() => import('./pages/Features.jsx'))
const Pricing = lazy(() => import('./pages/Pricing.jsx'))
const Docs = lazy(() => import('./pages/Docs.jsx'))
const Contact = lazy(() => import('./pages/Contact.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))

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

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-violet-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <ScrollManager />
      <Nav />

      <main id="main" className="flex-1">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/features" element={<Features />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />
    </div>
  )
}
