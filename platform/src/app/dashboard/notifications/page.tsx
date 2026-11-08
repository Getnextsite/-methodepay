import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { requireTenant, assertRole, ForbiddenError } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { encryptSecret, maskSecret, decryptSecret } from '@/lib/crypto';
import { emailConfigured } from '@/lib/env';
import { entitlementsFor } from '@/lib/entitlements';
import { sendTelegram } from '@/lib/notifier';
import { loadMerchantContext } from '@/lib/gateway/context';
import { Banner, Field, PageHeader, Section } from '@/components/ui';
import { ActionForm, SubmitButton, type ActionState } from '@/components/action-form';

export const metadata: Metadata = { title: 'Notifications' };

async function saveNotificationsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  'use server';
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'ADMIN');

    const existing = await prisma.notificationSettings.upsert({
      where: { accountId: tenant.account.id },
      create: { accountId: tenant.account.id },
      update: {},
    });

    const submittedToken = String(formData.get('telegramBotToken') ?? '').trim();
    const notifyEmails = String(formData.get('notifyEmails') ?? '')
      .split(/[,\n]/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes('@'))
      .slice(0, 10);

    await prisma.notificationSettings.update({
      where: { accountId: tenant.account.id },
      data: {
        storeName: String(formData.get('storeName') ?? '').trim().slice(0, 120),
        supportEmail: String(formData.get('supportEmail') ?? '').trim().toLowerCase().slice(0, 190),
        orderPrefix:
          String(formData.get('orderPrefix') ?? '')
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9-]/g, '')
            .slice(0, 8) || 'MP-',
        notifyEmails,
        notifyOnNewOrder: formData.get('notifyOnNewOrder') === 'on',
        notifyOnConfirm: formData.get('notifyOnConfirm') === 'on',
        // An untouched masked field keeps the stored token.
        telegramBotTokenEnc:
          !submittedToken || submittedToken.includes('•')
            ? existing.telegramBotTokenEnc
            : encryptSecret(submittedToken),
        telegramChatId: String(formData.get('telegramChatId') ?? '').trim() || null,
        confirmWhatsapp: String(formData.get('confirmWhatsapp') ?? '').trim() || null,
        confirmTelegram: String(formData.get('confirmTelegram') ?? '').trim() || null,
        confirmMessage: String(formData.get('confirmMessage') ?? '').trim() || null,
        renewalsEnabled: formData.get('renewalsEnabled') === 'on',
        renewReminderDays:
          String(formData.get('renewReminderDays') ?? '')
            .replace(/[^0-9,]/g, '')
            .slice(0, 40) || '7,3,1,0',
        renewSubject:
          String(formData.get('renewSubject') ?? '').trim() ||
          'Your {product} expires in {days} days',
        renewExpiredSubject:
          String(formData.get('renewExpiredSubject') ?? '').trim() || 'Your {product} has expired',
        renewDiscountCode: String(formData.get('renewDiscountCode') ?? '').trim().toUpperCase() || null,
      },
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath('/dashboard/notifications');
  return { message: 'Notification settings saved.' };
}

async function testTelegramAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  'use server';
  const tenant = await requireTenant();
  const ctx = await loadMerchantContext(tenant.account.id);
  if (!ctx.notifications.telegramChatId || !decryptSecret(ctx.notifications.telegramBotTokenEnc)) {
    return { error: 'Add a bot token and chat ID first, then save.' };
  }
  const ok = await sendTelegram(
    ctx,
    `<b>MethodePay test</b>\nIf you can read this, order alerts for ${ctx.account.name} will reach you.`,
  );
  return ok
    ? { message: 'Sent. Check the chat.' }
    : {
        error:
          'Telegram rejected it. Check the token, and make sure the bot has been started in that chat.',
      };
}

export default async function NotificationsPage() {
  const { account } = await requireTenant();
  const ent = entitlementsFor(account);

  const settings = await prisma.notificationSettings.upsert({
    where: { accountId: account.id },
    create: { accountId: account.id },
    update: {},
  });

  const storedToken = decryptSecret(settings.telegramBotTokenEnc);

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Who hears about an order, and how. Every send is best-effort — a dead mail server never rolls back a payment."
      />

      {!emailConfigured() ? (
        <Banner tone="warn">
          No SMTP credentials are configured on this deployment, so delivery and receipt emails will
          not send. Set <code className="text-xs">SMTP_HOST</code> and friends in the environment.
          Telegram alerts work regardless.
        </Banner>
      ) : null}

      <div className="space-y-6">
        <ActionForm action={saveNotificationsAction} className="space-y-6">
          <Section title="Your store" description="How you appear in buyer emails.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Store name" htmlFor="storeName">
                <input
                  id="storeName"
                  name="storeName"
                  defaultValue={settings.storeName || account.name}
                  className="input"
                />
              </Field>
              <Field label="Support email" htmlFor="supportEmail" hint="Buyers reply here.">
                <input
                  id="supportEmail"
                  name="supportEmail"
                  type="email"
                  defaultValue={settings.supportEmail}
                  className="input"
                />
              </Field>
              <Field
                label="Order reference prefix"
                htmlFor="orderPrefix"
                hint="References look like MP-7F3K2Q. Buyers read these out loud, so keep it short."
              >
                <input
                  id="orderPrefix"
                  name="orderPrefix"
                  defaultValue={settings.orderPrefix}
                  maxLength={8}
                  className="input font-mono uppercase"
                />
              </Field>
              <Field
                label="Alert these addresses"
                htmlFor="notifyEmails"
                hint="Comma-separated. Up to ten."
              >
                <input
                  id="notifyEmails"
                  name="notifyEmails"
                  defaultValue={settings.notifyEmails.join(', ')}
                  className="input"
                />
              </Field>
            </div>

            <div className="mt-4 space-y-2.5">
              <label className="flex items-center gap-2.5 text-sm text-ink-100">
                <input
                  type="checkbox"
                  name="notifyOnNewOrder"
                  defaultChecked={settings.notifyOnNewOrder}
                  className="h-4 w-4 accent-mint"
                />
                Alert me when an order is created
              </label>
              <label className="flex items-center gap-2.5 text-sm text-ink-100">
                <input
                  type="checkbox"
                  name="notifyOnConfirm"
                  defaultChecked={settings.notifyOnConfirm}
                  className="h-4 w-4 accent-mint"
                />
                Alert me when a buyer reports they have paid
              </label>
            </div>
          </Section>

          <Section
            title="Telegram"
            description="The fastest way to know a sale landed. Create a bot with @BotFather, then send it a message so it can reply."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Bot token"
                htmlFor="telegramBotToken"
                hint={
                  storedToken
                    ? `Stored and encrypted (${maskSecret(storedToken)}). Leave blank to keep it.`
                    : 'Encrypted at rest.'
                }
              >
                <input
                  id="telegramBotToken"
                  name="telegramBotToken"
                  className="input font-mono text-xs"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={storedToken ? maskSecret(storedToken) : '123456:ABC-DEF…'}
                />
              </Field>
              <Field label="Chat ID" htmlFor="telegramChatId" hint="Yours, or a group the bot is in.">
                <input
                  id="telegramChatId"
                  name="telegramChatId"
                  defaultValue={settings.telegramChatId ?? ''}
                  className="input font-mono text-xs"
                />
              </Field>
            </div>
          </Section>

          <Section
            title="How buyers reach you after paying"
            description="Shown on the payment screen for manual rails, prefilled with the order reference."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="WhatsApp number" htmlFor="confirmWhatsapp" hint="Digits only, with country code.">
                <input
                  id="confirmWhatsapp"
                  name="confirmWhatsapp"
                  defaultValue={settings.confirmWhatsapp ?? ''}
                  className="input"
                />
              </Field>
              <Field label="Telegram username" htmlFor="confirmTelegram">
                <input
                  id="confirmTelegram"
                  name="confirmTelegram"
                  defaultValue={settings.confirmTelegram ?? ''}
                  className="input"
                  placeholder="yourhandle"
                />
              </Field>
            </div>
            <Field
              label="Prefilled message"
              htmlFor="confirmMessage"
              hint="Placeholders: {order_ref} {amount} {currency} {product_name} {buyer_name}"
            >
              <textarea
                id="confirmMessage"
                name="confirmMessage"
                rows={3}
                defaultValue={settings.confirmMessage ?? ''}
                className="input"
              />
            </Field>
          </Section>

          <Section
            title="Renewal reminders"
            description={
              ent.renewals
                ? 'Sent once a day for products with an access period.'
                : 'Part of the Professional plan. The settings are saved either way.'
            }
          >
            <label className="flex items-center gap-2.5 text-sm text-ink-100">
              <input
                type="checkbox"
                name="renewalsEnabled"
                defaultChecked={settings.renewalsEnabled}
                disabled={!ent.renewals}
                className="h-4 w-4 accent-mint"
              />
              Send renewal reminders
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                label="Days before expiry"
                htmlFor="renewReminderDays"
                hint="Comma-separated. 0 means on the day it lapses."
              >
                <input
                  id="renewReminderDays"
                  name="renewReminderDays"
                  defaultValue={settings.renewReminderDays}
                  className="input font-mono text-xs"
                />
              </Field>
              <Field label="Renewal discount code" htmlFor="renewDiscountCode" hint="Optional sweetener.">
                <input
                  id="renewDiscountCode"
                  name="renewDiscountCode"
                  defaultValue={settings.renewDiscountCode ?? ''}
                  className="input font-mono uppercase"
                />
              </Field>
              <Field label="Reminder subject" htmlFor="renewSubject">
                <input
                  id="renewSubject"
                  name="renewSubject"
                  defaultValue={settings.renewSubject}
                  className="input"
                />
              </Field>
              <Field label="Expired subject" htmlFor="renewExpiredSubject">
                <input
                  id="renewExpiredSubject"
                  name="renewExpiredSubject"
                  defaultValue={settings.renewExpiredSubject}
                  className="input"
                />
              </Field>
            </div>
          </Section>

          <div className="flex justify-end">
            <SubmitButton>Save notifications</SubmitButton>
          </div>
        </ActionForm>

        <Section title="Test Telegram" description="Sends one message to the chat above.">
          <ActionForm action={testTelegramAction}>
            <SubmitButton variant="ghost">Send a test message</SubmitButton>
          </ActionForm>
        </Section>

        <p className="text-xs text-ink-400">
          Renewal reminders are sent by a scheduled job — see{' '}
          <Link href="/dashboard/developers" className="text-mint hover:underline">
            Developers
          </Link>{' '}
          for the cron endpoint.
        </p>
      </div>
    </>
  );
}
