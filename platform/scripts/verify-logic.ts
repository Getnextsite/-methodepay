/**
 * Smoke-check the database-free logic of the platform.
 * Run with: npm run verify
 */
import { decryptSecret, encryptSecret, maskSecret, orderRef, safeEqual, sha256 } from '../src/lib/crypto';
import {
  computeTotals,
  decimalString,
  formatMoney,
  fromCents,
  sanitizeCurrency,
  toCents,
} from '../src/lib/money';
import {
  PLANS,
  canUseDesign,
  canUseMethod,
  entitlementsFor,
  tierUnlocking,
  withinProductLimit,
  withinSeatLimit,
} from '../src/lib/entitlements';
import { readableOn, withAlpha } from '../src/lib/checkout/theme';
import { parseConfirmChannels, resolveConfirm } from '../src/lib/confirm-channels';
import { activeBump, bumpCents, orderBumpOf, parseBump, parseUpsell } from '../src/lib/offers';
import {
  METHOD_DEFINITIONS,
  defaultConfig,
  methodDefinition,
  secretFieldNames,
} from '../src/lib/gateway/registry';

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail = '') {
  if (condition) {
    passed += 1;
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function eq<T>(name: string, actual: T, expected: T) {
  check(name, Object.is(actual, expected), `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
}

// ---------------------------------------------------------------- crypto
{
  const secret = 'sk_live_51Hx9QwKlmNoPqRsTuVwXyZ';
  const sealed = encryptSecret(secret);
  check('encrypt produces versioned envelope', sealed.startsWith('v1.'));
  check('envelope has 4 parts', sealed.split('.').length === 4);
  eq('decrypt round-trips', decryptSecret(sealed), secret);
  check('same plaintext encrypts differently each time', encryptSecret(secret) !== sealed);
  eq('decrypt of garbage is empty', decryptSecret('not-our-format'), '');
  eq('decrypt of null is empty', decryptSecret(null), '');

  // A tampered ciphertext must fail the auth tag, not return partial data.
  const parts = sealed.split('.');
  const flipped = Buffer.from(parts[3], 'base64');
  flipped[0] = flipped[0] ^ 0xff;
  parts[3] = flipped.toString('base64');
  eq('tampered ciphertext refuses to decrypt', decryptSecret(parts.join('.')), '');

  eq('mask keeps head and tail', maskSecret('sk_live_abcdef1234'), 'sk_l••••••1234');
  eq('mask of short value hides all', maskSecret('abc'), '•••');
  eq('mask of empty is empty', maskSecret(''), '');

  check('sha256 is stable', sha256('x') === sha256('x'));
  check('safeEqual true for identical', safeEqual('abc', 'abc'));
  check('safeEqual false for different', !safeEqual('abc', 'abd'));
  check('safeEqual false for different lengths', !safeEqual('abc', 'abcd'));

  // Order refs are read aloud over WhatsApp: no I or O, prefix preserved.
  const refs = new Set<string>();
  for (let i = 0; i < 400; i += 1) refs.add(orderRef('ATL-'));
  check('order refs are unique across 400 draws', refs.size === 400, `got ${refs.size}`);
  const sample = [...refs];
  check('order refs carry the prefix', sample.every((r) => r.startsWith('ATL-')));
  check('order refs are prefix + 6', sample.every((r) => r.length === 10));
  check(
    'order ref alphabet excludes I and O',
    sample.every((r) => !/[IO]/.test(r.slice(4))),
  );
}

// ---------------------------------------------------------------- money
{
  eq('toCents from decimal string', toCents('19.99'), 1999);
  eq('toCents from comma decimal', toCents('19,99'), 1999);
  eq('toCents from number', toCents(19.99), 1999);
  eq('toCents trims spaces', toCents(' 1 234.50 '), 123450);
  eq('toCents rejects negatives', toCents('-5'), 0);
  eq('toCents of junk is zero', toCents('abc'), 0);
  eq('toCents rounds half up', toCents('0.005'), 1);
  eq('toCents for zero-decimal currency', toCents('1200', 'JPY'), 1200);

  eq('fromCents', fromCents(1999), '19.99');
  eq('fromCents zero-decimal', fromCents(1200, 'JPY'), '1200');
  eq('decimalString matches fromCents', decimalString(2500), '25.00');

  eq('sanitizeCurrency passes known', sanitizeCurrency('eur'), 'EUR');
  eq('sanitizeCurrency falls back', sanitizeCurrency('XYZ'), 'USD');
  eq('sanitizeCurrency handles junk', sanitizeCurrency(undefined), 'USD');
  eq('sanitizeCurrency keeps emerging-market codes', sanitizeCurrency('ngn'), 'NGN');

  check('formatMoney includes the amount', formatMoney(1999, 'USD').includes('19.99'));
  check('formatMoney of JPY has no decimals', !formatMoney(1200, 'JPY').includes('.'));

  const t = computeTotals({ subtotalCents: 10_000, discountCents: 2_000, shippingCents: 500 });
  eq('total = subtotal - discount + shipping', t.totalCents, 8_500);

  // A coupon worth more than the order must not produce a negative charge.
  const over = computeTotals({ subtotalCents: 1_000, discountCents: 5_000 });
  eq('discount is capped at the subtotal', over.discountCents, 1_000);
  eq('total never goes negative', over.totalCents, 0);

  const neg = computeTotals({ subtotalCents: 1_000, discountCents: -50, shippingCents: -10 });
  eq('negative discount is clamped to zero', neg.discountCents, 0);
  eq('negative shipping is clamped to zero', neg.shippingCents, 0);
}

// ---------------------------------------------------------------- plans
{
  const free = entitlementsFor({ planTier: 'FREE', trialEndsAt: null });
  eq('free tier label', free.label, 'Trial');
  check('free allows whatsapp', canUseMethod(free, 'whatsapp'));
  check('free blocks stripe', !canUseMethod(free, 'stripe'));
  check('free blocks every manual slot', !canUseMethod(free, 'manual_1'));

  const starter = PLANS.STARTER;
  check('starter allows western union', canUseMethod(starter, 'western_union'));
  check('starter blocks alchemypay', !canUseMethod(starter, 'alchemypay'));
  check('starter allows manual slot 1', canUseMethod(starter, 'manual_1'));
  check('starter blocks manual slot 2', !canUseMethod(starter, 'manual_2'));
  check('starter allows LITE design', canUseDesign(starter, 'LITE'));
  check('starter blocks HERO design', !canUseDesign(starter, 'HERO'));

  const pro = PLANS.PROFESSIONAL;
  check('pro allows stripe', canUseMethod(pro, 'stripe'));
  check('pro allows all 5 manual slots', canUseMethod(pro, 'manual_5'));
  check('pro blocks a 6th manual slot', !canUseMethod(pro, 'manual_6'));
  check('pro allows HERO design', canUseDesign(pro, 'HERO'));
  check('pro has api access', pro.apiAccess);
  check('pro has no custom domain', !pro.customDomain);

  const agency = PLANS.AGENCY;
  check('agency has custom domain', agency.customDomain);
  eq('agency products are unlimited', agency.products, -1);
  check('unlimited plan is always within product limit', withinProductLimit(agency, 999_999));
  check('starter blocks the 26th product', !withinProductLimit(starter, 25));
  check('starter allows the 25th product', withinProductLimit(starter, 24));
  check('one-seat plan blocks a second seat', !withinSeatLimit(starter, 1));

  // A lapsed trial must degrade, not lock the merchant out.
  const lapsed = entitlementsFor({
    planTier: 'FREE',
    trialEndsAt: new Date(Date.now() - 86_400_000),
  });
  check('lapsed trial keeps self-serve rails', canUseMethod(lapsed, 'whatsapp'));
  check('lapsed trial still blocks card rails', !canUseMethod(lapsed, 'stripe'));

  // A paid plan is never downgraded by a stale trial date.
  const paidWithOldTrial = entitlementsFor({
    planTier: 'PROFESSIONAL',
    trialEndsAt: new Date(Date.now() - 86_400_000),
  });
  eq('paid plan ignores an expired trial date', paidWithOldTrial.tier, 'PROFESSIONAL');

  eq('cheapest tier for stripe', tierUnlocking('stripe'), 'PROFESSIONAL');
  eq('cheapest tier for whatsapp', tierUnlocking('whatsapp'), 'FREE');
  eq('cheapest tier for western_union', tierUnlocking('western_union'), 'STARTER');
  eq('unknown rail unlocks nowhere', tierUnlocking('does_not_exist'), null);
}

// ---------------------------------------------------------------- theme
{
  // The pay button must stay readable whatever palette a merchant picks.
  eq('dark text on neon mint', readableOn('#00ffa3'), '#06240f');
  eq('white text on navy', readableOn('#0a0e1a'), '#ffffff');
  eq('dark text on white', readableOn('#ffffff'), '#06240f');
  eq('white text on black', readableOn('#000000'), '#ffffff');
  eq('white text on mid violet', readableOn('#7c5cff'), '#ffffff');
  eq('malformed colour falls back safely', readableOn('nonsense'), '#000000');

  eq('withAlpha builds rgba', withAlpha('#ffffff', 0.5), 'rgba(255, 255, 255, 0.5)');
  eq('withAlpha passes through junk', withAlpha('oops', 0.5), 'oops');
}

// ---------------------------------------------------------------- registry
{
  const keys = METHOD_DEFINITIONS.map((d) => d.key);
  check('registry has no duplicate keys', new Set(keys).size === keys.length);
  check('registry covers 18 rails', keys.length === 18, `got ${keys.length}`);

  for (const def of METHOD_DEFINITIONS) {
    check(`${def.key} has a label`, def.defaultLabel.length > 0);
    check(`${def.key} has a setup hint`, def.setupHint.length > 0);
    check(`${def.key} has a tone`, /^#[0-9a-f]{6}$/i.test(def.tone));
    check(
      `${def.key} field names are unique`,
      new Set(def.fields.map((f) => f.name)).size === def.fields.length,
    );
    // Every rail must refuse to go live on an empty config, except the three
    // whose readiness is resolved from other tables (wallets, shared wallet).
    const externallyResolved = def.key === 'crypto' || def.key.startsWith('op_') || def.key === 'amazon_giftcard';
    if (!externallyResolved) {
      check(`${def.key} is not ready when unconfigured`, !def.isReady({}));
    }
  }

  eq('stripe secrets are declared', secretFieldNames('stripe').join(','), 'secretKey,webhookSecret');
  eq('paypal secret is declared', secretFieldNames('paypal').join(','), 'clientSecret');
  eq('whatsapp has no secrets', secretFieldNames('whatsapp').length, 0);

  check('stripe is ready with a secret key', methodDefinition('stripe')!.isReady({ secretKey: 'sk_x' }));
  check(
    'stripe is not ready with only a publishable key',
    !methodDefinition('stripe')!.isReady({ publishableKey: 'pk_x' }),
  );
  check(
    'bank transfer needs holder and iban',
    !methodDefinition('bank_transfer')!.isReady({ holderName: 'A' }) &&
      methodDefinition('bank_transfer')!.isReady({ holderName: 'A', iban: 'B' }),
  );
  check(
    'whitespace-only values do not count as configured',
    !methodDefinition('whatsapp')!.isReady({ number: '   ' }),
  );

  eq('onramppay carries a default domain', defaultConfig('onramppay').domain, 'checkout.onramp-pay.com');
  eq('promoted binance carries its tag', defaultConfig('op_binance').onrampTag, 'binance');
  eq('unknown rail has no defaults', Object.keys(defaultConfig('nope')).length, 0);
  eq('onramppay minimum is 30 USD', methodDefinition('onramppay')!.minUsd, 30);
}

// ---------------------------------------------------------------- confirmation channels
{
  const base = { whatsappNumber: '+212 600-000041', supportEmail: 'help@shop.test', message: 'Order MP-ABC123', subject: 'Order MP-ABC123' };
  const on = (c: Partial<ReturnType<typeof parseConfirmChannels>>) =>
    resolveConfirm({ ...base, channels: { txid: false, whatsapp: false, email: false, emailTo: '', ...c } });

  eq('legacy array keeps the TXID form on', parseConfirmChannels(['whatsapp']).txid, true);
  eq('legacy array reads whatsapp', parseConfirmChannels(['whatsapp']).whatsapp, true);
  eq('legacy array leaves email off', parseConfirmChannels(['whatsapp']).email, false);
  eq('object shape is read as stored', parseConfirmChannels({ txid: false, whatsapp: true, email: true, emailTo: ' a@b.co ' }).emailTo, 'a@b.co');
  eq('missing value falls back to defaults', parseConfirmChannels(null).txid, true);

  const all = on({ txid: true, whatsapp: true, email: true });
  check('all three: whatsapp link uses digits only', all.whatsappUrl?.startsWith('https://wa.me/212600000041?text=') === true);
  check('all three: whatsapp message carries the reference', decodeURIComponent(all.whatsappUrl ?? '').includes('MP-ABC123'));
  check('all three: email falls back to the support inbox', all.emailUrl?.startsWith('mailto:help@shop.test?') === true);
  check('all three: email body carries the reference', decodeURIComponent(all.emailUrl ?? '').includes('MP-ABC123'));
  eq('all three: TXID form shown', all.txid, true);

  const wa = on({ whatsapp: true });
  check('whatsapp only: no email, no TXID', wa.whatsappUrl !== null && wa.emailUrl === null && wa.txid === false);
  const mail = on({ email: true, emailTo: 'pay@shop.test' });
  check('email only: own inbox wins over support', mail.emailUrl?.startsWith('mailto:pay@shop.test?') === true && mail.txid === false);
  const both = on({ whatsapp: true, email: true });
  check('whatsapp + email: no TXID form', both.whatsappUrl !== null && both.emailUrl !== null && both.txid === false);
  const tx = on({ txid: true });
  check('TXID only: no messaging links', tx.txid && tx.whatsappUrl === null && tx.emailUrl === null);

  eq('nothing ticked still leaves a way to confirm', on({}).txid, true);
  const noNumber = resolveConfirm({ ...base, whatsappNumber: '', channels: { txid: false, whatsapp: true, email: false, emailTo: '' } });
  check('whatsapp ticked without a number falls back to TXID', noNumber.whatsappUrl === null && noNumber.txid === true);
}

// ---------------------------------------------------------------- order bump & upsell
{
  const live = { enabled: true, title: 'Priority setup', priceCents: 1900, originalPriceCents: 3900 };

  eq('bump: price taken from settings', bumpCents(live, true, true), 1900);
  eq('bump: nothing added when not ticked', bumpCents(live, true, false), 0);
  eq('bump: nothing added without the offers plan', bumpCents(live, false, true), 0);
  eq('bump: switched off adds nothing', bumpCents({ ...live, enabled: false }, true, true), 0);
  eq('bump: no title means no bump', activeBump({ ...live, title: '' }, true), null);
  eq('bump: zero price means no bump', activeBump({ ...live, priceCents: 0 }, true), null);
  eq('bump: negative price is ignored', parseBump({ ...live, priceCents: -500 }).priceCents, 0);
  eq('bump: http image rejected', parseBump({ ...live, imageUrl: 'http://x.test/a.png' }).imageUrl, '');
  eq('bump: https image kept', parseBump({ ...live, imageUrl: 'https://x.test/a.png' }).imageUrl, 'https://x.test/a.png');
  eq('bump: empty settings use the default headline', parseBump({}).headline, 'One-time offer — add it to your order');

  eq('upsell: blank labels fall back', parseUpsell({ acceptLabel: '  ' }).acceptLabel, 'Yes, add this to my order');
  eq('upsell: off by default', parseUpsell(null).enabled, false);

  eq('order meta: bump read back', orderBumpOf({ orderBump: { title: 'Priority setup', amountCents: 1900 } })?.amountCents, 1900);
  eq('order meta: no bump recorded', orderBumpOf({ customFields: {} }), null);
}

// ---------------------------------------------------------------- report
console.log(`\n${passed} checks passed`);
if (failures.length > 0) {
  console.log(`${failures.length} FAILED:\n`);
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
console.log('all green\n');
