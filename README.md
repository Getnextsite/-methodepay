# MethodePay — marketing site

Conversion-focused marketing site for MethodePay, a standalone WordPress payment plugin.
React + Vite + Tailwind, dark premium-fintech theme, five routes.

## Run it

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

`npm run preview` serves the production build locally with SPA fallback.

## Pages

| Route | File | What's on it |
| --- | --- | --- |
| `/` | `src/pages/Home.jsx` | Hero + animated checkout mockup, payment-method wall, pain band, 6-card feature grid, 3-step how-it-works, **interactive** live-editor demo (`#demo`), testimonials, pricing preview, FAQ, footer CTA |
| `/features` | `src/pages/Features.jsx` | Deep dive grouped by Payments / Checkout Design / Automation / Admin, each with a UI mockup; full method matrix; six checkout designs |
| `/pricing` | `src/pages/Pricing.jsx` | Three plans with yearly/lifetime toggle, guarantees strip, full comparison table, Agency justification block, pricing FAQ |
| `/docs` | `src/pages/Docs.jsx` | Sidebar nav with scroll-spy, getting started, per-method setup guides, automation, shortcodes, troubleshooting |
| `/contact` | `src/pages/Contact.jsx` | Support form, channels, support FAQ, privacy & terms (`#legal`), affiliates (`#affiliate`) |

Anything not matching falls through to `src/pages/NotFound.jsx`.

## Where the content lives

All marketing copy, features, testimonials, plans and FAQ answers are in
**`src/data/site.js`** — edit that file rather than the JSX. Docs content is inline in
`src/pages/Docs.jsx` because each entry carries its own markup.

### Pricing

Defined once in `src/data/site.js` (`plans` and `comparison`):

| | Starter | Professional ⭐ | Agency |
| --- | --- | --- | --- |
| Yearly | $39 | $89 | $199 |
| Lifetime | $117 | $267 | $597 |
| Sites | 1 | 5 | Unlimited |

Professional is flagged `popular: true`, which drives the badge, violet border and glow.

## Design system

- Background `#0a0a0f` with decorative radial glows (`<Glow />`, always `aria-hidden`)
- Accent electric violet `#7c5cff` → indigo `#4f46e5`; success green `#00d632`
- Plus Jakarta Sans / Inter, tight heading tracking, relaxed body leading
- Glassmorphic cards via the `.glass` / `.glass-hover` component classes in `src/index.css`
- Buttons via `.btn-primary` (animated gradient) and `.btn-secondary`

Tokens live in `tailwind.config.js`. Note that `zinc.500` and `zinc.600` are deliberately
overridden to lighter values than Tailwind's defaults so 11–13px muted copy clears WCAG AA
(4.5:1) on the glass surfaces — the primary-button gradient stops are likewise kept dark
enough for white label text at every point of the animation.

## Accessibility

- Skip link, one `h1` per page, no heading-level jumps, semantic landmarks
- Every interactive control keyboard-reachable with a visible `:focus-visible` ring
- Accordions use `aria-expanded` / `aria-controls`; toggles use `role="switch"`
- Contrast audited page-by-page against composited backgrounds — no failures
- All animation is suppressed under `prefers-reduced-motion: reduce`
- Decorative UI mockups are `aria-hidden` or exposed as a single `role="img"` with a text
  alternative, so screen readers don't crawl fake checkout markup

## Performance & SEO

- Routes other than Home are `React.lazy` code-split (see `src/App.jsx`)
- All illustrations are inline SVG/CSS — there are no raster assets to download. If you swap
  in real screenshots, add `loading="lazy"` and `decoding="async"` to those `<img>` tags.
- Per-page title, description, canonical and Open Graph tags via `src/lib/useSeo.js`
- JSON-LD structured data on Home and Pricing (`SoftwareApplication` with the three yearly
  offers, plus `FAQPage`), injected and torn down per route by the same hook
- No `og:image` yet — add a 1200×630 PNG to `public/` and reference it in `index.html`
- `public/robots.txt` and `public/sitemap.xml` — update the domain in both, plus `ORIGIN` in
  `src/lib/useSeo.js`, before launch

## Before launch

1. Replace `https://methodepay.com` in `src/lib/useSeo.js`, `index.html`, `public/robots.txt`
   and `public/sitemap.xml`.
2. Point the plan CTAs (`/contact#buy` in `src/components/PlanCards.jsx`) at your real
   checkout or cart URLs.
3. Wire the contact form in `src/pages/Contact.jsx` to a real endpoint — it currently
   validates and shows a success state without sending anything.
4. Swap the testimonials in `src/data/site.js` for real, attributable quotes.
5. Deploying to static hosting? `public/_redirects` covers Netlify; for other hosts add the
   equivalent SPA fallback rewrite to `index.html`.
