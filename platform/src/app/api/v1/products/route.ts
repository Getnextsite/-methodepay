import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, authenticateApiRequest, hasScope } from '@/lib/api-keys';
import { entitlementsFor, withinProductLimit } from '@/lib/entitlements';
import { encryptSecret } from '@/lib/crypto';
import { sanitizeCurrency, toCents } from '@/lib/money';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

function serialize(product: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceCents: number;
  currency: string;
  active: boolean;
  type: string;
  durationDays: number;
  stock: number;
  manageStock: boolean;
  imageUrl: string | null;
  createdAt: Date;
}, accountSlug: string) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.priceCents,
    currency: product.currency,
    active: product.active,
    type: product.type,
    duration_days: product.durationDays,
    stock: product.manageStock ? product.stock : null,
    image_url: product.imageUrl,
    checkout_url: `${env.checkoutUrl}/c/${accountSlug}/${product.slug}`,
    created_at: product.createdAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const caller = await authenticateApiRequest(request);
  if (!caller) return apiError('Invalid or missing API key.', 401, 'unauthorized');

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 50) || 50));
  const activeParam = url.searchParams.get('active');

  const products = await prisma.product.findMany({
    where: {
      accountId: caller.accountId,
      ...(activeParam === 'true' ? { active: true } : activeParam === 'false' ? { active: false } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return Response.json({
    data: products.map((p) => serialize(p, caller.account.slug)),
    has_more: products.length === limit,
  });
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(190),
  price: z.union([z.string(), z.number()]),
  currency: z.string().trim().optional(),
  description: z.string().max(20_000).optional(),
  image_url: z.string().url().max(500).optional(),
  slug: z.string().trim().max(190).optional(),
  active: z.boolean().optional(),
  type: z.enum(['DIGITAL', 'PHYSICAL']).optional(),
  duration_days: z.number().int().min(0).max(36_500).optional(),
  delivery_file_url: z.string().url().max(500).optional(),
  delivery_access_code: z.string().max(20_000).optional(),
  stock: z.number().int().min(0).optional(),
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

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      422,
      'validation_failed',
    );
  }
  const input = parsed.data;

  const ent = entitlementsFor(caller.account);
  const count = await prisma.product.count({ where: { accountId: caller.accountId } });
  if (!withinProductLimit(ent, count)) {
    return apiError(
      `The ${ent.label} plan covers ${ent.products} products.`,
      402,
      'plan_limit_reached',
    );
  }

  const currency = sanitizeCurrency(input.currency ?? 'USD');
  const baseSlug =
    (input.slug ?? input.name)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 180) || 'product';

  let slug = baseSlug;
  let n = 2;
  while (
    await prisma.product.findUnique({
      where: { accountId_slug: { accountId: caller.accountId, slug } },
      select: { id: true },
    })
  ) {
    slug = `${baseSlug}-${n}`;
    n += 1;
  }

  const product = await prisma.product.create({
    data: {
      accountId: caller.accountId,
      name: input.name,
      slug,
      description: input.description ?? null,
      priceCents: toCents(input.price, currency),
      currency,
      imageUrl: input.image_url ?? null,
      active: input.active ?? true,
      type: input.type ?? 'DIGITAL',
      requiresShipping: (input.type ?? 'DIGITAL') === 'PHYSICAL',
      durationDays: input.duration_days ?? 0,
      deliveryFileUrl: input.delivery_file_url ?? null,
      deliveryAccessCodeEnc: input.delivery_access_code
        ? encryptSecret(input.delivery_access_code)
        : null,
      manageStock: input.stock !== undefined,
      stock: input.stock ?? 0,
    },
  });

  return Response.json({ data: serialize(product, caller.account.slug) }, { status: 201 });
}
