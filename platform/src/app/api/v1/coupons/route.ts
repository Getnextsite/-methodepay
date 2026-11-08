import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, authenticateApiRequest, hasScope } from '@/lib/api-keys';
import { toCents } from '@/lib/money';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const caller = await authenticateApiRequest(request);
  if (!caller) return apiError('Invalid or missing API key.', 401, 'unauthorized');

  const coupons = await prisma.coupon.findMany({
    where: { accountId: caller.accountId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return Response.json({
    data: coupons.map((coupon) => ({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      usage_limit: coupon.usageLimit,
      usage_count: coupon.usageCount,
      active: coupon.active,
      expires_at: coupon.expiresAt?.toISOString() ?? null,
    })),
  });
}

const schema = z.object({
  code: z.string().trim().min(2).max(64),
  type: z.enum(['PERCENT', 'FIXED']).default('PERCENT'),
  value: z.union([z.string(), z.number()]),
  usage_limit: z.number().int().min(0).optional(),
  expires_at: z.string().datetime().optional(),
  active: z.boolean().optional(),
});

export async function POST(request: Request) {
  const caller = await authenticateApiRequest(request);
  if (!caller) return apiError('Invalid or missing API key.', 401, 'unauthorized');
  if (!hasScope(caller, 'write')) return apiError('This key is read-only.', 403, 'forbidden');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Malformed JSON body.');
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      422,
      'validation_failed',
    );
  }
  const input = parsed.data;

  const code = input.code.toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9_-]{2,64}$/.test(code)) {
    return apiError('Codes may contain letters, numbers, dashes and underscores.', 422);
  }

  // PERCENT is whole percent; FIXED is minor units, accepted as "15.00" too.
  const value = input.type === 'PERCENT' ? Math.round(Number(input.value) || 0) : toCents(input.value);
  if (input.type === 'PERCENT' && (value <= 0 || value > 100)) {
    return apiError('A percentage discount must be between 1 and 100.', 422);
  }
  if (input.type === 'FIXED' && value <= 0) {
    return apiError('A fixed discount must be above zero.', 422);
  }

  const coupon = await prisma.coupon.upsert({
    where: { accountId_code: { accountId: caller.accountId, code } },
    create: {
      accountId: caller.accountId,
      code,
      type: input.type,
      value,
      usageLimit: input.usage_limit ?? 0,
      expiresAt: input.expires_at ? new Date(input.expires_at) : null,
      active: input.active ?? true,
    },
    update: {
      type: input.type,
      value,
      usageLimit: input.usage_limit ?? 0,
      expiresAt: input.expires_at ? new Date(input.expires_at) : null,
      active: input.active ?? true,
    },
  });

  return Response.json(
    {
      data: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        usage_limit: coupon.usageLimit,
        usage_count: coupon.usageCount,
        active: coupon.active,
        expires_at: coupon.expiresAt?.toISOString() ?? null,
      },
    },
    { status: 201 },
  );
}
