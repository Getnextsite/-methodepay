import BrandIcon from './BrandIcon.jsx'
import CheckoutMockup from './CheckoutMockup.jsx'
import DashboardMockup from './DashboardMockup.jsx'
import { Check, Shield } from './Icons.jsx'

const tiles = [
  { rail: 'op_binance', label: 'Binance Pay' },
  { rail: 'op_revolut', label: 'Revolut' },
  { rail: 'op_upi', label: 'UPI' },
  { rail: 'op_cashapp', label: 'Cash App' },
]

/** The Express design on a phone: rails first, one tap to pay. */
function PhoneCheckout() {
  return (
    <div
      role="img"
      aria-label="The Express checkout design on a phone, with one-tap buttons for Binance Pay, Revolut, UPI and Cash App."
      className="w-[212px] rounded-[34px] border border-white/[0.14] bg-ink-800 p-2 shadow-lift"
    >
      <div aria-hidden="true" className="overflow-hidden rounded-[27px] border border-white/[0.07] bg-ink">
        <div className="flex justify-center pt-2">
          <span className="h-1.5 w-14 rounded-full bg-white/15" />
        </div>
        <div className="p-3.5">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg text-[11px] font-extrabold brand-fill">
              M
            </span>
            <div className="min-w-0">
              <p className="truncate text-[11.5px] font-bold text-white">Starter Pack</p>
              <p className="text-[9.5px] text-zinc-500">Express checkout</p>
            </div>
            <p className="ml-auto font-display text-[15px] font-bold text-white">$39</p>
          </div>

          <p className="mt-3.5 text-[9px] font-bold uppercase tracking-widest text-zinc-500">
            Pay in one tap
          </p>
          <ul className="mt-2 grid grid-cols-2 gap-1.5">
            {tiles.map((t, i) => (
              <li
                key={t.rail}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 ${
                  i === 0 ? 'border-violet-500/60 bg-violet-500/[0.1]' : 'border-white/[0.08] bg-white/[0.03]'
                }`}
              >
                <BrandIcon rail={t.rail} size={24} />
                <span className="text-[9.5px] font-semibold text-zinc-200">{t.label}</span>
              </li>
            ))}
          </ul>

          <div className="mt-2.5 rounded-xl px-3 py-2.5 text-center text-[11px] font-extrabold brand-fill">
            Pay $39.00
          </div>
          <p className="mt-2 flex items-center justify-center gap-1 text-[9px] text-zinc-500">
            <Shield width={11} height={11} className="text-success" />
            14-day money-back guarantee
          </p>
        </div>
      </div>
    </div>
  )
}

/** Small "it just happened" chip that floats over the stage. */
function Chip({ children, className = '', style }) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={`solid-chip glass absolute z-20 hidden items-center gap-2 !rounded-full px-3 py-1.5 text-[11px] font-semibold text-zinc-200 animate-float-slow motion-reduce:animate-none lg:flex ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * Hero stage: the dashboard in the middle, a desktop checkout and a phone
 * checkout layered in front of it. Below `lg` the overlays would crowd the
 * dashboard, so the checkout drops underneath instead.
 */
export default function HeroShowcase() {
  return (
    <div className="relative mx-auto max-w-5xl">
      <div className="animate-stage-in motion-reduce:animate-none">
        <div className="relative lg:px-16">
          <DashboardMockup />

          {/* desktop checkout, front left */}
          <div
            className="solid-cards absolute -bottom-10 -left-6 z-10 hidden w-[310px] animate-float-slow motion-reduce:animate-none lg:block xl:-left-14"
            style={{ '--tilt': '-2deg' }}
          >
            <CheckoutMockup />
          </div>

          {/* phone checkout, front right */}
          <div
            className="absolute -bottom-12 -right-4 z-10 hidden animate-float-slow motion-reduce:animate-none [animation-delay:-3s] lg:block xl:-right-12"
            style={{ '--tilt': '3deg' }}
          >
            <PhoneCheckout />
          </div>

          <Chip className="-top-4 left-[18%]" style={{ animationDelay: '-2s' }}>
            <span className="grid h-4 w-4 place-items-center rounded-full bg-success/20 text-success">
              <Check width={11} height={11} />
            </span>
            Order paid · code delivered in 2s
          </Chip>
          <Chip className="-top-3 right-[14%]" style={{ animationDelay: '-5s' }}>
            <BrandIcon rail="whatsapp" size={16} />
            New order from WhatsApp
          </Chip>
        </div>
      </div>

      {/* small screens: the checkout sits under the dashboard */}
      <div className="mx-auto mt-10 max-w-sm pb-16 lg:hidden">
        <CheckoutMockup />
      </div>
    </div>
  )
}
