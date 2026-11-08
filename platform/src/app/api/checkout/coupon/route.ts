import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { validateCoupon } from '@/lib/coupons';

export const dynamic = 'force-dynamic';

const schema = z.object({
  productId: z.string().min(1),
  code: z.string().trim().min(1).max(64),
});

/**
 * Check a coupon from the checkout page.
 *
 * The discount returned here is for display. It is recomputed server-side when
 * the order is created, so a tampered response changes what the buyer sees and
 * nothing about what they are charged.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ valid: false, reason: 'Malformed request.' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ valid: false, reason: 'Enter a coupon code.' }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
    select: { accountId: true, priceCents: true, active: true },
  });
  if (!product?.active) {
    return NextResponse.json({ valid: false, reason: 'That product is not available.' }, { status: 404 });
  }

  const result = await validateCoupon(product.accountId, parsed.data.code, product.priceCents);
  return NextResponse.json(
    result.valid
      ? { valid: true, discountCents: result.discountCents, label: result.label }
      : { valid: false, reason: result.reason },
  );
}
