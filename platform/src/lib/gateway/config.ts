import 'server-only';
import type { PaymentMethodConfig } from '@prisma/client';
import { decryptSecret, encryptSecret, maskSecret } from '../crypto';
import { defaultConfig, METHODS_BY_KEY, secretFieldNames } from './registry';
import type { MethodConfig } from './types';

/**
 * Secret handling for rail configuration.
 *
 * Secrets live encrypted in PaymentMethodConfig.config. Two readers exist and
 * they are deliberately different:
 *
 *   readConfig()   — server only, decrypts. Used by initiate() and webhooks.
 *   publicConfig() — masked. The only shape allowed to reach a browser.
 *
 * Keeping them apart means a careless `JSON.stringify(method)` in a component
 * cannot leak a live Stripe key.
 */

function raw(method: PaymentMethodConfig | null): MethodConfig {
  if (!method) return {};
  const value = method.config;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as MethodConfig;
}

export function readConfig(method: PaymentMethodConfig | null, key?: string): MethodConfig {
  const railKey = key ?? method?.key ?? '';
  const stored = raw(method);
  const merged: MethodConfig = { ...defaultConfig(railKey), ...stored };
  for (const name of secretFieldNames(railKey)) {
    const value = stored[name];
    merged[name] = typeof value === 'string' ? decryptSecret(value) : '';
  }
  return merged;
}

export function publicConfig(method: PaymentMethodConfig | null, key?: string): MethodConfig {
  const railKey = key ?? method?.key ?? '';
  const stored = raw(method);
  const merged: MethodConfig = { ...defaultConfig(railKey), ...stored };
  for (const name of secretFieldNames(railKey)) {
    const value = stored[name];
    merged[name] = typeof value === 'string' && value ? maskSecret(decryptSecret(value)) : '';
  }
  return merged;
}

/**
 * Prepare a submitted form for storage: coerce by declared type, encrypt the
 * secret fields, and preserve an existing secret when the field comes back as
 * the mask (the merchant left it alone).
 */
export function prepareConfigForStorage(
  key: string,
  submitted: Record<string, unknown>,
  existing: PaymentMethodConfig | null,
): MethodConfig {
  const def = METHODS_BY_KEY[key];
  if (!def) return {};
  const previous = raw(existing);
  const out: MethodConfig = {};

  for (const field of def.fields) {
    const incoming = submitted[field.name];

    if (field.secret) {
      const value = typeof incoming === 'string' ? incoming.trim() : '';
      // An untouched masked value, or an empty box, keeps what we already have.
      if (!value || value.includes('•')) {
        const kept = previous[field.name];
        if (typeof kept === 'string' && kept) out[field.name] = kept;
        continue;
      }
      out[field.name] = encryptSecret(value);
      continue;
    }

    switch (field.type) {
      case 'checkbox':
        out[field.name] = incoming === true || incoming === 'on' || incoming === '1';
        break;
      case 'number': {
        const n = Number(incoming);
        out[field.name] = Number.isFinite(n) ? n : Number(field.defaultValue ?? 0);
        break;
      }
      default:
        out[field.name] = typeof incoming === 'string' ? incoming.trim() : '';
    }
  }
  return out;
}

export function configIsReady(key: string, config: MethodConfig): boolean {
  const def = METHODS_BY_KEY[key];
  if (!def) return false;
  return def.isReady(config);
}
