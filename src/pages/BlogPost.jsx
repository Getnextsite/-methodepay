import { Link, useParams } from 'react-router-dom'
import useSeo from '../lib/useSeo.js'
import Reveal from '../components/Reveal.jsx'
import Glow from '../components/Glow.jsx'
import CtaBand from '../components/CtaBand.jsx'
import NotFound from './NotFound.jsx'
import { ArrowRight } from '../components/Icons.jsx'
import { post, sortedPosts } from '../data/posts.js'
import { formatDate } from './Blog.jsx'

const ORIGIN = 'https://www.methodepay.com'

export default function BlogPost() {
  const { slug } = useParams()
  const entry = post(slug)
  if (!entry) return <NotFound />
  return <Article entry={entry} />
}

/** Renders the structured body blocks. Keeps authoring in data, not JSX. */
function Block({ block }) {
  switch (block.type) {
    case 'h2':
      return <h2>{block.text}</h2>
    case 'h3':
      return <h3>{block.text}</h3>
    case 'ul':
      return (
        <ul>
          {block.items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      )
    case 'ol':
      return (
        <ol>
          {block.items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ol>
      )
    case 'note':
      return (
        <aside className="glass mt-7 border-violet-400/20 bg-violet-400/[0.06] p-5 text-sm leading-relaxed text-zinc-300">
          {block.text}
        </aside>
      )
    case 'table':
      return (
        <div className="mt-7 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr>
                {block.head.map((h) => (
                  <th
                    key={h}
                    className="border-b border-white/10 pb-2.5 pr-5 text-xs font-semibold uppercase tracking-wider text-zinc-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) => (
                    <td
                      key={i}
                      className={`border-b border-white/[0.06] py-3 pr-5 ${
                        i === 0 ? 'font-semibold text-white' : 'text-zinc-400'
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'cta':
      return (
        <p className="mt-8">
          <Link to={block.href} className="btn-primary">
            {block.text} <ArrowRight width={16} height={16} />
          </Link>
        </p>
      )
    default:
      return <p>{block.text}</p>
  }
}

function Article({ entry }) {
  const more = sortedPosts.filter((p) => p.slug !== entry.slug).slice(0, 2)

  useSeo({
    title: entry.title,
    description: entry.description,
    path: `/blog/${entry.slug}`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: entry.title,
      description: entry.description,
      datePublished: entry.date,
      dateModified: entry.updated ?? entry.date,
      author: { '@type': 'Organization', name: 'MethodePay', url: ORIGIN },
      publisher: { '@type': 'Organization', name: 'MethodePay', url: ORIGIN },
      mainEntityOfPage: { '@type': 'WebPage', '@id': `${ORIGIN}/blog/${entry.slug}` },
      keywords: entry.tags.join(', '),
    },
  })

  return (
    <>
      <section className="relative overflow-hidden">
        <Glow className="-top-28 left-1/4" />
        <div className="container-page py-14 sm:py-16">
          <nav aria-label="Breadcrumb" className="text-xs font-medium text-zinc-500">
            <Link to="/blog" className="hover:text-zinc-300">
              Blog
            </Link>
            <span aria-hidden className="px-2">
              /
            </span>
            <span className="text-zinc-400">{entry.tags[0]}</span>
          </nav>

          <Reveal className="mt-6">
            <h1 className="max-w-3xl text-3xl font-extrabold leading-[1.08] tracking-tightest text-white sm:text-4xl">
              {entry.title}
            </h1>
            <p className="mt-5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <time dateTime={entry.date}>{formatDate(entry.date)}</time>
              <span aria-hidden>·</span>
              <span>{entry.readingTime} min read</span>
              {entry.updated && entry.updated !== entry.date ? (
                <>
                  <span aria-hidden>·</span>
                  <span>Updated {formatDate(entry.updated)}</span>
                </>
              ) : null}
            </p>
          </Reveal>
        </div>
      </section>

      <article className="container-page grid gap-10 pb-6 lg:grid-cols-[1fr_18rem] lg:items-start">
        <div className="prose-mp min-w-0 max-w-[46rem]">
          <p className="!mt-0 text-lg leading-relaxed text-zinc-300">{entry.excerpt}</p>
          <hr className="mt-6 border-white/10" />
          {entry.body.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </div>

        <aside className="lg:sticky lg:top-24">
          <div className="glass p-5">
            <p className="text-sm font-bold text-white">Take payments this week</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Eighteen rails on one checkout. WhatsApp, crypto and bank transfer need no processor
              approval at all.
            </p>
            <Link to="/payments" className="btn-secondary mt-4 w-full">
              See the rails
            </Link>
          </div>

          {more.length > 0 ? (
            <nav className="glass mt-4 p-5" aria-label="More posts">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Read next
              </p>
              <ul className="mt-3 grid gap-3">
                {more.map((p) => (
                  <li key={p.slug}>
                    <Link
                      to={`/blog/${p.slug}`}
                      className="block text-sm font-medium leading-snug text-zinc-300 hover:text-white"
                    >
                      {p.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </aside>
      </article>

      <CtaBand />
    </>
  )
}
