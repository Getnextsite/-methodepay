/**
 * Development seed.
 *
 * Creates one merchant with the rails that need no processor approval already
 * live, so `npm run dev` lands on a dashboard with something in it and a
 * checkout you can actually pay through end to end.
 *
 * Safe to re-run: everything is an upsert keyed on a stable identifier.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createCipheriv, createHash, randomBytes } from 'node:crypto';

const prisma = new PrismaClient();

// Mirrors src/lib/crypto.ts. Duplicated rather than imported because the seed
// runs through tsx outside the Next module graph, where "server-only" throws.
function encryptSecret(plaintext: string): string {
  if (!plaintext) return '';
  const raw =
    process.env.ENCRYPTION_KEY ?? 'ZGV2LW9ubHktaW5zZWN1cmUta2V5LTMyLWJ5dGVzIQ==';
  const keyBuf = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, 'hex')
    : Buffer.from(raw, 'base64');
  const key = keyBuf.length === 32 ? keyBuf : createHash('sha256').update(raw, 'utf8').digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64'),
    cipher.getAuthTag().toString('base64'),
    enc.toString('base64'),
  ].join('.');
}

const EMAIL = 'owner@example.com';
const PASSWORD = 'methodepay-dev-2026';

async function main() {
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    create: {
      email: EMAIL,
      name: 'Amina Tazi',
      passwordHash: await bcrypt.hash(PASSWORD, 10),
    },
    update: {},
  });

  const account = await prisma.account.upsert({
    where: { slug: 'atlas-digital' },
    create: {
      name: 'Atlas Digital',
      slug: 'atlas-digital',
      // Professional so every rail and design is visible while developing.
      planTier: 'PROFESSIONAL',
      memberships: { create: { userId: user.id, role: 'OWNER' } },
    },
    update: { planTier: 'PROFESSIONAL' },
  });

  await prisma.checkoutProfile.upsert({
    where: { accountId: account.id },
    create: {
      accountId: account.id,
      design: 'CLASSIC',
      checkoutTitle: 'Complete your order',
      checkoutSubtitle: 'Pay by card, crypto, bank transfer or WhatsApp.',
      trustBadges: ['ssl', 'encrypted', 'money_back', 'support'],
      kycNoticeMethods: ['onramppay', 'stripe', 'alchemypay'],
      kycNoticeText:
        'Pay securely by card. For your protection you may be asked to verify your identity with a government ID and a selfie. That is a standard check required by the payment provider, not by us.',
      guaranteeText:
        'If within 30 days you hit a problem that makes this unusable and we cannot fix it, we will refund you in full.',
      fieldVisibility: { country: 'required', phone: 'optional' },
      testimonials: [
        {
          text: 'Paid from Lagos with a local card when nothing else would take my money.',
          name: 'Chidi O.',
          role: 'Verified buyer',
        },
        {
          text: 'The USDT option settled in two minutes and the licence key arrived straight away.',
          name: 'Marta K.',
          role: 'Verified buyer',
        },
      ],
    },
    update: {},
  });

  await prisma.notificationSettings.upsert({
    where: { accountId: account.id },
    create: {
      accountId: account.id,
      storeName: 'Atlas Digital',
      supportEmail: 'support@atlas.example',
      orderPrefix: 'ATL-',
      notifyEmails: ['orders@atlas.example'],
      confirmChannels: ['whatsapp'],
      confirmWhatsapp: '212600000000',
      confirmMessage:
        'Hi, I have paid. My order reference is {order_ref} — {amount} {currency}. Please verify and activate it.',
      renewalsEnabled: true,
    },
    update: {},
  });

  // Rails that work on day one with no processor relationship at all.
  const methods: {
    key: string;
    enabled: boolean;
    label?: string;
    config: Record<string, unknown>;
  }[] = [
    {
      key: 'whatsapp',
      enabled: true,
      config: {
        number: '212600000000',
        messageTemplate:
          'Hello! I want to pay for order {order_ref}\nProduct: {product_name}\nAmount: {amount}',
        instructions: 'Message us and we will send payment details for your country.',
      },
    },
    {
      key: 'crypto',
      enabled: true,
      config: { timerMinutes: 20, instructions: 'Send the exact amount, then paste your TXID.' },
    },
    {
      key: 'bank_transfer',
      enabled: true,
      config: {
        holderName: 'Atlas Digital SARL',
        iban: 'MA64011519000001234567890',
        swift: 'BMCEMAMC',
        bankName: 'Bank of Africa',
        referencePrefix: 'ATL-',
        instructions: 'Transfers from outside Morocco can take two working days to land.',
      },
    },
    {
      key: 'western_union',
      enabled: true,
      config: {
        firstName: 'Amina',
        lastName: 'Tazi',
        country: 'Morocco',
        city: 'Casablanca',
        instructions: 'Bring ID to the agent, then send us the MTCN.',
      },
    },
    {
      key: 'finchpay_btc',
      enabled: false,
      config: { wallet: '', blockedCountries: 'US' },
    },
    {
      key: 'stripe',
      enabled: false,
      config: { secretKey: encryptSecret(''), webhookSecret: encryptSecret('') },
    },
  ];

  for (const method of methods) {
    await prisma.paymentMethodConfig.upsert({
      where: { accountId_key: { accountId: account.id, key: method.key } },
      create: {
        accountId: account.id,
        key: method.key,
        enabled: method.enabled,
        label: method.label ?? null,
        config: method.config as object,
      },
      update: {},
    });
  }

  for (const slot of [1, 2, 3, 4, 5]) {
    await prisma.manualMethod.upsert({
      where: { accountId_slot: { accountId: account.id, slot } },
      create:
        slot === 1
          ? {
              accountId: account.id,
              slot,
              enabled: true,
              name: 'M-Pesa',
              requireReference: true,
              instructions:
                '<ol><li>Open M-Pesa and choose Send Money</li><li>Send to 0712 345 678</li><li>Paste the confirmation code below</li></ol>',
              buttonLabel: 'Open M-Pesa',
            }
          : { accountId: account.id, slot },
      update: {},
    });
  }

  const wallets = [
    { coin: 'USDT', network: 'TRC20', address: 'TXYZab1234567890abcdefghijklmnopqr' },
    { coin: 'USDC', network: 'Polygon', address: '0x1234567890abcdef1234567890abcdef12345678' },
    { coin: 'BTC', network: 'Bitcoin', address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' },
  ];
  for (const [index, wallet] of wallets.entries()) {
    await prisma.wallet.upsert({
      where: {
        accountId_coin_network: {
          accountId: account.id,
          coin: wallet.coin,
          network: wallet.network,
        },
      },
      create: { accountId: account.id, ...wallet, sortOrder: index },
      update: {},
    });
  }

  const products = [
    {
      slug: 'pro-licence',
      name: 'Atlas Pro — annual licence',
      priceCents: 12_900,
      durationDays: 365,
      description:
        '<p>One year of Atlas Pro, including every update and priority support.</p><ul><li>Unlimited projects</li><li>Priority support</li></ul>',
      accessCode: 'ATLAS-PRO-XXXX-YYYY-ZZZZ',
    },
    {
      slug: 'starter-pack',
      name: 'Starter pack (one-off)',
      priceCents: 2_900,
      durationDays: 0,
      description: '<p>Templates and a setup walkthrough. Yours to keep.</p>',
      accessCode: '',
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { accountId_slug: { accountId: account.id, slug: product.slug } },
      create: {
        accountId: account.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        priceCents: product.priceCents,
        currency: 'USD',
        active: true,
        durationDays: product.durationDays,
        thanksTitle: 'You are in',
        thanksMessage: '<p>Your licence details are below and in your inbox.</p>',
        deliveryAccessCodeEnc: product.accessCode ? encryptSecret(product.accessCode) : null,
      },
      update: {},
    });
  }

  await prisma.coupon.upsert({
    where: { accountId_code: { accountId: account.id, code: 'LAUNCH20' } },
    create: { accountId: account.id, code: 'LAUNCH20', type: 'PERCENT', value: 20, usageLimit: 100 },
    update: {},
  });

  console.log(`
Seeded.

  Dashboard   http://localhost:3000/login
  Email       ${EMAIL}
  Password    ${PASSWORD}

  Checkout    http://localhost:3000/c/atlas-digital/pro-licence
              http://localhost:3000/c/atlas-digital/starter-pack
  Coupon      LAUNCH20 (20% off)

Live rails: WhatsApp, direct crypto, bank transfer, Western Union, M-Pesa.
Stripe and FinchPay are present but switched off until you add real keys.
`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
