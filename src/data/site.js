// Single source of truth for site copy and pricing.

// Every rail the hosted checkout offers; `rail` picks its icon in public/rails.
export const paymentMethods = [
  { rail: 'stripe', name: 'Stripe', short: 'Cards worldwide' },
  { rail: 'paypal', name: 'PayPal', short: 'Wallet + cards' },
  { rail: 'finchpay_btc', name: 'Visa / Mastercard', short: 'Card to Bitcoin, 150+ countries' },
  { rail: 'whatsapp', name: 'WhatsApp Pay', short: 'Chat to close' },
  { rail: 'crypto', name: 'Direct Crypto', short: 'USDT, BTC, ETH' },
  { rail: 'op_binance', name: 'Binance Pay', short: 'Pay from a Binance balance' },
  { rail: 'op_revolut', name: 'Revolut', short: 'Instant app transfer' },
  { rail: 'op_cashapp', name: 'Cash App', short: 'US buyers' },
  { rail: 'op_paypalus', name: 'PayPal (USA)', short: 'US PayPal accounts' },
  { rail: 'onramppay', name: 'Cards / Bank / Crypto', short: 'OnRamPay, 20+ on-ramps' },
  { rail: 'alchemypay', name: 'Alchemy Pay', short: 'Embedded card-to-crypto' },
  { rail: 'bc_paypal', name: 'BTC-PayPal', short: 'Buy BTC in PayPal, send it to you' },
  { rail: 'bc_cashapp', name: 'BTC-Cash App', short: 'Buy BTC in Cash App, send it to you' },
  { rail: 'paypal_ff', name: 'PayPal Friends & Family', short: 'Direct PayPal transfer' },
  { rail: 'western_union', name: 'Western Union', short: 'Cash pickup, MTCN' },
  { rail: 'bank_transfer', name: 'Bank Transfer', short: 'Local IBAN / RIB / SEPA' },
  { rail: 'amazon_giftcard', name: 'Amazon eGift Card', short: 'Gift card codes' },
  { rail: 'manual', name: 'Manual methods ×5', short: 'M-Pesa, PIX, mobile money' },
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
    title: '17 payment methods',
    body: 'Cards, PayPal, Binance Pay, Revolut, UPI, Cash App, WhatsApp, crypto, bank transfer, Western Union and more — plus five manual methods you define yourself.',
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
  {
    icon: 'Shield',
    title: 'Automatic crypto verification',
    body: 'The buyer pastes their transaction ID; MethodePay checks it on the blockchain (your wallet, the right amount, enough confirmations, never reused) and marks the order paid.',
  },
  {
    icon: 'Mail',
    title: 'Abandoned checkout recovery',
    body: 'Buyers who left without paying get one reminder with their order ready to finish and an optional discount. See exactly how much revenue came back.',
  },
  {
    icon: 'Users',
    title: 'Customer portal & invoices',
    body: 'Every buyer gets a page with their orders, downloads, renewals and printable receipts. Far fewer “where is my order?” messages.',
  },
  {
    icon: 'Chart',
    title: 'Financial reports',
    body: 'Gross, refunds, net, average order and checkout conversion for any period, compared with the one before. Broken down by method, product and country, and exported to CSV.',
  },
  {
    icon: 'Radar',
    title: 'Fraud screening',
    body: 'Every checkout is scored before the order exists: throwaway emails, bursts from one IP, country mismatches, reused bank references. Flag it for review or refuse it outright.',
  },
  {
    icon: 'Pulse',
    title: 'Provider monitoring & webhooks',
    body: 'Know the moment Stripe rejects your key or a rail stops opening, before buyers tell you. Signed webhooks retry for a day until your server answers.',
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
        title: 'Order bump & upsell',
        body: 'Offer a one-click add-on right above the Pay button, and a second product after purchase. Prices are set by you and checked on the server, never by the browser.',
      },
      {
        title: 'Scan to continue on the phone',
        body: 'On a laptop, WhatsApp Pay shows a QR code so the buyer can finish in WhatsApp on their phone, with the order already written.',
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
        title: 'Automatic crypto verification',
        body: 'Transaction IDs are looked up on Bitcoin, Litecoin, Ethereum, BNB Chain, Polygon and TRON (USDT and USDC included). Right address, right amount, sent after the order, enough confirmations, never used twice. Then the order is paid and delivered, or flagged for you.',
      },
      {
        title: 'Abandoned checkout recovery',
        body: 'Unpaid checkouts get one reminder email after the delay you choose, linking back with the buyer’s details and your discount code already applied.',
      },
      {
        title: 'Webhooks that do not get lost',
        body: 'Signed like Stripe’s, retried six times over a day when your server is down, with a full delivery log, the reply your server gave, a test button and one-click resend.',
      },
      {
        title: 'Provider monitoring',
        body: 'Each switched-on rail is checked with your own credentials and against real checkouts from the last 24 hours. An email or Telegram message when one goes down, and another when it is back.',
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
      {
        title: 'Invoices and receipts',
        body: 'A clean A4 invoice for every order, a receipt once it is paid, with your business name, address and tax ID. Saved as PDF in one click, in any language.',
      },
      {
        title: 'Customer portal',
        body: 'Buyers sign in with their order reference and email to see every order, download what they bought, renew subscriptions and get receipts.',
      },
      {
        title: 'Confirmation channels you choose',
        body: 'Let buyers confirm a manual payment by WhatsApp (with QR), by email, or with a transaction ID. Any combination, every message carrying the order reference.',
      },
      {
        title: 'Financial reports',
        body: 'Revenue counted on the day the money arrived, refunds on the day they were made. Seven ready-made periods or your own dates, a daily chart, and a CSV your accountant can open.',
      },
      {
        title: 'Fraud screening and blocklists',
        body: 'An explainable score on every order, built only from your own store history. Block an email, a whole domain, an IP or a country, and see every checkout that was refused.',
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
  { row: 'Order bump & upsell', starter: false, professional: true, agency: true },
  { row: 'Automatic crypto verification', starter: true, professional: true, agency: true },
  { row: 'Abandoned checkout recovery', starter: true, professional: true, agency: true },
  { row: 'Invoices & customer portal', starter: true, professional: true, agency: true },
  { row: 'Financial reports & CSV export', starter: true, professional: true, agency: true },
  { row: 'Fraud screening & blocklists', starter: true, professional: true, agency: true },
  { row: 'Provider monitoring & alerts', starter: true, professional: true, agency: true },
  { row: 'Webhooks with automatic retries', starter: false, professional: true, agency: true },
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
    q: 'How does MethodePay protect me from fraud on manual payments?',
    a: 'Every checkout is scored before the order is created, from your own store history only: throwaway email addresses, many checkouts from one email or IP in an hour, a billing country that differs from where the buyer connects, unusually large orders, and a bank or transfer reference that was already used on another order. Risky orders are flagged with the reasons in plain words, or refused if you prefer, and you can block an email, a domain, an IP or a whole country in one click.',
  },
  {
    q: 'Can MethodePay confirm crypto payments by itself?',
    a: 'Yes. When a buyer submits their transaction ID, MethodePay looks it up on the blockchain and checks it paid your wallet, in the right coin, enough to cover the order, after the order was placed, with enough confirmations, and that it was never used for another order. Verified orders are marked paid and delivered automatically, or flagged for you to confirm if you prefer. Bitcoin, Litecoin, Ethereum, BNB Chain, Polygon and TRON are supported, including USDT and USDC.',
  },
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
