import { NextResponse } from 'next/server';
import { safeEqual } from '@/lib/crypto';
import { runRecoveryForAll } from '@/lib/recovery';
import { sweepChainChecks } from '@/lib/chain/reconcile';
import { retryDueWebhooks } from '@/lib/webhooks';
import { runMonitorForAll } from '@/lib/monitor';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Housekeeping: abandoned checkout reminders, a re-check of every crypto
 * payment still waiting for confirmations, webhook retries that are due, and
 * a health check of every merchant's payment providers. All are idempotent,
 * so a scheduler may call this as often as it likes (an external one can run
 * it every few minutes; Vercel's free plan runs it once a day).
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET ?? '';
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not set, so this endpoint is disabled.' }, { status: 503 });
  }
  const header = request.headers.get('authorization') ?? '';
  const presented = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  if (!presented || !safeEqual(presented, secret)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const [recovery, chain, webhooks, monitor] = await Promise.all([
    runRecoveryForAll().catch((e) => ({ error: String(e) })),
    sweepChainChecks().catch((e) => ({ error: String(e) })),
    retryDueWebhooks({ limit: 200 }).catch((e) => ({ error: String(e) })),
    runMonitorForAll().catch((e) => ({ error: String(e) })),
  ]);
  return NextResponse.json({ recovery, chain, webhooks, monitor });
}

export const GET = handle;
export const POST = handle;
