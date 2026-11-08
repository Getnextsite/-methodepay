import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import { requireTenant, assertRole, ForbiddenError } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { toCents } from '@/lib/money';
import { Field, PageHeader, Section } from '@/components/ui';
import { ActionForm, SubmitButton, type ActionState } from '@/components/action-form';

export const metadata: Metadata = { title: 'Coupons' };

async function saveCouponAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  'use server';
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'ADMIN');

    const code = String(formData.get('code') ?? '').trim().toUpperCase().replace(/\s+/g, '');
    if (!code) return { error: 'Give the coupon a code.' };
    if (!/^[A-Z0-9_-]{2,64}$/.test(code)) {
      return { error: 'Use letters, numbers, dashes and underscores only.' };
    }

    const type = formData.get('type') === 'FIXED' ? 'FIXED' : 'PERCENT';
    const rawValue = String(formData.get('value') ?? '0');
    const value = type === 'PERCENT' ? Math.round(Number(rawValue) || 0) : toCents(rawValue);

    if (type === 'PERCENT' && (value <= 0 || value > 100)) {
      return { error: 'A percentage discount has to be between 1 and 100.' };
    }
    if (type === 'FIXED' && value <= 0) return { error: 'Enter an amount above zero.' };

    const expiresRaw = String(formData.get('expiresAt') ?? '').trim();
    const expiresAt = expiresRaw ? new Date(`${expiresRaw}T23:59:59Z`) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) return { error: 'That date is not valid.' };

    await prisma.coupon.upsert({
      where: { accountId_code: { accountId: tenant.account.id, code } },
      create: {
        accountId: tenant.account.id,
        code,
        type,
        value,
        usageLimit: Math.max(0, Number(formData.get('usageLimit') ?? 0) || 0),
        expiresAt,
        active: formData.get('active') === 'on',
      },
      update: {
        type,
        value,
        usageLimit: Math.max(0, Number(formData.get('usageLimit') ?? 0) || 0),
        expiresAt,
        active: formData.get('active') === 'on',
      },
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath('/dashboard/coupons');
  return { message: 'Coupon saved.' };
}

async function deleteCouponAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  'use server';
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'ADMIN');
    await prisma.coupon.deleteMany({
      where: { id: String(formData.get('id') ?? ''), accountId: tenant.account.id },
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }
  revalidatePath('/dashboard/coupons');
  return { message: 'Coupon deleted.' };
}

export default async function CouponsPage() {
  const { account } = await requireTenant();
  const coupons = await prisma.coupon.findMany({
    where: { accountId: account.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <>
      <PageHeader
        title="Coupons"
        description="Validated server-side at checkout, so a discount a buyer types into the URL does not become a discount."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Section title="Create or update" description="Saving an existing code overwrites it.">
          <ActionForm action={saveCouponAction}>
            <Field label="Code" htmlFor="code" hint="Case-insensitive for buyers.">
              <input id="code" name="code" required maxLength={64} className="input font-mono uppercase" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Type" htmlFor="type">
                <select id="type" name="type" className="input" defaultValue="PERCENT">
                  <option value="PERCENT">Percentage off</option>
                  <option value="FIXED">Fixed amount off</option>
                </select>
              </Field>
              <Field label="Value" htmlFor="value" hint="20 for 20%, or 15.00 for a flat 15 off.">
                <input id="value" name="value" required inputMode="decimal" className="input" />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Usage limit" htmlFor="usageLimit" hint="0 for unlimited.">
                <input id="usageLimit" name="usageLimit" type="number" min={0} defaultValue={0} className="input" />
              </Field>
              <Field label="Expires" htmlFor="expiresAt" hint="Optional.">
                <input id="expiresAt" name="expiresAt" type="date" className="input" />
              </Field>
            </div>

            <label className="flex items-center gap-2.5 text-sm text-ink-100">
              <input type="checkbox" name="active" defaultChecked className="h-4 w-4 accent-mint" />
              Active
            </label>

            <SubmitButton>Save coupon</SubmitButton>
          </ActionForm>
        </Section>

        <Section title="Your coupons">
          {coupons.length === 0 ? (
            <p className="text-sm text-ink-400">No coupons yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {coupons.map((coupon) => {
                const expired = coupon.expiresAt && coupon.expiresAt.getTime() < Date.now();
                const usedUp = coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit;
                return (
                  <li
                    key={coupon.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-ink-600/70 bg-ink-900/40 p-3.5"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-medium text-white">{coupon.code}</p>
                      <p className="mt-0.5 text-xs text-ink-400">
                        {coupon.type === 'PERCENT'
                          ? `${coupon.value}% off`
                          : `${(coupon.value / 100).toFixed(2)} off`}
                        {' · '}
                        {coupon.usageCount} used
                        {coupon.usageLimit > 0 ? ` of ${coupon.usageLimit}` : ''}
                        {coupon.expiresAt ? ` · until ${coupon.expiresAt.toISOString().slice(0, 10)}` : ''}
                      </p>
                      <div className="mt-1.5 flex gap-1.5">
                        {!coupon.active ? <span className="chip">Inactive</span> : null}
                        {expired ? <span className="chip">Expired</span> : null}
                        {usedUp ? <span className="chip">Used up</span> : null}
                        {coupon.active && !expired && !usedUp ? (
                          <span className="chip border-mint/40 bg-mint/10 text-mint">Live</span>
                        ) : null}
                      </div>
                    </div>
                    <ActionForm action={deleteCouponAction} className="shrink-0">
                      <input type="hidden" name="id" value={coupon.id} />
                      <SubmitButton
                        variant="danger"
                        className="!px-2.5 !py-1.5 !text-xs"
                        confirm={`Delete ${coupon.code}? Orders that already used it keep their discount.`}
                      >
                        Delete
                      </SubmitButton>
                    </ActionForm>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
