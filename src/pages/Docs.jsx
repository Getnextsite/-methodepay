import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useSeo from '../lib/useSeo.js'
import Reveal from '../components/Reveal.jsx'
import Glow from '../components/Glow.jsx'
import CtaBand from '../components/CtaBand.jsx'
import { ArrowRight, Book, Check } from '../components/Icons.jsx'

const nav = [
  {
    title: 'Getting started',
    items: [
      { id: 'install', label: 'Install & activate' },
      { id: 'licence', label: 'Activate your licence' },
      { id: 'first-checkout', label: 'Your first checkout' },
      { id: 'pay-links', label: 'Direct payment links' },
    ],
  },
  {
    title: 'Payment methods',
    items: [
      { id: 'stripe', label: 'Stripe' },
      { id: 'paypal', label: 'PayPal' },
      { id: 'alchemy', label: 'Alchemy Pay' },
      { id: 'whatsapp', label: 'WhatsApp Pay' },
      { id: 'crypto', label: 'Direct Crypto' },
      { id: 'onrampay', label: 'OnRamPay' },
      { id: 'western-union', label: 'Western Union' },
      { id: 'bank', label: 'Bank Transfer' },
      { id: 'manual', label: 'Manual methods' },
    ],
  },
  {
    title: 'Automation',
    items: [
      { id: 'trial-codes', label: 'Trial-code delivery' },
      { id: 'telegram', label: 'Telegram alerts' },
    ],
  },
  {
    title: 'Reference',
    items: [
      { id: 'shortcodes', label: 'Shortcodes' },
      { id: 'troubleshooting', label: 'Troubleshooting' },
    ],
  },
]

const allIds = nav.flatMap((g) => g.items.map((i) => i.id))

function Code({ children }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-xl border border-white/[0.08] bg-black/40 p-4 text-[12.5px] leading-relaxed text-zinc-300">
      <code className="font-mono">{children}</code>
    </pre>
  )
}

function Doc({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-white/[0.06] py-9 first:border-0">
      <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-zinc-400">{children}</div>
    </section>
  )
}

function Steps({ items }) {
  return (
    <ol className="mt-3 space-y-2.5">
      {items.map((s, i) => (
        <li key={s} className="flex gap-3">
          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-violet-500/15 font-mono text-[10px] font-bold text-violet-300">
            {i + 1}
          </span>
          <span className="text-[14px] leading-relaxed text-zinc-400">{s}</span>
        </li>
      ))}
    </ol>
  )
}

function Note({ children, tone = 'violet' }) {
  const tones = {
    violet: 'border-violet-500/25 bg-violet-500/[0.07]',
    success: 'border-success/25 bg-success/[0.07]',
  }
  return (
    <div className={`mt-4 rounded-xl border p-4 text-[13px] leading-relaxed text-zinc-300 ${tones[tone]}`}>
      {children}
    </div>
  )
}

/** Highlights the sidebar entry for the section currently on screen. */
function useScrollSpy(ids) {
  const [active, setActive] = useState(ids[0])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const observed = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean)

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    )
    observed.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [ids])

  return active
}

export default function Docs() {
  const active = useScrollSpy(allIds)

  useSeo({
    title: 'Documentation',
    description:
      'MethodePay docs: install the plugin, activate your licence, build your first checkout and set up every payment method — Stripe, PayPal, Alchemy Pay, WhatsApp Pay, crypto, Western Union, bank transfer and manual methods.',
    path: '/docs',
  })

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div aria-hidden="true" className="absolute inset-0 grid-lines" />
        <Glow className="-top-40 left-1/3" size={520} />
        <div className="container-page relative py-14 sm:py-16">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">
              <Book width={14} height={14} className="text-violet-400" />
              Documentation
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tightest text-white sm:text-5xl">
              Set up in an afternoon.
            </h1>
            <p className="lead mt-4">
              Install, licence, one checkout, then whichever payment rails you need. Every
              method has its own short guide — no method takes more than ten minutes.
            </p>
          </Reveal>
        </div>
      </section>

      <div className="container-page grid gap-10 py-12 lg:grid-cols-[220px_1fr] lg:gap-14">
        {/* Sidebar */}
        <nav aria-label="Documentation" className="lg:sticky lg:top-24 lg:h-max lg:self-start">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500 lg:hidden">
            On this page
          </p>
          <div className="max-h-[60vh] overflow-y-auto pr-1 lg:max-h-none lg:overflow-visible">
            {nav.map((group) => (
              <div key={group.title} className="mb-6">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                  {group.title}
                </p>
                <ul className="space-y-0.5 border-l border-white/[0.08]">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        aria-current={active === item.id ? 'true' : undefined}
                        className={`-ml-px block border-l py-1.5 pl-3 text-[13px] transition ${
                          active === item.id
                            ? 'border-violet-500 font-semibold text-white'
                            : 'border-transparent text-zinc-400 hover:border-white/25 hover:text-white'
                        }`}
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="min-w-0 max-w-3xl">
          <Doc id="install" title="Install & activate">
            <p>
              MethodePay ships as a standard WordPress plugin ZIP. There is no WooCommerce
              prerequisite and no external account to create first.
            </p>
            <Steps
              items={[
                'In wp-admin, go to Plugins → Add New → Upload Plugin and choose methodepay.zip.',
                'Click Install Now, then Activate.',
                'A new MethodePay menu appears in the sidebar, below Settings.',
              ]}
            />
            <Note tone="success">
              Requirements: WordPress 5.8+, PHP 7.4+, and HTTPS on the checkout page. Any theme
              and any page builder will do.
            </Note>
          </Doc>

          <Doc id="licence" title="Activate your licence">
            <p>
              Your licence key arrives in the purchase email and is also listed in your account
              area. Activating unlocks updates and the features in your tier.
            </p>
            <Steps
              items={[
                'Go to MethodePay → Licence.',
                'Paste the key and press Activate.',
                'The panel shows your plan, your site count and the date updates run until.',
              ]}
            />
            <p>
              Staging and local copies do not consume an activation, so you can develop against
              a clone without burning a site slot.
            </p>
          </Doc>

          <Doc id="first-checkout" title="Your first checkout">
            <Steps
              items={[
                'Go to MethodePay → Products and press Add Product. Give it a name, a price and a currency.',
                'Open MethodePay → Methods and switch on at least one payment method.',
                'Open MethodePay → Checkout and pick one of the six designs.',
                'Create a WordPress page and drop the shortcode below into it.',
              ]}
            />
            <Code>{`[methodepay product="pro-licence" design="classic"]`}</Code>
            <p>
              Publish the page and open it in a private window. That is a working checkout —
              buyers can pay it immediately.
            </p>
          </Doc>

          <Doc id="pay-links" title="Direct payment links">
            <p>
              Every product also gets its own URL, with an optional method segment that
              pre-selects a rail. Nothing needs to be built for it — the route exists as soon as
              the product does.
            </p>
            <Code>{`https://yoursite.com/pay/pro-licence
https://yoursite.com/pay/stripe/pro-licence
https://yoursite.com/pay/whatsapp/pro-licence`}</Code>
            <p>
              Paste these into DMs, invoices, email signatures, link-in-bio pages or ads. Buyers
              land straight on the checkout with no cart and no account.
            </p>
          </Doc>

          <Doc id="stripe" title="Stripe">
            <Steps
              items={[
                'In the Stripe dashboard, open Developers → API keys.',
                'Copy the publishable key and the secret key.',
                'Paste both into MethodePay → Methods → Stripe and save.',
                'Copy the webhook URL shown in the panel into Stripe → Webhooks so payment status posts back.',
              ]}
            />
            <Code>{`Webhook URL: https://yoursite.com/?methodepay-webhook=stripe
Events:      payment_intent.succeeded, charge.refunded`}</Code>
            <Note>
              If Stripe has declined your account, skip this method entirely. Nothing else in
              MethodePay depends on it.
            </Note>
          </Doc>

          <Doc id="paypal" title="PayPal">
            <Steps
              items={[
                'Create a REST app at developer.paypal.com and copy the Client ID and Secret.',
                'Paste them into MethodePay → Methods → PayPal.',
                'Choose Sandbox while testing, then flip to Live.',
                'Save — the PayPal button renders inside your checkout, not on a redirect page.',
              ]}
            />
          </Doc>

          <Doc id="alchemy" title="Alchemy Pay">
            <p>
              Alchemy Pay runs embedded in the checkout, so buyers stay on your domain while
              paying with local cards and wallets.
            </p>
            <Steps
              items={[
                'Request merchant credentials from Alchemy Pay and copy your App ID and App Secret.',
                'Paste them into MethodePay → Methods → Alchemy Pay.',
                'Set your settlement currency and the fiat currencies you want offered.',
                'Add your checkout domain to the allowed origins list in the Alchemy dashboard.',
              ]}
            />
          </Doc>

          <Doc id="whatsapp" title="WhatsApp Pay">
            <p>
              This method opens a pre-filled WhatsApp thread carrying the order reference and
              amount, so the sale closes in the app your customer already uses.
            </p>
            <Steps
              items={[
                'Enter your WhatsApp business number in full international format.',
                'Edit the message template — order ID, product and amount are available as tokens.',
                'Optionally require a proof-of-payment upload before the order is marked paid.',
              ]}
            />
            <Code>{`Template: Hi! I want to pay {amount} for {product}. Order {order_id}.`}</Code>
          </Doc>

          <Doc id="crypto" title="Direct Crypto">
            <p>
              You publish your own wallet addresses. No custodian holds the funds and no
              exchange account is involved.
            </p>
            <Steps
              items={[
                'Add one row per asset: label, network, address and optional QR image.',
                'Set the fiat-to-crypto rate source, or enter a fixed rate.',
                'Require a transaction hash on submit so you can verify on-chain in one click.',
              ]}
            />
            <Note>
              Always name the network next to the address — USDT on TRC-20 and ERC-20 are not
              interchangeable, and buyers do send to the wrong chain.
            </Note>
          </Doc>

          <Doc id="onrampay" title="OnRamPay">
            <Steps
              items={[
                'Paste your OnRamPay merchant key into MethodePay → Methods → OnRamPay.',
                'Choose the destination wallet that receives settlement.',
                'Pick which local currencies appear in the widget.',
              ]}
            />
            <p>
              Buyers quote in their own currency, convert inside the flow and settle in one
              pass — useful where cards fail but cash and local rails do not.
            </p>
          </Doc>

          <Doc id="western-union" title="Western Union">
            <Steps
              items={[
                'Enter the receiver name, city and country exactly as they appear on your ID.',
                'Write the instructions your buyer should follow at the agent counter.',
                'Turn on MTCN capture so the buyer submits the tracking number with the order.',
                'Verify the transfer, then mark the order paid — delivery fires automatically.',
              ]}
            />
          </Doc>

          <Doc id="bank" title="Bank Transfer">
            <p>
              Bank details render with a one-tap copy button and the reference the buyer must
              quote, which is what keeps reconciliation sane.
            </p>
            <Steps
              items={[
                'Add account holder, IBAN or RIB, SWIFT/BIC and bank name.',
                'Add a second account if you take more than one currency.',
                'Set the reference format — order ID is the default and the safest.',
                'Enable proof upload so buyers can attach the transfer receipt.',
              ]}
            />
            <Code>{`Reference format: MP-{order_id}`}</Code>
          </Doc>

          <Doc id="manual" title="Manual methods (M-Pesa, PIX, mobile money)">
            <p>
              A manual method is any rail you define yourself. MethodePay does not need to know
              what it is — you supply the name, the button, the steps and the proof field, and
              it behaves like any other method at checkout.
            </p>
            <Steps
              items={[
                'Go to MethodePay → Methods → Manual and press Add Method (up to five).',
                'Set the display name, upload a logo and pick the button colour.',
                'Write the payment instructions the buyer must follow, step by step.',
                'Optionally paste a YouTube or Vimeo URL — the tutorial embeds inside the checkout.',
                'Choose what proof the buyer submits: a reference code, a screenshot, or both.',
              ]}
            />
            <Note tone="success">
              Merchants most often configure these as M-Pesa, PIX, Orange Money, Vodafone Cash
              and a local bank app. Pair a manual method with trial-code delivery and the whole
              flow runs without you.
            </Note>
          </Doc>

          <Doc id="trial-codes" title="Trial-code auto-delivery">
            <p>
              Codes are held in a pool. When a buyer submits proof of payment, the next unused
              code is assigned, emailed and logged against the order — typically inside two
              seconds.
            </p>
            <Steps
              items={[
                'Go to MethodePay → Automation → Codes and paste your codes, one per line.',
                'Assign the pool to a product.',
                'Edit the delivery email template — {code}, {product} and {order_id} are available.',
                'Set a low-stock threshold so you get warned before the pool empties.',
              ]}
            />
            <Code>{`Subject: Your {product} access code
Body:    Here is your code: {code}
         Order {order_id} · thanks for your purchase.`}</Code>
          </Doc>

          <Doc id="telegram" title="Telegram alerts">
            <Steps
              items={[
                'Message @BotFather on Telegram and create a bot; copy the token it gives you.',
                'Add the bot to your channel or group and make it an administrator.',
                'Get the chat ID from the button inside MethodePay → Automation → Telegram.',
                'Paste the token and chat ID, then press Send test message.',
              ]}
            />
            <p>
              Alerts carry the buyer’s name and email, the method used, the amount and the code
              assigned — enough to verify a payment from your phone without opening wp-admin.
            </p>
          </Doc>

          <Doc id="shortcodes" title="Shortcodes">
            <Code>{`[methodepay product="pro-licence"]
[methodepay product="pro-licence" design="hero"]
[methodepay product="pro-licence" methods="stripe,whatsapp"]
[methodepay product="pro-licence" coupon="off"]
[methodepay_button product="pro-licence" label="Buy now"]`}</Code>
            <ul className="mt-4 space-y-2">
              {[
                'design — classic, lite, storefront, express, hero, trust',
                'methods — comma-separated slugs; omit to show every enabled method',
                'coupon — on or off, overriding the global setting for this checkout',
              ].map((t) => (
                <li key={t} className="flex gap-2.5 text-[13.5px] text-zinc-400">
                  <Check width={16} height={16} className="mt-0.5 shrink-0 text-success" />
                  <span className="font-mono text-[12.5px]">{t}</span>
                </li>
              ))}
            </ul>
          </Doc>

          <Doc id="troubleshooting" title="Troubleshooting">
            <div className="space-y-4">
              {[
                {
                  q: 'The checkout is unstyled or inherits odd theme fonts.',
                  a: 'Your theme is dequeuing plugin styles. Turn on MethodePay → Checkout → Force styles, which loads the checkout CSS with a higher priority.',
                },
                {
                  q: 'The email with the code never arrives.',
                  a: 'Most WordPress hosts throttle wp_mail. Install any SMTP plugin, send a test, and the delivery email will follow the same route.',
                },
                {
                  q: 'Telegram test message fails.',
                  a: 'The bot is not an administrator of the channel, or the chat ID is missing its leading minus sign for groups. Re-run the chat ID button.',
                },
                {
                  q: 'Direct pay links return a 404.',
                  a: 'Go to Settings → Permalinks and press Save. WordPress needs one flush to register the /pay/ route.',
                },
              ].map((t) => (
                <div key={t.q}>
                  <h3 className="text-[14px] font-semibold text-white">{t.q}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-zinc-400">{t.a}</p>
                </div>
              ))}
            </div>

            <div className="glass mt-8 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-zinc-300">Still stuck? Support answers within 24h.</p>
              <Link to="/contact" className="btn-secondary shrink-0">
                Contact support
                <ArrowRight width={16} height={16} />
              </Link>
            </div>
          </Doc>
        </div>
      </div>

      <CtaBand
        title="Read enough? Take your first payment."
        sub="Pick a plan, install the plugin and switch on the rails that work in your market."
      />
    </>
  )
}
