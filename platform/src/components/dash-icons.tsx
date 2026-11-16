/**
 * Line icons for the dashboard. Decorative (aria-hidden): the text next to
 * each one carries the meaning.
 */
type P = { className?: string };

function Svg({ className = 'h-[18px] w-[18px]', children }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export const Icon = {
  home: (p: P) => (
    <Svg {...p}>
      <path d="M3.5 10.5 12 4l8.5 6.5V20a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z" />
    </Svg>
  ),
  orders: (p: P) => (
    <Svg {...p}>
      <path d="M6 3h12l1 18-3.5-2-3.5 2-3.5-2L5 21z" />
      <path d="M9 8h6M9 12h6" />
    </Svg>
  ),
  box: (p: P) => (
    <Svg {...p}>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
    </Svg>
  ),
  repeat: (p: P) => (
    <Svg {...p}>
      <path d="M4 12a7 7 0 0 1 12-5l2 2M20 12a7 7 0 0 1-12 5l-2-2" />
      <path d="M18 4v5h-5M6 20v-5h5" />
    </Svg>
  ),
  tag: (p: P) => (
    <Svg {...p}>
      <path d="M3 12V4h8l10 10-8 8z" />
      <circle cx="7.5" cy="8.5" r="1.3" />
    </Svg>
  ),
  cart: (p: P) => (
    <Svg {...p}>
      <path d="M3 4h2l2.4 11h10.2L20 7H6.2" />
      <circle cx="9" cy="19.5" r="1.3" />
      <circle cx="17" cy="19.5" r="1.3" />
    </Svg>
  ),
  chart: (p: P) => (
    <Svg {...p}>
      <path d="M4 20V5M4 20h16" />
      <path d="m7 15 4-4 3 3 5-6" />
    </Svg>
  ),
  shield: (p: P) => (
    <Svg {...p}>
      <path d="M12 3 4.5 6v6c0 4.4 3.2 8 7.5 9 4.3-1 7.5-4.6 7.5-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </Svg>
  ),
  pulse: (p: P) => (
    <Svg {...p}>
      <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />
    </Svg>
  ),
  card: (p: P) => (
    <Svg {...p}>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="M3 10h18M7 15h3" />
    </Svg>
  ),
  wallet: (p: P) => (
    <Svg {...p}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" />
      <rect x="4" y="8" width="17" height="11" rx="2.5" />
      <circle cx="16.5" cy="13.5" r="1.2" />
    </Svg>
  ),
  palette: (p: P) => (
    <Svg {...p}>
      <path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.9 1.4-2-.5-1.2.3-2.5 1.6-2.5H17a4 4 0 0 0 4-4C21 7 17 3 12 3z" />
      <circle cx="7.5" cy="11" r="1" />
      <circle cx="10" cy="7" r="1" />
      <circle cx="15" cy="7.5" r="1" />
    </Svg>
  ),
  gift: (p: P) => (
    <Svg {...p}>
      <rect x="3.5" y="8" width="17" height="4" rx="1" />
      <path d="M5 12v8h14v-8M12 8v12M12 8c-1.5-4-6-3.5-5-1 .6 1.5 5 1 5 1zm0 0c1.5-4 6-3.5 5-1-.6 1.5-5 1-5 1z" />
    </Svg>
  ),
  bell: (p: P) => (
    <Svg {...p}>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </Svg>
  ),
  plug: (p: P) => (
    <Svg {...p}>
      <path d="M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0zM12 16v5" />
    </Svg>
  ),
  code: (p: P) => (
    <Svg {...p}>
      <path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" />
    </Svg>
  ),
  users: (p: P) => (
    <Svg {...p}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0M16 5.5a3.2 3.2 0 0 1 0 6.2M17.5 20a6 6 0 0 0-2-4.5" />
    </Svg>
  ),
  receipt: (p: P) => (
    <Svg {...p}>
      <rect x="4" y="3.5" width="16" height="17" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </Svg>
  ),
  search: (p: P) => (
    <Svg {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </Svg>
  ),
  help: (p: P) => (
    <Svg {...p}>
      <path d="M4 12a8 8 0 1 1 3.5 6.6L4 20l1.4-3.4A8 8 0 0 1 4 12z" />
    </Svg>
  ),
  plus: (p: P) => (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  ),
  arrowUpRight: (p: P) => (
    <Svg {...p}>
      <path d="M7 17 17 7M9 7h8v8" />
    </Svg>
  ),
  link: (p: P) => (
    <Svg {...p}>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </Svg>
  ),
  sparkle: (p: P) => (
    <Svg {...p}>
      <path d="M12 3.5 13.8 10l6.7 2-6.7 2L12 20.5 10.2 14l-6.7-2 6.7-2zM19 3v4M17 5h4" />
    </Svg>
  ),
  logout: (p: P) => (
    <Svg {...p}>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" />
    </Svg>
  ),
  bitcoin: (p: P) => (
    <Svg {...p}>
      <path d="M8 6h5.5a2.5 2.5 0 0 1 0 5H8zm0 5h6.5a2.5 2.5 0 0 1 0 5H8zM8 4v16M11 4v2M11 18v2" />
    </Svg>
  ),
  chat: (p: P) => (
    <Svg {...p}>
      <path d="M4 12a8 8 0 1 1 3.5 6.6L4 20l1.4-3.4A8 8 0 0 1 4 12z" />
      <path d="M9 11h6M9 14h4" />
    </Svg>
  ),
  bank: (p: P) => (
    <Svg {...p}>
      <path d="M3 9.5 12 4l9 5.5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3.5 20h17" />
    </Svg>
  ),
};

export type IconName = keyof typeof Icon;
