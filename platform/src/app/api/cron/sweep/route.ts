import { NextResponse } from 'next/server';
import { safeEqual } from '@/lib/crypto';
import { runRecoveryForAll } from '@/lib/recovery';
import { sweepChainChecks } from '@/lib/chain/reconcile';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Daily housekeeping: abandoned checkout reminders, and a re-check of every
 * crypto payment still waiting for confirmations. Both are idempotent, so a
 * scheduler may call this as often as it likes (an external one can run it
 * hourly; Vercel's free plan runs it once a day).
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

  const [recovery, chain] = await Promise.all([
    runRecoveryForAll().catch((e) => ({ error: String(e) })),
    sweepChainChecks().catch((e) => ({ error: String(e) })),
  ]);
  return NextResponse.json({ recovery, chain });
}

export const GET = handle;
export const POST = handle;
