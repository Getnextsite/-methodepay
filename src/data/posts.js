/**
 * Blog posts.
 *
 * Written against searches that come just before somebody buys: "stripe
 * declined my business", "accept payments without a merchant account",
 * "how to take payment in a country Stripe does not serve". A post that
 * answers the question honestly, including when the answer is not our
 * product, earns the link that a thin keyword page never will.
 *
 * Body blocks: p, h2, h3, ul, ol, quote, note, table.
 */

export const posts = [
  {
    slug: 'stripe-declined-my-business',
    title: 'Stripe declined your business. What now?',
    description:
      'Why card processors refuse legitimate merchants, what the decline actually means, and the payment rails that stay open when the big processors close.',
    date: '2026-11-19',
    updated: '2026-11-19',
    readingTime: 8,
    tags: ['Getting paid', 'Card processing'],
    excerpt:
      'A decline is a risk decision, not a verdict on your business. Here is what drives it and what you can still use.',
    body: [
      { type: 'p', text: 'You filled in the form, you uploaded the documents, and a week later an email arrived saying your business falls outside what they can support. No reason, no appeal, no human. If it helps: this happens to a lot of legitimate businesses, and it is almost never a judgement about whether you are honest.' },
      { type: 'h2', text: 'What a decline actually means' },
      { type: 'p', text: 'Card processors are underwriting risk, not assessing character. They are asking one question: if this merchant disappears tomorrow with money taken for goods not delivered, who pays the chargebacks? The answer is the processor. So they model the probability and refuse anything above a threshold.' },
      { type: 'p', text: 'Things that push you over that threshold have nothing to do with whether you are a good business:' },
      { type: 'ul', items: [
        'Selling digital goods that are delivered instantly and cannot be recovered.',
        'A high average order value with no trading history.',
        'Buyers concentrated in countries with high fraud rates, even if you are not in one.',
        'An industry with a historically high dispute rate — gaming, subscriptions, coaching, anything that looks like it could be a trial trap.',
        'Being registered somewhere the processor does not have an acquiring relationship.',
      ] },
      { type: 'h2', text: 'The things that do not work' },
      { type: 'p', text: 'Before the useful part, the three things people try first and regret.' },
      { type: 'h3', text: 'Applying again with different wording' },
      { type: 'p', text: 'Underwriting keeps a record. Reapplying with the same entity and a softened description usually gets a faster no, and sometimes gets the related accounts closed too.' },
      { type: 'h3', text: 'Using someone else account' },
      { type: 'p', text: 'This is the one that ends worst. The account holder carries the chargebacks, the processor treats it as misrepresentation, and when it unwinds it takes their account with it.' },
      { type: 'h3', text: 'Asking buyers to send PayPal Friends and Family' },
      { type: 'p', text: 'It breaches PayPal terms for commercial payments, it strips your buyer of any protection, and PayPal does reverse and limit over it. We support a manual PayPal rail and we still will not tell you to ask for Friends and Family.' },
      { type: 'h2', text: 'What does work: stop needing approval' },
      { type: 'p', text: 'Every rail that can decline you has one thing in common — somebody is taking settlement risk on your behalf. Rails where nobody takes that risk cannot refuse you, because there is nothing to refuse.' },
      { type: 'h3', text: 'Crypto straight to your own wallet' },
      { type: 'p', text: 'No account, no application, no underwriting. The buyer sends to an address you control. It is irreversible, which means no chargebacks ever, and it requires your buyer to already hold crypto.' },
      { type: 'h3', text: 'Card payments that settle to crypto' },
      { type: 'p', text: 'On-ramps let the buyer pay by card while you receive crypto at your own address. The on-ramp carries the card risk, not you. In practice this is the closest thing to card acceptance without a merchant account — a Bitcoin address is the only requirement.' },
      { type: 'h3', text: 'Bank transfer' },
      { type: 'p', text: 'Unglamorous and slow, and the fee on a large invoice is a rounding error next to card fees. Business buyers expect it. You match the reference against your statement and mark the order paid.' },
      { type: 'h3', text: 'The conversation' },
      { type: 'p', text: 'In a lot of markets the highest-converting checkout is a WhatsApp thread. The buyer taps one button, lands in a conversation that already has their order reference in it, and you agree payment like humans.' },
      { type: 'note', text: 'None of these are as convenient as a card button that settles itself. They are, however, available to you right now, and a slow payment you receive beats an instant one you are refused.' },
      { type: 'h2', text: 'The honest trade-off' },
      { type: 'p', text: 'Rails that settle themselves cost you approval and chargeback risk. Rails nobody can decline cost you manual work — somebody has to look at a transaction and confirm it. That is a real cost and you should price it in.' },
      { type: 'p', text: 'The way most merchants in this position end up working is to run several at once: whatever automatic rail they can get, plus two or three manual ones that catch the buyers the first one turns away. That is what MethodePay is built to do — eighteen rails, switched on individually, all on one checkout.' },
      { type: 'cta', text: 'See every rail, what it needs and what it costs you', href: '/payments' },
    ],
  },

  {
    slug: 'accept-payments-without-merchant-account',
    title: 'How to accept payments online without a merchant account',
    description:
      'Four ways to take money on a website with no merchant account, no business registration and no underwriting — and what each one actually costs you.',
    date: '2026-11-17',
    updated: '2026-11-19',
    readingTime: 7,
    tags: ['Getting paid', 'Guides'],
    excerpt:
      'A merchant account is one way to get paid, not the only one. Here are four that need nothing but an address or a phone number.',
    body: [
      { type: 'p', text: 'A merchant account exists so a bank can advance you money before a card settles, and claw it back if the buyer disputes. If you do not need that advance, you do not strictly need the account — you need a way for money to reach you.' },
      { type: 'h2', text: '1. Crypto to a wallet you control' },
      { type: 'p', text: 'What you need: one receive address per coin and network. That is the whole setup.' },
      { type: 'p', text: 'The buyer sees the address, a QR code and a reference. They send, they paste the transaction ID, you check the chain. Irreversible in both directions — nobody can chargeback you, and you cannot undo a mistake.' },
      { type: 'note', text: 'Use a self-custodial wallet, not an exchange deposit address. Exchanges read third-party deposits as merchant activity and freeze accounts over it. This is the single most common way people lose money doing this.' },
      { type: 'h2', text: '2. An on-ramp, so buyers can still use a card' },
      { type: 'p', text: 'The hard part of dropping card acceptance is that most buyers only have a card. On-ramps solve this: the buyer pays by card or a local method, the on-ramp handles the regulated bit, and you receive crypto.' },
      { type: 'p', text: 'You need a wallet address. The buyer may face an identity check, which is worth warning them about before they start rather than mid-payment, because that is where people abandon.' },
      { type: 'h2', text: '3. Bank transfer with a reference' },
      { type: 'p', text: 'Publish your account details and give every order a unique reference. The buyer quotes it, you match it against your statement.' },
      { type: 'p', text: 'One to three days, almost no fee on large amounts, no chargebacks. For B2B invoices this is often what the buyer wanted anyway.' },
      { type: 'h2', text: '4. Chat' },
      { type: 'p', text: 'In large parts of the world, selling happens in WhatsApp. The buyer taps a button on your page, an order is recorded, and the thread opens with the reference and amount already in it. You settle however you both prefer.' },
      { type: 'p', text: 'It does not scale past a certain volume and it converts better than anything else at low volume. Both are true.' },
      { type: 'h2', text: 'What it costs you' },
      { type: 'table', head: ['Rail', 'Setup', 'Settles', 'Your work per order'], rows: [
        ['Direct crypto', 'An address', 'Minutes', 'Check the chain'],
        ['On-ramp', 'An address', 'Minutes', 'None, or one check'],
        ['Bank transfer', 'Account details', '1–3 days', 'Match a reference'],
        ['WhatsApp', 'A phone number', 'Whenever you agree', 'A conversation'],
      ] },
      { type: 'p', text: 'The pattern worth noticing: the setup column is almost empty. What you are trading is ongoing manual effort for the absence of anyone who can refuse you.' },
      { type: 'cta', text: 'Compare all eighteen rails side by side', href: '/payments' },
    ],
  },

  {
    slug: 'chargebacks-and-irreversible-rails',
    title: 'Chargebacks, and the rails that do not have them',
    description:
      'How a chargeback actually works, what it costs beyond the refund, and why irreversible payment rails change the economics of selling online.',
    date: '2026-11-12',
    readingTime: 6,
    tags: ['Risk', 'Card processing'],
    excerpt:
      'The refund is the small part. Here is what a chargeback really costs, and what changes when a payment cannot be reversed.',
    body: [
      { type: 'p', text: 'A chargeback is not a refund. A refund is you deciding to give money back. A chargeback is the buyer telling their bank the charge was wrong, and the bank taking it from your processor, who takes it from you.' },
      { type: 'h2', text: 'What it costs' },
      { type: 'ul', items: [
        'The money, reversed.',
        'A fee, typically fifteen to twenty-five dollars, win or lose.',
        'Your time assembling evidence, usually against a deadline.',
        'A mark on your chargeback ratio.',
      ] },
      { type: 'p', text: 'That last one is what actually hurts. Cross roughly one percent and processors place you in a monitoring programme; stay there and they close you. The fee is annoying; the ratio is existential.' },
      { type: 'h2', text: 'Friendly fraud' },
      { type: 'p', text: 'A large share of disputes are not fraud at all. The buyer forgot, or did not recognise the name on the statement, or found it easier to call the bank than to email you. You lose those as often as not, because the system is designed to favour the cardholder.' },
      { type: 'h2', text: 'Rails that cannot be reversed' },
      { type: 'p', text: 'Crypto, cash over a counter, and a completed bank transfer have no mechanism for the payer to claw funds back unilaterally. There is no dispute button because there is no intermediary holding the money.' },
      { type: 'p', text: 'This changes the economics in three ways. Your chargeback ratio stops being a thing you manage. You can sell to countries a card processor treats as high risk. And you can accept orders large enough that the dispute risk would have made them not worth taking.' },
      { type: 'h2', text: 'The cost side' },
      { type: 'p', text: 'Irreversibility cuts both ways. Your buyer has no recourse if you do not deliver, which means they are trusting you more than a card buyer has to. Earn it: say clearly what happens after payment, respond quickly, and publish a refund policy you actually honour — a voluntary refund on an irreversible rail is a new payment you choose to send.' },
      { type: 'p', text: 'And somebody has to verify each payment. That is the trade: no disputes, but no automation either, unless you pair it with a rail that settles itself.' },
      { type: 'cta', text: 'See which rails are reversible and which are not', href: '/payments' },
    ],
  },

  {
    slug: 'accept-crypto-payments-safely',
    title: 'Accepting crypto payments without losing money',
    description:
      'The practical mistakes that cost merchants real money when taking crypto — wrong networks, exchange deposit addresses, stale quotes — and how to avoid each.',
    date: '2026-11-05',
    readingTime: 7,
    tags: ['Crypto', 'Guides'],
    excerpt:
      'Taking crypto is easy. Taking it without losing some is a handful of specific habits.',
    body: [
      { type: 'p', text: 'Accepting crypto is genuinely simple: you publish an address, somebody sends to it. The complications are all in the details, and every one of them below has cost somebody their money.' },
      { type: 'h2', text: 'The network is part of the address' },
      { type: 'p', text: 'USDT on TRC20 and USDT on ERC20 are different tokens on different chains. Same name, different addresses, and a transfer sent to the wrong one is usually unrecoverable.' },
      { type: 'p', text: 'Always publish the coin and the network together, and store one address per pair rather than assuming a buyer will pick correctly.' },
      { type: 'h2', text: 'Never publish an exchange deposit address' },
      { type: 'p', text: 'This is the big one. Deposit addresses at an exchange are intended for your own funds. When money arrives from strangers, compliance reads it as operating a business through a personal account. Accounts get frozen and unfreezing means proving where every payment came from.' },
      { type: 'p', text: 'Use a self-custodial wallet for receiving and move funds to an exchange yourself if you need to convert.' },
      { type: 'h2', text: 'Quote for a window, not forever' },
      { type: 'p', text: 'If you price in dollars and settle in Bitcoin, the amount owed moves between the order and the transfer. Quote a rate that holds for a defined number of minutes and say so on the page. Fifteen is a reasonable default.' },
      { type: 'h2', text: 'Give every order a reference' },
      { type: 'p', text: 'Two buyers sending the same amount to the same address in the same hour is indistinguishable on-chain unless you asked each of them to tell you their transaction ID. Collect it, and tie it to the order.' },
      { type: 'h2', text: 'Decide what counts as paid' },
      { type: 'p', text: 'Seen in the mempool is not paid. Decide how many confirmations you need, write it down, and apply it consistently — more for large amounts. Then verify on a block explorer before releasing anything.' },
      { type: 'h2', text: 'What good looks like' },
      { type: 'ol', items: [
        'One address per coin and network, in a wallet you control.',
        'A QR code generated from that address so nobody mistypes it.',
        'A quote with a visible expiry.',
        'A unique reference, and a field for the transaction ID.',
        'A confirmation rule you follow every time.',
      ] },
      { type: 'p', text: 'MethodePay does the middle three for you: the QR is generated server-side from the address you entered, the quote window is configurable, and the reference is on every order.' },
      { type: 'cta', text: 'Read the direct crypto guide', href: '/payments/crypto' },
    ],
  },

  {
    slug: 'whatsapp-as-a-checkout',
    title: 'WhatsApp is a checkout, if you treat it like one',
    description:
      'Why chat converts better than a card form in many markets, and how to run it without losing orders in an inbox.',
    date: '2026-10-28',
    readingTime: 5,
    tags: ['Conversion', 'Chat'],
    excerpt:
      'Chat beats a card form in a lot of places. The failure mode is not conversion — it is record-keeping.',
    body: [
      { type: 'p', text: 'In large parts of Africa, South Asia, the Middle East and Latin America, buying something from a small business means messaging them. Not because people cannot use a card form, but because the conversation answers questions a form cannot.' },
      { type: 'h2', text: 'Why it converts' },
      { type: 'ul', items: [
        'The buyer can ask whether it will work for them before paying.',
        'Nobody is declined, because no processor is involved.',
        'Trust is personal: they are talking to a human, not a checkout.',
        'Payment can be whatever both of you already use.',
      ] },
      { type: 'h2', text: 'Why it goes wrong' },
      { type: 'p', text: 'The failure is never conversion. It is that nothing is written down. An order lives in a thread, the thread scrolls, and a week later you cannot say who paid, what for, or whether you delivered.' },
      { type: 'h2', text: 'Make the chat produce a record' },
      { type: 'p', text: 'The fix is to create the order before the conversation, not after. The buyer taps the button on your page; an order is recorded with a reference, product and amount; then the thread opens already containing those details.' },
      { type: 'p', text: 'Two things follow. You have a list of orders including the ones that never became a conversation — abandoned carts become visible instead of invisible. And when you do agree payment, you mark that order paid, which fires delivery and the receipt.' },
      { type: 'h2', text: 'Prefill the message' },
      { type: 'p', text: 'Open the thread with the order reference, product name and amount already in it. The buyer does not have to explain themselves and you do not have to ask. It sounds small; it is most of the friction.' },
      { type: 'h2', text: 'Know when to stop' },
      { type: 'p', text: 'Chat does not scale indefinitely. Past a few dozen orders a day it needs a person whose job it is. The usual path is to keep it as the rail that rescues sales an automatic one lost — the buyer who was declined, or who wants to ask one question first.' },
      { type: 'cta', text: 'Read the WhatsApp guide', href: '/payments/whatsapp' },
    ],
  },
]

export function post(slug) {
  return posts.find((p) => p.slug === slug) ?? null
}

export const sortedPosts = [...posts].sort((a, b) => (a.date < b.date ? 1 : -1))
