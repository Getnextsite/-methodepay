import { Link } from 'react-router-dom'
import useSeo from '../lib/useSeo.js'
import Reveal from '../components/Reveal.jsx'
import Glow from '../components/Glow.jsx'
import CtaBand from '../components/CtaBand.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import { ArrowRight, Check } from '../components/Icons.jsx'
import { GROUPS, SETTLEMENT, guidesByGroup, paymentGuides } from '../data/payments.js'

const DESCRIPTION =
  'Eighteen ways to get paid on one checkout — cards, on-ramps, crypto, bank transfer, cash and chat. What each one needs, how fast it settles, and who it is for.'

/** An index that is useful in its own right, not just a list of links. */
export default function Payments() {
  const groups = guidesByGroup()

  useSeo({
    title: 'Payment methods — every way to get paid',
    description: DESCRIPTION,
    path: '/payments',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Payment methods supported by MethodePay',
      itemListElement: paymentGuides.map((g, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: g.name,
        url: `https://www.methodepay.com/payments/${g.slug}`,
      })),
    },
  })

  return (
    <>
      <section className="relative overflow-hidden">
        <Glow className="-top-24 left-1/3" />
        <div className="container-page py-16 sm:py-24">
          <Reveal>
            <span className="eyebrow">{paymentGuides.length} payment rails</span>
            <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tightest text-white sm:text-5xl">
              Every way to get paid, and the honest cost of each
            </h1>
            <p className="lead mt-5 max-w-2xl">{DESCRIPTION}</p>
          </Reveal>

          <Reveal delay={80} className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              ['Settles itself', 'A verified webhook marks the order paid. Nothing for you to do.'],
              ['You confirm it', 'The buyer says they paid; you check and release. Slower, and nobody can decline you.'],
              ['Never in the middle', 'Money moves between your buyer and your own account. We never hold it.'],
            ].map(([t, d]) => (
              <div key={t} className="glass p-5">
                <p className="text-sm font-bold text-white">{t}</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{d}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {groups.map((group, gi) => (
        <section key={group.id} className="container-page py-10">
          <SectionHeading
            eyebrow={`${group.guides.length} rail${group.guides.length === 1 ? '' : 's'}`}
            title={group.name}
            sub={group.blurb}
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.guides.map((g, i) => {
              const s = SETTLEMENT[g.settlement]
              return (
                <Reveal key={g.slug} delay={i * 60}>
                  <Link
                    to={`/payments/${g.slug}`}
                    className="glass glass-hover flex h-full flex-col p-5"
                  >
                    <span className="flex items-center gap-3">
                      <img
                        src={`/rails/${g.key}.webp`}
                        alt=""
                        width={36}
                        height={36}
                        loading={gi === 0 ? 'eager' : 'lazy'}
                        className="h-9 w-9 rounded-lg object-contain"
                      />
                      <span className="text-base font-bold tracking-tight text-white">{g.name}</span>
                    </span>

                    <span className="mt-3 block text-sm leading-relaxed text-zinc-400">
                      {g.bestFor}
                    </span>

                    <span className="mt-4 flex flex-wrap items-center gap-2 pt-1">
                      <span
                        className={`chip-sm ${
                          s.tone === 'good'
                            ? 'border-success/40 bg-success/10 text-success'
                            : 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                        }`}
                      >
                        {s.label}
                      </span>
                      {g.minimum !== '$1' ? (
                        <span className="chip-sm border-white/10 bg-white/[0.04] text-zinc-400">
                          Min {g.minimum}
                        </span>
                      ) : null}
                    </span>

                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-violet-300">
                      Read the guide <ArrowRight width={15} height={15} />
                    </span>
                  </Link>
                </Reveal>
              )
            })}
          </div>
        </section>
      ))}

      <section className="container-page py-10">
        <Reveal className="glass p-6 sm:p-8">
          <h2 className="text-xl font-bold tracking-tight text-white">
            You do not have to choose one
          </h2>
          <p className="lead mt-3 max-w-2xl">
            Most merchants here run three or four at once: whatever automatic rail they can get, plus
            the manual ones that catch the buyers it turns away. Each is switched on independently,
            and a buyer only ever sees the ones that are ready and that apply to their order.
          </p>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {GROUPS.map((g) => (
              <li key={g.id} className="flex gap-2.5 text-sm text-zinc-300">
                <Check width={17} height={17} className="mt-0.5 shrink-0 text-success" />
                <span>{g.blurb}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      <CtaBand
        title="Switch on the rails that work where you sell."
        sub="Fourteen days on the trial, no card. WhatsApp, direct crypto and bank transfer work immediately — they need no processor approval at all."
      />
    </>
  )
}
