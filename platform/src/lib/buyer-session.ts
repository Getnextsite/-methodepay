import 'server-only';
import { createHmac } from 'node:crypto';
import { cookies } from 'next/headers';
import { env } from './env';
import { safeEqual } from './crypto';

/**
 * Customer portal sessions.
 *
 * Buyers have no password: they prove they own an email either by clicking a
 * link we mailed to it, or by quoting an order reference together with the
 * email it was placed with. Either way they get a signed, store-scoped token.
 * Nothing is stored server-side; the signature is the session.
 */
const COOKIE = 'mp_buyer';
const SESSION_DAYS = 30;
const LINK_MINUTES = 30;

type Payload = { p: 'session' | 'link'; a: string; e: string; x: number };

function sign(body: string): string {
  return createHmac('sha256', `${env.sessionSecret}:buyer-portal`).update(body).digest('base64url');
}

function encode(payload: Payload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

function decode(token: string, purpose: Payload['p']): Payload | null {
  const [body, sig] = token.split('.');
  if (!body || !sig || !safeEqual(sig, sign(body))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as Payload;
    if (payload.p !== purpose || typeof payload.a !== 'string' || typeof payload.e !== 'string') return null;
    if (payload.x < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** A one-time-ish sign-in link token, valid for 30 minutes. */
export function linkToken(accountId: string, email: string): string {
  return encode({ p: 'link', a: accountId, e: email.toLowerCase(), x: Date.now() + LINK_MINUTES * 60_000 });
}

export function readLinkToken(token: string): { accountId: string; email: string } | null {
  const p = decode(token, 'link');
  return p ? { accountId: p.a, email: p.e } : null;
}

export function startBuyerSession(accountId: string, email: string): void {
  cookies().set(COOKIE, encode({ p: 'session', a: accountId, e: email.toLowerCase(), x: Date.now() + SESSION_DAYS * 86_400_000 }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 86_400,
  });
}

export function endBuyerSession(): void {
  cookies().delete(COOKIE);
}

/** The signed-in buyer's email for this store, or null. */
export function buyerEmailFor(accountId: string): string | null {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  const p = decode(token, 'session');
  return p && p.a === accountId ? p.e : null;
}
