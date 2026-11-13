import { useEffect, useState } from 'react'
import { Check, Send, Shield } from './Icons.jsx'

const methods = [
  { name: 'Stripe', hint: 'Card · 3D Secure', tone: '#8b83ff', initials: 'S' },
  { name: 'WhatsApp Pay', hint: 'Chat to confirm', tone: '#25d366', initials: 'WA' },
  { name: 'Direct Crypto', hint: 'USDT · TRC-20', tone: '#f7931a', initials: '₿' },
  { name: 'M-Pesa (manual)', hint: 'Till 402 118', tone: '#00d632', initials: 'MP' },
]

const REDUCED =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Decorative, self-playing checkout demo used on the home hero.
 * It is not a real form, so it is exposed as an image with a text alternative.
 */
export default function CheckoutMockup() {
  const [active, setActive] = useState(0)
  const [paid, setPaid] = useState(false)

  useEffect(() => {
    if (REDUCED) return
    let step = 0
    const id = setInterval(() => {
      step += 1
      const phase = step % 6
      if (phase === 5) {
        setPaid(true)
      } else if (phase === 0) {
        setPaid(false)
        setActive((a) => (a + 1) % methods.length)
      }
    }, 1400)
    return () => clearInterval(id)
  }, [])

  const method = methods[active]

  return (
    <div
      role="img"
      aria-label="MethodePay checkout demo: a buyer picks a payment method — Stripe, WhatsApp Pay, Direct Crypto or a manual M-Pesa method — pays, and instantly receives an access code by email while the merchant gets a Telegram alert."
      className="relative"
    >
      <div className="glass relative overflow-hidden p-5 sm:p-6">
        {/* checkout header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 text-xs font-bold text-onaccent">
              M
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight text-white">Pro Licence</p>
              <p className="text-[11px] text-zinc-500">yoursite.com/pay/pro-licence</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-extrabold tracking-tighter text-white">$89.00</p>
            <p className="text-[11px] text-zinc-500">1 year</p>
          </div>
        </div>

        <div className="my-4 hairline" />

        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          Payment method
        </p>

        <ul className="space-y-2">
          {methods.map((m, i) => {
            const on = i === active
            return (
              <li
                key={m.name}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-500 ${
                  on
                    ? 'border-violet-500/60 bg-violet-500/[0.09]'
                    : 'border-white/[0.07] bg-white/[0.02]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-white"
                  style={{ background: `${m.tone}26`, color: m.tone }}
                >
                  {m.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-white">
                    {m.name}
                  </span>
                  <span className="block truncate text-[11px] text-zinc-500">{m.hint}</span>
                </span>
                <span
                  className={`grid h-4 w-4 place-items-center rounded-full border transition ${
                    on ? 'border-violet-400 bg-violet-500' : 'border-white/20'
                  }`}
                >
                  {on && <span className="h-1.5 w-1.5 rounded-full bg-onaccent" />}
                </span>
              </li>
            )
          })}
        </ul>

        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          className={`btn mt-4 w-full text-onaccent transition-all duration-500 ${
            paid ? 'bg-success/90' : 'bg-gradient-to-r from-violet-500 to-indigo-500'
          }`}
        >
          {paid ? (
            <>
              <Check width={16} height={16} /> Paid · code sent
            </>
          ) : (
            <>Pay $89.00 with {method.name.replace(' (manual)', '')}</>
          )}
        </button>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
          <Shield width={13} height={13} className="text-success" />
          14-day money-back guarantee · Secured on your own domain
        </p>
      </div>

      {/* Telegram alert card */}
      <div
        className={`glass absolute -bottom-20 -right-2 w-[248px] p-3.5 transition-all duration-500 sm:-right-6 ${
          paid ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-sky-500/15 text-sky-400">
            <Send width={14} height={14} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-white">Telegram · New order</p>
            <p className="mt-1 text-[11px] leading-snug text-zinc-400">
              Amina K. · amina@…  · {method.name.replace(' (manual)', '')}
              <br />
              Code <span className="font-mono text-success">MP-7F42-QX</span> delivered
            </p>
          </div>
        </div>
      </div>

      {/* email delivery card */}
      <div
        className={`glass absolute -top-14 left-1 hidden w-[210px] p-3 transition-all duration-500 lg:block ${
          paid ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'
        }`}
      >
        <p className="text-[11px] font-semibold text-white">Email delivered · 2s</p>
        <p className="mt-1 text-[11px] leading-snug text-zinc-400">
          “Your access code is ready.”
        </p>
      </div>
    </div>
  )
}
