import { useEffect, useRef, useState } from 'react'

const stats = [
  { value: 17, suffix: '', label: 'Payment methods', note: 'cards, wallets, crypto, cash' },
  { value: 6, suffix: '', label: 'Checkout designs', note: 'restyle any of them live' },
  { value: 0, suffix: '%', label: 'Transaction fees', note: 'buyers pay you directly' },
  { value: 2, suffix: 's', label: 'To deliver a code', note: 'after payment is confirmed' },
]

const REDUCED =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Counts up once, the first time it scrolls into view. */
function CountUp({ to, suffix }) {
  const ref = useRef(null)
  const [n, setN] = useState(REDUCED ? to : 0)

  useEffect(() => {
    if (REDUCED || !ref.current || typeof IntersectionObserver === 'undefined') {
      setN(to)
      return
    }
    let raf
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        const start = performance.now()
        const tick = (now) => {
          const t = Math.min(1, (now - start) / 1100)
          setN(Math.round(to * (1 - Math.pow(1 - t, 3))))
          if (t < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    io.observe(ref.current)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [to])

  return (
    <span ref={ref}>
      {n}
      {suffix}
    </span>
  )
}

export default function StatsBand() {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.08] lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-ink px-5 py-7 text-center sm:px-6 sm:py-9">
          <dd className="font-display text-4xl font-extrabold tracking-tightest gradient-text sm:text-5xl">
            <CountUp to={s.value} suffix={s.suffix} />
          </dd>
          <dt className="mt-2 text-sm font-bold text-white">{s.label}</dt>
          <p className="mt-1 text-xs text-zinc-500">{s.note}</p>
        </div>
      ))}
    </dl>
  )
}
