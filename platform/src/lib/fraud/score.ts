/**
 * Fraud screening: settings and scoring. Pure (no database, no network), so
 * every rule is covered by scripts/verify-logic.ts.
 *
 * The score is a sum of points from independent signals, capped at 100. It is
 * deliberately explainable: every point carries a sentence the merchant can
 * read on the order, because a score nobody can explain is a score nobody
 * trusts enough to act on.
 */

export type FraudSettings = {
  enabled: boolean;
  /** Refuse high-risk checkouts outright instead of only flagging them. */
  blockHigh: boolean;
  mediumAt: number;
  highAt: number;
  /** Orders per hour from one email or one IP before it counts as velocity. */
  velocityPerHour: number;
  /** Flag orders above this amount (0 = off). */
  maxAmountCents: number;
  /** ISO country codes whose checkouts are refused. */
  blockedCountries: string[];
  /** Emails, @domains and IPs that are always refused. */
  blocklist: string[];
};

export const DEFAULT_FRAUD: FraudSettings = {
  enabled: true,
  blockHigh: false,
  mediumAt: 35,
  highAt: 70,
  velocityPerHour: 3,
  maxAmountCents: 0,
  blockedCountries: [],
  blocklist: [],
};

function num(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : fallback;
}

function list(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[\n,]+/) : [];
  return [...new Set(raw.map((v) => String(v).trim().toLowerCase()).filter(Boolean))].slice(0, 500);
}

export function parseFraud(value: unknown): FraudSettings {
  const v = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const highAt = num(v.highAt, DEFAULT_FRAUD.highAt, 10, 100);
  const mediumAt = Math.min(num(v.mediumAt, DEFAULT_FRAUD.mediumAt, 5, 100), highAt);
  return {
    enabled: v.enabled !== false,
    blockHigh: v.blockHigh === true,
    mediumAt,
    highAt,
    velocityPerHour: num(v.velocityPerHour, DEFAULT_FRAUD.velocityPerHour, 1, 100),
    maxAmountCents: num(v.maxAmountCents, 0, 0, 1_000_000_000),
    blockedCountries: list(v.blockedCountries)
      .map((c) => c.toUpperCase())
      .filter((c) => /^[A-Z]{2}$/.test(c)),
    blocklist: list(v.blocklist),
  };
}

/** Throwaway inbox providers. Short on purpose: the big ones, kept current. */
const DISPOSABLE = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'sharklasers.com', 'grr.la',
  '10minutemail.com', '10minutemail.net', 'tempmail.com', 'temp-mail.org', 'temp-mail.io',
  'tempmailo.com', 'tempr.email', 'throwawaymail.com', 'yopmail.com', 'yopmail.fr', 'yopmail.net',
  'getnada.com', 'nada.email', 'trashmail.com', 'trashmail.de', 'dispostable.com', 'maildrop.cc',
  'mailnesia.com', 'mintemail.com', 'fakeinbox.com', 'emailondeck.com', 'mohmal.com',
  'moakt.com', 'spamgourmet.com', 'mailcatch.com', 'burnermail.io', 'inboxkitten.com',
  'tempinbox.com', 'discard.email', 'mail.tm', 'mailpoof.com', 'mytemp.email', 'emailfake.com',
  'fakemail.net', 'luxusmail.org', 'tmail.ws', 'tmpmail.org', 'tmpmail.net', 'spambox.us',
  'byom.de', 'eyepaste.com', 'harakirimail.com', 'mailforspam.com', 'anonbox.net', 'cock.li',
  'linshiyouxiang.net', 'emailtemporanea.net', 'correotemporal.org', 'wegwerfmail.de',
  'einrot.com', 'mvrht.net', 'mailsac.com', 'firemailbox.club', 'tempmail.plus', 'mailto.plus',
]);

export function emailDomain(email: string): string {
  return email.trim().toLowerCase().split('@')[1] ?? '';
}

export function isDisposableEmail(email: string): boolean {
  const domain = emailDomain(email);
  if (!domain) return false;
  if (DISPOSABLE.has(domain)) return true;
  // Subdomains of a disposable provider are disposable too.
  return [...DISPOSABLE].some((d) => domain.endsWith('.' + d));
}

/** Which blocklist entry, if any, matches this buyer. */
export function blocklistHit(
  blocklist: string[],
  buyer: { email: string; ip?: string | null },
): string | null {
  const email = buyer.email.trim().toLowerCase();
  const domain = emailDomain(email);
  const ip = (buyer.ip ?? '').trim().toLowerCase();
  for (const entry of blocklist) {
    if (entry === email) return entry;
    if (entry.startsWith('@') && (domain === entry.slice(1) || domain.endsWith('.' + entry.slice(1)))) return entry;
    if (ip && entry === ip) return entry;
  }
  return null;
}

/** A name that is a single letter, all digits, or a keyboard mash. */
export function suspiciousName(name: string): boolean {
  const n = name.trim();
  const letters = n.replace(/[^\p{L}]/gu, '');
  if (letters.length < 2) return true;
  if (/\d{3,}/.test(n)) return true;
  if (/^(asdf|qwer|zxcv|test|aaaa|xxxx|fake)/i.test(letters)) return true;
  // Six or more consonants in a row does not happen in real names.
  return /[bcdfghjklmnpqrstvwxz]{6,}/i.test(letters);
}

export type RiskSignals = {
  email: string;
  name: string;
  amountCents: number;
  buyerCountry?: string | null;
  /** Country the request came from (from the edge), if known. */
  ipCountry?: string | null;
  ip?: string | null;
  /** Orders from this email in the last hour, not counting this one. */
  emailOrdersLastHour: number;
  /** Orders from this IP in the last hour, not counting this one. */
  ipOrdersLastHour: number;
  /** Orders from this email in the last 7 days that were never paid. */
  unpaidLastWeek: number;
  /** Paid orders from this email, ever. A returning customer lowers risk. */
  paidBefore: number;
  /** The store's average paid order, for spotting outliers (0 = unknown). */
  averageOrderCents: number;
  /** The rail chosen. Gift cards and irreversible rails carry more risk. */
  paymentMethod: string;
};

export type RiskReason = { code: string; points: number; label: string };
export type RiskLevel = 'low' | 'medium' | 'high';
export type RiskAssessment = {
  score: number;
  level: RiskLevel;
  reasons: RiskReason[];
  /** Refuse this checkout (blocklist, blocked country, or high risk with blockHigh on). */
  blocked: boolean;
};

const HIGH_RISK_RAILS = new Set(['amazon_giftcard']);

export function scoreRisk(signals: RiskSignals, settings: FraudSettings): RiskAssessment {
  const reasons: RiskReason[] = [];
  const add = (code: string, points: number, label: string) => reasons.push({ code, points, label });
  let hardBlock = false;

  const hit = blocklistHit(settings.blocklist, { email: signals.email, ip: signals.ip });
  if (hit) {
    add('blocklist', 100, `Matches your blocklist (${hit}).`);
    hardBlock = true;
  }

  const country = (signals.buyerCountry ?? '').toUpperCase();
  const ipCountry = (signals.ipCountry ?? '').toUpperCase();
  const blockedCountry = [country, ipCountry].find((c) => c && settings.blockedCountries.includes(c));
  if (blockedCountry) {
    add('blocked_country', 100, `Country ${blockedCountry} is on your blocked list.`);
    hardBlock = true;
  }

  if (isDisposableEmail(signals.email)) add('disposable_email', 30, 'Uses a throwaway email address.');
  if (suspiciousName(signals.name)) add('suspicious_name', 10, 'The name looks made up.');

  if (country && ipCountry && country !== ipCountry) {
    add('country_mismatch', 20, `Billing country ${country} but connecting from ${ipCountry}.`);
  }

  const limit = settings.velocityPerHour;
  if (signals.emailOrdersLastHour >= limit) {
    add('velocity_email', 25, `${signals.emailOrdersLastHour + 1} checkouts from this email in an hour.`);
  }
  if (signals.ipOrdersLastHour >= limit) {
    add('velocity_ip', 25, `${signals.ipOrdersLastHour + 1} checkouts from this IP address in an hour.`);
  }

  if (signals.unpaidLastWeek >= 3) {
    add('unpaid_history', 15, `${signals.unpaidLastWeek} unpaid orders from this email this week.`);
  }

  if (settings.maxAmountCents > 0 && signals.amountCents > settings.maxAmountCents) {
    add('over_limit', 20, 'Above the order amount you set for review.');
  } else if (
    signals.averageOrderCents > 0 &&
    signals.amountCents >= signals.averageOrderCents * 5 &&
    signals.amountCents >= 10_000
  ) {
    add('large_order', 15, 'Five times your average order or more.');
  }

  if (HIGH_RISK_RAILS.has(signals.paymentMethod)) {
    add('risky_rail', 10, 'Gift cards are a common way to pay with stolen money.');
  }

  if (signals.paidBefore > 0 && !hardBlock) {
    add('returning_buyer', -20, `Returning customer with ${signals.paidBefore} paid order${signals.paidBefore === 1 ? '' : 's'}.`);
  }

  const score = Math.max(0, Math.min(100, reasons.reduce((sum, r) => sum + r.points, 0)));
  const level: RiskLevel = score >= settings.highAt ? 'high' : score >= settings.mediumAt ? 'medium' : 'low';
  const blocked = settings.enabled && (hardBlock || (settings.blockHigh && level === 'high'));
  return { score, level, reasons, blocked };
}
