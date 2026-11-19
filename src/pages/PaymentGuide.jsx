import { Link, useParams } from 'react-router-dom'
import useSeo, { faqSchema } from '../lib/useSeo.js'
import Reveal from '../components/Reveal.jsx'
import Glow from '../components/Glow.jsx'
import CtaBand from '../components/CtaBand.jsx'
import NotFound from './NotFound.jsx'
import { ArrowRight, Check } from '../components/Icons.jsx'
import { GROUPS, SETTLEMENT, paymentGuide, paymentGuides } from '../data/payments.js'
import { signUpUrl } from '../lib/appUrl.js'

const ORIGIN = 'https://www.methodepay.com'

/**
 * One guide, rendered from data.
 *
 * Every one of these is a separate URL with its own title, description and
 * structured data, because the search that brings somebody here is specific:
 * they want to know whether they can take Western Union, not whether payment
 * software exists.
 */
export default function PaymentGuide() {
  const { slug } = useParams()
  const guide = paymentGuide(slug)
  if (!guide) return <NotFound />

  return <Guide guide={guide} />
}

function Guide({ guide }) {
  const settlement = SETTLEMENT[guide.settlement]
  const group = GROUPS.find((g) => g.id === guide.group)
  const siblings = paymentGuides.filter((g) => g.group === guide.group && g.slug !== guide.slug)

  useSeo({
    title: `${guide.h1} — MethodePay`,
    description: guide.description,
    path: `/payments/${guide.slug}`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'HowTo',
          name: guide.h1,
          description: guide.description,
          step: guide.steps.map((s, i) => ({
            '@type': 'HowToStep',
            position: i + 1,
            name: s.title,
            text: s.body,
          })),
        },
        faqSchema(guide.faqs),
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Payment methods', item: `${ORIGIN}/payments` },
            { '@type': 'ListItem', position: 2, name: guide.name, item: `${ORIGIN}/payments/${guide.slug}` },
          ],
        },
      ],
    },
  })

  return (
    <>
      <section className="relative overflow-hidden">
        <Glow className="-top-28 left-1/4" />
        <div className="container-page py-14 sm:py-20">
          <nav aria-label="Breadcrumb" className="text-xs font-medium text-zinc-500">
            <Link to="/payments" className="hover:text-zinc-300">
              Payment methods
            </Link>
            <span aria-hidden className="px-2">
              /
            </span>
            <span className="text-zinc-400">{guide.name}</span>
          </nav>

          <Reveal className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
            <img
              src={`/rails/${guide.key}.webp`}
              alt={`${guide.name} logo`}
              width={64}
              height={64}
              className="h-16 w-16 shrink-0 rounded-2xl object-contain"
            />
            <div className="min-w-0">
              <h1 className="text-3xl font-extrabold leading-[1.08] tracking-tightest text-white sm:text-4xl">
                {guide.h1}
              </h1>
              <p className="lead mt-4 max-w-2xl">{guide.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span
                  className={`chip-sm ${
                    settlement.tone === 'good'
                      ? 'border-success/40 bg-success/10 text-success'
                      : 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                  }`}
                >
                  {settlement.label}
                </span>
                <span className="chip-sm border-white/10 bg-white/[0.04] text-zinc-400">
                  {group?.name}
                </span>
                <span className="chip-sm border-white/10 bg-white/[0.04] text-zinc-400">
                  Minimum {guide.minimum}
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="container-page grid gap-10 pb-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="min-w-0">
          {/* At a glance ------------------------------------------------ */}
          <Reveal className="glass p-6">
            <h2 className="text-lg font-bold tracking-tight text-white">At a glance</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Best for
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-zinc-300">{guide.bestFor}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  How it settles
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-zinc-300">{settlement.blurb}</dd>
              </div>
            </dl>

            <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              What you need
            </p>
            <ul className="mt-3 grid gap-2">
              {guide.needs.map((n) => (
                <li key={n} className="flex gap-2.5 text-sm text-zinc-300">
                  <Check width={17} height={17} className="mt-0.5 shrink-0 text-success" />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* Steps ------------------------------------------------------ */}
          <section className="mt-12">
            <h2 className="text-2xl font-extrabold tracking-tightest text-white">
              How {guide.name} works, step by step
            </h2>
            <ol className="mt-6 grid gap-4">
              {guide.steps.map((s, i) => (
                <Reveal key={s.title} delay={i * 50}>
                  <li className="glass flex gap-4 p-5">
                    <span
                      aria-hidden
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-violet-400/40 text-sm font-bold text-violet-300"
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-white">{s.title}</span>
                      <span className="mt-1.5 block text-sm leading-relaxed text-zinc-400">
                        {s.body}
                      </span>
                    </span>
                  </li>
                </Reveal>
              ))}
            </ol>
          </section>

          {/* What the buyer sees ---------------------------------------- */}
          <section className="mt-12">
            <h2 className="text-2xl font-extrabold tracking-tightest text-white">
              What your buyer sees
            </h2>
            <p className="lead mt-3">
              {guide.settlement === 'manual'
                ? 'A payment screen on your own checkout with the details, a reference to quote, and a way to tell you it is done.'
                : 'Your checkout, then the provider own secure page. Card details are never entered on a page we render.'}
            </p>
            <Reveal className="mt-6 overflow-hidden rounded-2xl border border-white/[0.08]">
              <img
                src="/shots/checkout-classic.webp"
                alt={`A MethodePay checkout showing ${guide.name} as a payment option`}
                width={1200}
                height={800}
                loading="lazy"
                className="w-full"
              />
            </Reveal>
          </section>

          {/* Trade-offs ------------------------------------------------- */}
          <section className="mt-12 grid gap-4 sm:grid-cols-2">
            <Reveal className="glass p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-success">
                What it gives you
              </h2>
              <ul className="mt-4 grid gap-2.5">
                {guide.pros.map((p) => (
                  <li key={p} className="flex gap-2.5 text-sm leading-relaxed text-zinc-300">
                    <Check width={17} height={17} className="mt-0.5 shrink-0 text-success" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={60} className="glass p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber-300">
                What it costs you
              </h2>
              <ul className="mt-4 grid gap-2.5">
                {guide.cons.map((c) => (
                  <li key={c} className="flex gap-2.5 text-sm leading-relaxed text-zinc-300">
                    <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-300" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </section>

          {/* FAQ -------------------------------------------------------- */}
          <section className="mt-12">
            <h2 className="text-2xl font-extrabold tracking-tightest text-white">
              Questions people ask
            </h2>
            <div className="mt-6 grid gap-3">
              {guide.faqs.map((f) => (
                <details key={f.q} className="glass group p-5">
                  <summary className="cursor-pointer list-none text-sm font-bold text-white">
                    {f.q}
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar ------------------------------------------------------ */}
        <aside className="lg:sticky lg:top-24">
          <div className="glass p-5">
            <p className="text-sm font-bold text-white">Switch this on in minutes</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Fourteen days on the trial, no card. The setup wizard asks for what you already
              have — an address, a phone number — and nothing you do not.
            </p>
            <a href={signUpUrl} className="btn-primary mt-4 w-full">
              Start free <ArrowRight width={16} height={16} />
            </a>
          </div>

          {siblings.length > 0 ? (
            <nav className="glass mt-4 p-5" aria-label={`Other ${group?.name} rails`}>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Also in {group?.name}
              </p>
              <ul className="mt-3 grid gap-1.5">
                {siblings.map((s) => (
                  <li key={s.slug}>
                    <Link
                      to={`/payments/${s.slug}`}
                      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-zinc-300 hover:bg-white/[0.05] hover:text-white"
                    >
                      <img
                        src={`/rails/${s.key}.webp`}
                        alt=""
                        width={20}
                        height={20}
                        loading="lazy"
                        className="h-5 w-5 rounded object-contain"
                      />
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          <Link
            to="/payments"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-violet-300 hover:text-violet-200"
          >
            All {paymentGuides.length} payment methods <ArrowRight width={15} height={15} />
          </Link>
        </aside>
      </div>

      <CtaBand
        title={`Start taking ${guide.name} payments this week.`}
        sub="Switch on as many rails as you like. A buyer only ever sees the ones that are ready and that apply to their order."
      />
    </>
  )
}
