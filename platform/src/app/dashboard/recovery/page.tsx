import type { Metadata } from 'next';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { requireTenant, assertRole, ForbiddenError } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { emailConfigured } from '@/lib/env';
import { formatMoney } from '@/lib/money';
import { parseRecovery, recoverySentAt, runRecovery } from '@/lib/recovery';
import { Banner, Field, PageHeader, Section, StatTile } from '@/components/ui';
import { ActionForm, SubmitButton, type ActionState } from '@/components/action-form';

export const metadata: Metadata = { title: 'Abandoned checkouts' };

async function saveRecoveryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  'use server';
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'ADMIN');
    const recovery = parseRecovery({
      enabled: formData.get('enabled') === 'on',
      delayHours: Number(formData.get('delayHours') ?? 1),
      couponCode: String(formData.get('couponCode') ?? ''),
      subject: String(formData.get('subject') ?? ''),
      message: String(formData.get('message') ?? ''),
    });
    if (recovery.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { accountId_code: { accountId: tenant.account.id, code: recovery.couponCode } },
        select: { active: true },
      });
      if (!coupon?.active) return { error: `There is no active coupon called ${recovery.couponCode}. Create it under Coupons first.` };
    }
    await prisma.notificationSettings.upsert({
      where: { accountId: tenant.account.id },
      create: { accountId: tenant.account.id, recovery },
      update: { recovery },
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }
  revalidatePath('/dashboard/recovery');
  return { message: 'Recovery settings saved.' };
}

async function sendNowAction(_prev: ActionState): Promise<ActionState> {
  'use server';
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'ADMIN');
    if (!emailConfigured()) return { error: 'Email is not set up, so reminders cannot be sent yet.' };
    const result = await runRecovery(tenant.account.id);
    revalidatePath('/dashboard/recovery');
    return {
      message:
        result.due === 0
          ? 'No abandoned checkouts are due a reminder right now.'
          : `Sent ${result.sent} of ${result.due} reminder${result.due === 1 ? '' : 's'}.`,
    };
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }
}

export default async function RecoveryPage() {
  const { account } = await requireTenant();
  const settingsRow = await prisma.notificationSettings.upsert({
    where: { accountId: account.id },
    create: { accountId: account.id },
    update: {},
  });
  const settings = parseRecovery(settingsRow.recovery);

  // Last 14 days of checkouts that were never paid.
  const since = new Date(Date.now() - 14 * 86_400_000);
  const abandoned = await prisma.order.findMany({
    where: { accountId: account.id, status: { in: ['PENDING', 'EXPIRED', 'CANCELLED'] }, createdAt: { gte: since } },
    include: { product: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  // Recovered = the same buyer went on to pay for the same product.
  const later = abandoned.length
    ? await prisma.order.findMany({
        where: {
          accountId: account.id,
          status: 'PAID',
          createdAt: { gte: since },
          buyerEmail: { in: [...new Set(abandoned.map((o) => o.buyerEmail))] },
        },
        select: { buyerEmail: true, productId: true, createdAt: true, amountCents: true, currency: true },
      })
    : [];
  const recoveredBy = (o: (typeof abandoned)[number]) =>
    later.find((p) => p.buyerEmail === o.buyerEmail && p.productId === o.productId && p.createdAt > o.createdAt) ?? null;

  const reminded = abandoned.filter((o) => recoverySentAt(o));
  const recovered = abandoned.filter((o) => recoverySentAt(o) && recoveredBy(o));
  const recoveredValue = recovered.reduce((sum, o) => sum + (recoveredBy(o)?.amountCents ?? 0), 0);
  const currency = abandoned[0]?.currency ?? 'USD';
  const email = emailConfigured();

  return (
    <>
      <PageHeader
        title="Abandoned checkouts"
        description="Buyers who filled in the checkout but never paid get one reminder email with a link straight back to their order."
      />

      {!email ? (
        <Banner tone="warn">
          Email is not set up yet, so reminders cannot be sent. Add the SMTP settings (SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM) to your Vercel environment variables and redeploy.
        </Banner>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatTile label="Abandoned (14 days)" value={String(abandoned.length)} />
        <StatTile label="Reminded" value={String(reminded.length)} />
        <StatTile label="Recovered" value={String(recovered.length)} />
        <StatTile label="Recovered revenue" value={formatMoney(recoveredValue, currency)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-6">
          <Section title="Reminder settings" description="Checked once a day automatically. Use “Send reminders now” to run it straight away.">
            <ActionForm action={saveRecoveryAction}>
              <label className="flex items-center gap-2.5 text-sm text-ink-100">
                <input type="checkbox" name="enabled" defaultChecked={settings.enabled} />
                Send abandoned checkout reminders
              </label>
              <Field label="Wait before reminding" htmlFor="delayHours" hint="Hours after the checkout was started (1–48). Reminders stop after 72 hours.">
                <input id="delayHours" name="delayHours" type="number" min={1} max={48} defaultValue={settings.delayHours} className="input" />
              </Field>
              <Field label="Discount code to offer" htmlFor="couponCode" hint="Optional. Must be an active coupon; it is prefilled on the checkout.">
                <input id="couponCode" name="couponCode" defaultValue={settings.couponCode} className="input font-mono uppercase" />
              </Field>
              <Field label="Email subject" htmlFor="subject" hint="Placeholders: {product} {buyer_name} {amount} {order_ref}">
                <input id="subject" name="subject" defaultValue={settings.subject} className="input" />
              </Field>
              <Field label="Message" htmlFor="message">
                <textarea id="message" name="message" rows={4} defaultValue={settings.message} className="input" />
              </Field>
              <SubmitButton>Save settings</SubmitButton>
            </ActionForm>
          </Section>

          <Section title="Send reminders now">
            <ActionForm action={sendNowAction}>
              <p className="text-sm text-ink-300">
                Emails every abandoned checkout that is due and has not been reminded yet.
              </p>
              <SubmitButton variant="ghost">Send reminders now</SubmitButton>
            </ActionForm>
          </Section>
        </div>

        <Section title="Recent abandoned checkouts">
          {abandoned.length === 0 ? (
            <p className="text-sm text-ink-300">None in the last 14 days.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-ink-400">
                  <tr>
                    <th className="pb-2 font-medium">Buyer</th>
                    <th className="pb-2 font-medium">Product</th>
                    <th className="pb-2 font-medium">Total</th>
                    <th className="pb-2 font-medium">Reminder</th>
                  </tr>
                </thead>
                <tbody>
                  {abandoned.map((o) => {
                    const sent = recoverySentAt(o);
                    const won = recoveredBy(o);
                    return (
                      <tr key={o.id} className="border-t border-ink-600/60">
                        <td className="py-2.5 pr-3">
                          <Link href={`/dashboard/orders/${o.id}`} className="text-white hover:underline">
                            {o.buyerEmail}
                          </Link>
                          <span className="block text-xs text-ink-400">
                            {o.ref} · {o.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-ink-200">{o.product.name}</td>
                        <td className="py-2.5 pr-3 tabular-nums text-ink-200">{formatMoney(o.amountCents, o.currency)}</td>
                        <td className="py-2.5 text-xs">
                          {won ? (
                            <span className="text-mint">Recovered</span>
                          ) : sent ? (
                            <span className="text-ink-200">Sent {sent.slice(0, 10)}</span>
                          ) : (
                            <span className="text-ink-400">Not yet</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </>
  );
}
