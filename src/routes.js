import { paymentGuides } from './data/payments.js'
import { posts } from './data/posts.js'
import { legalPages } from './data/legal.js'

/**
 * Every route, declared once.
 *
 * This is the single source of truth for three things that used to drift
 * apart: what the router renders, what the sitemap lists, and what the build
 * prerenders to static HTML. A page that is not in here is invisible to search
 * engines, so adding one here is the whole job.
 *
 * `load` is a dynamic import so the client can code-split on it and the
 * prerender step can await it. React.lazy cannot be rendered by
 * renderToString, so the server resolves these eagerly instead.
 */
export const routes = [
  { path: '/', load: () => import('./pages/Home.jsx'), priority: 1.0, changefreq: 'weekly' },
  { path: '/features', load: () => import('./pages/Features.jsx'), priority: 0.9 },
  { path: '/pricing', load: () => import('./pages/Pricing.jsx'), priority: 0.9 },
  { path: '/docs', load: () => import('./pages/Docs.jsx'), priority: 0.7 },
  { path: '/contact', load: () => import('./pages/Contact.jsx'), priority: 0.5 },

  // Payment-method guides: one page per rail. These are the long-tail pages —
  // somebody searching "accept payment by Western Union on a website" is much
  // closer to buying than somebody searching "payment plugin".
  { path: '/payments', load: () => import('./pages/Payments.jsx'), priority: 0.9 },
  {
    path: '/payments/:slug',
    load: () => import('./pages/PaymentGuide.jsx'),
    priority: 0.8,
    expand: () => paymentGuides.map((g) => `/payments/${g.slug}`),
  },

  { path: '/blog', load: () => import('./pages/Blog.jsx'), priority: 0.8, changefreq: 'weekly' },
  {
    path: '/blog/:slug',
    load: () => import('./pages/BlogPost.jsx'),
    priority: 0.7,
    expand: () => posts.map((p) => `/blog/${p.slug}`),
  },

  {
    path: '/legal/:slug',
    load: () => import('./pages/Legal.jsx'),
    priority: 0.3,
    changefreq: 'yearly',
    expand: () => legalPages.map((p) => `/legal/${p.slug}`),
  },

  // Rendered for anything unmatched. Prerendered too, so a bad inbound link
  // gets a real page rather than a blank shell.
  { path: '*', load: () => import('./pages/NotFound.jsx'), noindex: true },
]

/** Concrete URLs — dynamic routes expanded. Used by the sitemap and prerender. */
export function allPaths() {
  const out = []
  for (const route of routes) {
    if (route.path === '*') continue
    if (route.expand) out.push(...route.expand().map((p) => ({ ...route, path: p })))
    else out.push(route)
  }
  return out
}
