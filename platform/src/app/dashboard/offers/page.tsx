import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import { requireTenant, assertRole, ForbiddenError } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { entitlementsFor } from '@/lib/entitlements';
import { fromCents, toCents } from '@/lib/money';
import { parseBump, parseUpsell } from '@/lib/offers';
import { Field, PageHeader, Section, UpgradeHint } from '@/components/ui';
import { ActionForm, SubmitButton, type ActionState } from '@/components/action-form';

export const metadata: Metadata = { title: 'Order bump & upsell' };

const text = (formData: FormData, name: string) => String(formData.get(name) ?? '').trim();

async function saveOffersAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  'use server';
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'ADMIN');

    // Run the submitted values through the same parsers the checkout uses, so
    // what is stored is exactly what a buyer will see.
    const bump = parseBump({
      enabled: formData.get('bumpEnabled') === 'on',
      headline: text(formData, 'bumpHeadline'),
      title: text(formData, 'bumpTitle'),
      description: text(formData, 'bumpDescription'),
      priceCents: toCents(text(formData, 'bumpPrice') || '0'),
      originalPriceCents: toCents(text(formData, 'bumpOriginalPrice') || '0'),
      imageUrl: text(formData, 'bumpImage'),
      badge: text(formData, 'bumpBadge'),
    });
    if (bump.enabled && (!bump.title || bump.priceCents <= 0)) {
      return { error: 'An order bump needs a title and a price above zero before it can go live.' };
    }
    if (text(formData, 'bumpImage') && !bump.imageUrl) {
      return { error: 'The bump image has to be an https:// link.' };
    }

    const upsell = parseUpsell({
      enabled: formData.get('upsellEnabled') === 'on',
      productId: text(formData, 'upsellProductId'),
      headline: text(formData, 'upsellHeadline'),
      title: text(formData, 'upsellTitle'),
      description: text(formData, 'upsellDescription'),
      originalPriceCents: toCents(text(formData, 'upsellOriginalPrice') || '0'),
      imageUrl: text(formData, 'upsellImage'),
      acceptLabel: text(formData, 'upsellAccept'),
      declineLabel: text(formData, 'upsellDecline'),
    });
    if (upsell.productId) {
      // Only ever one of this store's own products.
      const owned = await prisma.product.findFirst({
        where: { id: upsell.productId, accountId: tenant.account.id },
        select: { id: true },
      });
      if (!owned) return { error: 'Pick one of your own products for the upsell.' };
    }
    if (upsell.enabled && !upsell.productId) {
      return { error: 'Choose which product the upsell offers before switching it on.' };
    }
    if (text(formData, 'upsellImage') && !upsell.imageUrl) {
      return { error: 'The upsell image has to be an https:// link.' };
    }

    await prisma.checkoutProfile.upsert({
      where: { accountId: tenant.account.id },
      create: { accountId: tenant.account.id, bump, upsell },
      update: { bump, upsell },
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath('/dashboard/offers');
  return { message: 'Offers saved.' };
}

export default async function OffersPage() {
  const { account } = await requireTenant();
  const ent = entitlementsFor(account);

  const [profile, products] = await Promise.all([
    prisma.checkoutProfile.upsert({
      where: { accountId: account.id },
      create: { accountId: account.id },
      update: {},
    }),
    prisma.product.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, priceCents: true, currency: true, active: true },
    }),
  ]);
  const bump = parseBump(profile.bump);
  const upsell = parseUpsell(profile.upsell);
  const money = (c: number) => (c > 0 ? fromCents(c) : '');

  return (
    <>
      <PageHeader
        title="Order bump & upsell"
        description="Two ways to raise the order value without a second sales page: an add-on ticked at checkout, and an offer shown once the buyer has paid."
      />

      {!ent.offers ? (
        <div className="mb-6">
          <UpgradeHint>
            Order bump and upsell are part of the Professional plan. Your settings are saved, but buyers will not see them on {ent.label}.
          </UpgradeHint>
        </div>
      ) : null}

      <ActionForm action={saveOffersAction} className="space-y-6">
        <Section
          title="Order bump"
          description="A single tick box just above the Pay button. Ticking it adds the amount below to the order. The price is always taken from here, never from the buyer's browser, and discount codes do not apply to it."
        >
          <div className="space-y-4">
          <label className="flex items-center gap-2.5 text-sm text-ink-100">
            <input type="checkbox" name="bumpEnabled" defaultChecked={bump.enabled} />
            Show the order bump at checkout
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Headline" htmlFor="bumpHeadline" hint="The strip above the box.">
              <input id="bumpHeadline" name="bumpHeadline" defaultValue={bump.headline} maxLength={120} className="input" />
            </Field>
            <Field label="Badge" htmlFor="bumpBadge" hint="Optional, e.g. LIMITED OFFER.">
              <input id="bumpBadge" name="bumpBadge" defaultValue={bump.badge} maxLength={30} className="input uppercase" />
            </Field>
          </div>

          <Field label="Title" htmlFor="bumpTitle" hint="What the buyer is adding, e.g. 'Priority setup call'.">
            <input id="bumpTitle" name="bumpTitle" defaultValue={bump.title} maxLength={120} className="input" />
          </Field>
          <Field label="Description" htmlFor="bumpDescription">
            <textarea id="bumpDescription" name="bumpDescription" rows={2} defaultValue={bump.description} maxLength={400} className="input" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Price" htmlFor="bumpPrice" hint="In the currency of the product being bought.">
              <input id="bumpPrice" name="bumpPrice" inputMode="decimal" defaultValue={money(bump.priceCents)} placeholder="19.00" className="input" />
            </Field>
            <Field label="Original price" htmlFor="bumpOriginalPrice" hint="Optional, shown struck through.">
              <input id="bumpOriginalPrice" name="bumpOriginalPrice" inputMode="decimal" defaultValue={money(bump.originalPriceCents)} placeholder="39.00" className="input" />
            </Field>
            <Field label="Image URL" htmlFor="bumpImage" hint="Optional, https:// only.">
              <input id="bumpImage" name="bumpImage" type="url" defaultValue={bump.imageUrl} className="input" />
            </Field>
          </div>
          </div>
        </Section>

        <Section
          title="Post-purchase upsell"
          description="An offer on the order page once the buyer has paid or reported paying. Accepting opens a separate checkout for that product with their name and email already filled in; they choose how to pay, and nothing is charged automatically."
        >
          <div className="space-y-4">
          <label className="flex items-center gap-2.5 text-sm text-ink-100">
            <input type="checkbox" name="upsellEnabled" defaultChecked={upsell.enabled} />
            Show the upsell after purchase
          </label>

          <Field label="Product to offer" htmlFor="upsellProductId" hint="It is never offered to someone who just bought it.">
            <select id="upsellProductId" name="upsellProductId" defaultValue={upsell.productId} className="input">
              <option value="">Choose a product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {fromCents(p.priceCents, p.currency)} {p.currency}
                  {p.active ? '' : ' (inactive)'}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Headline" htmlFor="upsellHeadline">
              <input id="upsellHeadline" name="upsellHeadline" defaultValue={upsell.headline} maxLength={120} className="input" />
            </Field>
            <Field label="Title" htmlFor="upsellTitle" hint="Blank uses the product name.">
              <input id="upsellTitle" name="upsellTitle" defaultValue={upsell.title} maxLength={120} className="input" />
            </Field>
          </div>
          <Field label="Description" htmlFor="upsellDescription">
            <textarea id="upsellDescription" name="upsellDescription" rows={2} defaultValue={upsell.description} maxLength={400} className="input" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Original price" htmlFor="upsellOriginalPrice" hint="Optional, shown struck through next to the product price.">
              <input id="upsellOriginalPrice" name="upsellOriginalPrice" inputMode="decimal" defaultValue={money(upsell.originalPriceCents)} className="input" />
            </Field>
            <Field label="Image URL" htmlFor="upsellImage" hint="Blank uses the product image. https:// only.">
              <input id="upsellImage" name="upsellImage" type="url" defaultValue={upsell.imageUrl} className="input" />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Accept button" htmlFor="upsellAccept">
              <input id="upsellAccept" name="upsellAccept" defaultValue={upsell.acceptLabel} maxLength={60} className="input" />
            </Field>
            <Field label="Decline button" htmlFor="upsellDecline">
              <input id="upsellDecline" name="upsellDecline" defaultValue={upsell.declineLabel} maxLength={60} className="input" />
            </Field>
          </div>
          </div>
        </Section>

        <SubmitButton>Save offers</SubmitButton>
      </ActionForm>
    </>
  );
}
