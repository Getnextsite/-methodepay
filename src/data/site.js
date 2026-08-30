// Single source of truth for site copy and pricing.

export const paymentMethods = [
  { name: 'Stripe', short: 'Cards worldwide', tone: '#8b83ff', initials: 'S' },
  { name: 'PayPal', short: 'Wallet + cards', tone: '#4da3e8', initials: 'PP' },
  { name: 'Alchemy Pay', short: 'Embedded on-ramp', tone: '#00d4b1', initials: 'AP' },
  { name: 'WhatsApp Pay', short: 'Chat to close', tone: '#25d366', initials: 'WA' },
  { name: 'Direct Crypto', short: 'USDT, BTC, ETH', tone: '#f7931a', initials: '₿' },
  { name: 'OnRamPay', short: 'Fiat to crypto', tone: '#7c5cff', initials: 'OR' },
  { name: 'Western Union', short: 'Cash payout codes', tone: '#ffd400', initials: 'WU' },
  { name: 'Bank Transfer', short: 'Local IBAN / RIB', tone: '#8aa2ff', initials: 'BT' },
  { name: 'Manual ×5', short: 'M-Pesa, PIX, mobile money', tone: '#00d632', initials: 'M5' },
]

export const checkoutDesigns = [
  {
    name: 'Classic',
    tag: 'Two-column',
    blurb: 'Order summary left, methods right. The layout nobody has to learn.',
  },
  {
    name: 'Lite',
    tag: 'Single column',
    blurb: 'Stripped to product, price, pay. Fastest path on a 3G phone.',
  },
  {
    name: 'Storefront',
    tag: 'Product-led',
    blurb: 'Gallery, description and price block for physical or digital goods.',
  },
  {
    name: 'Express',
    tag: 'One-tap',
    blurb: 'Method buttons above the fold. Built for repeat buyers.',
  },
  {
    name: 'Hero',
    tag: 'Landing page',
    blurb: 'Full-bleed headline and offer stack. Checkout as a sales page.',
  },
  {
    name: 'Trust',
    tag: 'Proof-heavy',
    blurb: 'Badges, guarantees and testimonials framing the pay button.',
  },
]

export const homeFeatures = [
  {
    icon: 'Wallet',
    title: '9+ payment methods',
    body: 'Stripe, PayPal, Alchemy Pay, WhatsApp Pay, Direct Crypto, OnRamPay, Western Union, Bank Transfer — plus five manual methods you define yourself.',
  },
  {
    icon: 'Palette',
    title: '6 checkout designs',
    body: 'Classic, Lite, Storefront, Express, Hero and Trust. Switch design without touching a theme file or a line of CSS.',
  },
  {
    icon: 'Sliders',
    title: 'Live checkout editor',
    body: 'A WordPress-native customizer with side-by-side preview. Change colours, fonts, width, radius and logo — see it instantly.',
  },
  {
    icon: 'Bolt',
    title: 'Instant trial-code delivery',
    body: 'Customer uploads proof of payment, gets access by email in seconds, and you get a Telegram alert with their details and the code assigned.',
  },
  {
    icon: 'Link',
    title: 'Direct payment links',
    body: 'yoursite.com/pay/stripe/product-name. Paste it in a DM, a bio, an invoice or an ad. No cart, no account, no funnel.',
  },
  {
    icon: 'Bell',
    title: 'Telegram + email alerts',
    body: 'Every order pings your phone the moment it lands, with the method used and the buyer’s details attached.',
  },
]

export const featureGroups = [
  {
    id: 'payments',
    label: 'Payments',
    icon: 'Wallet',
    headline: 'Nine ways in. Zero gatekeepers.',
    intro:
      'Mainstream processors decline whole countries, whole industries and whole business models. MethodePay stops treating that as the end of the conversation — if one rail is closed, you switch on another.',
    items: [
      {
        title: 'Stripe & PayPal, when you have them',
        body: 'Full card and wallet checkout for the merchants who are approved. Keys go in once, and payments post straight to your WordPress orders table.',
      },
      {
        title: 'Alchemy Pay, embedded',
        body: 'The Alchemy Pay widget runs inside your checkout, not on a redirect. Buyers pay with local cards and wallets across 170+ countries and never leave your domain.',
      },
      {
        title: 'WhatsApp Pay',
        body: 'One tap opens a pre-filled WhatsApp thread with the order reference and amount. Where WhatsApp is the shop, this closes the sale in the app your customer already lives in.',
      },
      {
        title: 'Direct Crypto',
        body: 'Publish your own wallet addresses — USDT, BTC, ETH, anything with an address and a network. No custodian, no exchange account, no cut taken in the middle.',
      },
      {
        title: 'OnRamPay',
        body: 'Buyers with cash or a local card convert to crypto in the checkout flow and settle in one pass. You quote in your currency, they pay in theirs.',
      },
      {
        title: 'Western Union',
        body: 'Show your payout details, take the MTCN from the buyer, verify and release. The rail that reaches customers with no bank account at all.',
      },
      {
        title: 'Bank Transfer',
        body: 'Your IBAN, RIB, SWIFT or local account fields, rendered cleanly with a one-tap copy button and the reference the buyer needs to quote.',
      },
      {
        title: '5 fully customizable manual methods',
        body: 'M-Pesa, PIX, Orange Money, Vodafone Cash, a cousin with a POS terminal — you name the method, write the steps, upload a video tutorial and design the button. The plugin does not care what the rail is called.',
      },
    ],
  },
  {
    id: 'design',
    label: 'Checkout Design',
    icon: 'Palette',
    headline: 'Six checkouts. One editor. No CSS.',
    intro:
      'Checkout is where the money leaves or stays. You get six tested layouts and a live editor to make any of them look like it was built for your brand.',
    items: [
      {
        title: 'Six layouts, one click apart',
        body: 'Classic, Lite, Storefront, Express, Hero and Trust each solve a different job — fast mobile, product-led, proof-heavy, repeat buyer. Swap between them and keep every setting.',
      },
      {
        title: 'Live side-by-side preview',
        body: 'The editor is the WordPress customizer you already know. Controls on the left, real checkout on the right, updating as you drag — not after you save and reload.',
      },
      {
        title: 'Brand controls that matter',
        body: 'Accent and background colours, font family, layout width, corner radius and your logo. Enough to match a brand, not so much that you can break the layout.',
      },
      {
        title: 'Custom checkout fields',
        body: 'Add select and checkbox fields with your own labels and options — plan tier, delivery city, licence type, referral source. Values land on the order.',
      },
      {
        title: 'Trust badges, coupons, policy links',
        body: 'Money-back badges, secure-payment marks, discount codes, and privacy and terms links rendered inline where buyers look for them.',
      },
      {
        title: 'Mobile-first rendering',
        body: 'Every design is built phone-up: tap targets sized for thumbs, method lists that do not overflow, and forms that survive a slow connection.',
      },
    ],
  },
  {
    id: 'automation',
    label: 'Automation',
    icon: 'Bolt',
    headline: 'Manual payment. Automatic delivery.',
    intro:
      'The reason merchants avoid manual methods is the follow-up: checking proofs, emailing codes, chasing buyers at midnight. MethodePay does that part for you.',
    items: [
      {
        title: 'Instant trial-code auto-delivery',
        body: 'Buyer submits proof of payment and the plugin assigns a code from your pool and emails it immediately. The wait between paying and getting access drops to seconds.',
      },
      {
        title: 'Telegram alert with full context',
        body: 'You get a message with the buyer’s name, email, the method they used, the amount and the exact code assigned. Verification takes one glance at your phone.',
      },
      {
        title: 'Direct payment links',
        body: 'Every product and method has its own URL: yoursite.com/pay/stripe/product-name. Drop it in a DM, an email signature, an ad or an invoice.',
      },
      {
        title: 'Email notifications both ways',
        body: 'Confirmation to the buyer, order alert to you, both templated and both sent from your own site.',
      },
      {
        title: 'Code pools you control',
        body: 'Upload codes in bulk, watch them drain in the dashboard, and get warned before the pool runs dry mid-campaign.',
      },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: 'Shield',
    headline: 'It lives in WordPress. That is the point.',
    intro:
      'No external dashboard, no second login, no data leaving your server. MethodePay is a plugin, and it behaves like one.',
    items: [
      {
        title: 'Orders inside wp-admin',
        body: 'Filter by method, status and date. Open an order to see custom field values, proof of payment and the code assigned.',
      },
      {
        title: 'No WooCommerce dependency',
        body: 'MethodePay does not extend WooCommerce, wrap it or need it installed. Fewer tables, fewer cron jobs, fewer things to break on shared hosting.',
      },
      {
        title: 'Works on any WordPress site',
        body: 'Any theme, any host, any page builder. Drop in a shortcode or use a direct pay link — that is the whole integration.',
      },
      {
        title: 'Per-method controls',
        body: 'Enable, disable, reorder and rename any method. Set which ones show for which product, and hide the rest.',
      },
      {
        title: 'Your data stays yours',
        body: 'Orders, buyer details and proofs live in your database. No middleman account holds your customer list.',
      },
    ],
  },
]

export const steps = [
  {
    n: '01',
    title: 'Install the plugin',
    body: 'Upload the ZIP, activate, and MethodePay adds its own menu in wp-admin. No WooCommerce, no theme changes, no setup wizard that takes an afternoon.',
  },
  {
    n: '02',
    title: 'Switch on your methods',
    body: 'Paste API keys for the processors you have, and write your own steps for the ones you do not — bank details, a WhatsApp number, an M-Pesa till, a wallet address.',
  },
  {
    n: '03',
    title: 'Share the link and get paid',
    body: 'Publish the checkout on a page or send the direct pay link. Orders land in wp-admin, alerts land on your phone, and access is delivered automatically.',
  },
]

export const testimonials = [
  {
    quote:
      'Stripe closed our account for being in the wrong country. We moved to bank transfer plus a manual M-Pesa method and the revenue never actually stopped.',
    name: 'Amine B.',
    role: 'Digital courses · Casablanca',
    initials: 'AB',
  },
  {
    quote:
      'Half our buyers do not own a card. WhatsApp Pay and Western Union turned those conversations into orders instead of dead ends.',
    name: 'Chinelo O.',
    role: 'SaaS reseller · Lagos',
    initials: 'CO',
  },
  {
    quote:
      'We run 14 client sites on the Agency plan. Cloning a checkout takes minutes, and I stopped explaining WooCommerce to people who just wanted one pay button.',
    name: 'Dani R.',
    role: 'Web agency · São Paulo',
    initials: 'DR',
  },
  {
    quote:
      'The Telegram alert with the code already assigned is the whole product for me. I verify a payment from my phone in about four seconds.',
    name: 'Rizky P.',
    role: 'Subscription tools · Jakarta',
    initials: 'RP',
  },
]

export const plans = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'One site, the rails that never say no.',
    yearly: 39,
    lifetime: 117,
    popular: false,
    cta: 'Get Starter',
    highlights: [
      '1 site',
      'WhatsApp Pay, Direct Crypto, Bank Transfer, Western Union',
      '1 manual method',
      '2 checkout designs (Classic, Lite)',
      'Live editor — colours only',
      'Custom fields and coupons',
      'Email support, 48h response',
      '1 year of updates',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    tagline: 'Every method, every design, delivery on autopilot.',
    yearly: 89,
    lifetime: 267,
    popular: true,
    cta: 'Get Professional',
    highlights: [
      '5 sites',
      'Everything in Starter, plus Stripe, PayPal, Alchemy Pay, OnRamPay',
      'All 5 manual methods',
      'All 6 checkout designs',
      'Full live editor — layout, fonts, spacing, logo',
      'Trial-code auto-delivery, Telegram alerts, direct pay links',
      'Trust badges, video tutorials on manual methods, policy links',
      'Priority email support, 24h response',
      '1 year of updates',
    ],
  },
  {
    id: 'agency',
    name: 'Agency',
    tagline: 'Unlimited client sites and a human on setup day.',
    yearly: 199,
    lifetime: 597,
    popular: false,
    cta: 'Get Agency',
    highlights: [
      'Unlimited sites',
      'Everything in Professional',
      'All 6 checkout designs',
      'Full live editor',
      'All automation, including priority processing',
      'Every checkout extra',
      'Priority support + 1-on-1 setup call',
      '1 year of updates',
    ],
  },
]

export const comparison = [
  {
    row: 'Sites',
    starter: '1 site',
    professional: '5 sites',
    agency: 'Unlimited sites',
  },
  {
    row: 'Payment methods',
    starter: 'WhatsApp Pay, Direct Crypto, Bank Transfer, Western Union, 1 manual method',
    professional:
      'Everything in Starter + Stripe, PayPal, Alchemy Pay, OnRamPay, all 5 manual methods',
    agency: 'Everything in Professional',
  },
  {
    row: 'Checkout designs',
    starter: '2 designs (Classic, Lite)',
    professional: 'All 6 designs',
    agency: 'All 6 designs',
  },
  {
    row: 'Live checkout editor',
    starter: 'Colours only',
    professional: 'Full live editor — layout, fonts, spacing, logo',
    agency: 'Full live editor',
  },
  {
    row: 'Trial-code auto-delivery',
    starter: false,
    professional: true,
    agency: true,
  },
  { row: 'Telegram alerts', starter: false, professional: true, agency: true },
  { row: 'Direct payment links', starter: false, professional: true, agency: true },
  { row: 'Custom checkout fields', starter: true, professional: true, agency: true },
  { row: 'Coupons', starter: true, professional: true, agency: true },
  { row: 'Trust badges', starter: false, professional: true, agency: true },
  {
    row: 'Video tutorials on manual methods',
    starter: false,
    professional: true,
    agency: true,
  },
  { row: 'Privacy & terms links', starter: false, professional: true, agency: true },
  {
    row: 'Support',
    starter: 'Email, 48h response',
    professional: 'Priority email, 24h response',
    agency: 'Priority support + 1-on-1 setup call',
  },
  { row: 'Updates', starter: '1 year', professional: '1 year', agency: '1 year' },
  {
    row: 'Money-back guarantee',
    starter: '14 days',
    professional: '14 days',
    agency: '14 days',
  },
]

export const homeFaqs = [
  {
    q: 'Do I need WooCommerce?',
    a: 'No. MethodePay is standalone — it does not extend WooCommerce and does not need it installed. You get a checkout, an orders screen and payment methods without the extra tables, cron jobs and templates WooCommerce brings with it.',
  },
  {
    q: 'Stripe rejected my business. Can I still use this?',
    a: 'Yes, and that is the reason MethodePay exists. Starter ships with WhatsApp Pay, Direct Crypto, Bank Transfer and Western Union — none of which require processor approval. You define the steps, the buyer follows them, and you confirm the payment.',
  },
  {
    q: 'What is a manual payment method exactly?',
    a: 'A method you define yourself: a name, a logo, a button, written instructions, an optional video tutorial and a proof-of-payment upload. Merchants use them for M-Pesa, PIX, Orange Money, local bank apps and cash agents. MethodePay handles the checkout, the order record and the delivery.',
  },
  {
    q: 'How does instant trial-code delivery work?',
    a: 'You upload a pool of codes. When a buyer submits proof of payment, the plugin assigns the next code, emails it to them straight away, and sends you a Telegram alert with their details and the code that went out. They get access in seconds instead of waiting for you to wake up.',
  },
  {
    q: 'Will it work with my theme and page builder?',
    a: 'Yes. MethodePay renders through a shortcode or its own /pay/ route, so it works with any theme, Elementor, Bricks, Gutenberg or a custom build. The checkout carries its own styles so your theme cannot break it.',
  },
  {
    q: 'What happens after my year of updates ends?',
    a: 'The plugin keeps working. You keep every feature you paid for — you simply stop receiving new versions until you renew. Renewals are optional and discounted.',
  },
]

export const pricingFaqs = [
  {
    q: 'What counts as a site?',
    a: 'One WordPress install, one licence activation. Staging and local development copies do not count against your limit — activate them freely.',
  },
  {
    q: 'What is the difference between yearly and lifetime?',
    a: 'Yearly gives you one year of updates and support, then renews if you want it to. Lifetime is a single payment at roughly 3× the yearly price and never renews. Both include every feature in the tier from day one.',
  },
  {
    q: 'Why is Agency $199 when Professional is $89?',
    a: 'Because the plan is priced for people billing clients, not running one store. Unlimited sites means one licence covers your entire book of business, and the 1-on-1 setup call means the first deployment does not eat a day of your time. If you run four or more client sites, Agency is already cheaper than Professional.',
  },
  {
    q: 'Can I upgrade later?',
    a: 'Yes, at any time. You pay the difference, prorated against what is left of your current term. Nothing needs to be reinstalled or reconfigured.',
  },
  {
    q: 'Is there really a refund?',
    a: 'Fourteen days, no interrogation. Email support, say it did not fit, and the payment goes back. If a payment method genuinely does not work in your country, we would rather refund you than argue about it.',
  },
  {
    q: 'Do you take a cut of my sales?',
    a: 'No. MethodePay never touches your money. Payments go directly from your buyer to your processor, your bank, your wallet or your phone. There is no transaction fee and no revenue share.',
  },
  {
    q: 'Which plan do I need for Stripe and PayPal?',
    a: 'Professional or Agency. Starter covers the methods that do not require processor approval — which is deliberate, because that is what most merchants in underserved markets are actually blocked on.',
  },
]

export const docsFaqs = [
  {
    q: 'Where do I find my licence key?',
    a: 'In the purchase email, and in your account area under Licences. Paste it into MethodePay → Licence in wp-admin to unlock updates.',
  },
]
