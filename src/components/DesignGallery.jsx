import { useEffect, useState } from 'react'
import { checkoutDesigns } from '../data/site.js'

const REDUCED =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * The six checkout designs, switchable. Each preview is a real capture of the
 * hosted checkout for a demo store (public/shots/checkout-<design>.webp).
 * It cycles on its own until the visitor picks one, then stays put.
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

  const onKey = (e) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
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
        className="ring-gradient self-start overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0b0f14] shadow-lift"
      >
        <div className="flex items-center gap-2 border-b border-pure/10 bg-pure/[0.04] px-4 py-2.5">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </span>
          <span className="ml-2 min-w-0 truncate font-mono text-[11px] text-[#9aa6a1]">
            app.methodepay.com/c/atlas-digital · {design.name.toLowerCase()} design
          </span>
        </div>
        {/* key remounts the image so each design fades in */}
        <img
          key={design.name}
          src={`/shots/checkout-${design.name.toLowerCase()}.webp`}
          alt={`The ${design.name} checkout design: ${design.blurb}`}
          width={2560}
          height={1720}
          loading="lazy"
          className="block h-auto w-full animate-fade-up"
        />
      </div>
    </div>
  )
}
