import { useState } from 'react'
import { Check, Shield } from './Icons.jsx'

const accents = [
  { name: 'Violet', value: '#7c5cff' },
  { name: 'Emerald', value: '#00d632' },
  { name: 'Amber', value: '#f7931a' },
  { name: 'Sky', value: '#3b9dff' },
  { name: 'Rose', value: '#ff5d8f' },
]

const fonts = [
  { name: 'Jakarta', stack: '"Plus Jakarta Sans", system-ui, sans-serif' },
  { name: 'Inter', stack: 'Inter, system-ui, sans-serif' },
  { name: 'System', stack: 'ui-sans-serif, system-ui, sans-serif' },
]

const widths = [
  { name: 'Compact', value: 300 },
  { name: 'Standard', value: 360 },
  { name: 'Wide', value: 420 },
]

const designs = ['Classic', 'Lite', 'Trust']

function Segmented({ legend, options, value, onChange, name }) {
  return (
    <fieldset>
      <legend className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-1">
        {options.map((o) => {
          const label = typeof o === 'string' ? o : o.name
          const checked = label === value
          return (
            <label
              key={label}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold tracking-tight transition ${
                checked
                  ? 'bg-white/[0.1] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.1)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={label}
                checked={checked}
                onChange={() => onChange(label)}
                className="sr-only"
              />
              {label}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export default function LiveEditorDemo() {
  const [accent, setAccent] = useState(accents[0].value)
  const [radius, setRadius] = useState(16)
  const [font, setFont] = useState('Jakarta')
  const [width, setWidth] = useState('Standard')
  const [design, setDesign] = useState('Classic')
  const [logo, setLogo] = useState(true)

  const fontStack = fonts.find((f) => f.name === font).stack
  const maxWidth = widths.find((w) => w.name === width).value
  const lite = design === 'Lite'
  const trust = design === 'Trust'

  return (
    <div className="glass grid gap-0 overflow-hidden lg:grid-cols-[300px_1fr]">
      {/* controls — the WordPress-customizer side */}
      <div className="border-b border-white/[0.07] bg-white/[0.02] p-5 lg:border-b-0 lg:border-r">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          Customizer
        </p>
        <h3 className="mt-1 text-base font-bold tracking-tight text-white">
          MethodePay → Checkout
        </h3>

        <div className="mt-5 space-y-5">
          <fieldset>
            <legend className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
              Accent colour
            </legend>
            <div className="flex gap-2">
              {accents.map((a) => (
                <label
                  key={a.value}
                  className="cursor-pointer"
                  title={a.name}
                >
                  <input
                    type="radio"
                    name="accent"
                    value={a.value}
                    checked={accent === a.value}
                    onChange={() => setAccent(a.value)}
                    className="peer sr-only"
                  />
                  <span
                    className="block h-8 w-8 rounded-lg ring-offset-2 ring-offset-ink transition peer-checked:ring-2 peer-focus-visible:ring-2 peer-checked:ring-white/70"
                    style={{ background: a.value }}
                  />
                  <span className="sr-only">{a.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <Segmented
            legend="Design"
            name="design"
            options={designs}
            value={design}
            onChange={setDesign}
          />

          <Segmented
            legend="Font"
            name="font"
            options={fonts}
            value={font}
            onChange={setFont}
          />

          <Segmented
            legend="Layout width"
            name="width"
            options={widths}
            value={width}
            onChange={setWidth}
          />

          <div>
            <label
              htmlFor="radius"
              className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-zinc-500"
            >
              Corner radius
              <span className="font-mono text-[11px] normal-case tracking-normal text-zinc-300">
                {radius}px
              </span>
            </label>
            <input
              id="radius"
              type="range"
              min="0"
              max="24"
              step="2"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full accent-violet-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="logo" className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
              Show logo
            </label>
            <button
              id="logo"
              type="button"
              role="switch"
              aria-checked={logo}
              onClick={() => setLogo((v) => !v)}
              className={`relative h-6 w-11 rounded-full border transition ${
                logo ? 'border-transparent' : 'border-white/15 bg-white/[0.06]'
              }`}
              style={logo ? { background: accent } : undefined}
            >
              <span className="sr-only">Show logo</span>
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                  logo ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* preview */}
      <div className="relative grid place-items-center bg-[radial-gradient(ellipse_at_top,rgba(124,92,255,0.12),transparent_60%)] p-6 sm:p-10">
        <span className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
          Live preview
        </span>

        <div
          className="w-full border border-white/[0.09] bg-white/[0.04] p-5 shadow-card transition-all duration-300"
          style={{ maxWidth, borderRadius: radius, fontFamily: fontStack }}
          aria-live="polite"
        >
          {logo && (
            <div className="mb-4 flex items-center gap-2">
              <span
                aria-hidden="true"
                className="grid h-7 w-7 place-items-center text-[11px] font-bold text-white"
                style={{ background: accent, borderRadius: Math.max(4, radius - 6) }}
              >
                M
              </span>
              <span className="text-sm font-bold tracking-tight text-white">Your Brand</span>
            </div>
          )}

          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-semibold text-white">Pro Licence</span>
            <span className="text-lg font-extrabold tracking-tight text-white">$89.00</span>
          </div>

          {!lite && (
            <p className="mt-1 text-[11px] text-zinc-400">Billed yearly · instant delivery</p>
          )}

          <div className="my-4 h-px bg-white/10" />

          <div className="space-y-2">
            {['Stripe', 'WhatsApp Pay', 'Bank Transfer'].slice(0, lite ? 2 : 3).map((m, i) => (
              <div
                key={m}
                className="flex items-center gap-2.5 border px-3 py-2 text-[12px] font-medium text-white transition"
                style={{
                  borderRadius: Math.max(4, radius - 4),
                  borderColor: i === 0 ? accent : 'rgba(255,255,255,0.08)',
                  background: i === 0 ? `${accent}1f` : 'rgba(255,255,255,0.02)',
                }}
              >
                <span
                  className="h-4 w-4 rounded-full border"
                  style={{
                    borderColor: i === 0 ? accent : 'rgba(255,255,255,0.25)',
                    background: i === 0 ? accent : 'transparent',
                  }}
                />
                {m}
              </div>
            ))}
          </div>

          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className="mt-4 w-full px-4 py-2.5 text-[13px] font-bold text-white transition"
            style={{ background: accent, borderRadius: Math.max(4, radius - 4) }}
          >
            Pay $89.00
          </button>

          {trust && (
            <div className="mt-3 space-y-1.5">
              <p className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-400">
                <Shield width={12} height={12} style={{ color: accent }} />
                14-day money-back guarantee
              </p>
              <p className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-400">
                <Check width={12} height={12} className="text-success" />
                2,400+ merchants paid this month
              </p>
            </div>
          )}

          {!trust && (
            <p className="mt-3 text-center text-[10px] text-zinc-500">
              Privacy policy · Terms
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
