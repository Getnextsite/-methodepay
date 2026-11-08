'use server';

import { revalidatePath } from 'next/cache';
import type { CheckoutDesign } from '@prisma/client';
import { prisma } from '@/lib/db';
import { assertRole, ForbiddenError, requireTenant } from '@/lib/tenancy';
import { canUseDesign, entitlementsFor } from '@/lib/entitlements';
import type { ActionState } from '@/components/action-form';

const DESIGNS: CheckoutDesign[] = ['CLASSIC', 'LITE', 'STOREFRONT', 'EXPRESS', 'HERO', 'TRUST'];
const FIELD_KEYS = [
  'phone',
  'country',
  'state',
  'city',
  'postalCode',
  'address1',
  'address2',
  'company',
  'note',
] as const;

function hex(value: unknown, fallback: string): string {
  const raw = String(value ?? '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw.toLowerCase() : fallback;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export async function saveDesignAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'ADMIN');
    const ent = entitlementsFor(tenant.account);

    const requested = String(formData.get('design') ?? 'CLASSIC') as CheckoutDesign;
    const design = DESIGNS.includes(requested) ? requested : 'CLASSIC';
    if (!canUseDesign(ent, design)) {
      return {
        error: `The ${design.charAt(0)}${design.slice(1).toLowerCase()} design is not part of the ${ent.label} plan. Your other changes were not saved — pick an available design and save again.`,
      };
    }

    const existing = await prisma.checkoutProfile.upsert({
      where: { accountId: tenant.account.id },
      create: { accountId: tenant.account.id },
      update: {},
    });

    // Starter and the trial get colours only. Letting the rest of the form
    // post silently and then ignoring it would be worse than saying so, so the
    // locked values are carried over from what is already stored.
    const full = ent.fullEditor;

    const fieldVisibility: Record<string, string> = {};
    for (const key of FIELD_KEYS) {
      const value = String(formData.get(`field_${key}`) ?? 'hidden');
      fieldVisibility[key] = ['hidden', 'optional', 'required'].includes(value) ? value : 'hidden';
    }

    await prisma.checkoutProfile.update({
      where: { accountId: tenant.account.id },
      data: {
        design,
        colorPrimary: hex(formData.get('colorPrimary'), '#00ffa3'),
        colorBgStart: hex(formData.get('colorBgStart'), '#0a0e1a'),
        colorBgEnd: hex(formData.get('colorBgEnd'), '#1a1030'),
        colorText: hex(formData.get('colorText'), '#ffffff'),
        colorCardBg: hex(formData.get('colorCardBg'), '#10131c'),

        logoUrl: full ? String(formData.get('logoUrl') ?? '').trim() || null : existing.logoUrl,
        logoMaxHeight: full
          ? clampInt(formData.get('logoMaxHeight'), 16, 160, 36)
          : existing.logoMaxHeight,
        fontFamily: full
          ? String(formData.get('fontFamily') ?? 'Inter').trim() || 'Inter'
          : existing.fontFamily,
        layoutWidth: full ? clampInt(formData.get('layoutWidth'), 640, 1440, 1080) : existing.layoutWidth,
        cardRadius: full ? clampInt(formData.get('cardRadius'), 0, 40, 16) : existing.cardRadius,
        baseFontSize: full ? clampInt(formData.get('baseFontSize'), 13, 20, 16) : existing.baseFontSize,
        customCss: full ? String(formData.get('customCss') ?? '').trim() || null : existing.customCss,

        checkoutTitle: String(formData.get('checkoutTitle') ?? '').trim() || null,
        checkoutSubtitle: String(formData.get('checkoutSubtitle') ?? '').trim() || null,
        privacyPolicyUrl: String(formData.get('privacyPolicyUrl') ?? '').trim() || null,
        termsUrl: String(formData.get('termsUrl') ?? '').trim() || null,

        showTrustBadges: formData.get('showTrustBadges') === 'on',
        trustBadges: formData.getAll('trustBadges').map(String),
        guaranteeTitle:
          String(formData.get('guaranteeTitle') ?? '').trim() || '100% Money Back Guarantee',
        guaranteeText: String(formData.get('guaranteeText') ?? '').trim() || null,
        guaranteeDays: clampInt(formData.get('guaranteeDays'), 0, 365, 30),

        fieldVisibility,

        kycNoticeEnabled: formData.get('kycNoticeEnabled') === 'on',
        kycNoticeMethods: formData.getAll('kycNoticeMethods').map(String),
        kycNoticeText: String(formData.get('kycNoticeText') ?? '').trim() || null,
      },
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath('/dashboard/design');
  return { message: 'Checkout design saved.' };
}
