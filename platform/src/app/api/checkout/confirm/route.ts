import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { claimPayment } from '@/lib/orders';

export const dynamic = 'force-dynamic';

const schema = z.object({
  nonce: z.string().min(10).max(64),
  reference: z.string().trim().max(120).optional(),
});

/**
 * The buyer reporting a payment on a manual rail.
 *
 * Moves the order to AWAITING_VERIFICATION and alerts the merchant. It
 * deliberately cannot mark an order paid: the only things that can are a
 * verified provider webhook and a human in the dashboard. Otherwise anyone
 * holding a checkout link could claim their own order was settled.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { nonce: parsed.data.nonce },
    select: { id: true, status: true },
  });
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

  if (order.status === 'PAID') {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }
  if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
    return NextResponse.json({ error: 'That order is closed.' }, { status: 409 });
  }

  await claimPayment(order.id, { reference: parsed.data.reference, channel: 'checkout' });
  return NextResponse.json({ ok: true });
}
