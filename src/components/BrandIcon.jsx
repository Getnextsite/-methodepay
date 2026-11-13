/**
 * Payment rail icons, shared with the hosted checkout.
 *
 * Generated from platform/src/components/checkout/method-icon.tsx so the
 * marketing site shows the same marks buyers see at checkout. Each sits on a
 * white tile, which keeps dark artwork (PayPal above all) readable on any
 * background in either theme.
 */
export default function BrandIcon({ rail, tone = '#64748b', size = 20, title }) {
  const art = ART[rail] ?? null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      style={{ flex: '0 0 auto', display: 'block' }}
    >
      <rect width="24" height="24" rx="6" fill="#ffffff" />
      {art ?? (
        <g fill="none" stroke={tone} strokeWidth="1.9">
          <rect x="4" y="7" width="16" height="11" rx="2.6" />
          <path d="M4 11h16" />
        </g>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------- artwork

const BTC_GLYPH =
  'M16.3 10.4c.2-1.3-.8-2-2.2-2.5l.45-1.8-1.1-.27-.44 1.75c-.29-.07-.58-.14-.88-.2l.44-1.77-1.1-.27-.45 1.8-.7-.17-1.5-.38-.29 1.17s.81.19.79.2c.44.11.52.4.5.64l-.5 2.05.12.03-.12-.03-.72 2.87c-.05.13-.19.33-.5.26.01.01-.79-.2-.79-.2l-.55 1.26 1.43.35.77.2-.45 1.82 1.1.28.45-1.8c.3.08.59.15.88.22l-.44 1.79 1.1.27.45-1.81c1.87.35 3.28.21 3.87-1.49.48-1.37-.02-2.16-1-2.68.71-.16 1.26-.63 1.4-1.61zm-2.53 3.53c-.34 1.38-2.65.64-3.4.45l.6-2.41c.75.19 3.15.55 2.8 1.96zm.34-3.55c-.31 1.25-2.24.62-2.87.46l.55-2.19c.63.16 2.64.44 2.32 1.73z';

const PAYPAL_DARK =
  'M7.4 21.3H4.6c-.3 0-.5-.2-.4-.5L6.9 3.2c.1-.4.4-.6.8-.6h6.3c2.9 0 4.9 1.4 4.5 4.4-.5 3.4-3 4.9-6.2 4.9H9.9c-.4 0-.7.3-.8.7l-1 6.9c-.1.5-.4.9-.7.9z';
const PAYPAL_LIGHT =
  'M18.9 7.4c-.5 3.4-3 4.9-6.2 4.9h-1.6l-1.1 7.7c-.1.4.2.8.6.8h2.4c.4 0 .7-.3.7-.6l.6-4.1c.1-.3.4-.6.7-.6h.5c2.9 0 5.1-1.2 5.5-4.5.2-1.4 0-2.5-.7-3.3z';

const CASHAPP_GLYPH =
  'M18.4 15.6c.45 0 .9.15 1.2.4l.35-.65c-.3-.25-.7-.4-1.1-.45l.1-.55h-.75l-.1.55c-.8.1-1.35.6-1.35 1.3 0 .8.65 1.1 1.35 1.3.6.2.85.35.85.65 0 .3-.3.5-.75.5-.5 0-1-.2-1.35-.5l-.4.65c.35.3.85.5 1.3.55l-.1.55h.75l.1-.55c.85-.1 1.4-.6 1.4-1.35 0-.8-.65-1.1-1.4-1.3-.55-.15-.85-.3-.85-.6 0-.3.3-.5.75-.5z';

const ART = {
  stripe: (
    <>
      <rect x="1.5" y="4.5" width="21" height="15" rx="2.6" fill="#635BFF" />
      <rect x="1.5" y="7.6" width="21" height="3" fill="#4B44CC" />
      <rect x="3.8" y="12.4" width="4.2" height="3.2" rx=".8" fill="#FFD966" />
      <circle cx="16.4" cy="14.6" r="3" fill="#EB001B" />
      <circle cx="19.2" cy="14.6" r="3" fill="#F79E1B" opacity=".9" />
    </>
  ),

  paypal: (
    <>
      <path fill="#003087" d={PAYPAL_DARK} />
      <path fill="#0070E0" d={PAYPAL_LIGHT} />
    </>
  ),

  paypal_ff: (
    <>
      <path fill="#146B3A" d={PAYPAL_DARK} />
      <path fill="#16A34A" d={PAYPAL_LIGHT} />
    </>
  ),

  bc_paypal: (
    <>
      <circle cx="8" cy="12" r="7.6" fill="#F7931A" />
      <path
        fill="#fff"
        d="M11.5 11c.16-1-.62-1.55-1.68-1.9l.34-1.37-.83-.21-.33 1.33c-.22-.06-.45-.11-.67-.16l.34-1.34-.84-.21-.34 1.37-.53-.13-1.15-.29-.22.89s.62.14.6.15c.34.08.4.31.39.49l-.39 1.56.09.02-.09-.02-.55 2.18c-.04.1-.14.25-.38.19 0 0-.6-.15-.6-.15l-.42.96 1.09.27.59.15-.35 1.39.84.21.34-1.37c.23.06.45.12.67.18l-.34 1.36.84.21.34-1.38c1.43.27 2.5.16 2.95-1.13.36-1.04-.02-1.64-.77-2.04.55-.13.96-.49 1.07-1.23zm-1.92 2.7c-.26 1.04-2.01.48-2.58.34l.46-1.84c.57.14 2.4.42 2.12 1.5zm.26-2.71c-.24.95-1.7.47-2.17.35l.42-1.67c.47.12 2 .34 1.75 1.32z"
      />
      <g transform="translate(13.6,2) scale(0.5)">
        <path fill="#003087" d={PAYPAL_DARK} />
        <path fill="#0070E0" d={PAYPAL_LIGHT} />
      </g>
    </>
  ),

  bc_cashapp: (
    <>
      <circle cx="12" cy="12" r="10" fill="#F7931A" />
      <path fill="#fff" d={BTC_GLYPH} />
      <rect x="13" y="13" width="10" height="10" rx="3" fill="#00D632" />
      <path fill="#fff" d={CASHAPP_GLYPH} />
    </>
  ),

  whatsapp: (
    <>
      <path
        fill="#25D366"
        d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z"
      />
      <path
        fill="#25D366"
        d="M16.6 14.3c-.25-.13-1.47-.72-1.7-.8-.23-.09-.4-.13-.56.12-.17.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.13-.14.17-.25.25-.41.09-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.44.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.02 2.57.12.16 1.75 2.67 4.23 3.75.59.25 1.05.4 1.41.52.6.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.1-.23-.16-.48-.29z"
      />
    </>
  ),

  crypto: (
    <>
      <circle cx="15.5" cy="8.5" r="6" fill="#627EEA" />
      <path fill="#fff" d="m15.5 4.6-2.7 4.2 2.7 1.6 2.7-1.6z" opacity=".85" />
      <path fill="#fff" d="M15.5 11.1 12.8 9.5l2.7 3.8 2.7-3.8z" />
      <circle cx="9" cy="14" r="8" fill="#F7931A" />
      <path fill="#fff" d={BTC_GLYPH} />
    </>
  ),

  alchemypay: (
    <>
      <circle cx="12" cy="12" r="10" fill="#0B48E5" />
      <path d="M12 6.5 16.5 17h-2.2l-.85-2.1h-2.9L9.7 17H7.5L12 6.5zm0 3.6-.95 2.9h1.9L12 10.1z" fill="#fff" />
    </>
  ),

  op_binance: (
    <>
      <rect width="24" height="24" rx="5" fill="#F0B90B" />
      <path
        fill="#fff"
        d="M12 6l1.9 1.9L12 9.8 10.1 7.9 12 6zM8 10l1.9 1.9L8 13.8 6.1 11.9 8 10zM16 10l1.9 1.9L16 13.8 14.1 11.9 16 10zM12 14l1.9 1.9L12 17.8 10.1 15.9 12 14zM12 10.9l1.1 1.1L12 13.1 10.9 12 12 10.9z"
      />
    </>
  ),

  op_revolut: (
    <>
      <rect width="24" height="24" rx="5" fill="#0a0a0a" />
      <path
        fill="#fff"
        d="M7 6h4.8c2.2 0 3.8 1.5 3.8 3.6 0 1.6-.9 2.9-2.3 3.4l2.5 5H13l-2.3-4.7H9.5V18H7V6zm2.5 2.1v3.2h2.1c1 0 1.7-.7 1.7-1.6s-.7-1.6-1.7-1.6H9.5z"
      />
    </>
  ),

  op_upi: (
    <>
      <rect width="24" height="24" rx="5" fill="#fff" stroke="#e2e8f0" />
      <path d="M10 6l-3 6 3 6 3-6z" fill="#097939" />
      <path d="M13.5 6l-3 6 3 6 3-6z" fill="#ed752e" />
    </>
  ),

  op_paypalus: (
    <>
      <rect width="24" height="24" rx="5" fill="#003087" />
      <g transform="translate(4.5 4.5) scale(0.62)">
        <path fill="#fff" d={PAYPAL_DARK} />
        <path fill="#99c2ff" d={PAYPAL_LIGHT} />
      </g>
      <rect x="15" y="3" width="6" height="4.5" fill="#b31942" />
      <rect x="15" y="3.9" width="6" height="0.7" fill="#fff" />
      <rect x="15" y="5.6" width="6" height="0.7" fill="#fff" />
      <rect x="15" y="3" width="2.6" height="2.6" fill="#0a3161" />
    </>
  ),

  op_cashapp: (
    <>
      <rect width="24" height="24" rx="5" fill="#00D632" />
      {/* The glyph is drawn for the 10x10 box at (13,13); blow that box up to
          fill the tile. Transforms apply right to left: 2.4 * (p - 13). */}
      <g transform="scale(2.4) translate(-13 -13)">
        <path fill="#fff" d={CASHAPP_GLYPH} />
      </g>
    </>
  ),

  onramppay: (
    <>
      <rect x="1.5" y="5.5" width="10" height="7" rx="1.6" fill="#7C5CFF" />
      <rect x="1.5" y="7.6" width="10" height="1.7" fill="#5B3DF0" />
      <path d="M3.4 15.6 1.5 16.8V19h10v-2.2l-1.9-1.2z" fill="#A78BFA" />
      <path
        d="M13 12h3m0 0-1.4-1.4M16 12l-1.4 1.4"
        stroke="#7C5CFF"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="19.6" cy="12" r="4.4" fill="#F7931A" />
      <path
        fill="#fff"
        d="M21.6 11.4c.09-.58-.35-.89-.96-1.1l.2-.79-.48-.12-.19.77c-.13-.03-.26-.06-.39-.09l.19-.78-.48-.12-.2.79-.31-.07-.66-.17-.13.52s.36.08.35.09c.2.05.23.18.22.28l-.22.9.05.01-.05-.01-.31 1.26c-.02.06-.08.15-.21.11 0 0-.35-.09-.35-.09l-.24.56.62.16.34.09-.2.8.48.12.2-.79c.13.04.26.07.38.1l-.19.79.48.12.2-.8c.82.16 1.44.09 1.7-.65.21-.6-.01-.95-.44-1.17.32-.07.55-.28.61-.71zm-1.1 1.55c-.15.6-1.16.28-1.49.2l.27-1.06c.33.08 1.38.24 1.22.86zm.15-1.56c-.14.55-.98.27-1.25.2l.24-.96c.27.07 1.16.2 1.01.76z"
      />
    </>
  ),

  western_union: (
    <>
      <rect x="1.5" y="4" width="21" height="16" rx="3.5" fill="#FFDD00" />
      <path
        d="M4 8.6 5.7 15h1.5l1.1-4 1.1 4h1.5l1.7-6.4h-1.6l-.9 4-1.1-4H7.6l-1.1 4-.9-4z"
        fill="#000"
      />
      <path
        d="M14 8.6v4c0 1.6 1 2.6 2.6 2.6s2.6-1 2.6-2.6v-4h-1.6v3.9c0 .8-.4 1.2-1 1.2s-1-.4-1-1.2V8.6z"
        fill="#000"
      />
      <path d="M4 17.4h16" stroke="#000" strokeWidth="1.1" strokeLinecap="round" />
    </>
  ),

  bank_transfer: (
    <>
      <path d="M9 2.5 1.5 6.4V8h15V6.4z" fill="#2563EB" />
      <rect x="2.8" y="9.2" width="2" height="6" fill="#2563EB" />
      <rect x="8" y="9.2" width="2" height="6" fill="#2563EB" />
      <rect x="13.2" y="9.2" width="2" height="6" fill="#2563EB" />
      <rect x="1.5" y="16.2" width="15" height="1.9" rx=".95" fill="#2563EB" />
      <path
        d="M18 8h4m0 0-1.6-1.6M22 8l-1.6 1.6"
        stroke="#1D4ED8"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 14h-4m0 0 1.6-1.6M18 14l1.6 1.6"
        stroke="#60A5FA"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),

  // Added after the plugin's icon set, drawn to match it.
  finchpay_btc: (
    <>
      <rect x="1.5" y="5" width="14" height="9.6" rx="2" fill="#4D82A9" />
      <rect x="1.5" y="7.4" width="14" height="2.4" fill="#375F7C" />
      <rect x="3.2" y="11.2" width="4" height="1.5" rx=".75" fill="#ABD0EA" />
      <circle cx="17.4" cy="16.4" r="6" fill="#F7931A" />
      <g transform="translate(8.2 7.2) scale(0.72)">
        <path fill="#fff" d={BTC_GLYPH} />
      </g>
    </>
  ),

  amazon_giftcard: (
    <>
      <rect x="1.5" y="6.5" width="21" height="13.5" rx="2.4" fill="#FF9900" />
      <rect x="1.5" y="11" width="21" height="2.2" fill="#E07C00" />
      <rect x="10.6" y="6.5" width="2.8" height="13.5" fill="#E07C00" />
      <path
        d="M12 6.5c-1.9-3-5.2-1.8-4.3.5.5 1.3 2.5 1 4.3-.5zm0 0c1.9-3 5.2-1.8 4.3.5-.5 1.3-2.5 1-4.3-.5z"
        fill="#fff"
      />
    </>
  ),
};
