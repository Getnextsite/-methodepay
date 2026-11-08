# MethodePay Platform

The hosted, multi-tenant version of the MethodePay WordPress plugin. Merchants
sign up, add products, switch on payment rails and get checkout links on your
domain. No WordPress, no plugin install, no per-site licence file.

```
Next.js 14 (App Router) · TypeScript · Prisma · PostgreSQL · Tailwind · Stripe
```

---

## What changed from the plugin

The plugin was ~20k lines of PHP where each install was its own world: one
`wp_options` blob held 200 settings, one site had one merchant, and feature
gating was advisory because anyone could edit the PHP. Hosted, four things had
to be rebuilt rather than ported.

| Plugin | Platform | Why |
| --- | --- | --- |
| One site = one merchant | `accountId` on every row, resolved in one place (`src/lib/tenancy.ts`) | Every query is scoped from the session, never from a request parameter. That is the whole security model. |
| 200-key `wp_options` array | Each rail declares its own fields (`src/lib/gateway/registry.ts`) | The dashboard, the API validator and the checkout all read one declaration, so they cannot disagree about what a field is called. |
| Secrets in plaintext options | AES-256-GCM at rest (`src/lib/crypto.ts`) | A database dump should not hand over a working Stripe key. Secrets are decrypted only in `readConfig()`, server-side. |
| Licence keys per site | Plan entitlements enforced server-side (`src/lib/entitlements.ts`) | The checkout renders on our infrastructure, so a plan gate is real rather than a suggestion. |
| `DECIMAL(18,2)` through PHP floats | Integer minor units everywhere (`src/lib/money.ts`) | Survivable in one language, a bug factory across a JSON API. |

Everything the plugin actually did is here: 17 payment rails, 6 checkout
designs, coupons, subscriptions and renewal reminders, shipping and stock,
email and Telegram notifications, the order audit trail, and the merchant REST
API — plus accounts, teams, billing and signed outbound webhooks, which a
single-site plugin never needed.

---

## Running it

You need Node 20+ and a PostgreSQL database.

```bash
cd platform
npm install
cp .env.example .env     # then fill in the three required secrets
npm run prisma:push      # create the tables
npm run seed             # one merchant, two products, five live rails
npm run dev
```

Generate the secrets `.env` asks for:

```bash
openssl rand -base64 32   # ENCRYPTION_KEY
openssl rand -base64 32   # SESSION_SECRET
openssl rand -hex 32      # CRON_SECRET
```

The seed prints a login and two working checkout URLs. WhatsApp, direct
crypto, bank transfer, Western Union and an M-Pesa custom rail are live out of
the box, because none of them needs a processor to approve anything.

> **`ENCRYPTION_KEY` is not rotatable without a migration.** Everything
> encrypted with it — Stripe keys, Telegram tokens, licence codes — becomes
> unreadable if you change it. Back it up where you keep your other production
> secrets.

### Useful scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on :3000 |
| `npm run build` | `prisma generate` then a production build |
| `npm run verify` | 169 assertions over the money, crypto, plan and rail logic. No database needed. |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run prisma:studio` | Browse the data |
| `npm run seed` | Re-seed (idempotent) |

---

## How it is laid out

```
src/
  app/
    (auth)/             sign in, sign up, invite acceptance
    dashboard/          the merchant app — one folder per screen
    c/[account]/[product]/   the hosted checkout
    pay/[nonce]/        payment instructions for manual and on-ramp rails
    o/[nonce]/          order status, delivery, thank-you
    renew/[ref]/        renewal checkout from a reminder email
    lookup/             buyer finds an order by reference + email
    api/
      checkout/         create order, validate coupon, buyer confirms payment
      webhooks/         stripe (merchant), stripe/billing (ours), paypal, provider/*
      v1/               the merchant REST API
      cron/renewals     daily reminder and expiry sweep
  lib/
    tenancy.ts          which merchant am I acting for — the only answer
    entitlements.ts     plan limits, enforced where actions happen
    crypto.ts           AES-256-GCM, order references, constant-time compare
    money.ts            integer minor units
    orders.ts           the order lifecycle, including mark-paid side effects
    gateway/
      registry.ts       all 17 rails and their config schema
      resolve.ts        which rails this buyer, on this product, actually sees
      initiate.ts       routes a chosen rail to whatever happens next
      providers/        stripe, paypal, on-ramps
    notifier.ts         email + Telegram, best-effort by design
    webhooks.ts         signed outbound delivery, with replay protection
    billing.ts          platform subscriptions (what merchants pay you)
  components/
    checkout/           the six designs, the form, instructions, QR, copy fields
    ui.tsx              dashboard primitives
```

### The two rules worth knowing

**Tenancy.** `requireTenant()` is the only thing that decides which account a
request acts for. Every query takes `accountId` from the tenant it returns,
never from a URL or a form field — so a product id from another merchant simply
does not exist as far as the query is concerned.

**Nothing marks an order paid except a verified webhook or a human.**
`/api/checkout/confirm` moves an order to `AWAITING_VERIFICATION` and alerts the
merchant; it cannot settle one. Otherwise anybody holding a checkout link could
claim their own order was paid.

---

## Payment rails

Three groups, and the distinction is the product.

**Settles itself.** Stripe Checkout and PayPal Orders, both on the merchant's
own account, so money moves directly between buyer and merchant and the
platform is never in the flow of funds.

**On-ramps.** OnRamPay (plus Binance Pay, Revolut, UPI and PayPal US promoted
to their own buttons), Alchemy Pay embedded in an iframe, and the FinchPay
card-to-Bitcoin handoff. The buyer pays by card or a local method; the merchant
receives crypto at their own address. These are the rails that work where
Stripe will not open an account. A hosted widget URL is a redirect, not a
contract, so **these land in `AWAITING_VERIFICATION`, never straight to
`PAID`** — the merchant confirms the funds arrived.

**Manual.** Direct crypto with per-coin wallets and generated QR codes, bank
transfer, Western Union, PayPal friends-and-family, buy-crypto-first flows for
PayPal and Cash App, Amazon eGift cards, WhatsApp, and five rails the merchant
defines entirely themselves. Unglamorous, slow, and the reason the plugin
existed.

Adding a rail means adding one entry to `METHOD_DEFINITIONS`. The dashboard
form, the secret encryption, the readiness check, the plan gate and the
checkout radio list all follow from it.

### Gift-card handling

Buyer-submitted Amazon codes are bearer credentials and are treated as such:
encrypted at rest, excluded from every email and Telegram alert, revealed only
by an explicit action that writes to the audit trail, and erased the moment the
order is marked paid. Nothing is redeemed or balance-checked automatically, and
the UI says so to both the merchant and the buyer.

---

## Plans

`src/lib/entitlements.ts` is the single source of truth, mirroring the
marketing site's tiers.

| | Trial | Starter | Professional | Agency |
| --- | --- | --- | --- | --- |
| Products | 3 | 25 | 500 | ∞ |
| Rails | 3 self-serve | 4 self-serve + 1 custom | all 17 + 5 custom | all 17 + 5 custom |
| Designs | Classic | Classic, Lite | all 6 | all 6 |
| Editor | colours | colours | full | full |
| Seats | 1 | 1 | 5 | 20 |
| API & webhooks | — | — | ✓ | ✓ |
| Custom domain | — | — | — | ✓ |

**A lapsed plan degrades, it does not lock out.** Checkout links keep working on
the self-serve rails and the merchant keeps their data. That is the difference
between a nudge to pay and holding someone's business hostage, and only one of
those gets renewed.

Billing is Stripe Checkout plus the hosted customer portal, on **your** Stripe
account, through a separate webhook endpoint from the merchant one. Leave
`PLATFORM_STRIPE_SECRET_KEY` unset and gating still works — you set tiers by
hand in the database.

---

## Merchant API

Bearer auth. Keys are shown once at creation and stored only as a hash.

```bash
curl https://your-host/api/v1/orders?status=AWAITING_VERIFICATION \
  -H "Authorization: Bearer mp_live_…"
```

`GET /v1/ping` · `GET|POST /v1/products` · `GET /v1/orders` ·
`GET /v1/orders/:ref` · `POST /v1/orders/:ref/paid` ·
`POST /v1/orders/:ref/refund` · `GET /v1/subscriptions` · `GET /v1/customers` ·
`GET|POST /v1/coupons` · `GET /v1/stats`

Outbound webhooks are signed the way Stripe signs theirs —
`MethodePay-Signature: t=…,v1=HMAC-SHA256(timestamp.body)` — so a captured
payload cannot be replayed a week later, and merchants can reuse a verifier
they have already written.

---

## Deploying

1. Postgres somewhere (Neon, Supabase, RDS).
2. `npm run prisma:migrate deploy` — or `prisma:push` for a first cut.
3. Set the environment from `.env.example`. Point `CHECKOUT_URL` at a **separate
   host** from `APP_URL` so merchant checkouts never share an origin with the
   dashboard.
4. Webhooks: `POST /api/webhooks/stripe/billing` on your own Stripe account.
   Each merchant points their own Stripe at `/api/webhooks/stripe` and pastes
   the signing secret into the dashboard.
5. Cron: `POST /api/cron/renewals` once a day with
   `Authorization: Bearer $CRON_SECRET`. It is idempotent — a missed day is
   caught up on the next run, and running twice sends nothing twice.

---

## Known gaps

Honest list of what is scaffolded rather than finished:

- **Custom domains** have a `Domain` model and an Agency entitlement, but no
  TLS provisioning or host-to-account routing middleware yet.
- **Webhook retries** record every failed delivery with its error, but nothing
  re-drives the queue; `WebhookDelivery` is ready for a worker.
- **Order bump and post-purchase upsell** have profile storage and plan gating;
  the checkout does not render them yet.
- **Password reset** is not built. Invites work; a forgotten password currently
  needs a manual hash update.
- **The AI reply drafter** from plugin 3.11 was not ported. The notifier is the
  natural seam if you want it.
- **No automated browser tests.** `npm run verify` covers the logic that does
  not need a database; the request paths are exercised by hand.
