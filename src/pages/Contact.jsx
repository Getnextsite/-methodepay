import { useState } from 'react'
import { Link } from 'react-router-dom'
import useSeo from '../lib/useSeo.js'
import Reveal from '../components/Reveal.jsx'
import Glow from '../components/Glow.jsx'
import Faq from '../components/Faq.jsx'
import { Bolt, Book, Check, Mail, Send, Users } from '../components/Icons.jsx'

const channels = [
  {
    icon: Mail,
    title: 'Email support',
    body: 'support@methodepay.com — 48h on Starter, 24h on Professional and Agency.',
  },
  {
    icon: Send,
    title: 'Telegram',
    body: '@methodepay_support, for quick pre-sales questions and setup nudges.',
  },
  {
    icon: Users,
    title: 'Agency onboarding',
    body: 'Agency plans include a 1-on-1 call. Book it from your account after purchase.',
  },
]

const contactFaqs = [
  {
    q: 'Can you tell me if a method works in my country before I buy?',
    a: 'Yes — send the country and the rail you want to use. If it will not work we will say so up front rather than sell you a licence and refund it later.',
  },
  {
    q: 'Do you help with installation?',
    a: 'Support walks you through setup on every plan. Agency includes a scheduled 1-on-1 call where we configure the first site with you.',
  },
  {
    q: 'How do I get an invoice with my company details?',
    a: 'Reply to your purchase email with the company name, address and tax number and we will reissue the invoice the same day.',
  },
]

const subjects = ['Pre-sales question', 'Technical support', 'Billing or licence', 'Agency / partnership']

export default function Contact() {
  const [sent, setSent] = useState(false)
  const [subject, setSubject] = useState(subjects[0])

  useSeo({
    title: 'Contact & Support',
    description:
      'Talk to the MethodePay team — pre-sales questions, technical support, billing and agency onboarding. Priority replies within 24 hours on Professional and Agency plans.',
    path: '/contact',
  })

  const onSubmit = (e) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <>
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 grid-lines" />
        <Glow className="-top-32 left-1/2 -translate-x-1/2" size={560} />

        <div className="container-page relative py-16 sm:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Contact</p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tightest text-white sm:text-5xl">
              Ask before you buy. We answer either way.
            </h1>
            <p className="lead mt-5">
              Tell us the country you sell into and the rail you need, and we will tell you
              straight whether MethodePay solves it.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Form */}
            <Reveal>
              <div className="glass scroll-mt-24 p-6 sm:p-8" id="buy">
                {sent ? (
                  <div className="py-10 text-center" role="status">
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-success/15 text-success">
                      <Check />
                    </span>
                    <h2 className="mt-4 text-xl font-bold tracking-tight text-white">
                      Message queued.
                    </h2>
                    <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
                      We reply within 24 hours on business days. If it is urgent, ping
                      @methodepay_support on Telegram and mention this form.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSent(false)}
                      className="btn-secondary mt-6"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={onSubmit} noValidate={false}>
                    <h2 className="text-lg font-bold tracking-tight text-white">
                      Send us a message
                    </h2>
                    <p className="mt-1.5 text-sm text-zinc-400">
                      Every field marked with * is required.
                    </p>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="name"
                          className="mb-1.5 block text-[13px] font-semibold text-zinc-300"
                        >
                          Name *
                        </label>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          required
                          autoComplete="name"
                          className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 transition focus:border-violet-500/60"
                          placeholder="Amina K."
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="email"
                          className="mb-1.5 block text-[13px] font-semibold text-zinc-300"
                        >
                          Email *
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          required
                          autoComplete="email"
                          className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 transition focus:border-violet-500/60"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label
                        htmlFor="subject"
                        className="mb-1.5 block text-[13px] font-semibold text-zinc-300"
                      >
                        Subject *
                      </label>
                      <select
                        id="subject"
                        name="subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white transition focus:border-violet-500/60"
                      >
                        {subjects.map((s) => (
                          <option key={s} value={s} className="bg-ink-700">
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-4">
                      <label
                        htmlFor="country"
                        className="mb-1.5 block text-[13px] font-semibold text-zinc-300"
                      >
                        Country you sell into
                      </label>
                      <input
                        id="country"
                        name="country"
                        type="text"
                        autoComplete="country-name"
                        className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 transition focus:border-violet-500/60"
                        placeholder="Morocco, Nigeria, Brazil…"
                      />
                    </div>

                    <div className="mt-4">
                      <label
                        htmlFor="message"
                        className="mb-1.5 block text-[13px] font-semibold text-zinc-300"
                      >
                        Message *
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        rows={5}
                        required
                        className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 transition focus:border-violet-500/60"
                        placeholder="Which payment methods do you need, and what is blocking you today?"
                      />
                    </div>

                    <button type="submit" className="btn-primary mt-6 w-full sm:w-auto">
                      Send message
                      <Send width={16} height={16} />
                    </button>

                    <p className="mt-3 text-xs text-zinc-500">
                      We use your message to answer you and nothing else. See{' '}
                      <a href="#legal" className="text-violet-400 hover:text-violet-300">
                        privacy & terms
                      </a>
                      .
                    </p>
                  </form>
                )}
              </div>
            </Reveal>

            {/* Sidebar */}
            <div className="space-y-5">
              <Reveal delay={80}>
                <ul className="space-y-3">
                  {channels.map((c) => (
                    <li key={c.title} className="glass glass-hover flex gap-3.5 p-5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-500/25 bg-violet-500/10 text-violet-400">
                        <c.icon />
                      </span>
                      <span>
                        <span className="block text-sm font-bold tracking-tight text-white">
                          {c.title}
                        </span>
                        <span className="mt-1 block text-[13px] leading-relaxed text-zinc-400">
                          {c.body}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Reveal>

              <Reveal delay={140}>
                <div className="glass p-5">
                  <h2 className="text-sm font-bold tracking-tight text-white">
                    Faster than emailing us
                  </h2>
                  <ul className="mt-3 space-y-2.5">
                    {[
                      { to: '/docs#manual', label: 'Set up a manual method', icon: Book },
                      { to: '/docs#trial-codes', label: 'Trial-code delivery guide', icon: Bolt },
                      { to: '/pricing#faq', label: 'Pricing and licence questions', icon: Check },
                    ].map((l) => (
                      <li key={l.to}>
                        <Link
                          to={l.to}
                          className="flex items-center gap-2.5 rounded-lg text-[13px] text-zinc-400 transition hover:text-white"
                        >
                          <l.icon width={15} height={15} className="text-violet-400" />
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>

              <Reveal delay={180}>
                <div className="glass p-5" id="affiliate">
                  <h2 className="text-sm font-bold tracking-tight text-white">
                    Affiliates & partners
                  </h2>
                  <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
                    We pay 30% recurring to people who genuinely sell to merchants in
                    underserved markets. Pick “Agency / partnership” in the form and tell us
                    about your audience.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.06] bg-white/[0.015]">
        <div className="container-page py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow mb-4">Support FAQ</p>
            <h2 className="text-3xl font-extrabold tracking-tightest text-white sm:text-4xl">
              Common questions.
            </h2>
          </Reveal>
          <div className="mt-10">
            <Faq items={contactFaqs} />
          </div>
        </div>
      </section>

      <section id="legal" className="scroll-mt-20 border-t border-white/[0.06]">
        <div className="container-page py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-extrabold tracking-tightest text-white">
              Privacy & terms
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-400">
              <p>
                MethodePay is a self-hosted WordPress plugin. Your orders, buyer details and
                proofs of payment stay in your own database — we do not receive them, store
                them or process them.
              </p>
              <p>
                What we do hold is your licence record: the email you bought with, your key and
                the sites it is activated on. That is used to deliver updates and support, and
                nothing else. Licences are per the plan you purchased, refundable within 14
                days, and never resold or shared.
              </p>
              <p>
                Messages you send through this form are used to answer you and are deleted once
                the conversation is closed.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
