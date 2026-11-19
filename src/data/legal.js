/**
 * Legal pages.
 *
 * These are drafts written against what MethodePay actually does — the rails
 * it offers, the data it stores, the fact that it is not in the flow of funds.
 * They are specific rather than generic, which makes them useful to a reader
 * and to a search engine. They are not legal advice: anything in {curly
 * braces} is a placeholder that must be filled in, and the set should be read
 * by a lawyer in your jurisdiction before you take money from strangers.
 */

export const COMPANY = {
  name: '{Your registered company name}',
  address: '{Registered address}',
  country: '{Country of incorporation}',
  email: 'support@methodepay.com',
  privacyEmail: 'privacy@methodepay.com',
}

const UPDATED = '2026-11-19'

export const legalPages = [
  {
    slug: 'terms',
    title: 'Terms of Service',
    description:
      'The agreement between MethodePay and the merchants who use it: what the service does, what it does not do, plan terms, acceptable use and liability.',
    updated: UPDATED,
    summary:
      'MethodePay gives you hosted checkout pages and a dashboard. You keep your own processor accounts and your own wallets. We never hold your buyers money.',
    sections: [
      {
        h: 'Who this agreement is between',
        body: [
          `These terms are between ${COMPANY.name} ("MethodePay", "we") and the person or company that creates an account ("you", "the merchant"). By creating an account you accept them.`,
          'They cover the hosted MethodePay platform: the dashboard, the checkout pages we render on your behalf, and the API.',
        ],
      },
      {
        h: 'What the service is',
        body: [
          'MethodePay is software that renders checkout pages, records orders and tells you when a buyer says they have paid. It supports payment rails of three kinds: rails that settle themselves through your own processor account, on-ramp rails that pay out to a crypto address you control, and manual rails where you confirm each payment by hand.',
          'MethodePay is not a payment processor, a money transmitter, an escrow service or a merchant of record. We do not hold, receive, transmit or control your buyers funds at any point. Money moves between your buyer and your own processor, wallet or bank account.',
          'Because of this, any dispute about a payment is between you and your buyer, and any dispute about settlement is between you and your processor.',
        ],
      },
      {
        h: 'Your account',
        body: [
          'You are responsible for everything done under your account, for keeping your password and API keys secret, and for the accuracy of the payout details you enter. A payout address typed incorrectly sends your money somewhere we cannot retrieve it from.',
          'You must be old enough to enter a contract in your country, and you must not be barred from receiving payments under any sanctions regime that applies to you.',
        ],
      },
      {
        h: 'What you may not sell',
        body: [
          'You may not use MethodePay to sell anything illegal where you or your buyer are, nor to take payment for: stolen goods or credentials, weapons, controlled drugs, child sexual abuse material, malware or hacking services, forged documents, or anything that infringes someone else copyright.',
          'You may not use it to run a scheme designed to take money without delivering, to launder funds, or to evade a processor that has already declined you for any of the above.',
          'We may suspend an account we reasonably believe is doing any of these. Suspension stops new checkouts; it does not touch money that has already settled to your own accounts, because we never had it.',
        ],
      },
      {
        h: 'Plans, billing and renewal',
        body: [
          'Paid plans are billed in advance, monthly or annually, through our billing provider. Prices are shown before you pay and include any tax our provider is required to collect.',
          'A plan renews automatically until you cancel. Cancelling stops the next renewal; it does not refund the period you are in, except as set out in the refund policy.',
          'If a renewal fails, your account falls back to the free tier rather than being locked. Your data and your existing checkout links keep working on the self-serve rails. We think a lapsed card should be a nudge, not a hostage situation.',
        ],
      },
      {
        h: 'Availability',
        body: [
          'We aim to keep the service up and we do not promise it will never be down. We may change, add or remove features. If we remove something you depend on we will tell you by email before it happens where we reasonably can.',
          'Scheduled maintenance that will take checkout offline is announced in advance.',
        ],
      },
      {
        h: 'Liability',
        body: [
          'To the extent the law where you are allows it, MethodePay is provided as is, and our total liability to you for any claim is limited to the amount you paid us in the twelve months before the claim.',
          'We are not liable for money you lose to a buyer who does not pay, to a processor that freezes your account, to a crypto transfer sent to the wrong address, or to a chargeback. Those are the risks of taking payments, and the rails you choose carry different amounts of that risk; the guides on this site say which.',
          'Nothing here limits liability that cannot be limited by law, such as for fraud.',
        ],
      },
      {
        h: 'Ending the agreement',
        body: [
          'You can close your account at any time from the dashboard. We can end this agreement with thirty days notice, or immediately if you breach the acceptable-use section.',
          'When an account closes you can export your orders and customer records first. We then delete or anonymise them on the schedule in the privacy policy.',
        ],
      },
      {
        h: 'Changes and governing law',
        body: [
          'We may update these terms. Material changes are emailed to account owners at least fourteen days before they take effect, and the date at the top of this page always reflects the current version.',
          `This agreement is governed by the law of ${COMPANY.country}, and the courts there have jurisdiction.`,
        ],
      },
    ],
  },

  {
    slug: 'privacy',
    title: 'Privacy Policy',
    description:
      'What personal data MethodePay collects from merchants and their buyers, why, how long it is kept, who it is shared with, and how to exercise your rights.',
    updated: UPDATED,
    summary:
      'We hold merchant account details and buyer order details. We never see card numbers. Merchant secrets and buyer gift-card codes are encrypted at rest.',
    sections: [
      {
        h: 'Two kinds of people in this policy',
        body: [
          'MethodePay handles data about merchants, who sign up and use the dashboard, and about buyers, who reach a merchant checkout page.',
          'For merchant data we are the controller. For buyer data we are a processor acting for the merchant, who is the controller: they decide what to collect and why, and this policy describes what we do with it on their behalf.',
        ],
      },
      {
        h: 'What we collect from merchants',
        body: [
          'Account: name, email, password hash, store name and the team members you invite.',
          'Configuration: your payout wallet addresses, bank details, WhatsApp number and the API credentials for any processor you connect.',
          'Billing: the plan you are on and the identifiers our billing provider returns. We never see or store your card number.',
          'Technical: IP address, browser and timestamps for sessions and audit logging.',
        ],
      },
      {
        h: 'What we collect from buyers',
        body: [
          'Whatever the merchant has configured their checkout to ask for. Always a name and email; optionally a phone number, address, country or custom fields they have added.',
          'Order records: what was bought, the amount, the rail chosen, the order reference, the status and its history.',
          'Where a rail requires it, a payment proof such as a transaction ID, an MTCN, or a gift-card code.',
          'We do not receive card numbers. Card details are entered on the processor own page, never on ours.',
        ],
      },
      {
        h: 'How it is protected',
        body: [
          'Merchant processor secrets, Telegram tokens, delivery codes and buyer-submitted gift-card codes are encrypted at rest with AES-256-GCM. Passwords are hashed with bcrypt. API keys are stored only as hashes and shown once.',
          'A gift-card code is a bearer credential: it is excluded from every email and alert, revealed only by an explicit action that is written to the audit trail, and erased when the order is marked paid.',
          'Every record is scoped to one merchant account, and that scope is resolved from the session rather than from anything in the request.',
        ],
      },
      {
        h: 'Who we share it with',
        body: [
          'Our infrastructure providers (hosting, database, email delivery) under contract, only to run the service.',
          'The payment provider a buyer chooses, which receives what it needs to process that payment.',
          'Our billing provider, for merchant subscriptions.',
          'Anyone we are legally required to disclose to. We do not sell personal data and we do not use buyer data for our own marketing.',
        ],
      },
      {
        h: 'How long it is kept',
        body: [
          'Merchant account data for as long as the account is open, then up to ninety days.',
          'Order and transaction records for seven years where tax or accounting law requires it, in a reduced form.',
          'Gift-card codes until the order is marked paid, then erased.',
          'Session and audit logs for twelve months.',
        ],
      },
      {
        h: 'Your rights',
        body: [
          'Depending on where you live you may have the right to access, correct, delete or export your data, to object to processing, and to complain to a data protection authority.',
          `Merchants can do most of this from the dashboard. For anything else, or for a buyer request, write to ${COMPANY.privacyEmail}. A buyer request about an order is passed to the merchant, who is the controller for it.`,
        ],
      },
      {
        h: 'International transfers',
        body: [
          'Our infrastructure may process data outside your country. Where that happens we rely on the safeguards available to us, such as standard contractual clauses.',
        ],
      },
    ],
  },

  {
    slug: 'cookies',
    title: 'Cookie Policy',
    description:
      'The cookies MethodePay sets, what each one does, how long it lasts, and how to change your choice at any time.',
    updated: UPDATED,
    summary:
      'We set one cookie to keep you signed in and one to remember your cookie choice. Nothing else runs unless you say yes.',
    sections: [
      {
        h: 'The short version',
        body: [
          'MethodePay runs no advertising cookies and no cross-site trackers. The only cookies that are set without asking are the ones without which the site cannot work.',
          'Anything optional stays off until you accept it, and you can change your mind at any time from the link in the footer.',
        ],
      },
      {
        h: 'Strictly necessary',
        table: [
          ['mp_session', 'Keeps you signed in to the dashboard.', '30 days'],
          ['mp_account', 'Remembers which store you are working on when you belong to several.', '1 year'],
          ['mp-cookie-choice', 'Remembers whether you accepted or declined the optional cookies, so we stop asking.', '6 months'],
          ['mp-theme', 'Remembers light or dark mode. Stored in your browser, never sent to us.', 'Until cleared'],
        ],
        body: [
          'These cannot be switched off, because switching them off means you cannot sign in or we have to ask about cookies on every page.',
        ],
      },
      {
        h: 'Analytics, only if you accept',
        body: [
          'If you accept, we may set a privacy-focused analytics cookie to count page views and see which pages lead to a sign-up. It does not follow you to other websites and is not used to build a profile.',
          'If you decline, it is never set, and nothing on this site changes.',
        ],
      },
      {
        h: 'Cookies on a merchant checkout page',
        body: [
          'A checkout page rendered by MethodePay for a merchant sets no tracking cookies at all. The payment provider you choose may set its own once you reach its page, governed by its policy, not this one.',
        ],
      },
      {
        h: 'Changing your mind',
        body: [
          'Use the "Cookie settings" link in the footer of any page. You can also delete cookies in your browser settings, which resets the question.',
        ],
      },
    ],
  },

  {
    slug: 'refunds',
    title: 'Refund Policy',
    description:
      'When MethodePay refunds a subscription, how to ask, and how refunds work for payments your own buyers made to you.',
    updated: UPDATED,
    summary:
      'Fourteen days, no argument, on your first paid period. Refunds to your own buyers are yours to make — we are not in the flow of funds.',
    sections: [
      {
        h: 'Your subscription to MethodePay',
        body: [
          'If MethodePay does not do what you expected, write to us within fourteen days of your first payment on a paid plan and we refund it in full. You do not have to justify it.',
          'After fourteen days, and on renewals, we do not refund the period you are in by default. Cancel and you simply are not billed again. If something on our side broke and you could not take payments, tell us — we would rather sort that out than keep the money.',
          'Annual plans cancelled mid-term are not refunded pro rata unless the law where you live says otherwise.',
        ],
      },
      {
        h: 'How to ask',
        body: [
          `Email ${COMPANY.email} from the address on the account, say which store it is, and that you want a refund. We action it within five working days and the money takes as long as your bank takes after that.`,
        ],
      },
      {
        h: 'Refunds to your buyers',
        body: [
          'These are not ours to give. MethodePay is never in the flow of funds: your buyer paid your processor, your wallet or your bank, so the refund comes from there.',
          'What MethodePay does is record it. Marking an order refunded in the dashboard updates the order, writes the reason to the audit trail and notifies the buyer. On rails that settle through your own Stripe or PayPal account, refunding there sends us a webhook and the order updates by itself.',
          'Crypto and cash rails cannot be reversed by anybody. If you refund one, you are making a new payment, and you should keep your own record of it.',
        ],
      },
      {
        h: 'Chargebacks',
        body: [
          'A chargeback on a card rail is between you, your buyer and your processor. MethodePay keeps the order record, the status history and any payment proof the buyer submitted, which is usually what the evidence form asks for. You can export all of it from the order page.',
        ],
      },
    ],
  },
]

export function legalPage(slug) {
  return legalPages.find((p) => p.slug === slug) ?? null
}
