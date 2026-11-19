import { Link, useParams } from 'react-router-dom'
import useSeo from '../lib/useSeo.js'
import Reveal from '../components/Reveal.jsx'
import NotFound from './NotFound.jsx'
import { legalPage, legalPages } from '../data/legal.js'
import { formatDate } from './Blog.jsx'

export default function Legal() {
  const { slug } = useParams()
  const page = legalPage(slug)
  if (!page) return <NotFound />
  return <Document page={page} />
}

function Document({ page }) {
  useSeo({
    title: `${page.title} — MethodePay`,
    description: page.description,
    path: `/legal/${page.slug}`,
  })

  return (
    <div className="container-page grid gap-10 py-14 lg:grid-cols-[16rem_1fr] lg:items-start sm:py-16">
      <nav className="lg:sticky lg:top-24" aria-label="Legal pages">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Legal</p>
        <ul className="mt-4 grid gap-1">
          {legalPages.map((p) => (
            <li key={p.slug}>
              <Link
                to={`/legal/${p.slug}`}
                aria-current={p.slug === page.slug ? 'page' : undefined}
                className={`block rounded-lg px-3 py-2 text-sm transition ${
                  p.slug === page.slug
                    ? 'bg-white/[0.07] font-semibold text-white'
                    : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                {p.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <article className="min-w-0 max-w-[46rem]">
        <Reveal>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tightest text-white sm:text-4xl">
            {page.title}
          </h1>
          <p className="mt-3 text-xs text-zinc-500">
            Last updated <time dateTime={page.updated}>{formatDate(page.updated)}</time>
          </p>
          <p className="glass mt-6 p-5 text-sm leading-relaxed text-zinc-300">{page.summary}</p>
        </Reveal>

        <div className="prose-mp mt-4">
          {page.sections.map((s) => (
            <section key={s.h}>
              <h2>{s.h}</h2>
              {s.table ? (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr>
                        {['Cookie', 'What it does', 'Lasts'].map((h) => (
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
                      {s.table.map((row) => (
                        <tr key={row[0]}>
                          <td className="border-b border-white/[0.06] py-3 pr-5 font-mono text-xs text-white">
                            {row[0]}
                          </td>
                          <td className="border-b border-white/[0.06] py-3 pr-5 text-zinc-400">
                            {row[1]}
                          </td>
                          <td className="whitespace-nowrap border-b border-white/[0.06] py-3 text-zinc-400">
                            {row[2]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {s.body?.map((para) => (
                <p key={para}>{para}</p>
              ))}
            </section>
          ))}
        </div>

        <p className="mt-12 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-4 text-xs leading-relaxed text-amber-200/90">
          This document is a starting point written against what MethodePay actually does, not legal
          advice. Anything in curly braces is a placeholder. Have a lawyer in your jurisdiction read
          it before you rely on it.
        </p>
      </article>
    </div>
  )
}
