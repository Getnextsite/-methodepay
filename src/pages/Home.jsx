import { useState } from 'react'
import { Link } from 'react-router-dom'
import useSeo, { faqSchema, productSchema } from '../lib/useSeo.js'
import Reveal from '../components/Reveal.jsx'
import Glow from '../components/Glow.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import CheckoutMockup from '../components/CheckoutMockup.jsx'
import PaymentWall from '../components/PaymentWall.jsx'
import LiveEditorDemo from '../components/LiveEditorDemo.jsx'
import Faq from '../components/Faq.jsx'
import CtaBand from '../components/CtaBand.jsx'
import { BillingToggle, PlanGrid } from '../components/PlanCards.jsx'
import * as Icons from '../components/Icons.jsx'
import {
  homeFaqs,
  homeFeatures,
  plans,
  steps,
  testimonials,
  checkoutDesigns,
} from '../data/site.js'

// Module scope keeps the object identity stable across renders.
const jsonLd = [productSchema(plans), faqSchema(homeFaqs)]

const pains = [
  {
    title: 'Rejected by Stripe.',
    body: 'Wrong country, wrong category, wrong risk score. You never got a reason — just a closed account and a balance on hold.',
  },
  {
    title: 'Customers without cards.',
    body: 'Most of your buyers pay with mobile money, a bank app or cash. A card form is a wall, not a checkout.',
  },
  {
    title: 'WooCommerce for one button.',
    body: 'Forty tables, a cron queue and a settings maze — to sell a single product. There is a smaller way to do this.',
  },
]

export default function Home() {
  const [billing, setBilling] = useState('yearly')

  useSeo({
    title: 'MethodePay — Accept payments anywhere. No WooCommerce. No rejections.',
    description:
      'A standalone WordPress payment plugin with 9+ payment methods, 6 checkout designs, a live checkout editor and instant trial-code delivery. Built for merchants in MENA, Africa, LATAM and Southeast Asia.',
    path: '/',
    jsonLd,
  })

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 grid-lines" />
        <Glow className="-top-40 left-1/4 -translate-x-1/2" size={640} />
        <Glow
          className="-top-20 right-0"
          size={520}
          color="rgba(79,70,229,0.28)"
        />

        <div className="container-page relative pb-20 pt-16 sm:pt-24">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
            <div>
              <Reveal>
                <p className="eyebrow">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
                  Standalone WordPress plugin · no WooCommerce
                </p>
              </Reveal>

              <Reveal delay={70}>
                <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.03] tracking-tightest text-white sm:text-6xl">
                  Accept payments anywhere.
                  <span className="block gradient-text">No WooCommerce. No rejections.</span>
                </h1>
              </Reveal>

              <Reveal delay={140}>
                <p className="lead mt-6 max-w-xl">
                  Rejected by Stripe? Customers without cards? Take the payment anyway.
                  MethodePay puts nine payment rails, six checkout designs and automatic
                  delivery inside WordPress — without the cart software you never wanted.
                </p>
              </Reveal>

              <Reveal delay={210}>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link to="/pricing" className="btn-primary">
                    Get MethodePay
                    <Icons.ArrowRight width={16} height={16} />
                  </Link>
                  <a href="#demo" className="btn-secondary">
                    See live demo
                  </a>
                </div>
              </Reveal>

              <Reveal delay={280}>
                <ul className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-zinc-400">
                  {[
                    'No transaction fees, ever',
                    '14-day money-back guarantee',
                    'Works with any theme',
                  ].map((t) => (
                    <li key={t} className="flex items-center gap-2">
                      <Icons.Check width={15} height={15} className="text-success" />
                      {t}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>

            <Reveal delay={200} className="lg:pl-6">
              <div className="animate-float motion-reduce:animate-none">
                <CheckoutMockup />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Payment method wall ──────────────────────────────── */}
      <section className="border-y border-white/[0.06] bg-white/[0.015] py-10">
        <div className="container-page">
          <Reveal>
            <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Nine ways to get paid — switch on the ones that work where you sell
            </p>
          </Reveal>
          <PaymentWall />
        </div>
      </section>

      {/* ── Pain ─────────────────────────────────────────────── */}
      <section className="container-page py-20 sm:py-28">
        <SectionHeading
          eyebrow="The problem"
          title="Your product is fine. Your payment page is the bottleneck."
          sub="Three things kill more sales in emerging markets than price ever does."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {pains.map((p, i) => (
            <Reveal key={p.title} delay={i * 90}>
              <div className="glass glass-hover h-full p-6">
                <p className="font-mono text-xs text-violet-400">0{i + 1}</p>
                <h3 className="mt-3 text-lg font-bold tracking-tight text-white">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Feature grid ─────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <Glow className="left-1/2 top-0 -translate-x-1/2" size={700} color="rgba(124,92,255,0.16)" />
        <div className="container-page relative py-20 sm:py-24">
          <SectionHeading
            eyebrow="What you get"
            title="Everything a checkout needs. Nothing a store doesn’t."
            sub="Built as one plugin, not a platform you have to move into."
          />

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {homeFeatures.map((f, i) => {
              const Icon = Icons[f.icon]
              return (
                <Reveal key={f.title} delay={(i % 3) * 80}>
                  <article className="glass glass-hover h-full p-6">
                    <span className="grid h-11 w-11 place-items-center rounded-xl border border-violet-500/25 bg-violet-500/10 text-violet-400">
                      <Icon />
                    </span>
                    <h3 className="mt-4 text-base font-bold tracking-tight text-white">
                      {f.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.body}</p>
                  </article>
                </Reveal>
              )
            })}
          </div>

          <Reveal delay={120} className="mt-8 text-center">
            <Link
              to="/features"
              className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-violet-400 transition hover:text-violet-300"
            >
              See every feature in detail
              <Icons.ArrowRight width={16} height={16} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="border-y border-white/[0.06] bg-white/[0.015]">
        <div className="container-page py-20 sm:py-24">
          <SectionHeading
            eyebrow="How it works"
            title="Live in an afternoon, not a sprint."
            sub="Three steps between installing the plugin and the first payment landing."
          />

          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 100} as="li">
                <div className="glass glass-hover relative h-full p-6">
                  <span
                    className="absolute right-5 top-4 font-mono text-4xl font-bold text-white/[0.06]"
                    aria-hidden="true"
                  >
                    {s.n}
                  </span>
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-[#6f4ffb] to-indigo-500 text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-base font-bold tracking-tight text-white">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Live editor demo ─────────────────────────────────── */}
      <section id="demo" className="scroll-mt-24">
        <div className="container-page py-20 sm:py-28">
          <SectionHeading
            eyebrow="Live checkout editor"
            title="Change it here. Watch it change there."
            sub="This is the real editor model: WordPress-native controls on the left, your checkout on the right, updating as you move. Try it — every control below is live."
          />

          <Reveal delay={100} className="mt-12">
            <LiveEditorDemo />
          </Reveal>

          <Reveal delay={140} className="mt-8">
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {checkoutDesigns.map((d) => (
                <li
                  key={d.name}
                  className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3"
                >
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-violet-400">
                    <Icons.Layers width={15} height={15} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-white">
                      {d.name}{' '}
                      <span className="font-normal text-zinc-500">· {d.tag}</span>
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-zinc-400">
                      {d.blurb}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────── */}
      <section className="border-y border-white/[0.06] bg-white/[0.015]">
        <div className="container-page py-20 sm:py-24">
          <SectionHeading
            eyebrow="Merchants"
            title="Built with the people the processors ignored."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={(i % 2) * 90}>
                <figure className="glass glass-hover flex h-full flex-col p-6">
                  <blockquote className="text-[15px] leading-relaxed text-zinc-200">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    <span
                      className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-500/30 to-indigo-500/30 text-xs font-bold text-violet-200"
                      aria-hidden="true"
                    >
                      {t.initials}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-white">{t.name}</span>
                      <span className="block text-xs text-zinc-500">{t.role}</span>
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing preview ──────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <Glow className="left-1/2 top-10 -translate-x-1/2" size={640} color="rgba(124,92,255,0.16)" />
        <div className="container-page relative py-20 sm:py-24">
          <SectionHeading
            eyebrow="Pricing"
            title="One payment. No cut of your sales."
            sub="MethodePay never touches your money — buyers pay you directly, and there is no transaction fee on top."
          />

          <Reveal delay={80} className="mt-8 flex justify-center">
            <BillingToggle billing={billing} setBilling={setBilling} />
          </Reveal>

          <div className="mt-12">
            <PlanGrid billing={billing} compact />
          </div>

          <Reveal delay={120} className="mt-8 text-center">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-violet-400 transition hover:text-violet-300"
            >
              Compare all three plans
              <Icons.ArrowRight width={16} height={16} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="border-t border-white/[0.06] bg-white/[0.015]">
        <div className="container-page py-20 sm:py-24">
          <SectionHeading eyebrow="FAQ" title="Straight answers." />
          <div className="mt-12">
            <Faq items={homeFaqs} />
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  )
}
