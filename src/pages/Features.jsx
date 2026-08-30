import useSeo from '../lib/useSeo.js'
import Reveal from '../components/Reveal.jsx'
import Glow from '../components/Glow.jsx'
import ScreenMock from '../components/ScreenMock.jsx'
import CtaBand from '../components/CtaBand.jsx'
import * as Icons from '../components/Icons.jsx'
import { checkoutDesigns, featureGroups, paymentMethods } from '../data/site.js'

export default function Features() {
  useSeo({
    title: 'Features',
    description:
      'Nine payment methods, six checkout designs, a live WordPress-native checkout editor, instant trial-code delivery and Telegram alerts — all without WooCommerce.',
    path: '/features',
  })

  return (
    <>
      {/* Header */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 grid-lines" />
        <Glow className="-top-32 left-1/2 -translate-x-1/2" size={620} />
        <div className="container-page relative py-16 sm:py-24">
          <Reveal className="max-w-3xl">
            <p className="eyebrow">Features</p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tightest text-white sm:text-5xl">
              A payment stack that fits in one plugin.
            </h1>
            <p className="lead mt-5 max-w-2xl">
              MethodePay is not a store, a platform or a gateway. It is the part of the stack
              you actually needed: a checkout, the rails that work in your market, and the
              automation that stops manual payments from eating your evenings.
            </p>
          </Reveal>

          <Reveal delay={100}>
            <nav aria-label="Feature sections" className="mt-10 flex flex-wrap gap-2">
              {featureGroups.map((g) => {
                const Icon = Icons[g.icon]
                return (
                  <a
                    key={g.id}
                    href={`#${g.id}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm font-semibold tracking-tight text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                  >
                    <Icon width={16} height={16} className="text-violet-400" />
                    {g.label}
                  </a>
                )
              })}
            </nav>
          </Reveal>
        </div>
      </section>

      {/* Groups */}
      {featureGroups.map((group, gi) => {
        const Icon = Icons[group.icon]
        const flip = gi % 2 === 1
        return (
          <section
            key={group.id}
            id={group.id}
            className={`scroll-mt-20 border-t border-white/[0.06] ${
              gi % 2 === 1 ? 'bg-white/[0.015]' : ''
            }`}
          >
            <div className="container-page py-20 sm:py-24">
              <div
                className={`grid items-start gap-12 [&>*]:min-w-0 lg:grid-cols-2 lg:gap-14 ${
                  flip ? 'lg:[&>*:first-child]:order-2' : ''
                }`}
              >
                <div>
                  <Reveal>
                    <p className="eyebrow">
                      <Icon width={14} height={14} className="text-violet-400" />
                      {group.label}
                    </p>
                    <h2 className="mt-4 text-3xl font-extrabold leading-[1.1] tracking-tightest text-white sm:text-4xl">
                      {group.headline}
                    </h2>
                    <p className="lead mt-4">{group.intro}</p>
                  </Reveal>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    {group.items.map((item, i) => (
                      <Reveal key={item.title} delay={(i % 2) * 70}>
                        <div className="glass glass-hover h-full p-5">
                          <h3 className="text-sm font-bold tracking-tight text-white">
                            {item.title}
                          </h3>
                          <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
                            {item.body}
                          </p>
                        </div>
                      </Reveal>
                    ))}
                  </div>
                </div>

                <Reveal delay={120} className="lg:sticky lg:top-24">
                  <ScreenMock id={group.id} />
                  <p className="mt-3 text-center text-xs text-zinc-500">
                    {group.id === 'payments' && 'Method manager in wp-admin'}
                    {group.id === 'design' && 'The live customizer, side by side'}
                    {group.id === 'automation' && 'What happens after a buyer submits proof'}
                    {group.id === 'admin' && 'Orders, filters and pay links — all in WordPress'}
                  </p>
                </Reveal>
              </div>
            </div>
          </section>
        )
      })}

      {/* Method matrix */}
      <section className="border-t border-white/[0.06]">
        <div className="container-page py-20 sm:py-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow mb-4">The full list</p>
            <h2 className="text-3xl font-extrabold tracking-tightest text-white sm:text-4xl">
              Every rail MethodePay speaks.
            </h2>
          </Reveal>

          <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {paymentMethods.map((m, i) => (
              <Reveal key={m.name} delay={(i % 3) * 60} as="li">
                <div className="glass glass-hover flex h-full items-center gap-3.5 p-4">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xs font-bold"
                    style={{ background: `${m.tone}1f`, color: m.tone }}
                    aria-hidden="true"
                  >
                    {m.initials}
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-white">{m.name}</span>
                    <span className="block text-xs text-zinc-500">{m.short}</span>
                  </span>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Designs */}
      <section className="border-t border-white/[0.06] bg-white/[0.015]">
        <div className="container-page py-20 sm:py-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow mb-4">Checkout designs</p>
            <h2 className="text-3xl font-extrabold tracking-tightest text-white sm:text-4xl">
              Six layouts, each with a job.
            </h2>
            <p className="lead mt-4">
              Pick one, restyle it in the editor, switch later without losing a setting.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {checkoutDesigns.map((d, i) => (
              <Reveal key={d.name} delay={(i % 3) * 70}>
                <article className="glass glass-hover h-full overflow-hidden">
                  <div
                    className="flex h-32 items-center justify-center border-b border-white/[0.07] bg-gradient-to-br from-violet-500/[0.12] to-transparent p-4"
                    aria-hidden="true"
                  >
                    <div className="w-full max-w-[180px] space-y-1.5">
                      <div className="h-2.5 w-1/2 rounded bg-white/20" />
                      <div className="h-6 rounded-md border border-violet-500/50 bg-violet-500/15" />
                      <div className="h-6 rounded-md border border-white/[0.07] bg-white/[0.03]" />
                      <div className="h-6 rounded-md bg-gradient-to-r from-violet-500 to-indigo-500" />
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-bold tracking-tight text-white">
                      {d.name}
                      <span className="ml-2 rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                        {d.tag}
                      </span>
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">{d.blurb}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        title="See it running before you pay for it."
        sub="Open the live editor demo, or read the docs and check the method you need is covered. Then buy — with 14 days to change your mind."
      />
    </>
  )
}
