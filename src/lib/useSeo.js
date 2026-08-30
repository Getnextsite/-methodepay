import { useEffect } from 'react'

const SITE = 'MethodePay'
const ORIGIN = 'https://methodepay.com'

function upsertMeta(selector, attrs) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    document.head.appendChild(el)
  }
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v))
  return el
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

const JSONLD_ID = 'methodepay-jsonld'

function upsertJsonLd(data) {
  let el = document.getElementById(JSONLD_ID)
  if (!data) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = JSONLD_ID
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

/** Schema.org helpers — pages pass the result to useSeo as `jsonLd`. */
export const faqSchema = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((i) => ({
    '@type': 'Question',
    name: i.q,
    acceptedAnswer: { '@type': 'Answer', text: i.a },
  })),
})

export const productSchema = (plans) => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'MethodePay',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'WordPress',
  description:
    'Standalone WordPress payment plugin with 9+ payment methods, 6 checkout designs and instant trial-code delivery. No WooCommerce required.',
  url: ORIGIN,
  offers: plans.map((p) => ({
    '@type': 'Offer',
    name: `${p.name} — yearly`,
    price: String(p.yearly),
    priceCurrency: 'USD',
    url: `${ORIGIN}/pricing`,
    availability: 'https://schema.org/InStock',
  })),
})

/**
 * Per-page SEO. Sets title, description, canonical, social tags and an
 * optional JSON-LD block on mount.
 */
export default function useSeo({ title, description, path = '/', jsonLd = null }) {
  useEffect(() => {
    const fullTitle = title.includes(SITE) ? title : `${title} — ${SITE}`
    document.title = fullTitle

    upsertMeta('meta[name="description"]', { name: 'description', content: description })
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: fullTitle })
    upsertMeta('meta[property="og:description"]', {
      property: 'og:description',
      content: description,
    })
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: ORIGIN + path })
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: fullTitle })
    upsertMeta('meta[name="twitter:description"]', {
      name: 'twitter:description',
      content: description,
    })
    upsertLink('canonical', ORIGIN + path)
    upsertJsonLd(jsonLd)

    return () => upsertJsonLd(null)
  }, [title, description, path, jsonLd])
}
