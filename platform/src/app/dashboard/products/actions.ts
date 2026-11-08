'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { assertRole, ForbiddenError, requireTenant } from '@/lib/tenancy';
import { entitlementsFor, withinProductLimit } from '@/lib/entitlements';
import { encryptSecret } from '@/lib/crypto';
import { sanitizeCurrency, toCents } from '@/lib/money';
import type { ActionState } from '@/components/action-form';

const schema = z.object({
  name: z.string().trim().min(1, 'The product needs a name.').max(190),
  slug: z.string().trim().max(190).optional(),
  description: z.string().trim().max(20_000).optional(),
  price: z.string().trim(),
  currency: z.string().trim(),
  imageUrl: z.string().trim().max(500).optional(),
  active: z.string().optional(),
  type: z.enum(['DIGITAL', 'PHYSICAL']).default('DIGITAL'),
  durationDays: z.string().optional(),
  thanksTitle: z.string().trim().max(190).optional(),
  thanksMessage: z.string().trim().max(20_000).optional(),
  thanksRedirectUrl: z.string().trim().max(500).optional(),
  deliveryFileUrl: z.string().trim().max(500).optional(),
  deliveryAccessCode: z.string().trim().max(20_000).optional(),
  manageStock: z.string().optional(),
  stock: z.string().optional(),
  weightGrams: z.string().optional(),
});

function read(formData: FormData) {
  return schema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug') ?? undefined,
    description: formData.get('description') ?? undefined,
    price: formData.get('price') ?? '0',
    currency: formData.get('currency') ?? 'USD',
    imageUrl: formData.get('imageUrl') ?? undefined,
    active: formData.get('active') ?? undefined,
    type: (formData.get('type') as string) ?? 'DIGITAL',
    durationDays: formData.get('durationDays') ?? undefined,
    thanksTitle: formData.get('thanksTitle') ?? undefined,
    thanksMessage: formData.get('thanksMessage') ?? undefined,
    thanksRedirectUrl: formData.get('thanksRedirectUrl') ?? undefined,
    deliveryFileUrl: formData.get('deliveryFileUrl') ?? undefined,
    deliveryAccessCode: formData.get('deliveryAccessCode') ?? undefined,
    manageStock: formData.get('manageStock') ?? undefined,
    stock: formData.get('stock') ?? undefined,
    weightGrams: formData.get('weightGrams') ?? undefined,
  });
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 180) || 'product'
  );
}

async function uniqueSlug(accountId: string, base: string, ignoreId?: string): Promise<string> {
  let candidate = base;
  let n = 2;
  for (;;) {
    const clash = await prisma.product.findFirst({
      where: { accountId, slug: candidate, ...(ignoreId ? { NOT: { id: ignoreId } } : {}) },
      select: { id: true },
    });
    if (!clash) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
  }
}

export async function createProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let productId: string;
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'ADMIN');

    const parsed = read(formData);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form.' };
    const data = parsed.data;

    const ent = entitlementsFor(tenant.account);
    const existing = await prisma.product.count({ where: { accountId: tenant.account.id } });
    if (!withinProductLimit(ent, existing)) {
      return {
        error: `The ${ent.label} plan covers ${ent.products} products. Upgrade to add more, or archive one you no longer sell.`,
      };
    }

    const currency = sanitizeCurrency(data.currency);
    const product = await prisma.product.create({
      data: {
        accountId: tenant.account.id,
        name: data.name,
        slug: await uniqueSlug(tenant.account.id, slugify(data.slug || data.name)),
        description: data.description || null,
        priceCents: toCents(data.price, currency),
        currency,
        imageUrl: data.imageUrl || null,
        active: data.active === 'on',
        type: data.type,
        requiresShipping: data.type === 'PHYSICAL',
        durationDays: Math.max(0, Number(data.durationDays ?? 0) || 0),
        thanksTitle: data.thanksTitle || null,
        thanksMessage: data.thanksMessage || null,
        thanksRedirectUrl: data.thanksRedirectUrl || null,
        deliveryFileUrl: data.deliveryFileUrl || null,
        deliveryAccessCodeEnc: data.deliveryAccessCode
          ? encryptSecret(data.deliveryAccessCode)
          : null,
        manageStock: data.manageStock === 'on',
        stock: Math.max(0, Number(data.stock ?? 0) || 0),
        weightGrams: Math.max(0, Number(data.weightGrams ?? 0) || 0),
      },
    });
    productId = product.id;
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath('/dashboard/products');
  redirect(`/dashboard/products/${productId}?created=1`);
}

export async function updateProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'ADMIN');

    const id = String(formData.get('id') ?? '');
    const parsed = read(formData);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form.' };
    const data = parsed.data;

    // Scoped by accountId as well as id: an id from another tenant simply
    // does not exist as far as this query is concerned.
    const existing = await prisma.product.findFirst({
      where: { id, accountId: tenant.account.id },
    });
    if (!existing) return { error: 'That product no longer exists.' };

    const currency = sanitizeCurrency(data.currency);
    const nextSlug = data.slug ? slugify(data.slug) : existing.slug;

    await prisma.product.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        slug:
          nextSlug === existing.slug
            ? existing.slug
            : await uniqueSlug(tenant.account.id, nextSlug, existing.id),
        description: data.description || null,
        priceCents: toCents(data.price, currency),
        currency,
        imageUrl: data.imageUrl || null,
        active: data.active === 'on',
        type: data.type,
        requiresShipping: data.type === 'PHYSICAL',
        durationDays: Math.max(0, Number(data.durationDays ?? 0) || 0),
        thanksTitle: data.thanksTitle || null,
        thanksMessage: data.thanksMessage || null,
        thanksRedirectUrl: data.thanksRedirectUrl || null,
        deliveryFileUrl: data.deliveryFileUrl || null,
        // An empty box leaves the stored code alone; clearing it is explicit.
        deliveryAccessCodeEnc: data.deliveryAccessCode
          ? encryptSecret(data.deliveryAccessCode)
          : formData.get('clearAccessCode') === 'on'
            ? null
            : existing.deliveryAccessCodeEnc,
        manageStock: data.manageStock === 'on',
        stock: Math.max(0, Number(data.stock ?? 0) || 0),
        weightGrams: Math.max(0, Number(data.weightGrams ?? 0) || 0),
      },
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath('/dashboard/products');
  return { message: 'Product saved.' };
}

export async function deleteProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'ADMIN');
    const id = String(formData.get('id') ?? '');

    const product = await prisma.product.findFirst({
      where: { id, accountId: tenant.account.id },
      include: { _count: { select: { orders: true } } },
    });
    if (!product) return { error: 'That product no longer exists.' };

    // Orders reference the product for the life of the record — a receipt that
    // cannot say what was bought is not a receipt. Deactivate instead.
    if (product._count.orders > 0) {
      await prisma.product.update({ where: { id: product.id }, data: { active: false } });
      revalidatePath('/dashboard/products');
      return {
        message: `${product.name} has ${product._count.orders} order${
          product._count.orders === 1 ? '' : 's'
        } against it, so it was deactivated rather than deleted. Its checkout link now returns "unavailable".`,
      };
    }

    await prisma.product.delete({ where: { id: product.id } });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath('/dashboard/products');
  redirect('/dashboard/products');
}
