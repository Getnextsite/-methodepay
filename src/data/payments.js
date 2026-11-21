/**
 * One guide per payment rail.
 *
 * These exist for two reasons at once. A merchant deciding how to get paid
 * needs to know what each rail costs them in effort and risk, and somebody
 * searching "how to accept Western Union on my website" is far closer to
 * buying than somebody searching "payment plugin". So every entry answers the
 * practical question honestly, including the rails that are slow or awkward.
 *
 * `key` matches the rail image in /public/rails and the rail key in the
 * platform registry, so the two never drift apart.
 */

/** How the money actually lands. The single most important fact per rail. */
export const SETTLEMENT = {
  automatic: {
    label: 'Settles itself',
    blurb: 'A verified webhook marks the order paid. Nothing for you to do.',
    tone: 'good',
  },
  manual: {
    label: 'You confirm it',
    blurb: 'The buyer tells us they paid; you check and mark the order paid.',
    tone: 'warn',
  },
}

export const GROUPS = [
  { id: 'card', name: 'Card processors', blurb: 'Your own merchant account. Money moves directly between buyer and you.' },
  { id: 'onramp', name: 'Cards without a merchant account', blurb: 'The buyer pays by card or a local method; you receive crypto at your own address.' },
  { id: 'crypto', name: 'Crypto, held directly', blurb: 'Your addresses. No custodian, no exchange account, nobody taking a cut in the middle.' },
  { id: 'chat', name: 'Chat', blurb: 'Where the conversation is the shop.' },
  { id: 'manual', name: 'Bank, cash and gift cards', blurb: 'You publish the details, the buyer pays, you verify.' },
]

export const paymentGuides = [
  // ------------------------------------------------------------ processors
  {
    slug: 'stripe',
    key: 'stripe',
    name: 'Stripe',
    group: 'card',
    settlement: 'automatic',
    h1: 'Accept card payments with Stripe',
    description:
      'Connect your own Stripe account to MethodePay and take Visa, Mastercard and Amex on a hosted checkout. Orders settle themselves through a verified webhook.',
    bestFor: 'Merchants Stripe has already approved, selling to card-friendly countries.',
    needs: ['A Stripe account in a supported country', 'Your secret key', 'A webhook signing secret'],
    minimum: '$1',
    steps: [
      { title: 'Connect your account', body: 'Paste your Stripe secret key into the dashboard. It is encrypted before it touches the database, and shown back to you masked.' },
      { title: 'Point Stripe at MethodePay', body: 'Add a webhook endpoint in Stripe to /api/webhooks/stripe and paste the signing secret back. Without it payments will not confirm themselves.' },
      { title: 'The buyer pays', body: 'They pick Card at your checkout and go to a Stripe-hosted page. Card details are entered on Stripe, never on us.' },
      { title: 'The order settles', body: 'Stripe sends a signed webhook, we verify the signature, and the order flips to paid. Delivery and emails fire from there.' },
    ],
    pros: ['Instant, automatic settlement', 'Buyers recognise it and trust it', 'Refunds in Stripe update the order here automatically'],
    cons: ['Needs Stripe to approve your business', 'Not available in many countries', 'Chargebacks are possible for months afterwards'],
    faqs: [
      { q: 'Does MethodePay touch the money?', a: 'No. The funds move from your buyer to your own Stripe account. We never hold or route them, which is also why we never need a money transmitter licence.' },
      { q: 'What if Stripe closes my account?', a: 'Your other rails keep working. That is the entire reason MethodePay supports eighteen of them.' },
    ],
  },
  {
    slug: 'paypal',
    key: 'paypal',
    name: 'PayPal',
    group: 'card',
    settlement: 'automatic',
    h1: 'Accept PayPal payments on your own checkout',
    description:
      'Connect a PayPal REST app to MethodePay and let buyers pay with a PayPal balance or a card through PayPal. Orders confirm automatically.',
    bestFor: 'Sellers whose buyers already keep a PayPal balance.',
    needs: ['A PayPal business account', 'A REST app client ID and secret'],
    minimum: '$1',
    steps: [
      { title: 'Create a REST app', body: 'In the PayPal developer dashboard, create an app and copy the client ID and secret.' },
      { title: 'Paste them in', body: 'Add them under Payment methods. The secret is encrypted at rest. Use the sandbox toggle to test first.' },
      { title: 'The buyer approves', body: 'They are sent to PayPal, approve the payment, and come back.' },
      { title: 'The order settles', body: 'We capture the order and mark it paid.' },
    ],
    pros: ['Buyers can pay without entering a card', 'Automatic settlement', 'Works in many countries Stripe does not'],
    cons: ['PayPal holds and reserves are common for new sellers', 'Disputes favour the buyer', 'Fees are high on small amounts'],
    faqs: [
      { q: 'Is this the same as PayPal Friends and Family?', a: 'No, and the difference matters. This is a real commercial payment with buyer protection. Friends and Family is a separate manual rail, and using it for sales breaches PayPal terms.' },
    ],
  },
  {
    slug: 'alchemy-pay',
    key: 'alchemypay',
    name: 'Alchemy Pay',
    group: 'onramp',
    settlement: 'automatic',
    h1: 'Accept cards and local payments in 170+ countries with Alchemy Pay',
    description:
      'Embed Alchemy Pay in your checkout to take cards, bank transfers and local wallets worldwide, settling to a crypto address you control.',
    bestFor: 'Selling into regions where a card processor will not open you an account.',
    needs: ['An Alchemy Pay merchant app ID and secret', 'A payout address and network'],
    minimum: '$1',
    steps: [
      { title: 'Get your credentials', body: 'Apply to Alchemy Pay and copy the app ID and app secret into MethodePay.' },
      { title: 'Choose settlement', body: 'Pick the coin and network you want to receive, and paste the address.' },
      { title: 'The buyer pays in an iframe', body: 'The widget renders inside your own payment screen rather than sending them away. The signature is rebuilt on every request because it is time-sensitive.' },
      { title: 'You receive crypto', body: 'Alchemy Pay settles to your address.' },
    ],
    pros: ['170+ countries and many local methods', 'Stays on your page', 'No card data ever reaches you'],
    cons: ['Buyers may face identity checks', 'You are paid in crypto, not local currency', 'Needs an application and approval'],
    faqs: [
      { q: 'Why does the buyer get asked for ID?', a: 'On-ramps are regulated money services. MethodePay can show a warning before the buyer starts so it is not a surprise mid-payment, which is where abandonment happens.' },
    ],
  },

  // ------------------------------------------------------------- on-ramps
  {
    slug: 'onrampay',
    key: 'onramppay',
    name: 'MethodePay On-Ramp',
    group: 'onramp',
    settlement: 'automatic',
    h1: 'One button, twenty-plus ways to pay',
    description:
      'Our own on-ramp aggregates more than twenty providers behind a single checkout button. Buyers pay by card, bank or local method; you receive USDC at your own wallet.',
    bestFor: 'Merchants who want the widest coverage without integrating each provider.',
    needs: ['A USDC payout wallet, normally on Polygon'],
    minimum: '$30',
    steps: [
      { title: 'Add a payout wallet', body: 'Paste a USDC address you control. Use a self-custodial wallet, not an exchange deposit address.' },
      { title: 'Pick your on-ramps', body: 'Leave it blank to let the router choose, or name the providers you want.' },
      { title: 'The buyer is routed', body: 'They are sent to the on-ramp that works for their country and method.' },
      { title: 'You receive USDC', body: 'Settlement lands at your address.' },
    ],
    pros: ['Widest coverage of any single rail here', 'No merchant account, no business registration', 'Only needs a wallet'],
    cons: ['Thirty dollar minimum rules out small orders', 'Buyer-side identity checks', 'You are paid in stablecoin'],
    faqs: [
      { q: 'Why is there a $30 minimum?', a: 'On-ramp fees are mostly fixed, so below about thirty dollars the fee eats the order. MethodePay hides the rail automatically under the minimum rather than letting a buyer hit the wall.' },
    ],
  },
  {
    slug: 'binance-pay',
    key: 'op_binance',
    name: 'Binance Pay',
    group: 'onramp',
    settlement: 'automatic',
    h1: 'Let buyers pay from their Binance balance',
    description:
      'Promote Binance Pay to its own checkout button. Buyers pay from the balance they already hold; you receive crypto at your own address.',
    bestFor: 'Audiences who already live inside an exchange app.',
    needs: ['A payout wallet, or the shared on-ramp wallet'],
    minimum: '$1',
    steps: [
      { title: 'Switch it on', body: 'Enable Binance Pay under Payment methods. It routes through our on-ramp locked to Binance.' },
      { title: 'Set a wallet', body: 'Give it its own payout address, or leave it blank to use your shared on-ramp wallet.' },
      { title: 'The buyer pays', body: 'They complete the payment in a flow they already recognise.' },
    ],
    pros: ['Enormous recognition in crypto-first markets', 'No card needed', 'Fast'],
    cons: ['Only useful if your buyers hold a Binance balance', 'Still an on-ramp underneath'],
    faqs: [
      { q: 'Why a separate button instead of one generic one?', a: 'Because "Cards / Bank / Crypto" tested badly against a recognisable logo. The same rail with a familiar name converts better.' },
    ],
  },
  {
    slug: 'revolut',
    key: 'op_revolut',
    name: 'Revolut',
    group: 'onramp',
    settlement: 'automatic',
    h1: 'Take payment from a Revolut account',
    description: 'Offer Revolut as its own checkout button, routed through our on-ramp and settling to your wallet.',
    bestFor: 'European buyers who bank with Revolut.',
    needs: ['A payout wallet, or the shared on-ramp wallet'],
    minimum: '$1',
    steps: [
      { title: 'Enable Revolut', body: 'Turn it on under Payment methods.' },
      { title: 'The buyer pays instantly', body: 'Payment comes straight from their Revolut account.' },
    ],
    pros: ['Instant for the buyer', 'Strong in Europe', 'No card entry'],
    cons: ['Narrow audience outside Europe'],
    faqs: [{ q: 'Do I need a Revolut Business account?', a: 'No. You are not receiving into Revolut; you receive crypto at your own address.' }],
  },
  {
    slug: 'upi',
    key: 'op_upi',
    name: 'UPI',
    group: 'onramp',
    settlement: 'automatic',
    h1: 'Accept UPI payments from India',
    description:
      'Take UPI payments — Google Pay, PhonePe, Paytm and the rest — from Indian buyers, settling to a crypto address you control.',
    bestFor: 'Selling to India, where UPI is how ordinary people pay for everything.',
    needs: ['A payout wallet, or the shared on-ramp wallet'],
    minimum: '$1',
    steps: [
      { title: 'Enable UPI', body: 'Turn it on under Payment methods.' },
      { title: 'The buyer pays from any UPI app', body: 'They use whichever app they already have.' },
    ],
    pros: ['By far the most normal way to pay in India', 'No card, no bank form', 'Instant'],
    cons: ['India only', 'Identity checks may apply above small amounts'],
    faqs: [{ q: 'Do I need an Indian entity?', a: 'No. That is the point of routing it through an on-ramp.' }],
  },
  {
    slug: 'paypal-usa',
    key: 'op_paypalus',
    name: 'PayPal (USA)',
    group: 'onramp',
    settlement: 'automatic',
    h1: 'Take US PayPal payments without a PayPal merchant account',
    description:
      'Accept payments from US PayPal accounts through an on-ramp, settling to your own wallet — useful when PayPal will not give you a merchant account.',
    bestFor: 'US buyers, when a PayPal business account is not an option for you.',
    needs: ['A payout wallet, or the shared on-ramp wallet'],
    minimum: '$1',
    steps: [
      { title: 'Enable it', body: 'Turn on PayPal (USA) under Payment methods.' },
      { title: 'The buyer pays with PayPal', body: 'Familiar flow, routed through the on-ramp.' },
    ],
    pros: ['Reaches PayPal-first US buyers without PayPal approving you', 'No chargeback exposure in your own account'],
    cons: ['US only', 'You receive crypto'],
    faqs: [{ q: 'How is this different from the PayPal rail?', a: 'The PayPal rail uses your own PayPal merchant account. This one does not require you to have one.' }],
  },
  {
    slug: 'cash-app',
    key: 'op_cashapp',
    name: 'Cash App',
    group: 'onramp',
    settlement: 'automatic',
    h1: 'Accept Cash App payments on your website',
    description: 'Take Cash App payments through Transak, settling to a crypto address you control.',
    bestFor: 'US buyers who pay for everything with Cash App.',
    needs: ['A payout wallet, or the shared on-ramp wallet'],
    minimum: '$1',
    steps: [
      { title: 'Enable Cash App', body: 'Turn it on under Payment methods.' },
      { title: 'The buyer pays via Transak', body: 'They complete it in the Cash App flow they know.' },
    ],
    pros: ['Huge among younger US buyers', 'No card number typed anywhere'],
    cons: ['US only', 'On-ramp identity checks'],
    faqs: [{ q: 'Is this the same as BTC via Cash App?', a: 'No. This settles automatically. The BTC via Cash App rail is manual: the buyer buys Bitcoin themselves and sends it to you.' }],
  },
  {
    slug: 'card-to-bitcoin',
    key: 'finchpay_btc',
    name: 'Visa / Mastercard to Bitcoin',
    group: 'onramp',
    settlement: 'manual',
    h1: 'Take card payments with nothing but a Bitcoin address',
    description:
      'FinchPay lets buyers in 150+ countries pay by card while you receive Bitcoin at a self-custodial address. No merchant account, no business registration.',
    bestFor: 'Anyone a card processor has refused, who still needs to take cards.',
    needs: ['A self-custodial Bitcoin receive address'],
    minimum: '$1',
    steps: [
      { title: 'Add a BTC address', body: 'Use a wallet you control. Do not use an exchange deposit address — exchanges read third-party deposits as merchant activity and freeze accounts over it.' },
      { title: 'Block countries if you need to', body: 'The US is blocked by default; edit the list to suit.' },
      { title: 'The buyer pays by card', body: 'Three guided steps on our own instructions screen.' },
      { title: 'You confirm', body: 'A hosted widget URL is a redirect, not a contract, so this lands in awaiting verification and you confirm the Bitcoin arrived.' },
    ],
    pros: ['Lowest barrier of any card rail here — just an address', 'Works where nothing else will', '150+ countries'],
    cons: ['You confirm each payment by hand', 'Bitcoin price moves between order and settlement', 'US buyers blocked by default'],
    faqs: [
      { q: 'Why does this not settle automatically?', a: 'Because we cannot verify from a redirect that the money arrived. Marking an order paid on that basis would let anyone with the link claim their own order was paid.' },
    ],
  },

  // --------------------------------------------------------------- crypto
  {
    slug: 'crypto',
    key: 'crypto',
    name: 'Direct crypto',
    group: 'crypto',
    settlement: 'manual',
    h1: 'Accept crypto directly to your own wallet',
    description:
      'Take BTC, USDT, USDC, LTC and more straight to addresses you control. MethodePay shows the buyer the address, a generated QR code and a reference to quote.',
    bestFor: 'Buyers who already hold crypto, and merchants who want no middleman at all.',
    needs: ['One receive address per coin and network'],
    minimum: '$1',
    steps: [
      { title: 'Add your addresses', body: 'One per coin and network — USDT on TRC20 is a different address from USDT on ERC20, and sending to the wrong one loses the money.' },
      { title: 'The buyer picks a coin', body: 'They see the address, a QR code we generate from it, and a quote that holds for a configurable number of minutes.' },
      { title: 'They send and confirm', body: 'They paste the transaction ID.' },
      { title: 'You verify on-chain', body: 'Check the transaction and mark it paid.' },
    ],
    pros: ['No custodian, no account, no cut', 'Irreversible — no chargebacks ever', 'Works everywhere'],
    cons: ['You verify each one', 'Buyer must already hold crypto', 'Wrong network means lost funds'],
    faqs: [
      { q: 'Where does the QR code come from?', a: 'It is generated server-side from the address you entered. There is nothing to upload.' },
      { q: 'Can I use my exchange deposit address?', a: 'You can, and we advise against it. Exchanges flag third-party deposits as merchant activity and freeze accounts.' },
    ],
  },
  {
    slug: 'bitcoin-via-paypal',
    key: 'bc_paypal',
    name: 'Bitcoin via PayPal',
    group: 'crypto',
    settlement: 'manual',
    h1: 'Buyers with only PayPal can still pay you in Bitcoin',
    description:
      'A guided flow: the buyer buys Bitcoin inside PayPal, then sends it to your address. Includes step-by-step instructions and an optional tutorial video.',
    bestFor: 'Buyers who have PayPal money but no card you can charge.',
    needs: ['A Bitcoin receive address', 'Ideally a short walkthrough video'],
    minimum: '$1',
    steps: [
      { title: 'Set your address and video', body: 'Paste the receive address and link a tutorial if you have one.' },
      { title: 'The buyer follows the steps', body: 'Buy crypto inside PayPal, then send it on.' },
      { title: 'You confirm receipt', body: 'Check the chain and mark it paid.' },
    ],
    pros: ['Unlocks PayPal balances without a PayPal merchant account', 'No chargebacks once it arrives'],
    cons: ['Several steps for the buyer — expect drop-off without a video', 'Manual confirmation'],
    faqs: [{ q: 'Is a video really necessary?', a: 'It is the difference between this rail converting and not. Most buyers have never moved crypto out of PayPal.' }],
  },
  {
    slug: 'bitcoin-via-cash-app',
    key: 'bc_cashapp',
    name: 'Bitcoin via Cash App',
    group: 'crypto',
    settlement: 'manual',
    h1: 'Turn a Cash App balance into a payment to you',
    description: 'The buyer buys Bitcoin inside Cash App and sends it to your address, with guided steps and an optional video.',
    bestFor: 'US buyers with a Cash App balance and no card.',
    needs: ['A Bitcoin receive address', 'Ideally a walkthrough video'],
    minimum: '$1',
    steps: [
      { title: 'Set your address', body: 'Paste the receive address and link a tutorial.' },
      { title: 'The buyer buys and sends', body: 'All inside Cash App, then on to you.' },
      { title: 'You confirm', body: 'Verify on-chain and mark it paid.' },
    ],
    pros: ['Reaches buyers with no card at all', 'Irreversible'],
    cons: ['Multi-step', 'Cash App imposes its own limits on new users'],
    faqs: [{ q: 'How long does it take?', a: 'Usually minutes, but Cash App can hold a first Bitcoin purchase for longer. Set expectations in your instructions.' }],
  },

  // ----------------------------------------------------------------- chat
  {
    slug: 'whatsapp',
    key: 'whatsapp',
    name: 'WhatsApp',
    group: 'chat',
    settlement: 'manual',
    h1: 'Take orders and payment over WhatsApp',
    description:
      'The buyer taps one button and lands in a WhatsApp thread with you that already contains their order reference, product and amount. You agree payment however suits.',
    bestFor: 'Markets where the conversation is the shop, and for high-value orders that need a human.',
    needs: ['A WhatsApp number with the country code'],
    minimum: '$1',
    steps: [
      { title: 'Add your number', body: 'Digits only, including the country code.' },
      { title: 'Write the prefilled message', body: 'Use placeholders for order reference, product, amount and buyer name so the thread opens with the context already in it.' },
      { title: 'The buyer taps through', body: 'An order is created first, so you have a record even if they never message.' },
      { title: 'You agree and confirm', body: 'Settle however you like, then mark the order paid.' },
    ],
    pros: ['Highest conversion rail in many markets', 'No processor can decline you', 'Lets you rescue a sale a card would have lost'],
    cons: ['Entirely manual', 'Does not scale past a certain volume', 'Needs someone to answer'],
    faqs: [
      { q: 'Does an order exist if they never message me?', a: 'Yes. The order is created before the handoff, so abandoned ones are visible instead of invisible.' },
    ],
  },

  // --------------------------------------------------------------- manual
  {
    slug: 'bank-transfer',
    key: 'bank_transfer',
    name: 'Bank transfer',
    group: 'manual',
    settlement: 'manual',
    h1: 'Accept bank transfers and SEPA payments',
    description:
      'Publish your account details on the checkout with a unique reference per order, so you can match a transfer to an order when it lands.',
    bestFor: 'Larger invoices, business buyers, and anywhere card fees hurt.',
    needs: ['Account holder name', 'IBAN or local account number', 'Optionally SWIFT and bank name'],
    minimum: '$1',
    steps: [
      { title: 'Add your account', body: 'Holder, IBAN, and a reference prefix.' },
      { title: 'The buyer sees the details', body: 'With a unique order reference to quote in the memo.' },
      { title: 'They transfer and confirm', body: 'They tell you it has been sent.' },
      { title: 'You check and mark paid', body: 'Match the reference against your statement.' },
    ],
    pros: ['Very low fees on large amounts', 'No chargebacks', 'Business buyers expect it'],
    cons: ['One to three days', 'Manual matching', 'International transfers can be expensive for the buyer'],
    faqs: [{ q: 'What if they forget the reference?', a: 'Match on amount and name, then use the order lookup. The prefix exists to make this rare.' }],
  },
  {
    slug: 'western-union',
    key: 'western_union',
    name: 'Western Union',
    group: 'manual',
    settlement: 'manual',
    h1: 'Accept cash payments through Western Union',
    description:
      'Show the receiver name, city and country at checkout. The buyer pays cash at an agent and submits the MTCN, which you verify before releasing the order.',
    bestFor: 'Buyers with no bank account and no card at all.',
    needs: ['Receiver first and last name', 'Receiver country, and ideally city'],
    minimum: '$1',
    steps: [
      { title: 'Add receiver details', body: 'Exactly as they appear on your ID, or the payout will be refused.' },
      { title: 'The buyer pays cash', body: 'At any agent location.' },
      { title: 'They submit the MTCN', body: 'The tracking number for the transfer.' },
      { title: 'You collect and confirm', body: 'Verify, collect, then mark the order paid.' },
    ],
    pros: ['Reaches the genuinely unbanked', 'Cash, so irreversible', 'Global agent network'],
    cons: ['Slow and entirely manual', 'Buyer pays a real fee', 'You must collect in person in many places'],
    faqs: [{ q: 'Why does the name have to match exactly?', a: 'Western Union will not pay out to a name that differs from your ID, even by a middle initial.' }],
  },
  {
    slug: 'paypal-friends-family',
    key: 'paypal_ff',
    name: 'PayPal (manual)',
    group: 'manual',
    settlement: 'manual',
    h1: 'Take a PayPal payment and verify it yourself',
    description:
      'Publish your own instructions and a PayPal link. The buyer pays, pastes their transaction ID, and you verify it in your PayPal account by hand.',
    bestFor: 'Sellers who want PayPal reach without connecting a merchant account.',
    needs: ['Instructions for the buyer', 'Optionally a PayPal.me link'],
    minimum: '$1',
    steps: [
      { title: 'Write your instructions', body: 'Say exactly what to do and what to include.' },
      { title: 'The buyer pays', body: 'Through the link or by sending to your address.' },
      { title: 'They paste the transaction ID', body: 'Which gives you something to check against.' },
      { title: 'You verify in PayPal', body: 'Then mark the order paid.' },
    ],
    pros: ['No merchant account needed', 'Works immediately'],
    cons: [
      'Entirely manual',
      'Using the Friends and Family option for a sale breaches PayPal terms and leaves your buyer with no protection — if you take this route, understand the risk you are putting on both of you',
    ],
    faqs: [
      { q: 'Should I ask for Friends and Family?', a: 'We will not tell you to. It breaks PayPal rules for commercial payments, and PayPal does reverse and limit accounts over it.' },
    ],
  },
  {
    slug: 'amazon-gift-card',
    key: 'amazon_giftcard',
    name: 'Amazon eGift Card',
    group: 'manual',
    settlement: 'manual',
    h1: 'Accept Amazon gift cards as payment',
    description:
      'Let buyers pay with an Amazon eGift card code. Codes are encrypted at rest, hidden from every alert, revealed only by an explicit action, and erased once the order is paid.',
    bestFor: 'Buyers holding gift-card balances and nothing else.',
    needs: ['Nothing — it works out of the box', 'Optionally a purchase link and instructions'],
    minimum: '$1',
    steps: [
      { title: 'Switch it on', body: 'Optionally add a purchase link and say which regions you accept.' },
      { title: 'The buyer submits a code', body: 'Sixteen characters, with the Amazon region if you ask for it.' },
      { title: 'You reveal and redeem', body: 'Revealing writes to the audit trail. Nothing is redeemed or balance-checked automatically.' },
      { title: 'Mark it paid', body: 'Which erases the stored code.' },
    ],
    pros: ['Reaches buyers with no money rails at all', 'No processor involved'],
    cons: [
      'A code is a bearer credential — whoever reads it can spend it',
      'No way to verify a balance automatically',
      'Gift-card fraud is common; treat unknown buyers with suspicion',
    ],
    faqs: [
      { q: 'How is the code protected?', a: 'Encrypted at rest, excluded from every email and Telegram alert, revealed only by an explicit action that is logged, and erased when you mark the order paid.' },
    ],
  },
  {
    slug: 'custom-methods',
    key: 'manual',
    name: 'Your own methods',
    group: 'manual',
    settlement: 'manual',
    h1: 'Add a payment method MethodePay has never heard of',
    description:
      'Define up to five rails of your own — M-Pesa, PIX, Interac, a local wallet, cash on delivery — with your own name, icon, instructions and reference field.',
    bestFor: 'Local rails that matter enormously in one country and nowhere else.',
    needs: ['A name buyers recognise', 'Instructions', 'Optionally an icon, a video and a button link'],
    minimum: '$1',
    steps: [
      { title: 'Name it', body: 'Whatever your buyers call it.' },
      { title: 'Write the instructions', body: 'This is the whole rail: say exactly what to do.' },
      { title: 'Decide what to collect', body: 'Require a reference if you need something to check against.' },
      { title: 'Verify and confirm', body: 'Same as any other manual rail.' },
    ],
    pros: ['Covers rails no global processor supports', 'Fully yours to word', 'Up to five of them'],
    cons: ['You write the instructions, so clarity is on you', 'Manual'],
    faqs: [{ q: 'What do people actually use these for?', a: 'M-Pesa in Kenya, PIX in Brazil, Interac in Canada, and cash on delivery nearly everywhere.' }],
  },
]

export function paymentGuide(slug) {
  return paymentGuides.find((g) => g.slug === slug) ?? null
}

export function guidesByGroup() {
  return GROUPS.map((g) => ({ ...g, guides: paymentGuides.filter((p) => p.group === g.id) }))
}
