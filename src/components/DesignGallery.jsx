import { useEffect, useState } from 'react'
import BrandIcon from './BrandIcon.jsx'
import { Check, Shield, Star } from './Icons.jsx'
import { checkoutDesigns } from '../data/site.js'

// ------------------------------------------------------------ building blocks

const Bar = ({ w = '100%', h = 8, className = '' }) => (
  <span className={`block rounded-full bg-white/[0.12] ${className}`} style={{ width: w, height: h }} />
)

function Rail({ rail, label, on = false }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${
        on ? 'border-violet-500/60 bg-violet-500/[0.1]' : 'border-white/[0.08] bg-white/[0.03]'
      }`}
    >
      <BrandIcon rail={rail} size={18} />
      <span className="flex-1 truncate text-[11px] font-semibold text-zinc-200">{label}</span>
      <span
        className={`h-3 w-3 rounded-full border ${on ? 'border-violet-400 bg-violet-500' : 'border-white/25'}`}
      />
    </div>
  )
}

const Pay = ({ children = 'Pay $89.00', className = '' }) => (
  <div className={`rounded-lg px-3 py-2.5 text-center text-[11.5px] font-extrabold brand-fill ${className}`}>
    {children}
  </div>
)

const Brand = () => (
  <div className="flex items-center gap-2">
    <span className="grid h-6 w-6 place-items-center rounded-md text-[10px] font-extrabold brand-fill">M</span>
    <span className="text-[11.5px] font-bold text-white">Your Brand</span>
  </div>
)

const Price = ({ small = false }) => (
  <p className={`font-display font-bold tracking-tight text-white ${small ? 'text-lg' : 'text-2xl'}`}>
    $89.00 <span className="text-[10px] font-medium text-zinc-500">/ year</span>
  </p>
)

const Panel = ({ children, className = '' }) => (
  <div className={`rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5 ${className}`}>{children}</div>
)

// ------------------------------------------------------------ the six layouts

const layouts = {
  Classic: () => (
    <div className="grid h-full gap-3 sm:grid-cols-2">
      <Panel className="flex flex-col gap-3">
        <Brand />
        <p className="text-[12px] font-bold text-white">Pro Licence</p>
        <Price />
        <div className="space-y-1.5">
          <Bar /> <Bar w="82%" /> <Bar w="64%" />
        </div>
        <ul className="mt-auto space-y-1.5 text-[10.5px] text-zinc-400">
          {['Instant delivery', '1 year of updates'].map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <Check width={12} height={12} className="text-success" /> {t}
            </li>
          ))}
        </ul>
      </Panel>
      <Panel className="flex flex-col gap-2">
        <p className="text-[9.5px] font-bold uppercase tracking-widest text-zinc-500">Payment method</p>
        <Rail rail="stripe" label="Card" on />
        <Rail rail="whatsapp" label="WhatsApp Pay" />
        <Rail rail="crypto" label="Crypto" />
        <Pay className="mt-auto" />
      </Panel>
    </div>
  ),

  Lite: () => (
    <div className="grid h-full place-items-center">
      <Panel className="flex w-full max-w-[250px] flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-bold text-white">Pro Licence</p>
          <Price small />
        </div>
        <Rail rail="op_binance" label="Binance Pay" on />
        <Rail rail="bank_transfer" label="Bank Transfer" />
        <Pay />
        <p className="text-center text-[9.5px] text-zinc-500">Nothing else to fill in.</p>
      </Panel>
    </div>
  ),

  Storefront: () => (
    <div className="grid h-full gap-3 sm:grid-cols-[1.1fr_1fr]">
      <div className="flex flex-col gap-2">
        <div className="grid flex-1 place-items-center rounded-xl border border-white/[0.08] bg-gradient-to-br from-violet-500/20 via-transparent to-indigo-500/20">
          <span className="grid h-14 w-14 place-items-center rounded-2xl text-xl font-extrabold brand-fill">M</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-9 rounded-lg border ${i === 0 ? 'border-violet-500/60' : 'border-white/[0.08]'} bg-white/[0.04]`}
            />
          ))}
        </div>
      </div>
      <Panel className="flex flex-col gap-2">
        <p className="text-[12.5px] font-bold text-white">Wireless Earbuds</p>
        <p className="flex items-center gap-1 text-[10px] text-amber-300">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} width={11} height={11} fill="currentColor" />
          ))}
          <span className="ml-1 text-zinc-500">214 reviews</span>
        </p>
        <Price small />
        <Bar /> <Bar w="70%" />
        <Rail rail="stripe" label="Card" on />
        <Pay className="mt-auto">Buy now</Pay>
      </Panel>
    </div>
  ),

  Express: () => (
    <div className="grid h-full place-items-center">
      <Panel className="flex w-full max-w-[330px] flex-col gap-3">
        <div className="flex items-center justify-between">
          <Brand />
          <Price small />
        </div>
        <p className="text-[9.5px] font-bold uppercase tracking-widest text-zinc-500">Pay in one tap</p>
        <div className="grid grid-cols-4 gap-2">
          {['op_binance', 'op_revolut', 'op_upi', 'op_cashapp'].map((r, i) => (
            <span
              key={r}
              className={`grid place-items-center rounded-xl border py-3 ${
                i === 0 ? 'border-violet-500/60 bg-violet-500/[0.1]' : 'border-white/[0.08] bg-white/[0.03]'
              }`}
            >
              <BrandIcon rail={r} size={26} />
            </span>
          ))}
        </div>
        <span className="block h-8 rounded-lg border border-white/[0.08] bg-white/[0.03]" />
        <Pay />
      </Panel>
    </div>
  ),

  Hero: () => (
    <div className="flex h-full flex-col gap-3">
      <div className="rounded-xl border border-white/[0.08] bg-gradient-to-r from-violet-500/25 via-transparent to-indigo-500/25 p-4">
        <p className="text-[9.5px] font-bold uppercase tracking-widest text-violet-400">Limited offer</p>
        <p className="mt-1 font-display text-[19px] font-extrabold leading-tight tracking-tight text-white">
          Launch your course this week.
        </p>
        <div className="mt-2 max-w-[220px] space-y-1.5">
          <Bar /> <Bar w="70%" />
        </div>
      </div>
      <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_1.1fr]">
        <ul className="space-y-2 self-center text-[11px] text-zinc-300">
          {['12 video modules', 'Private community', 'Lifetime access'].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <span className="grid h-4 w-4 place-items-center rounded-full bg-success/20 text-success">
                <Check width={10} height={10} />
              </span>
              {t}
            </li>
          ))}
        </ul>
        <Panel className="flex flex-col gap-2">
          <Price small />
          <Rail rail="paypal" label="PayPal" on />
          <Pay className="mt-auto">Enrol now</Pay>
        </Panel>
      </div>
    </div>
  ),

  Trust: () => (
    <div className="grid h-full gap-3 sm:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col gap-2.5">
        <Panel>
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-white">
            <Shield width={14} height={14} className="text-success" /> 14-day money-back guarantee
          </p>
          <p className="mt-1 text-[10px] leading-snug text-zinc-500">No questions asked.</p>
        </Panel>
        <Panel className="flex-1">
          <p className="flex gap-0.5 text-amber-300">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} width={11} height={11} fill="currentColor" />
            ))}
          </p>
          <p className="mt-1.5 text-[10.5px] leading-snug text-zinc-300">
            “Paid by bank transfer and had my code in seconds.”
          </p>
          <p className="mt-1.5 text-[9.5px] font-semibold text-zinc-500">Amina K. · verified buyer</p>
        </Panel>
        <div className="flex items-center gap-1.5">
          {['stripe', 'paypal', 'crypto', 'bank_transfer'].map((r) => (
            <BrandIcon key={r} rail={r} size={22} />
          ))}
          <span className="ml-1 text-[9.5px] text-zinc-500">Secure payment</span>
        </div>
      </div>
      <Panel className="flex flex-col gap-2">
        <Brand />
        <Price small />
        <Rail rail="bank_transfer" label="Bank Transfer" on />
        <Rail rail="western_union" label="Western Union" />
        <Pay className="mt-auto" />
      </Panel>
    </div>
  ),
}

const REDUCED =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * The six checkout designs, switchable. It cycles on its own until the
 * visitor picks one, then stays where they put it.
 */
export default function DesignGallery() {
  const [active, setActive] = useState(0)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (touched || REDUCED) return
    const id = setInterval(() => setActive((a) => (a + 1) % checkoutDesigns.length), 3800)
    return () => clearInterval(id)
  }, [touched])

  const design = checkoutDesigns[active]
  const Layout = layouts[design.name]

  const onKey = (e) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    setTouched(true)
    const next = (active + step + checkoutDesigns.length) % checkoutDesigns.length
    setActive(next)
    document.getElementById(`design-tab-${next}`)?.focus()
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
      <div
        role="tablist"
        aria-label="Checkout designs"
        aria-orientation="vertical"
        onKeyDown={onKey}
        className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
      >
        {checkoutDesigns.map((d, i) => {
          const on = i === active
          return (
            <button
              key={d.name}
              id={`design-tab-${i}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls="design-panel"
              tabIndex={on ? 0 : -1}
              onClick={() => {
                setTouched(true)
                setActive(i)
              }}
              className={`shrink-0 rounded-xl border px-4 py-3 text-left transition lg:shrink ${
                on
                  ? 'border-violet-500/50 bg-violet-500/[0.09] shadow-glow'
                  : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'
              }`}
            >
              <span className="flex items-center gap-2 whitespace-nowrap">
                <span className={`font-display text-[15px] font-bold ${on ? 'text-white' : 'text-zinc-300'}`}>
                  {d.name}
                </span>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  {d.tag}
                </span>
              </span>
              <span className={`mt-1 hidden text-xs leading-snug lg:block ${on ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {d.blurb}
              </span>
            </button>
          )
        })}
      </div>

      <div
        id="design-panel"
        role="tabpanel"
        aria-labelledby={`design-tab-${active}`}
        className="glass ring-gradient overflow-hidden"
      >
        <div className="flex items-center gap-2 border-b border-white/[0.07] bg-white/[0.03] px-4 py-2.5">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          </span>
          <span className="ml-2 min-w-0 truncate font-mono text-[11px] text-zinc-500">
            pay.yourbrand.com · {design.name.toLowerCase()} design
          </span>
        </div>
        <p className="px-4 pt-3 text-xs text-zinc-400 lg:hidden">{design.blurb}</p>
        {/* key remounts the layout so each design fades in */}
        <div key={design.name} aria-hidden="true" className="h-[400px] animate-fade-up p-4 sm:h-[340px] sm:p-5">
          <Layout />
        </div>
      </div>
    </div>
  )
}
