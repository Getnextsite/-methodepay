import { plans } from '../data/site.js'
import { signUpUrl } from '../lib/appUrl.js'
import { Check, Star } from './Icons.jsx'
import Reveal from './Reveal.jsx'

export function BillingToggle({ billing, setBilling }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <fieldset className="inline-flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
        <legend className="sr-only">Billing period</legend>
        {[
          { id: 'yearly', label: 'Yearly' },
          { id: 'lifetime', label: 'Lifetime' },
        ].map((o) => {
          const checked = billing === o.id
          return (
            <label
              key={o.id}
              className={`cursor-pointer rounded-lg px-5 py-2 text-sm font-semibold tracking-tight transition ${
                checked ? 'bg-white/[0.1] text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <input
                type="radio"
                name="billing"
                value={o.id}
                checked={checked}
                onChange={() => setBilling(o.id)}
                className="sr-only"
              />
              {o.label}
            </label>
          )
        })}
      </fieldset>
      <p className="text-xs text-zinc-500" aria-live="polite">
        {billing === 'yearly'
          ? 'Renews yearly. Cancel anytime.'
          : 'One payment. Never renews. Roughly 3× the yearly price.'}
      </p>
    </div>
  )
}

export function PlanCard({ plan, billing, compact = false, delay = 0 }) {
  const price = billing === 'yearly' ? plan.yearly : plan.lifetime
  const items = compact ? plan.highlights.slice(0, 5) : plan.highlights

  return (
    <Reveal
      delay={delay}
      className={`relative flex ${plan.popular ? 'lg:-my-2' : ''}`}
    >
      <div
        className={`glass glass-hover relative flex w-full flex-col p-6 sm:p-7 ${
          plan.popular
            ? 'border-violet-500/50 bg-violet-500/[0.05] shadow-glow'
            : ''
        }`}
      >
        {plan.popular && (
          <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-onaccent shadow-[0_8px_24px_-8px_rgb(var(--p)/0.9)]">
            <Star width={12} height={12} />
            Most popular
          </span>
        )}

        <h3 className="text-lg font-bold tracking-tight text-white">{plan.name}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{plan.tagline}</p>

        <p className="mt-6 flex items-baseline gap-1.5">
          <span className="text-4xl font-extrabold tracking-tightest text-white">${price}</span>
          <span className="text-sm text-zinc-500">
            {billing === 'yearly' ? '/year' : 'one-time'}
          </span>
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {billing === 'yearly'
            ? `or $${plan.lifetime} once, forever`
            : `or $${plan.yearly}/year`}
        </p>

        <a
          href={signUpUrl}
          className={`mt-6 w-full ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
        >
          {plan.cta}
        </a>

        <ul className="mt-6 space-y-2.5 text-sm">
          {items.map((h) => (
            <li key={h} className="flex gap-2.5 text-zinc-300">
              <Check
                width={17}
                height={17}
                className="mt-0.5 shrink-0 text-success"
              />
              <span className="leading-snug">{h}</span>
            </li>
          ))}
        </ul>

        {compact && plan.highlights.length > items.length && (
          <p className="mt-3 text-xs text-zinc-500">
            +{plan.highlights.length - items.length} more
          </p>
        )}

        <p className="mt-auto pt-6 text-[11px] text-zinc-500">
          14-day money-back guarantee · works on any WordPress site
        </p>
      </div>
    </Reveal>
  )
}

export function PlanGrid({ billing, compact = false }) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {plans.map((p, i) => (
        <PlanCard key={p.id} plan={p} billing={billing} compact={compact} delay={i * 90} />
      ))}
    </div>
  )
}
