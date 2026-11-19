import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import App from './App.jsx'
import { allPaths, routes } from './routes.js'
import { resetSeo, takenSeo } from './lib/seoCollector.js'

/**
 * The server half of the build.
 *
 * Vite builds this to a single Node bundle and `scripts/prerender.mjs` calls
 * `render()` once per URL. Without it the site ships a 2KB shell: Google will
 * execute the JavaScript eventually, but Facebook, LinkedIn, WhatsApp and X
 * never do, so every shared link falls back to the one set of tags hardcoded
 * in index.html.
 */
export { allPaths }

/**
 * Resolve every route module to a concrete component.
 *
 * Not just a warm-up: a React.lazy wrapper suspends the first time it renders
 * even if its import already resolved, so handing App real components is what
 * stops renderToString emitting the Suspense fallback instead of the page.
 */
let pages = null
async function resolvePages() {
  if (pages) return pages
  const mods = await Promise.all(routes.map((r) => r.load()))
  pages = routes.map((r, i) => ({ path: r.path, Component: mods[i].default }))
  return pages
}

export async function render(url) {
  const resolved = await resolvePages()
  resetSeo()

  const html = renderToString(
    <StaticRouter location={url}>
      <App pages={resolved} />
    </StaticRouter>,
  )

  // Whatever the page passed to useSeo during this render. Read straight after
  // the synchronous render, so it can only belong to this page.
  return { html, seo: takenSeo() }
}
