import { Link } from 'react-router-dom'
import useSeo from '../lib/useSeo.js'
import Reveal from '../components/Reveal.jsx'
import Glow from '../components/Glow.jsx'
import CtaBand from '../components/CtaBand.jsx'
import { ArrowRight } from '../components/Icons.jsx'
import { sortedPosts } from '../data/posts.js'

const ORIGIN = 'https://www.methodepay.com'
const DESCRIPTION =
  'Practical writing about getting paid when the usual rails say no — processor declines, chargebacks, crypto settlement and the payment methods that work where cards do not.'

export function formatDate(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default function Blog() {
  useSeo({
    title: 'Blog — getting paid when the usual rails say no',
    description: DESCRIPTION,
    path: '/blog',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'MethodePay blog',
      description: DESCRIPTION,
      url: `${ORIGIN}/blog`,
      blogPost: sortedPosts.map((p) => ({
        '@type': 'BlogPosting',
        headline: p.title,
        description: p.description,
        datePublished: p.date,
        dateModified: p.updated ?? p.date,
        url: `${ORIGIN}/blog/${p.slug}`,
      })),
    },
  })

  const [lead, ...rest] = sortedPosts

  return (
    <>
      <section className="relative overflow-hidden">
        <Glow className="-top-24 left-1/3" />
        <div className="container-page py-16 sm:py-20">
          <Reveal>
            <span className="eyebrow">Blog</span>
            <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tightest text-white sm:text-5xl">
              Getting paid when the usual rails say no
            </h1>
            <p className="lead mt-5 max-w-2xl">{DESCRIPTION}</p>
          </Reveal>
        </div>
      </section>

      <div className="container-page pb-8">
        {lead ? (
          <Reveal>
            <Link to={`/blog/${lead.slug}`} className="glass glass-hover block p-7 sm:p-9">
              <p className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span className="chip-sm border-violet-400/30 bg-violet-400/10 text-violet-300">
                  Latest
                </span>
                <time dateTime={lead.date}>{formatDate(lead.date)}</time>
                <span aria-hidden>·</span>
                <span>{lead.readingTime} min read</span>
              </p>
              <h2 className="mt-4 max-w-3xl text-2xl font-extrabold leading-tight tracking-tightest text-white sm:text-3xl">
                {lead.title}
              </h2>
              <p className="lead mt-3 max-w-2xl">{lead.excerpt}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-violet-300">
                Read it <ArrowRight width={15} height={15} />
              </span>
            </Link>
          </Reveal>
        ) : null}

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((p, i) => (
            <Reveal key={p.slug} delay={i * 60}>
              <Link to={`/blog/${p.slug}`} className="glass glass-hover flex h-full flex-col p-6">
                <p className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <time dateTime={p.date}>{formatDate(p.date)}</time>
                  <span aria-hidden>·</span>
                  <span>{p.readingTime} min</span>
                </p>
                <h2 className="mt-3 text-lg font-bold leading-snug tracking-tight text-white">
                  {p.title}
                </h2>
                <p className="mt-2.5 text-sm leading-relaxed text-zinc-400">{p.excerpt}</p>
                <span className="mt-auto flex flex-wrap gap-1.5 pt-5">
                  {p.tags.map((t) => (
                    <span key={t} className="chip-sm border-white/10 bg-white/[0.04] text-zinc-400">
                      {t}
                    </span>
                  ))}
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>

      <CtaBand
        title="Stop losing sales to a payment page."
        sub="Eighteen rails on one checkout. Switch on the ones that work where you sell."
      />
    </>
  )
}
