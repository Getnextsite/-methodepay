import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/**
 * Turn the SPA into static HTML, one file per route.
 *
 * Before this, the site shipped a 2KB shell with an empty <div id="root">.
 * Google will run the JavaScript eventually, but the crawlers that build share
 * previews — Facebook, LinkedIn, WhatsApp, X, Slack — never do, so every
 * shared link fell back to the single set of tags hardcoded in index.html.
 *
 * Vercel serves a real file before it applies the SPA rewrite, so writing
 * dist/payments/crypto/index.html is all it takes for that URL to be served
 * as a prerendered page while client-side navigation still works normally.
 */
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const dist = join(root, 'dist')
const ORIGIN = 'https://www.methodepay.com'

const { render, allPaths } = await import(
  pathToFileURL(join(root, 'dist-ssr', 'entry-server.js')).href
)

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Replace a tag that index.html already carries, rather than duplicating it. */
function swap(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html.replace('</head>', `  ${replacement}\n</head>`)
}

function applyHead(template, seo, url) {
  if (!seo) return template
  const title = seo.title.includes('MethodePay') ? seo.title : `${seo.title} — MethodePay`
  const canonical = ORIGIN + (seo.path ?? url)
  let out = template

  out = swap(out, /<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
  out = swap(
    out,
    /<meta\s+name="description"[\s\S]*?\/>/,
    `<meta name="description" content="${esc(seo.description)}" />`,
  )
  out = swap(out, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${esc(canonical)}" />`)
  out = swap(
    out,
    /<meta property="og:title"[^>]*>/,
    `<meta property="og:title" content="${esc(title)}" />`,
  )
  out = swap(
    out,
    /<meta\s+property="og:description"[\s\S]*?\/>/,
    `<meta property="og:description" content="${esc(seo.description)}" />`,
  )
  out = out.replace(
    '</head>',
    `  <meta property="og:url" content="${esc(canonical)}" />\n` +
      `  <meta name="twitter:title" content="${esc(title)}" />\n` +
      `  <meta name="twitter:description" content="${esc(seo.description)}" />\n` +
      (seo.jsonLd
        ? `  <script type="application/ld+json">${JSON.stringify(seo.jsonLd).replace(/</g, '\\u003c')}</script>\n`
        : '') +
      '</head>',
  )
  return out
}

const template = await readFile(join(dist, 'index.html'), 'utf8')
const targets = allPaths()

let written = 0
for (const route of targets) {
  const url = route.path
  const { html, seo } = await render(url)

  let page = applyHead(template, seo, url)
  page = page.replace('<div id="root"></div>', `<div id="root">${html}</div>`)

  const outDir = url === '/' ? dist : join(dist, url)
  await mkdir(outDir, { recursive: true })
  await writeFile(join(outDir, 'index.html'), page, 'utf8')
  written += 1
}

// The sitemap is generated from the same list, so a new page cannot be live
// and missing from it.
const today = new Date().toISOString().slice(0, 10)
const sitemap =
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  targets
    .filter((r) => !r.noindex)
    .map(
      (r) =>
        `  <url><loc>${ORIGIN}${r.path === '/' ? '/' : r.path}</loc>` +
        `<lastmod>${today}</lastmod>` +
        `<changefreq>${r.changefreq ?? 'monthly'}</changefreq>` +
        `<priority>${(r.priority ?? 0.6).toFixed(1)}</priority></url>`,
    )
    .join('\n') +
  '\n</urlset>\n'

await writeFile(join(dist, 'sitemap.xml'), sitemap, 'utf8')

console.log(`prerendered ${written} pages, sitemap lists ${targets.filter((r) => !r.noindex).length}`)
