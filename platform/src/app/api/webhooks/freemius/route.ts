import { NextResponse } from 'next/server';
import { applyFreemiusEvent, verifyFreemiusSignature, type FreemiusEvent } from '@/lib/freemius';
import { freemiusConfigured } from '@/lib/env';
import { forget, once } from '@/lib/webhooks';

export const dynamic = 'force-dynamic';

/**
 * Platform billing webhooks from Freemius — what merchants pay us.
 *
 * The only thing in the system that may change an account plan. The return URL
 * from checkout can bind an identity but never grants anything, because a
 * merchant can type a return URL and cannot forge this signature.
 */
export async function POST(request: Request) {
  if (!freemiusConfigured()) {
    return NextResponse.json({ error: 'Freemius billing is not configured.' }, { status: 503 });
  }

  // Must be the raw bytes. Parsing and re-serialising produces a different
  // sequence and the HMAC would never match.
  const raw = await request.text();

  if (!verifyFreemiusSignature(raw, request.headers.get('x-signature'))) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  let event: FreemiusEvent;
  try {
    event = JSON.parse(raw) as FreemiusEvent;
  } catch {
    return NextResponse.json({ error: 'Malformed payload.' }, { status: 400 });
  }

  const eventId = event.id ? String(event.id) : '';

  // Freemius retries, and a replayed upgrade must not reopen a cancelled plan.
  if (eventId && !(await once('freemius', eventId))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    const result = await applyFreemiusEvent(event);

    if (result === 'unresolved') {
      // Nothing here ties the payment to an account. A retry would reach the
      // same conclusion, so this is acknowledged rather than left to loop,
      // and logged loudly because somebody has paid and has nothing.
      console.error('[freemius] unresolved event', event.type, eventId);
      return NextResponse.json({ received: true, resolved: false });
    }

    return NextResponse.json({ received: true, applied: result === 'applied' });
  } catch (error) {
    // Release the idempotency claim so the retry is treated as new work
    // rather than mistaken for a duplicate and silently dropped.
    if (eventId) await forget('freemius', eventId);
    console.error('[freemius] handler failed', event.type, error);
    return NextResponse.json({ error: 'Handler failed.' }, { status: 500 });
  }
}
