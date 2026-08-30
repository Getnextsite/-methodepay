import { useState } from 'react'
import useSeo, { faqSchema, productSchema } from '../lib/useSeo.js'
import Reveal from '../components/Reveal.jsx'
import Glow from '../components/Glow.jsx'
import Faq from '../components/Faq.jsx'
import CtaBand from '../components/CtaBand.jsx'
import { BillingToggle, PlanGrid } from '../components/PlanCards.jsx'
import { Check, Minus, Shield, Star, Users } from '../components/Icons.jsx'
import { comparison, plans, pricingFaqs } from '../data/site.js'

// Module scope keeps the object identity stable across renders.
const jsonLd = [productSchema(plans), faqSchema(pricingFaqs)]

function Cell({ value, highlight }) {
  const base = `px-4 py-4 align-top text-[13px] ${
    highlight ? 'bg-violet-500/[0.06]' : ''
  }`

  if (value === true) {
    return (
      <td className={`${base} text-center`}>
        <Check className="mx-auto text-success" aria-label="Included" role="img" />
      </td>
    )
  }
  if (value === false) {
    return (
      <td className={`${base} text-center`}>
        <Minus className="mx-auto text-zinc-600" aria-label="Not included" role="img" />
      </td>
    )
  }
  return <td className={`${base} text-zinc-300`}>{value}</td>
}

const guarantees = [
  {
    icon: Shield,
    title: '14-day money-back guarantee',
    body: 'Try it on a live site. If it does not fit, one email gets your money back — no interrogation.',
  },
  {
    icon: Star,
    title: 'No transaction fees',
    body: 'MethodePay never touches your money. Buyers pay you directly and we take no cut of anything.',
  },
  {
    icon: Users,
    title: 'Cancel anytime',
    body: 'Yearly plans renew only if you let them. Lifetime never renews at all. Your plugin keeps working either way.',
  },
]

export default function Pricing() {
  const [billing, setBilling] = useState('yearly')

  useSeo({
    title: 'Pricing',
    description:
      'MethodePay pricing: Starter $39/yr, Professional $89/yr and Agency $199/yr, with lifetime options. All plans include a 14-day money-back guarantee and no transaction fees.',
    path: '/pricing',
    jsonLd,
  })

  return (
    <>
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 grid-lines" />
        <Glow className="-top-32 left-1/2 -translate-x-1/2" size={640} />

        <div className="container-page relative py-16 sm:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Pricing</p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tightest text-white sm:text-5xl">
              Pay once for the plugin. Keep all of your revenue.
            </h1>
            <p className="lead mt-5">
              Three plans, no usage limits, no per-order fees, no revenue share. Pick by how
              many sites you run and which rails you need switched on.
            </p>
          </Reveal>

          <Reveal delay={90} className="mt-9 flex justify-center">
            <BillingToggle billing={billing} setBilling={setBilling} />
          </Reveal>

          <div className="mt-12">
            <PlanGrid billing={billing} />
          </div>
        </div>
      </section>

      {/* Guarantees */}
      <section className="border-y border-white/[0.06] bg-white/[0.015]">
        <div className="container-page py-14">
          <ul className="grid gap-5 md:grid-cols-3">
            {guarantees.map((g, i) => (
              <Reveal key={g.title} delay={i * 80} as="li">
                <div className="flex h-full gap-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-success/25 bg-success/10 text-success">
                    <g.icon />
                  </span>
                  <span>
                    <span className="block text-sm font-bold tracking-tight text-white">
                      {g.title}
                    </span>
                    <span className="mt-1 block text-[13px] leading-relaxed text-zinc-400">
                      {g.body}
                    </span>
                  </span>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Comparison */}
      <section id="compare" className="scroll-mt-20">
        <div className="container-page py-20 sm:py-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow mb-4">Compare</p>
            <h2 className="text-3xl font-extrabold tracking-tightest text-white sm:text-4xl">
              Line by line.
            </h2>
            <p className="lead mt-4">
              Everything each plan includes, with nothing hidden behind an asterisk.
            </p>
          </Reveal>

          <Reveal delay={100} className="mt-12">
            <div className="glass overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <caption className="sr-only">
                  Feature comparison of the Starter, Professional and Agency plans
                </caption>
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th
                      scope="col"
                      className="px-4 py-5 text-[11px] font-semibold uppercase tracking-widest text-zinc-500"
                    >
                      Feature
                    </th>
                    {plans.map((p) => (
                      <th
                        key={p.id}
                        scope="col"
                        className={`px-4 py-5 ${p.popular ? 'bg-violet-500/[0.08]' : ''}`}
                      >
                        <span className="block text-sm font-bold tracking-tight text-white">
                          {p.name}
                        </span>
                        <span className="mt-0.5 block text-xs text-zinc-400">
                          ${billing === 'yearly' ? p.yearly : p.lifetime}
                          {billing === 'yearly' ? '/yr' : ' once'}
                        </span>
                        {p.popular && (
                          <span className="mt-1.5 inline-block rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-300">
                            Most popular
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((r) => (
                    <tr key={r.row} className="border-b border-white/[0.05] last:border-0">
                      <th
                        scope="row"
                        className="px-4 py-4 align-top text-[13px] font-semibold text-white"
                      >
                        {r.row}
                      </th>
                      <Cell value={r.starter} />
                      <Cell value={r.professional} highlight />
                      <Cell value={r.agency} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>

          {/* Agency justification */}
          <Reveal delay={120} className="mt-8">
            <div className="glass border-violet-500/25 bg-violet-500/[0.05] p-6 sm:p-7">
              <h3 className="text-base font-bold tracking-tight text-white">
                Running client sites? Agency pays for itself at four.
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">
                Professional covers five sites at $89. Agency covers an unlimited number at
                $199 — so the moment you are deploying MethodePay on more than a handful of
                client builds, the per-site cost collapses. Add the 1-on-1 setup call and the
                first deployment stops costing you a billable day.
              </p>
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-3">
                {[
                  'Unlimited client installs on one licence',
                  'Priority processing on automation and support',
                  '1-on-1 onboarding call for your first build',
                ].map((t) => (
                  <li key={t} className="flex gap-2.5 text-[13px] text-zinc-300">
                    <Check width={17} height={17} className="mt-0.5 shrink-0 text-success" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t border-white/[0.06] bg-white/[0.015]">
        <div className="container-page py-20 sm:py-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow mb-4">Pricing FAQ</p>
            <h2 className="text-3xl font-extrabold tracking-tightest text-white sm:text-4xl">
              Before you buy.
            </h2>
          </Reveal>
          <div className="mt-12">
            <Faq items={pricingFaqs} />
          </div>
        </div>
      </section>

      <CtaBand
        title="Pick a plan and take a payment today."
        sub="Every plan works on any WordPress site, needs no WooCommerce, and comes with 14 days to change your mind."
      />
    </>
  )
}
