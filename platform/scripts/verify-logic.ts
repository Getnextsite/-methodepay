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
import { chainOf, cleanTxid, normalizeCoin, tronAddress } from '../src/lib/chain/networks';
import { parseChainVerify } from '../src/lib/chain/settings';
import { autoVerifiable } from '../src/lib/chain/networks';
import { CRYPTO_CATALOG, addressProblem, coinAmount, networkInfo } from '../src/lib/crypto-catalog';
import { parseRecovery } from '../src/lib/recovery-settings';
import { parseInvoice } from '../src/lib/invoice';
import { afterAttempt, MAX_ATTEMPTS, RETRY_DELAYS_MS } from '../src/lib/webhook-schedule';
import { blocklistHit, isDisposableEmail, parseFraud, scoreRisk, suspiciousName, type RiskSignals } from '../src/lib/fraud/score';
import { bucketKey, bucketsFor, csvCell, pctChange, resolvePeriod } from '../src/lib/reports-period';
import { alertTransitions, combineStatus, parseMonitor } from '../src/lib/monitor-status';
import {
  METHOD_DEFINITIONS,
  defaultConfig,
  methodDefinition,
  secretFieldNames,
} from '../src/lib/gateway/registry';
import { ONRAMP_API_HOST, ONRAMP_CHECKOUT_HOST } from '../src/lib/gateway/onramp-hosts';

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
  check('registry covers 17 rails', keys.length === 17, `got ${keys.length}`);
  // UPI was retired: the upstream dropped the provider id, so the button could
  // only ever dead-end. Guard against it being pasted back in.
  check('no retired upi rail', !keys.includes('op_upi'), 'op_upi is back in the registry');

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

  // The rail must point at our own white-label, never back at the provider
  // the platform was ported away from.
  eq('onramppay defaults to our checkout host', defaultConfig('onramppay').domain, ONRAMP_CHECKOUT_HOST);
  eq('onramppay defaults to our api host', defaultConfig('onramppay').apiDomain, ONRAMP_API_HOST);
  check(
    'no rail default points at onramp-pay.com',
    !JSON.stringify(METHOD_DEFINITIONS).includes('onramp-pay.com'),
    'a default still references the old provider',
  );
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

// ---------------------------------------------------------------- crypto verification
{
  eq('network: USDT TRC20 is TRON', chainOf('USDT', 'TRC20'), 'tron');
  eq('network: USDT ERC20 is Ethereum', chainOf('USDT', 'ERC20'), 'eth');
  eq('network: USDT BEP20 is BSC', chainOf('USDT', 'BEP20'), 'bsc');
  eq('network: USDC Polygon is Polygon', chainOf('USDC', 'Polygon'), 'polygon');
  eq('network: BTC Bitcoin is Bitcoin', chainOf('BTC', 'Bitcoin'), 'btc');
  eq('network: LTC is Litecoin', chainOf('LTC', 'Litecoin'), 'ltc');
  eq('network: ETH on Base is not guessed as Ethereum', chainOf('ETH', 'Base'), null);
  eq('network: USDC on Solana is not checked', chainOf('USDC', 'Solana'), null);
  eq('network: BTC Lightning is not checked', chainOf('BTC', 'Lightning'), null);
  eq('network: USDT with no network is not guessed', chainOf('USDT', ''), null);

  eq('coin: USDC.e counts as USDC', normalizeCoin('USDC.e'), 'USDC');
  eq('coin: MATIC is POL', normalizeCoin('matic'), 'POL');

  eq('txid: 0x prefix stripped', cleanTxid('0x' + 'AB'.repeat(32)), 'ab'.repeat(32));
  eq('txid: whitespace trimmed', cleanTxid('  ' + 'cd'.repeat(32) + ' '), 'cd'.repeat(32));
  eq('txid: too short rejected', cleanTxid('abc123'), null);
  eq('txid: non-hex rejected', cleanTxid('z'.repeat(64)), null);

  // Known pair: USDT's TRC-20 contract in hex and base58.
  eq('tron: hex to base58', tronAddress('41a614f803b6fd780986a42c78ec9c7f77e6ded13c'), 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');
  eq('tron: bare 20-byte hex', tronAddress('a614f803b6fd780986a42c78ec9c7f77e6ded13c'), 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');

  eq('verify settings: on and automatic by default', JSON.stringify(parseChainVerify({})), JSON.stringify({ enabled: true, mode: 'auto' }));
  eq('verify settings: review mode kept', parseChainVerify({ mode: 'review' }).mode, 'review');
  eq('verify settings: can be switched off', parseChainVerify({ enabled: false }).enabled, false);
}

// ---------------------------------------------------------------- recovery & invoices
{
  eq('recovery: on by default', parseRecovery({}).enabled, true);
  eq('recovery: default delay 1h', parseRecovery({}).delayHours, 1);
  eq('recovery: delay above 48h rejected', parseRecovery({ delayHours: 200 }).delayHours, 1);
  eq('recovery: coupon upper-cased', parseRecovery({ couponCode: ' save10 ' }).couponCode, 'SAVE10');
  eq('recovery: blank subject falls back', parseRecovery({ subject: '  ' }).subject.includes('{product}'), true);
  eq('invoice: fields trimmed', parseInvoice({ taxId: '  FR123 ' }).taxId, 'FR123');
  eq('invoice: missing fields are blank', parseInvoice(null).businessName, '');
}

// ---------------------------------------------------------------- webhook retries
{
  const t0 = Date.UTC(2026, 0, 1);
  eq('webhook: 200 is delivered', afterAttempt(1, 200, t0).status, 'delivered');
  eq('webhook: 204 is delivered', afterAttempt(1, 204, t0).status, 'delivered');
  eq('webhook: 500 is retried', afterAttempt(1, 500, t0).status, 'retrying');
  eq('webhook: first retry after 1 min', afterAttempt(1, 500, t0).nextAttemptAt?.getTime(), t0 + 60_000);
  eq('webhook: second retry after 5 min', afterAttempt(2, 503, t0).nextAttemptAt?.getTime(), t0 + 300_000);
  eq('webhook: timeout (no response) is retried', afterAttempt(1, null, t0).status, 'retrying');
  eq('webhook: 404 fails at once', afterAttempt(1, 404, t0).status, 'failed');
  eq('webhook: 401 fails at once', afterAttempt(1, 401, t0).status, 'failed');
  eq('webhook: 429 is retried', afterAttempt(1, 429, t0).status, 'retrying');
  eq('webhook: 408 is retried', afterAttempt(1, 408, t0).status, 'retrying');
  eq('webhook: gives up after the last attempt', afterAttempt(MAX_ATTEMPTS, 500, t0).status, 'failed');
  eq('webhook: last retry is scheduled', afterAttempt(MAX_ATTEMPTS - 1, 500, t0).status, 'retrying');
  eq('webhook: 6 retries in the schedule', RETRY_DELAYS_MS.length, 6);
  eq('webhook: a 3xx redirect is retried, not followed', afterAttempt(1, 301, t0).status, 'retrying');
}

// ---------------------------------------------------------------- fraud scoring
{
  const settings = parseFraud({});
  const base: RiskSignals = {
    email: 'amina@gmail.com',
    name: 'Amina Khalil',
    amountCents: 4900,
    buyerCountry: 'MA',
    ipCountry: 'MA',
    ip: '41.0.0.1',
    emailOrdersLastHour: 0,
    ipOrdersLastHour: 0,
    unpaidLastWeek: 0,
    paidBefore: 0,
    averageOrderCents: 0,
    paymentMethod: 'crypto',
  };
  const clean = scoreRisk(base, settings);
  eq('fraud: ordinary buyer scores 0', clean.score, 0);
  eq('fraud: ordinary buyer is low', clean.level, 'low');
  eq('fraud: ordinary buyer not blocked', clean.blocked, false);

  eq('fraud: defaults on, not blocking', JSON.stringify([settings.enabled, settings.blockHigh]), '[true,false]');
  eq('fraud: medium never above high', parseFraud({ mediumAt: 90, highAt: 50 }).mediumAt, 50);
  eq('fraud: countries cleaned', parseFraud({ blockedCountries: 'ng, kp ,xyz' }).blockedCountries.join(','), 'NG,KP');
  eq('fraud: blocklist from lines', parseFraud({ blocklist: 'A@x.com\n@bad.io\n\n1.2.3.4' }).blocklist.length, 3);

  eq('fraud: mailinator is disposable', isDisposableEmail('x@mailinator.com'), true);
  eq('fraud: subdomain of disposable', isDisposableEmail('x@eu.yopmail.com'), true);
  eq('fraud: gmail is not disposable', isDisposableEmail('x@gmail.com'), false);

  eq('fraud: blocklist email match', blocklistHit(['bad@x.com'], { email: 'BAD@x.com' }), 'bad@x.com');
  eq('fraud: blocklist domain match', blocklistHit(['@x.com'], { email: 'a@mail.x.com' }), '@x.com');
  eq('fraud: blocklist ip match', blocklistHit(['9.9.9.9'], { email: 'a@b.com', ip: '9.9.9.9' }), '9.9.9.9');
  eq('fraud: blocklist no match', blocklistHit(['@x.com'], { email: 'a@notx.com' }), null);

  eq('fraud: single letter name is suspicious', suspiciousName('A'), true);
  eq('fraud: keyboard mash is suspicious', suspiciousName('asdfgh jkl'), true);
  eq('fraud: real name is fine', suspiciousName('Jean-Pierre Dubois'), false);
  eq('fraud: arabic name is fine', suspiciousName('أمينة خليل'), false);

  const listed = scoreRisk(base, parseFraud({ blocklist: ['amina@gmail.com'] }));
  eq('fraud: blocklisted buyer is blocked', listed.blocked, true);
  eq('fraud: blocklisted buyer scores 100', listed.score, 100);

  const country = scoreRisk({ ...base, ipCountry: 'NG' }, parseFraud({ blockedCountries: ['NG'] }));
  eq('fraud: blocked connecting country refused', country.blocked, true);

  const mismatch = scoreRisk({ ...base, ipCountry: 'US' }, settings);
  eq('fraud: country mismatch adds 20', mismatch.score, 20);

  const velocity = scoreRisk({ ...base, emailOrdersLastHour: 3, ipOrdersLastHour: 5, email: 'z@yopmail.com' }, settings);
  eq('fraud: velocity + throwaway is high', velocity.level, 'high');
  eq('fraud: high risk only flagged by default', velocity.blocked, false);
  eq('fraud: high risk blocked when asked', scoreRisk({ ...base, emailOrdersLastHour: 3, ipOrdersLastHour: 5, email: 'z@yopmail.com' }, parseFraud({ blockHigh: true })).blocked, true);

  const returning = scoreRisk({ ...base, ipCountry: 'US', paidBefore: 4 }, settings);
  eq('fraud: returning customer offsets a mismatch', returning.score, 0);

  const big = scoreRisk({ ...base, amountCents: 60_000, averageOrderCents: 5_000 }, settings);
  eq('fraud: large order flagged', big.reasons.some((r) => r.code === 'large_order'), true);
  const limit = scoreRisk({ ...base, amountCents: 60_000 }, parseFraud({ maxAmountCents: 50_000 }));
  eq('fraud: over review limit flagged', limit.reasons.some((r) => r.code === 'over_limit'), true);

  const off = scoreRisk(base, parseFraud({ enabled: false, blocklist: ['amina@gmail.com'] }));
  eq('fraud: switched off never blocks', off.blocked, false);
  eq('fraud: score never above 100', scoreRisk({ ...base, email: 'q@yopmail.com', emailOrdersLastHour: 9, ipOrdersLastHour: 9, ipCountry: 'US', unpaidLastWeek: 5, name: 'x', paymentMethod: 'amazon_giftcard' }, parseFraud({ blocklist: ['q@yopmail.com'] })).score, 100);
}

// ---------------------------------------------------------------- crypto catalog
{
  eq('catalog: every coin has a network', CRYPTO_CATALOG.every((c) => c.networks.length > 0), true);
  eq('catalog: symbols unique', new Set(CRYPTO_CATALOG.map((c) => c.symbol)).size, CRYPTO_CATALOG.length);
  eq('catalog: network ids unique per coin', CRYPTO_CATALOG.every((c) => new Set(c.networks.map((n) => n.id)).size === c.networks.length), true);

  eq('address: TRC20 accepts a Tron address', addressProblem('USDT', 'TRC20', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'), null);
  eq('address: TRC20 refuses an EVM address', addressProblem('USDT', 'TRC20', '0x' + 'a'.repeat(40)) !== null, true);
  eq('address: ERC20 accepts 0x address', addressProblem('USDT', 'ERC20', '0x' + 'A1'.repeat(20)), null);
  eq('address: ERC20 refuses a Tron address', addressProblem('USDC', 'ERC20', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t') !== null, true);
  eq('address: BTC bech32 accepted', addressProblem('BTC', 'Bitcoin', 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'), null);
  eq('address: BTC legacy accepted', addressProblem('BTC', 'Bitcoin', '1BoatSLRHtKNngkdXEeobR76b53LETtpyT'), null);
  eq('address: BTC refuses a Litecoin address', addressProblem('BTC', 'Bitcoin', 'ltc1qg42tkwuuxefutzxezdkdel39gfstuap288mfea') !== null, true);
  eq('address: LTC accepted', addressProblem('LTC', 'Litecoin', 'ltc1qg42tkwuuxefutzxezdkdel39gfstuap288mfea'), null);
  eq('address: spaces refused', addressProblem('USDT', 'TRC20', 'TR7N Hqje') !== null, true);
  eq('address: Lightning not pattern-checked', addressProblem('BTC', 'Lightning', 'lnurl1dp68gurn8ghj7'), null);
  eq('address: unknown coin not checked', addressProblem('AVAX', 'C-Chain', 'anything'), null);

  eq('network: old free text "Tron (TRC-20)" found', networkInfo('USDT', 'trc-20')?.id, 'TRC20');
  eq('network: label for BEP20', networkInfo('USDT', 'BEP20')?.label, 'BNB Smart Chain (BEP-20)');

  eq('amount: $39 at BTC 60000', coinAmount(3900, 2, 60000, 8), '0.00065000');
  eq('amount: rounds up, never down', coinAmount(1000, 2, 3, 2), '3.34');
  eq('amount: stable 1:1', coinAmount(3900, 2, 1, 2), '39.00');

  eq('verify: USDT on TRC20', autoVerifiable('USDT', 'TRC20'), true);
  eq('verify: BTC on Bitcoin', autoVerifiable('BTC', 'Bitcoin'), true);
  eq('verify: BTC on BEP20 is not', autoVerifiable('BTC', 'BEP20'), false);
  eq('verify: ETH on BEP20 is not', autoVerifiable('ETH', 'BEP20'), false);
  eq('verify: BNB on BEP20', autoVerifiable('BNB', 'BEP20'), true);
  eq('verify: DAI is not', autoVerifiable('DAI', 'ERC20'), false);
  eq('verify: USDC on Solana is not', autoVerifiable('USDC', 'Solana'), false);
  eq('verify: USDC on Polygon', autoVerifiable('USDC', 'Polygon'), true);
}

// ---------------------------------------------------------------- report periods
{
  const now = new Date(Date.UTC(2026, 10, 16, 15, 30));
  const p30 = resolvePeriod({ range: '30d' }, now);
  eq('reports: 30d ends tomorrow 00:00', p30.to.toISOString(), '2026-11-17T00:00:00.000Z');
  eq('reports: 30d starts 30 days earlier', p30.from.toISOString(), '2026-10-18T00:00:00.000Z');
  eq('reports: previous period same length', p30.prevTo.getTime() - p30.prevFrom.getTime(), p30.to.getTime() - p30.from.getTime());
  eq('reports: 30d is daily', p30.bucket, 'day');
  eq('reports: 30 daily buckets', bucketsFor(p30).length, 30);

  const mtd = resolvePeriod({ range: 'mtd' }, now);
  eq('reports: this month starts on the 1st', mtd.from.toISOString().slice(0, 10), '2026-11-01');
  const last = resolvePeriod({ range: 'last_month' }, now);
  eq('reports: last month', [last.from.toISOString().slice(0, 10), last.to.toISOString().slice(0, 10)].join(' '), '2026-10-01 2026-11-01');
  eq('reports: 90d is weekly', resolvePeriod({ range: '90d' }, now).bucket, 'week');
  eq('reports: 12 months is monthly', resolvePeriod({ range: '12m' }, now).bucket, 'month');
  eq('reports: 12 months has 12 buckets', bucketsFor(resolvePeriod({ range: '12m' }, now)).length, 12);

  const custom = resolvePeriod({ range: 'custom', from: '2026-02-01', to: '2026-02-28' }, now);
  eq('reports: custom range inclusive end', custom.to.toISOString().slice(0, 10), '2026-03-01');
  eq('reports: reversed custom range falls back', resolvePeriod({ range: 'custom', from: '2026-03-01', to: '2026-02-01' }, now).key, '30d');
  eq('reports: unknown range falls back', resolvePeriod({ range: 'forever' }, now).key, '30d');

  eq('reports: week buckets start Monday', bucketKey(new Date(Date.UTC(2026, 10, 15)), 'week'), '2026-11-09');
  eq('reports: pct up', pctChange(150, 100), 50);
  eq('reports: pct down', pctChange(50, 100), -50);
  eq('reports: pct from zero is unknown', pctChange(10, 0), null);

  eq('csv: plain', csvCell('abc'), 'abc');
  eq('csv: comma quoted', csvCell('a,b'), '"a,b"');
  eq('csv: quotes doubled', csvCell('say "hi"'), '"say ""hi"""');
  eq('csv: formula defused', csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  eq('csv: negative number kept', csvCell('-19.99'), '-19.99');
}

// ---------------------------------------------------------------- provider monitoring
{
  const up = { ok: true, message: 'ok', latencyMs: 300 };
  eq('monitor: healthy probe is up', combineStatus(up, { started: 10, failedToStart: 0 }).status, 'up');
  eq('monitor: failed probe is down', combineStatus({ ok: false, message: 'bad key', latencyMs: 100 }, { started: 0, failedToStart: 0 }).status, 'down');
  eq('monitor: slow probe is degraded', combineStatus({ ok: true, message: 'ok', latencyMs: 6000 }, { started: 0, failedToStart: 0 }).status, 'degraded');
  eq('monitor: most checkouts failing is down', combineStatus(up, { started: 4, failedToStart: 3 }).status, 'down');
  eq('monitor: some checkouts failing is degraded', combineStatus(up, { started: 10, failedToStart: 2 }).status, 'degraded');
  eq('monitor: one failure is not an incident', combineStatus(up, { started: 2, failedToStart: 1 }).status, 'up');
  eq('monitor: manual rail stays manual', combineStatus({ ok: null, message: 'manual', latencyMs: null }, { started: 3, failedToStart: 0 }).status, 'manual');

  const at = '2026-11-16T00:00:00Z';
  const r = (status: 'up' | 'down' | 'degraded') => ({ status, message: '', latencyMs: null, checkedAt: at });
  eq('monitor: alert when going down', alertTransitions({ stripe: r('up') }, { stripe: r('down') }).length, 1);
  eq('monitor: alert when recovering', alertTransitions({ stripe: r('down') }, { stripe: r('up') })[0]?.to, 'up');
  eq('monitor: no alert while still down', alertTransitions({ stripe: r('down') }, { stripe: r('down') }).length, 0);
  eq('monitor: no alert for degraded', alertTransitions({ stripe: r('up') }, { stripe: r('degraded') }).length, 0);
  eq('monitor: alerts on by default', parseMonitor({}).alerts, true);
  eq('monitor: bad status read as down', parseMonitor({ results: { x: { status: 'weird' } } }).results.x.status, 'down');
}

// ---------------------------------------------------------------- report
console.log(`\n${passed} checks passed`);
if (failures.length > 0) {
  console.log(`${failures.length} FAILED:\n`);
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
console.log('all green\n');
