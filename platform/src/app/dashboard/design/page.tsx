import Link from 'next/link';
import type { Metadata } from 'next';
import type { CheckoutDesign } from '@prisma/client';
import { requireTenant } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { canUseDesign, entitlementsFor } from '@/lib/entitlements';
import { env } from '@/lib/env';
import { ALL_DESIGNS, DESIGN_COPY } from '@/lib/checkout/design-copy';
import { Banner, PageHeader } from '@/components/ui';
import { DesignEditor } from './editor';

export const metadata: Metadata = { title: 'Checkout design' };

export default async function DesignPage() {
  const { account } = await requireTenant();
  const ent = entitlementsFor(account);

  const [profile, sample] = await Promise.all([
    prisma.checkoutProfile.upsert({
      where: { accountId: account.id },
      create: { accountId: account.id },
      update: {},
    }),
    prisma.product.findFirst({
      where: { accountId: account.id, active: true },
      select: { slug: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const previewUrl = sample ? `${env.checkoutUrl}/c/${account.slug}/${sample.slug}` : null;

  return (
    <>
      <PageHeader
        title="Checkout design"
        description="Six layouts, your colours, your logo. Buyers never see a MethodePay brand unless you put one there."
        action={
          previewUrl ? (
            <a href={previewUrl} target="_blank" rel="noreferrer" className="btn-ghost">
              Preview live checkout
            </a>
          ) : null
        }
      />

      {!ent.fullEditor ? (
        <Banner
          tone="info"
          action={
            <Link href="/dashboard/billing" className="btn-ghost !py-2 !text-xs">
              See plans
            </Link>
          }
        >
          On {ent.label} you can change <strong>colours, copy and buyer fields</strong>. Logo, fonts,
          width, radius and custom CSS unlock on Professional.
        </Banner>
      ) : null}

      <DesignEditor
        fullEditor={ent.fullEditor}
        availableDesigns={ALL_DESIGNS.filter((d) => canUseDesign(ent, d))}
        allDesigns={ALL_DESIGNS}
        designCopy={DESIGN_COPY}
        values={{
          design: profile.design,
          colorPrimary: profile.colorPrimary,
          colorBgStart: profile.colorBgStart,
          colorBgEnd: profile.colorBgEnd,
          colorText: profile.colorText,
          colorCardBg: profile.colorCardBg,
          logoUrl: profile.logoUrl ?? '',
          logoMaxHeight: profile.logoMaxHeight,
          fontFamily: profile.fontFamily,
          layoutWidth: profile.layoutWidth,
          cardRadius: profile.cardRadius,
          baseFontSize: profile.baseFontSize,
          customCss: profile.customCss ?? '',
          checkoutTitle: profile.checkoutTitle ?? '',
          checkoutSubtitle: profile.checkoutSubtitle ?? '',
          privacyPolicyUrl: profile.privacyPolicyUrl ?? '',
          termsUrl: profile.termsUrl ?? '',
          showTrustBadges: profile.showTrustBadges,
          trustBadges: asStrings(profile.trustBadges),
          guaranteeTitle: profile.guaranteeTitle,
          guaranteeText: profile.guaranteeText ?? '',
          guaranteeDays: profile.guaranteeDays,
          fieldVisibility: asRecord(profile.fieldVisibility),
          kycNoticeEnabled: profile.kycNoticeEnabled,
          kycNoticeMethods: asStrings(profile.kycNoticeMethods),
          kycNoticeText: profile.kycNoticeText ?? '',
        }}
      />
    </>
  );
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function asRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
  );
}
