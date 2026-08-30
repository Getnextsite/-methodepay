import { useId, useState } from 'react'
import { ChevronDown } from './Icons.jsx'

function Item({ q, a, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()

  return (
    <div className="glass overflow-hidden">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          id={`${id}-button`}
          className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left text-[15px] font-semibold tracking-tight text-white sm:px-6"
        >
          {q}
          <ChevronDown
            className={`shrink-0 text-zinc-400 transition-transform duration-300 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>
      </h3>
      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-button`}
        hidden={!open}
        className="px-5 pb-5 sm:px-6"
      >
        <p className="max-w-3xl text-sm leading-relaxed text-zinc-400">{a}</p>
      </div>
    </div>
  )
}

export default function Faq({ items, defaultOpenFirst = true }) {
  return (
    <div className="mx-auto grid max-w-3xl gap-3">
      {items.map((item, i) => (
        <Item key={item.q} {...item} defaultOpen={defaultOpenFirst && i === 0} />
      ))}
    </div>
  )
}
