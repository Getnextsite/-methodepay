/**
 * Inline stroke icons. All are decorative by default (aria-hidden) — labels
 * live on the surrounding text so screen readers don't read icon noise.
 */
const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
}

const make = (paths) =>
  function Icon(props) {
    return (
      <svg {...base} {...props}>
        {paths}
      </svg>
    )
  }

export const Wallet = make(
  <>
    <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H18a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z" />
    <path d="M3 8.5V7a2 2 0 0 1 2-2h10" />
    <circle cx="16.5" cy="12.5" r="1.2" />
  </>,
)

export const Palette = make(
  <>
    <path d="M12 21a9 9 0 1 1 9-9c0 2-1.5 3-3 3h-1.5a2 2 0 0 0-1.4 3.4A1.8 1.8 0 0 1 12 21z" />
    <circle cx="7.5" cy="12" r="1" />
    <circle cx="9.8" cy="8" r="1" />
    <circle cx="14.5" cy="7.6" r="1" />
  </>,
)

export const Bolt = make(<path d="M13 2 4 14h7l-1 8 9-12h-7z" />)

export const Link = make(
  <>
    <path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7l-1.3 1.3" />
    <path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 1 0 5.7 5.7l1.3-1.3" />
  </>,
)

export const Bell = make(
  <>
    <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
    <path d="M10.5 20a1.8 1.8 0 0 0 3 0" />
  </>,
)

export const Sliders = make(
  <>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </>,
)

export const Shield = make(
  <>
    <path d="M12 3 5 6v6c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6z" />
    <path d="m9.3 12 1.9 1.9 3.5-3.6" />
  </>,
)

export const Check = make(<path d="m5 12.5 4.2 4.2L19 7" />)

export const Minus = make(<path d="M6 12h12" />)

export const ArrowRight = make(
  <>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </>,
)

export const ChevronDown = make(<path d="m6 9 6 6 6-6" />)

export const Phone = make(
  <>
    <rect x="6" y="2.5" width="12" height="19" rx="3" />
    <path d="M10.5 18.5h3" />
  </>,
)

export const Globe = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M3.5 9h17M3.5 15h17" />
    <path d="M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" />
  </>,
)

export const Code = make(
  <>
    <path d="m9 8-5 4 5 4M15 8l5 4-5 4" />
  </>,
)

export const Mail = make(
  <>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="m4 8 7.1 4.6a2 2 0 0 0 2.2 0L20 8" />
  </>,
)

export const Send = make(
  <>
    <path d="M21 3 10.5 13.5" />
    <path d="M21 3 14.5 21l-4-7.5L3 9.5z" />
  </>,
)

export const Book = make(
  <>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
    <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5A2.5 2.5 0 0 1 4 20.5z" />
  </>,
)

export const Users = make(
  <>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20a6 6 0 0 1 12 0" />
    <path d="M16 5.5a3.2 3.2 0 0 1 0 6.2M17.5 20a6 6 0 0 0-2-4.5" />
  </>,
)

export const Star = make(
  <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />,
)

export const Layers = make(
  <>
    <path d="m12 3 9 5-9 5-9-5z" />
    <path d="m3.5 12.5 8.5 4.7 8.5-4.7" />
  </>,
)

export const Copy = make(
  <>
    <rect x="9" y="9" width="11" height="11" rx="2.5" />
    <path d="M15 6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15" />
  </>,
)
