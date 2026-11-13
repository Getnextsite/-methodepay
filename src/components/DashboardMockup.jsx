import BrandIcon from './BrandIcon.jsx'
import { Bell, Bolt, Code, Layers, Palette, Users, Wallet } from './Icons.jsx'

const nav = [
  { label: 'Overview', icon: Layers, active: true },
  { label: 'Orders', icon: Bell, badge: '7' },
  { label: 'Products', icon: Bolt },
  { label: 'Payment methods', icon: Wallet },
  { label: 'Checkout design', icon: Palette },
  { label: 'Team', icon: Users },
  { label: 'Developers', icon: Code },
]

const stats = [
  { label: 'Revenue', value: '$12,480', delta: '+18.2%' },
  { label: 'Orders', value: '342', delta: '+9.4%' },
  { label: 'Conversion', value: '6.4%', delta: '+1.1%' },
  { label: 'Awaiting review', value: '7', delta: 'now', muted: true },
]

const orders = [
  { ref: 'MP-7F3K2Q', buyer: 'Amina K.', rail: 'op_binance', method: 'Binance Pay', amount: '$89.00', status: 'Paid' },
  { ref: 'MP-2X9D4L', buyer: 'Chinelo O.', rail: 'whatsapp', method: 'WhatsApp', amount: '$39.00', status: 'Awaiting' },
  { ref: 'MP-8H1T6B', buyer: 'Dani R.', rail: 'stripe', method: 'Card', amount: '$199.00', status: 'Paid' },
  { ref: 'MP-4M7Q0Z', buyer: 'Rizky P.', rail: 'crypto', method: 'USDT', amount: '$267.00', status: 'Paid' },
]

const mix = [
  { rail: 'stripe', label: 'Cards', pct: 38 },
  { rail: 'op_binance', label: 'Binance Pay', pct: 24 },
  { rail: 'whatsapp', label: 'WhatsApp', pct: 21 },
  { rail: 'crypto', label: 'Crypto', pct: 17 },
]

// Revenue curve, drawn once on load.
const LINE = 'M0 96 C 40 92, 60 70, 96 74 S 150 52, 190 58 S 250 30, 290 36 S 350 14, 400 10'

/**
 * A stylised picture of the merchant dashboard for the hero. It is an
 * illustration, not a live UI, so it is exposed to assistive tech as one image.
 */
export default function DashboardMockup({ className = '' }) {
  return (
    <div
      role="img"
      aria-label="The MethodePay dashboard: revenue, orders and conversion at a glance, a revenue chart, payment-method mix and a list of recent orders."
      className={`glass ring-gradient overflow-hidden text-left ${className}`}
    >
      <div aria-hidden="true">
        {/* browser chrome */}
        <div className="flex items-center gap-3 border-b border-white/[0.07] bg-white/[0.03] px-4 py-2.5">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/80" />
          </span>
          <span className="mx-auto flex min-w-0 max-w-[280px] flex-1 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-1 font-mono text-[10.5px] text-zinc-500">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
            <span className="truncate">app.methodepay.com/dashboard</span>
          </span>
          <span className="hidden h-6 w-6 rounded-full brand-fill sm:block" />
        </div>

        <div className="grid sm:grid-cols-[168px_1fr]">
          {/* sidebar */}
          <aside className="hidden border-r border-white/[0.07] bg-white/[0.02] p-3 sm:block">
            <ul className="space-y-0.5">
              {nav.map((item) => (
                <li
                  key={item.label}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold ${
                    item.active ? 'bg-violet-500/[0.14] text-violet-400' : 'text-zinc-400'
                  }`}
                >
                  <item.icon width={14} height={14} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge ? (
                    <span className="rounded-full bg-violet-500/20 px-1.5 text-[9.5px] text-violet-400">
                      {item.badge}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-xl border border-violet-500/25 bg-violet-500/[0.07] p-2.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Agency</p>
              <p className="mt-0.5 text-[10.5px] leading-snug text-zinc-400">All rails. All designs.</p>
            </div>
          </aside>

          {/* main */}
          <div className="min-w-0 p-3.5 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-display text-[15px] font-bold tracking-tight text-white">
                  Overview
                </p>
                <p className="text-[10.5px] text-zinc-500">Last 30 days · all stores</p>
              </div>
              <span className="shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10.5px] font-semibold text-zinc-300">
                Nov 1 – Nov 30
              </span>
            </div>

            {/* stats */}
            <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-2.5">
                  <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    {s.label}
                  </p>
                  <p className="mt-1 font-display text-[17px] font-bold tracking-tight text-white">
                    {s.value}
                  </p>
                  <p className={`text-[10px] font-bold ${s.muted ? 'text-amber-300' : 'text-success'}`}>
                    {s.delta}
                  </p>
                </div>
              ))}
            </div>

            {/* chart + mix */}
            <div className="mt-2 grid gap-2 lg:grid-cols-[1.6fr_1fr]">
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-white">Revenue</p>
                  <p className="text-[10px] text-zinc-500">Daily</p>
                </div>
                <svg viewBox="0 0 400 110" className="mt-2 h-[92px] w-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="dm-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" style={{ stopColor: 'rgb(var(--p))', stopOpacity: 0.35 }} />
                      <stop offset="100%" style={{ stopColor: 'rgb(var(--p))', stopOpacity: 0 }} />
                    </linearGradient>
                    <linearGradient id="dm-line" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" style={{ stopColor: 'rgb(var(--p))' }} />
                      <stop offset="100%" style={{ stopColor: 'rgb(var(--s))' }} />
                    </linearGradient>
                  </defs>
                  {[28, 56, 84].map((y) => (
                    <line key={y} x1="0" x2="400" y1={y} y2={y} stroke="rgb(var(--fg) / 0.06)" strokeWidth="1" />
                  ))}
                  <path d={`${LINE} L 400 110 L 0 110 Z`} fill="url(#dm-area)" />
                  <path
                    d={LINE}
                    fill="none"
                    stroke="url(#dm-line)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    pathLength="600"
                    strokeDasharray="600"
                    className="animate-draw motion-reduce:animate-none"
                    style={{ '--len': 600 }}
                  />
                  <circle cx="400" cy="10" r="4" fill="rgb(var(--s))" />
                </svg>
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                <p className="text-[11px] font-bold text-white">Payment mix</p>
                <ul className="mt-2.5 space-y-2">
                  {mix.map((m, i) => (
                    <li key={m.label} className="flex items-center gap-2">
                      <BrandIcon rail={m.rail} size={16} />
                      <span className="w-[68px] shrink-0 truncate text-[10.5px] font-semibold text-zinc-300">
                        {m.label}
                      </span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                        <span
                          className="block h-full origin-left rounded-full brand-fill animate-[bar-x_1s_cubic-bezier(0.22,1,0.36,1)_both] motion-reduce:animate-none"
                          style={{ width: `${m.pct * 2.4}%`, animationDelay: `${700 + i * 120}ms` }}
                        />
                      </span>
                      <span className="w-7 shrink-0 text-right font-mono text-[10px] text-zinc-500">
                        {m.pct}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* orders */}
            <div className="mt-2 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.03]">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
                <p className="text-[11px] font-bold text-white">Recent orders</p>
                <p className="text-[10px] font-semibold text-violet-400">View all</p>
              </div>
              <ul>
                {orders.map((o) => (
                  <li
                    key={o.ref}
                    className="flex items-center gap-2.5 border-b border-white/[0.05] px-3 py-2 last:border-0"
                  >
                    <BrandIcon rail={o.rail} size={20} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11.5px] font-semibold text-white">{o.buyer}</span>
                      <span className="block truncate font-mono text-[9.5px] text-zinc-500">
                        {o.ref} · {o.method}
                      </span>
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-zinc-200">{o.amount}</span>
                    <span
                      className={`w-[62px] shrink-0 rounded-full px-2 py-0.5 text-center text-[9.5px] font-bold ${
                        o.status === 'Paid' ? 'bg-success/15 text-success' : 'bg-amber-300/15 text-amber-300'
                      }`}
                    >
                      {o.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
