/**
 * Captures what a page asked for during a server render.
 *
 * `useSeo` sets the document head from an effect, and effects never run during
 * renderToString — so without this the prerendered HTML would carry real body
 * copy under one generic title.
 *
 * The slot lives on globalThis rather than in module scope on purpose. Rollup
 * duplicated this module into two SSR chunks, which meant the page wrote to
 * one copy of a module-level variable and the renderer read another, and every
 * page came out with the fallback tags. A global has exactly one instance
 * however the bundler splits things.
 *
 * Safe here because renderToString is synchronous and single-threaded: one
 * render, one page, one value, read immediately afterwards.
 */
const SLOT = Symbol.for('methodepay.seo.current')

export function resetSeo() {
  globalThis[SLOT] = null
}

export function collectSeo(value) {
  globalThis[SLOT] = value
}

export function takenSeo() {
  return globalThis[SLOT] ?? null
}
