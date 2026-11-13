import { Bell, Check, Copy, Send } from './Icons.jsx'

function Frame({ label, children }) {
  return (
    <div className="glass overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/[0.07] bg-white/[0.02] px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        </span>
        <span className="ml-2 min-w-0 truncate font-mono text-[11px] text-zinc-500">{label}</span>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  )
}

const rows = [
  { name: 'Stripe', state: 'Connected', on: true, tone: '#635bff' },
  { name: 'WhatsApp Pay', state: '+212 6 •• •• •• 41', on: true, tone: '#25d366' },
  { name: 'Direct Crypto', state: 'USDT · TRC-20', on: true, tone: '#f7931a' },
  { name: 'Western Union', state: 'MTCN verification', on: false, tone: '#ffd400' },
  { name: 'M-Pesa (manual)', state: 'Till 402 118 · video added', on: true, tone: '#00d632' },
]

function PaymentsScreen() {
  return (
    <Frame label="wp-admin/admin.php?page=methodepay-methods">
      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.name}
            className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5"
          >
            <span
              className="h-7 w-7 shrink-0 rounded-lg"
              style={{ background: `${r.tone}2e`, boxShadow: `inset 0 0 0 1px ${r.tone}55` }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-white">
                {r.name}
              </span>
              <span className="block truncate text-[11px] text-zinc-500">{r.state}</span>
            </span>
            <span
              className={`relative h-5 w-9 shrink-0 rounded-full ${
                r.on ? 'bg-success/80' : 'bg-white/10'
              }`}
              aria-hidden="true"
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-pure ${
                  r.on ? 'left-[18px]' : 'left-0.5'
                }`}
              />
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-zinc-500">
        Drag to reorder · disabled methods never render at checkout
      </p>
    </Frame>
  )
}

function DesignScreen() {
  return (
    <Frame label="Customize → MethodePay → Checkout">
      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <div className="space-y-3">
          {['Accent', 'Typography', 'Layout width', 'Corner radius', 'Logo'].map((l, i) => (
            <div key={l}>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">{l}</p>
              <div className="mt-1 h-6 rounded-md border border-white/[0.07] bg-white/[0.03]">
                <div
                  className="h-full rounded-md bg-gradient-to-r from-violet-500/40 to-indigo-500/20"
                  style={{ width: `${45 + i * 12}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-gradient-to-b from-violet-500/[0.08] to-transparent p-4">
          <div className="mx-auto max-w-[220px] rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-semibold text-white">Pro Licence</span>
              <span className="text-sm font-extrabold text-white">$89</span>
            </div>
            <div className="my-2.5 h-px bg-white/10" />
            <div className="space-y-1.5">
              <div className="h-7 rounded-lg border border-violet-500/60 bg-violet-500/15" />
              <div className="h-7 rounded-lg border border-white/[0.07] bg-white/[0.02]" />
            </div>
            <div className="mt-2.5 h-8 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-500" />
          </div>
          <p className="mt-3 text-center text-[10px] text-zinc-500">
            Preview updates as you drag
          </p>
        </div>
      </div>
    </Frame>
  )
}

function AutomationScreen() {
  return (
    <Frame label="Order #2481 · automation log">
      <ol className="relative space-y-3 border-l border-white/10 pl-5">
        {[
          { t: '10:42:03', s: 'Proof of payment received', d: 'M-Pesa · receipt SGK4H2L9', ok: true },
          { t: '10:42:04', s: 'Code assigned from pool', d: 'MP-7F42-QX · 148 codes left', ok: true },
          { t: '10:42:04', s: 'Access email delivered', d: 'amina@example.com', ok: true },
          { t: '10:42:05', s: 'Telegram alert sent', d: 'Merchant channel · @yourshop', ok: true },
        ].map((e) => (
          <li key={e.s} className="relative">
            <span
              className="absolute -left-[26px] top-1 grid h-4 w-4 place-items-center rounded-full bg-success/20 text-success"
              aria-hidden="true"
            >
              <Check width={11} height={11} />
            </span>
            <p className="text-[13px] font-semibold text-white">{e.s}</p>
            <p className="text-[11px] text-zinc-500">
              <span className="font-mono">{e.t}</span> · {e.d}
            </p>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
        <Send width={15} height={15} className="text-sky-400" />
        <p className="text-[11px] text-zinc-400">
          Total elapsed <span className="font-semibold text-success">2 seconds</span> — no
          merchant action required
        </p>
      </div>
    </Frame>
  )
}

function AdminScreen() {
  return (
    <Frame label="wp-admin/admin.php?page=methodepay-orders">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[440px] text-left text-[12px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-zinc-500">
              <th scope="col" className="pb-2 font-semibold">Order</th>
              <th scope="col" className="pb-2 font-semibold">Method</th>
              <th scope="col" className="pb-2 font-semibold">Amount</th>
              <th scope="col" className="pb-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            {[
              ['#2481', 'M-Pesa', '$89.00', 'Delivered'],
              ['#2480', 'Stripe', '$39.00', 'Paid'],
              ['#2479', 'Bank Transfer', '$199.00', 'Awaiting proof'],
              ['#2478', 'Direct Crypto', '$267.00', 'Delivered'],
            ].map(([id, m, amt, st]) => (
              <tr key={id} className="border-t border-white/[0.06]">
                <td className="py-2.5 font-mono text-zinc-400">{id}</td>
                <td className="py-2.5">{m}</td>
                <td className="py-2.5 font-semibold text-white">{amt}</td>
                <td className="py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      st === 'Awaiting proof'
                        ? 'bg-amber-400/15 text-amber-300'
                        : 'bg-success/15 text-success'
                    }`}
                  >
                    {st}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-zinc-400">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5">
          <Copy width={13} height={13} /> yoursite.com/pay/stripe/pro-licence
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5">
          <Bell width={13} height={13} /> Alerts on
        </span>
      </div>
    </Frame>
  )
}

const screens = {
  payments: PaymentsScreen,
  design: DesignScreen,
  automation: AutomationScreen,
  admin: AdminScreen,
}

export default function ScreenMock({ id }) {
  const Screen = screens[id]
  return Screen ? <Screen /> : null
}
