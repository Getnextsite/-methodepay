import BrandIcon from './BrandIcon.jsx'
import { Check } from './Icons.jsx'

/**
 * Real captures of the product, taken from the app running a demo store
 * (Atlas Digital, sample orders). Regenerate them when the UI changes.
 */
const shots = {
  dashboard: {
    src: '/shots/dashboard-overview.webp',
    alt: 'The MethodePay dashboard: paid revenue, orders awaiting verification, recent orders and checkout links.',
    width: 2880,
    height: 1800,
  },
  checkout: {
    src: '/shots/checkout-card.webp',
    alt: 'A hosted checkout page: order summary, buyer details and payment methods.',
    width: 1120,
    height: 1520,
  },
  phone: {
    src: '/shots/checkout-mobile.webp',
    alt: 'The Express checkout design on a phone, with one-tap payment method tiles.',
    width: 1170,
    height: 2532,
  },
}

/** Browser-style frame around a capture. */
function Frame({ url, children, className = '' }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0b0f14] shadow-lift ${className}`}>
      <div className="flex items-center gap-3 border-b border-pure/10 bg-pure/[0.04] px-4 py-2.5" aria-hidden="true">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span className="mx-auto flex min-w-0 max-w-[300px] flex-1 items-center gap-2 rounded-lg border border-pure/10 bg-pure/[0.04] px-3 py-1 font-mono text-[10.5px] text-[#9aa6a1]">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
          <span className="truncate">{url}</span>
        </span>
        <span className="w-10" />
      </div>
      {children}
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
 * Hero stage: the real dashboard in the middle, with a real desktop checkout
 * and a real phone checkout layered in front of it. Below `lg` the overlays
 * would crowd the dashboard, so the checkout drops underneath instead.
 */
export default function HeroShowcase() {
  return (
    <div className="relative mx-auto max-w-5xl">
      <div className="animate-stage-in motion-reduce:animate-none">
        <div className="relative lg:px-16">
          <Frame url="app.methodepay.com/dashboard" className="ring-gradient">
            <img {...shots.dashboard} className="block h-auto w-full" fetchPriority="high" />
          </Frame>

          {/* desktop checkout, front left */}
          <div
            className="absolute -bottom-12 -left-6 z-10 hidden w-[290px] animate-float-slow motion-reduce:animate-none lg:block xl:-left-14"
            style={{ '--tilt': '-2deg' }}
          >
            <div className="overflow-hidden rounded-2xl border border-white/[0.14] shadow-lift">
              <img {...shots.checkout} loading="lazy" className="block h-auto w-full" />
            </div>
          </div>

          {/* phone checkout, front right */}
          <div
            className="absolute -bottom-14 -right-4 z-10 hidden animate-float-slow motion-reduce:animate-none [animation-delay:-3s] lg:block xl:-right-12"
            style={{ '--tilt': '3deg' }}
          >
            <div className="w-[206px] overflow-hidden rounded-[34px] border border-white/[0.16] bg-[#0b0f14] p-2 shadow-lift">
              <img
                {...shots.phone}
                loading="lazy"
                className="block h-[410px] w-full rounded-[27px] object-cover object-top"
              />
            </div>
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
      <div className="mx-auto mt-8 max-w-xs lg:hidden">
        <div className="overflow-hidden rounded-2xl border border-white/[0.14] shadow-lift">
          <img {...shots.checkout} loading="lazy" className="block h-auto w-full" />
        </div>
      </div>
    </div>
  )
}
