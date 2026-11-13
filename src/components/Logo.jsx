export default function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width="30"
        height="30"
        viewBox="0 0 64 64"
        aria-hidden="true"
        className="shrink-0 drop-shadow-[0_4px_14px_rgb(var(--p)/0.5)]"
      >
        <defs>
          <linearGradient id="mp-logo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: "rgb(var(--p400))" }} />
            <stop offset="100%" style={{ stopColor: "rgb(var(--s))" }} />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill="url(#mp-logo)" fillOpacity="0.14" />
        <rect
          x="0.75"
          y="0.75"
          width="62.5"
          height="62.5"
          rx="15.5"
          fill="none"
          stroke="url(#mp-logo)"
          strokeOpacity="0.5"
          strokeWidth="1.5"
        />
        <path d="M14 45V19h7l11 16 11-16h7v26h-7V31l-8 12h-6l-8-12v14z" fill="url(#mp-logo)" />
      </svg>
      <span className="text-[17px] font-extrabold tracking-tighter text-white">
        Methode<span className="gradient-text">Pay</span>
      </span>
    </span>
  )
}
