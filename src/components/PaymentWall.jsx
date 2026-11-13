import BrandIcon from './BrandIcon.jsx'

const rowA = [
  { rail: 'stripe', name: 'Cards', short: 'Visa · Mastercard' },
  { rail: 'paypal', name: 'PayPal', short: 'Wallet + cards' },
  { rail: 'op_binance', name: 'Binance Pay', short: 'Pay from balance' },
  { rail: 'whatsapp', name: 'WhatsApp Pay', short: 'Chat to close' },
  { rail: 'crypto', name: 'Direct Crypto', short: 'USDT · BTC · ETH' },
  { rail: 'op_revolut', name: 'Revolut', short: 'Instant transfer' },
  { rail: 'western_union', name: 'Western Union', short: 'Cash pickup' },
  { rail: 'bank_transfer', name: 'Bank Transfer', short: 'IBAN / RIB' },
]

const rowB = [
  { rail: 'op_upi', name: 'UPI', short: 'GPay · PhonePe' },
  { rail: 'op_cashapp', name: 'Cash App', short: 'US buyers' },
  { rail: 'alchemypay', name: 'Alchemy Pay', short: 'Embedded on-ramp' },
  { rail: 'onramppay', name: 'OnRamPay', short: '20+ on-ramps' },
  { rail: 'op_paypalus', name: 'PayPal (USA)', short: 'US accounts' },
  { rail: 'finchpay_btc', name: 'Card to Bitcoin', short: '150+ countries' },
  { rail: 'amazon_giftcard', name: 'Gift cards', short: 'Amazon codes' },
  { rail: 'manual', name: 'Your own method', short: 'M-Pesa, PIX, mobile money' },
]

function Chip({ m }) {
  return (
    <li className="glass flex shrink-0 items-center gap-3 !rounded-xl px-4 py-3 transition hover:border-white/20">
      <BrandIcon rail={m.rail} tone="#0aa57c" size={30} />
      <span>
        <span className="block whitespace-nowrap text-[13px] font-bold text-white">{m.name}</span>
        <span className="block whitespace-nowrap text-[11px] text-zinc-500">{m.short}</span>
      </span>
    </li>
  )
}

function Row({ items, reverse = false }) {
  return (
    <div className="marquee-mask overflow-hidden py-1.5">
      {/* Duplicated track for a seamless loop; the copy is hidden from AT. */}
      <div
        className="flex w-max animate-marquee gap-3 hover:[animation-play-state:paused] motion-reduce:animate-none"
        style={reverse ? { animationDirection: 'reverse' } : undefined}
      >
        <ul className="flex gap-3">
          {items.map((m) => (
            <Chip key={m.rail} m={m} />
          ))}
        </ul>
        <ul className="flex gap-3" aria-hidden="true">
          {items.map((m) => (
            <Chip key={`${m.rail}-dup`} m={m} />
          ))}
        </ul>
      </div>
    </div>
  )
}

/** Two counter-scrolling rows of every rail MethodePay can switch on. */
export default function PaymentWall() {
  return (
    <div>
      <Row items={rowA} />
      <Row items={rowB} reverse />
    </div>
  )
}
