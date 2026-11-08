import 'server-only';
import { randomBytes } from 'node:crypto';
import type { Account } from '@prisma/client';
import { prisma } from './db';
import { sha256 } from './crypto';
import { entitlementsFor } from './entitlements';

/**
 * Merchant API keys.
 *
 * The plugin shipped an "agent API" guarded by a key kept in plaintext in
 * wp_options. Here the secret is shown once at creation and only its hash is
 * stored, so a database leak does not hand over working credentials and we can
 * honestly say we cannot recover a lost key.
 *
 * Format: mp_live_<prefix>_<secret>. The prefix is stored in the clear so the
 * UI can label a key, and lookup is one indexed query rather than a scan.
 */

const PREFIX_BYTES = 6;
const SECRET_BYTES = 24;

export type MintedKey = { id: string; prefix: string; token: string };

export async function mintApiKey(
  accountId: string,
  name: string,
  scopes: string[] = ['read', 'write'],
): Promise<MintedKey> {
  const prefix = randomBytes(PREFIX_BYTES).toString('hex');
  const secret = randomBytes(SECRET_BYTES).toString('base64url');
  const token = `mp_live_${prefix}_${secret}`;

  const row = await prisma.apiKey.create({
    data: { accountId, name: name.trim().slice(0, 80) || 'API key', prefix, keyHash: sha256(token), scopes },
  });

  return { id: row.id, prefix, token };
}

export type ApiCaller = {
  accountId: string;
  account: Account;
  keyId: string;
  scopes: string[];
};

/**
 * Authenticate a request from the public API.
 *
 * Returns null for every failure mode — missing header, unknown key, revoked
 * key, plan without API access — because telling an unauthenticated caller
 * *which* of those applies is free reconnaissance.
 */
export async function authenticateApiRequest(request: Request): Promise<ApiCaller | null> {
  const header = request.headers.get('authorization') ?? '';
  const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  const token = bearer || request.headers.get('x-methodepay-key')?.trim() || '';
  if (!token.startsWith('mp_live_')) return null;

  const prefix = token.split('_')[2] ?? '';
  if (!prefix) return null;

  const key = await prisma.apiKey.findUnique({
    where: { prefix },
    include: { account: true },
  });
  if (!key || key.revokedAt) return null;
  if (key.keyHash !== sha256(token)) return null;
  if (key.account.suspendedAt) return null;
  if (!entitlementsFor(key.account).apiAccess) return null;

  // Fire and forget: a last-used timestamp is not worth failing a request for.
  prisma.apiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    accountId: key.accountId,
    account: key.account,
    keyId: key.id,
    scopes: key.scopes.length > 0 ? key.scopes : ['read', 'write'],
  };
}

export function hasScope(caller: ApiCaller, scope: 'read' | 'write'): boolean {
  return caller.scopes.includes(scope);
}

export function apiError(message: string, status = 400, code = 'bad_request') {
  return Response.json({ error: { code, message } }, { status });
}
