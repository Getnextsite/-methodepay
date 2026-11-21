import 'server-only';
import { prisma } from './db';
import { env } from './env';
import { loadMerchantContext } from './gateway/context';
import { configIsReady, readConfig } from './gateway/config';
import { methodDefinition } from './gateway/registry';
import { chainOf } from './chain/networks';
import { parseChainVerify } from './chain/settings';
import { ONRAMP_API_HOST, ONRAMP_BRAND } from './gateway/onramp-hosts';
import { notifyMerchantAlert, prettyMethod } from './notifier';
import {
  alertTransitions,
  combineStatus,
  parseMonitor,
  type FlowStats,
  type ProviderResult,
} from './monitor-status';

/**
 * Provider monitoring.
 *
 * Each enabled rail is checked two ways: a live, read-only call to the
 * provider with the merchant's own credentials (no payment is ever created),
 * and the last 24 hours of real checkouts through that rail. Crypto rails
 * also check the public blockchain nodes that automatic verification uses.
 *
 * Results are kept on the merchant's settings, and an alert goes out when a
 * rail goes down or comes back, never on every run.
 */

type Probe = { ok: boolean | null; message: string; latencyMs: number | null };

const TIMEOUT_MS = 8_000;

async function timed(run: () => Promise<Response>): Promise<{ res: Response | null; ms: number; error: string | null }> {
  const started = Date.now();
  try {
    const res = await run();
    return { res, ms: Date.now() - started, error: null };
  } catch (e) {
    const message =
      e instanceof Error ? (e.name === 'TimeoutError' ? 'No answer within 8 seconds.' : e.message) : 'Unreachable.';
    return { res: null, ms: Date.now() - started, error: message };
  }
}

/** A host answers at all (anything below 500 means it is up). */
async function reachable(url: string, name: string): Promise<Probe> {
  const { res, ms, error } = await timed(() =>
    fetch(url, { method: 'GET', cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS) }),
  );
  if (!res) return { ok: false, message: `${name} is unreachable: ${error}`, latencyMs: ms };
  if (res.status >= 500) return { ok: false, message: `${name} answered with an error (HTTP ${res.status}).`, latencyMs: ms };
  return { ok: true, message: `${name} is reachable.`, latencyMs: ms };
}

async function probeStripe(config: Record<string, unknown>): Promise<Probe> {
  const key = String(config.secretKey ?? '');
  if (!key) return { ok: false, message: 'No Stripe secret key is saved.', latencyMs: null };
  const { res, ms, error } = await timed(() =>
    fetch('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }),
  );
  if (!res) return { ok: false, message: `Stripe is unreachable: ${error}`, latencyMs: ms };
  if (res.status === 401) return { ok: false, message: 'Stripe rejected the secret key. It may have been rolled or revoked.', latencyMs: ms };
  if (res.status === 403) return { ok: false, message: 'The Stripe key is restricted and cannot read the account.', latencyMs: ms };
  if (!res.ok) return { ok: false, message: `Stripe answered with HTTP ${res.status}.`, latencyMs: ms };
  return { ok: true, message: `Stripe accepted the key${key.startsWith('sk_test') ? ' (test mode)' : ''}.`, latencyMs: ms };
}

async function probePaypal(config: Record<string, unknown>): Promise<Probe> {
  const id = String(config.clientId ?? '');
  const secret = String(config.clientSecret ?? '');
  if (!id || !secret) return { ok: false, message: 'The PayPal client ID or secret is missing.', latencyMs: null };
  const base = config.sandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
  const { res, ms, error } = await timed(() =>
    fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }),
  );
  if (!res) return { ok: false, message: `PayPal is unreachable: ${error}`, latencyMs: ms };
  if (res.status === 401) return { ok: false, message: 'PayPal rejected the client ID and secret.', latencyMs: ms };
  if (!res.ok) return { ok: false, message: `PayPal answered with HTTP ${res.status}.`, latencyMs: ms };
  return { ok: true, message: `PayPal accepted the credentials${config.sandbox ? ' (sandbox)' : ''}.`, latencyMs: ms };
}

function host(value: unknown, fallback: string): string {
  const raw = String(value ?? '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(raw) ? raw : fallback;
}

const EVM_RPC: Record<string, string> = {
  eth: 'https://ethereum-rpc.publicnode.com',
  bsc: 'https://bsc-rpc.publicnode.com',
  polygon: 'https://polygon-bor-rpc.publicnode.com',
};
const CHAIN_NAMES: Record<string, string> = {
  btc: 'Bitcoin node',
  ltc: 'Litecoin node',
  eth: 'Ethereum node',
  bsc: 'BNB Chain node',
  polygon: 'Polygon node',
  tron: 'TRON node',
  prices: 'Price feed',
};

async function probeChain(chain: string): Promise<Probe> {
  const name = CHAIN_NAMES[chain] ?? chain;
  if (chain === 'btc' || chain === 'ltc') {
    const base = chain === 'btc' ? 'https://mempool.space/api' : 'https://litecoinspace.org/api';
    const { res, ms, error } = await timed(() =>
      fetch(`${base}/blocks/tip/height`, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) }),
    );
    if (!res || !res.ok) return { ok: false, message: `${name} is not answering${error ? `: ${error}` : ''}.`, latencyMs: ms };
    const height = (await res.text()).trim();
    return { ok: true, message: `${name} is at block ${height}.`, latencyMs: ms };
  }
  if (EVM_RPC[chain]) {
    const { res, ms, error } = await timed(() =>
      fetch(EVM_RPC[chain], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
        cache: 'no-store',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }),
    );
    if (!res || !res.ok) return { ok: false, message: `${name} is not answering${error ? `: ${error}` : ''}.`, latencyMs: ms };
    const json = (await res.json().catch(() => ({}))) as { result?: string };
    if (!json.result) return { ok: false, message: `${name} answered without a block number.`, latencyMs: ms };
    return { ok: true, message: `${name} is at block ${Number(BigInt(json.result))}.`, latencyMs: ms };
  }
  if (chain === 'tron') {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (process.env.TRONGRID_API_KEY) headers['TRON-PRO-API-KEY'] = process.env.TRONGRID_API_KEY;
    const { res, ms, error } = await timed(() =>
      fetch('https://api.trongrid.io/wallet/getnowblock', {
        method: 'POST',
        headers,
        body: '{}',
        cache: 'no-store',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }),
    );
    if (!res) return { ok: false, message: `${name} is not answering: ${error}`, latencyMs: ms };
    if (res.status === 429 || res.status === 403) {
      return {
        ok: true,
        message: `${name} is rate-limiting free requests. Adding a TRONGRID_API_KEY makes checks reliable.`,
        latencyMs: ms,
      };
    }
    if (!res.ok) return { ok: false, message: `${name} answered with HTTP ${res.status}.`, latencyMs: ms };
    const json = (await res.json().catch(() => ({}))) as { block_header?: { raw_data?: { number?: number } } };
    return { ok: true, message: `${name} is at block ${json.block_header?.raw_data?.number ?? '?'}.`, latencyMs: ms };
  }
  if (chain === 'prices') {
    const { res, ms, error } = await timed(() =>
      fetch('https://api.coingecko.com/api/v3/ping', { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) }),
    );
    if (!res) return { ok: false, message: `${name} is not answering: ${error}`, latencyMs: ms };
    if (res.status === 429) return { ok: true, message: `${name} is busy (rate limited); prices are retried.`, latencyMs: ms };
    if (!res.ok) return { ok: false, message: `${name} answered with HTTP ${res.status}.`, latencyMs: ms };
    return { ok: true, message: `${name} is answering.`, latencyMs: ms };
  }
  return { ok: null, message: 'Not checked.', latencyMs: null };
}

const CRYPTO_RAILS = new Set(['crypto', 'bc_paypal', 'bc_cashapp', 'finchpay_btc']);

async function probeRail(key: string, config: Record<string, unknown>): Promise<Probe> {
  switch (key) {
    case 'stripe':
      return probeStripe(config);
    case 'paypal':
      return probePaypal(config);
    case 'alchemypay':
      return reachable(config.test ? 'https://ramptest.alchemypay.org' : 'https://ramp.alchemypay.org', 'Alchemy Pay');
    case 'onramppay':
    case 'op_cashapp':
    case 'op_binance':
    case 'op_revolut':
    case 'op_upi':
    case 'op_paypalus':
      return reachable(`https://${host(config.apiDomain, ONRAMP_API_HOST)}/`, ONRAMP_BRAND);
    case 'finchpay_btc':
      return reachable('https://widget.finchpay.io/', 'FinchPay');
    case 'crypto':
    case 'bc_paypal':
    case 'bc_cashapp':
      return { ok: null, message: 'Paid straight to your wallet. The blockchain nodes are checked below.', latencyMs: null };
    default:
      return { ok: null, message: 'You confirm these payments yourself, so there is nothing to probe.', latencyMs: null };
  }
}

/** Last 24 hours of checkouts per rail, and how many failed to start. */
async function flowStats(accountId: string): Promise<Record<string, FlowStats>> {
  const since = new Date(Date.now() - 86_400_000);
  const [started, failed] = await Promise.all([
    prisma.order.groupBy({
      by: ['paymentMethod'],
      where: { accountId, createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.orderEvent.findMany({
      where: { type: 'initiate_failed', createdAt: { gte: since }, order: { accountId } },
      select: { meta: true },
    }),
  ]);
  const stats: Record<string, FlowStats> = {};
  for (const row of started) {
    if (row.paymentMethod) stats[row.paymentMethod] = { started: row._count._all, failedToStart: 0 };
  }
  for (const event of failed) {
    const method = (event.meta as Record<string, unknown> | null)?.method;
    if (typeof method === 'string') {
      stats[method] ??= { started: 0, failedToStart: 0 };
      stats[method].failedToStart += 1;
    }
  }
  return stats;
}

export type MonitorRow = ProviderResult & { key: string; label: string; kind: 'rail' | 'chain'; flow: FlowStats };

/** Run every check for one merchant, save the results, alert on changes. */
export async function runMonitor(accountId: string, opts: { alert?: boolean } = {}): Promise<MonitorRow[]> {
  const ctx = await loadMerchantContext(accountId);
  const settingsRow = await prisma.notificationSettings.findUnique({
    where: { accountId },
    select: { monitor: true, chainVerify: true },
  });
  const previous = parseMonitor(settingsRow?.monitor);
  const chainVerify = parseChainVerify(settingsRow?.chainVerify);
  const flows = await flowStats(accountId);
  const checkedAt = new Date().toISOString();
  const empty: FlowStats = { started: 0, failedToStart: 0 };

  const rails = ctx.methods.filter((m) => m.enabled);
  const railRows = await Promise.all(
    rails.map(async (row): Promise<MonitorRow> => {
      const def = methodDefinition(row.key);
      const label = row.label?.trim() || def?.defaultLabel || prettyMethod(row.key);
      const config = readConfig(row, row.key);
      const flow = flows[row.key] ?? empty;
      if (def && !configIsReady(row.key, config)) {
        return { key: row.key, label, kind: 'rail', flow, status: 'unconfigured', message: 'Switched on but the settings are incomplete, so buyers do not see it.', latencyMs: null, checkedAt };
      }
      const probe = await probeRail(row.key, config).catch(
        (e): Probe => ({ ok: false, message: e instanceof Error ? e.message : 'Check failed.', latencyMs: null }),
      );
      const combined = combineStatus(probe, flow);
      return { key: row.key, label, kind: 'rail', flow, status: combined.status, message: combined.message, latencyMs: probe.latencyMs, checkedAt };
    }),
  );

  for (const manual of ctx.manualMethods.filter((m) => m.enabled)) {
    const key = `manual_${manual.slot}`;
    railRows.push({
      key,
      label: manual.name || `Manual method ${manual.slot}`,
      kind: 'rail',
      flow: flows[key] ?? empty,
      status: 'manual',
      message: 'You confirm these payments yourself, so there is nothing to probe.',
      latencyMs: null,
      checkedAt,
    });
  }

  // Blockchain nodes, only for chains this merchant actually has wallets on,
  // and only when automatic verification is on.
  const chainRows: MonitorRow[] = [];
  const usesCrypto = rails.some((r) => CRYPTO_RAILS.has(r.key));
  if (usesCrypto && chainVerify.enabled) {
    const wallets = await prisma.wallet.findMany({ where: { accountId, active: true }, select: { coin: true, network: true } });
    const chains = [...new Set(wallets.map((w) => chainOf(w.coin, w.network)).filter((c): c is NonNullable<typeof c> => Boolean(c)))];
    const keys = [...chains, 'prices'];
    const probes = await Promise.all(keys.map((c) => probeChain(c)));
    keys.forEach((chain, i) => {
      const combined = combineStatus(probes[i], empty);
      chainRows.push({
        key: `chain:${chain}`,
        label: CHAIN_NAMES[chain] ?? chain,
        kind: 'chain',
        flow: empty,
        status: combined.status,
        message: combined.message,
        latencyMs: probes[i].latencyMs,
        checkedAt,
      });
    });
  }

  // Wallet rails are checked through the nodes that verify them: they are
  // as healthy as the worst node. A node outage does not stop buyers paying,
  // only automatic confirmation, so it degrades the rail rather than downing it.
  if (chainRows.length) {
    const worst = chainRows.some((c) => c.status === 'down')
      ? 'degraded'
      : chainRows.some((c) => c.status === 'degraded')
        ? 'degraded'
        : 'up';
    for (const row of railRows) {
      if (row.status !== 'manual' || !['crypto', 'bc_paypal', 'bc_cashapp'].includes(row.key)) continue;
      row.status = worst;
      row.message =
        worst === 'up'
          ? 'Paid straight to your wallet and verified automatically on the blockchain.'
          : 'Paid straight to your wallet, but automatic verification is affected: see the blockchain nodes below.';
    }
  }

  const rows = [...railRows, ...chainRows];
  const results: Record<string, ProviderResult> = {};
  for (const r of rows) results[r.key] = { status: r.status, message: r.message, latencyMs: r.latencyMs, checkedAt: r.checkedAt };

  await prisma.notificationSettings.upsert({
    where: { accountId },
    create: { accountId, monitor: { alerts: previous.alerts, checkedAt, results } },
    update: { monitor: { alerts: previous.alerts, checkedAt, results } },
  });

  if (opts.alert !== false && previous.alerts && previous.checkedAt) {
    const changes = alertTransitions(previous.results, results);
    if (changes.length > 0) {
      const down = changes.filter((c) => c.to === 'down');
      const back = changes.filter((c) => c.to === 'up');
      const label = (key: string) => rows.find((r) => r.key === key)?.label ?? key;
      const lines = [
        ...down.map((c) => `${label(c.key)} is down: ${results[c.key].message}`),
        ...back.map((c) => `${label(c.key)} is working again.`),
      ];
      const subject = down.length
        ? `${down.map((c) => label(c.key)).join(', ')} ${down.length === 1 ? 'is' : 'are'} down on your checkout`
        : `${back.map((c) => label(c.key)).join(', ')} ${back.length === 1 ? 'is' : 'are'} working again`;
      await notifyMerchantAlert(ctx, subject, lines, {
        href: `${env.appUrl}/dashboard/monitoring`,
        label: 'Open provider status',
      }).catch(() => false);
    }
  }

  return rows;
}

/** Cron: every merchant with at least one switched-on rail. */
export async function runMonitorForAll(): Promise<{ accounts: number; down: number }> {
  const accounts = await prisma.account.findMany({
    where: { suspendedAt: null, paymentMethods: { some: { enabled: true } } },
    select: { id: true },
  });
  let down = 0;
  for (const a of accounts) {
    const rows = await runMonitor(a.id).catch(() => []);
    down += rows.filter((r) => r.status === 'down').length;
  }
  return { accounts: accounts.length, down };
}
