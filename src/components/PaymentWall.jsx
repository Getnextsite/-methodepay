import { paymentMethods } from '../data/site.js'

function Chip({ m }) {
  return (
    <li className="flex shrink-0 items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 transition hover:border-white/[0.15] hover:bg-white/[0.06]">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[11px] font-bold"
        style={{ background: `${m.tone}1f`, color: m.tone }}
        aria-hidden="true"
      >
        {m.initials}
      </span>
      <span>
        <span className="block whitespace-nowrap text-[13px] font-semibold text-white">
          {m.name}
        </span>
        <span className="block whitespace-nowrap text-[11px] text-zinc-500">{m.short}</span>
      </span>
    </li>
  )
}

export default function PaymentWall() {
  return (
    <div className="marquee-mask overflow-hidden">
      {/* Duplicated track for a seamless loop; the copy is hidden from AT. */}
      <div className="flex w-max animate-marquee gap-3 motion-reduce:animate-none">
        <ul className="flex gap-3">
          {paymentMethods.map((m) => (
            <Chip key={m.name} m={m} />
          ))}
        </ul>
        <ul className="flex gap-3" aria-hidden="true">
          {paymentMethods.map((m) => (
            <Chip key={`${m.name}-dup`} m={m} />
          ))}
        </ul>
      </div>
    </div>
  )
}
