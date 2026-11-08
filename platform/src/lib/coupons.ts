import 'server-only';
import { prisma } from './db';

export type CouponResult =
  | { valid: true; code: string; discountCents: number; label: string }
  | { valid: false; reason: string };

/**
 * Validate a coupon against a subtotal.
 *
 * Every rejection is a distinct reason, because "invalid code" on a coupon the
 * buyer read off a legitimate email is a support ticket. Expired, used up and
 * not-found are different problems and deserve different wording.
 */
export async function validateCoupon(
  accountId: string,
  rawCode: string,
  subtotalCents: number,
): Promise<CouponResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { valid: false, reason: 'Enter a coupon code.' };

  const coupon = await prisma.coupon.findUnique({
    where: { accountId_code: { accountId, code } },
  });

  if (!coupon || !coupon.active) {
    return { valid: false, reason: 'That coupon code is not recognised.' };
  }
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    return { valid: false, reason: 'That coupon has expired.' };
  }
  if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) {
    return { valid: false, reason: 'That coupon has reached its usage limit.' };
  }

  const discountCents =
    coupon.type === 'PERCENT'
      ? Math.round((subtotalCents * Math.min(100, Math.max(0, coupon.value))) / 100)
      : Math.min(subtotalCents, coupon.value);

  if (discountCents <= 0) {
    return { valid: false, reason: 'That coupon does not apply to this order.' };
  }

  return {
    valid: true,
    code,
    discountCents,
    label:
      coupon.type === 'PERCENT'
        ? `${coupon.value}% off`
        : `${(coupon.value / 100).toFixed(2)} off`,
  };
}
