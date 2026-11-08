import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireTenant } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { canUseMethod, entitlementsFor } from '@/lib/entitlements';
import { Banner, Field, PageHeader, Section } from '@/components/ui';
import { ActionForm, SubmitButton } from '@/components/action-form';
import { saveManualMethodAction } from '../../actions';

export const metadata: Metadata = { title: 'Custom payment method' };

export default async function ManualMethodPage({ params }: { params: { slot: string } }) {
  const slot = Number(params.slot);
  if (!Number.isInteger(slot) || slot < 1 || slot > 5) notFound();

  const { account } = await requireTenant();
  const ent = entitlementsFor(account);
  const allowed = canUseMethod(ent, `manual_${slot}`);

  const manual = await prisma.manualMethod.upsert({
    where: { accountId_slot: { accountId: account.id, slot } },
    create: { accountId: account.id, slot },
    update: {},
  });

  return (
    <>
      <PageHeader
        title={manual.name.trim() || `Custom method ${slot}`}
        description="You name the rail, write the steps and design the button. The buyer pays however you two agree, then submits a reference you verify."
        action={
          <Link href="/dashboard/methods" className="btn-ghost">
            All methods
          </Link>
        }
      />

      {!allowed ? (
        <Banner
          tone="info"
          action={
            <Link href="/dashboard/billing" className="btn-ghost !py-2 !text-xs">
              See plans
            </Link>
          }
        >
          The {ent.label} plan covers {ent.manualMethods} custom method
          {ent.manualMethods === 1 ? '' : 's'}. Fill this one in now; the checkout switch unlocks
          when you upgrade.
        </Banner>
      ) : null}

      <Section>
        <ActionForm action={saveManualMethodAction} className="space-y-5">
          <input type="hidden" name="slot" value={slot} />

          <label className="flex items-start gap-2.5 rounded-xl border border-ink-600 bg-ink-900/50 p-3.5 text-sm">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={manual.enabled}
              disabled={!allowed}
              className="mt-0.5 h-4 w-4 accent-mint"
            />
            <span>
              <span className="block font-medium text-white">Available at checkout</span>
              <span className="block text-xs text-ink-400">
                Needs a name. Empty slots are never shown to buyers.
              </span>
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Method name"
              htmlFor="name"
              hint="What buyers will recognise: M-Pesa, PIX, Orange Money."
            >
              <input
                id="name"
                name="name"
                maxLength={120}
                defaultValue={manual.name}
                className="input"
                placeholder="M-Pesa"
              />
            </Field>
            <Field label="Icon URL" htmlFor="iconUrl">
              <input id="iconUrl" name="iconUrl" type="url" defaultValue={manual.iconUrl ?? ''} className="input" />
            </Field>
          </div>

          <Field
            label="Instructions"
            htmlFor="instructions"
            hint="Exactly what the buyer should do, in their words. Basic HTML is allowed."
          >
            <textarea
              id="instructions"
              name="instructions"
              rows={6}
              defaultValue={manual.instructions ?? ''}
              className="input"
              placeholder={'1. Open M-Pesa and choose Send Money\n2. Send to 0712 345 678\n3. Paste the confirmation code below'}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Button label" htmlFor="buttonLabel">
              <input
                id="buttonLabel"
                name="buttonLabel"
                defaultValue={manual.buttonLabel ?? ''}
                className="input"
                placeholder="Open M-Pesa"
              />
            </Field>
            <Field label="Button link" htmlFor="buttonUrl">
              <input id="buttonUrl" name="buttonUrl" type="url" defaultValue={manual.buttonUrl ?? ''} className="input" />
            </Field>
            <Field label="Tutorial video" htmlFor="videoUrl" hint="YouTube or Vimeo.">
              <input id="videoUrl" name="videoUrl" type="url" defaultValue={manual.videoUrl ?? ''} className="input" />
            </Field>
          </div>

          <label className="flex items-start gap-2.5 text-sm text-ink-100">
            <input
              type="checkbox"
              name="requireReference"
              defaultChecked={manual.requireReference}
              className="mt-0.5 h-4 w-4 accent-mint"
            />
            <span>
              <span className="block">Require a payment reference before the buyer can confirm</span>
              <span className="block text-xs text-ink-400">
                Strongly recommended. A claim with no reference is a claim you cannot check.
              </span>
            </span>
          </label>

          <div className="flex justify-end border-t border-ink-600/70 pt-5">
            <SubmitButton>Save method</SubmitButton>
          </div>
        </ActionForm>
      </Section>
    </>
  );
}
