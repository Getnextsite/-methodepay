'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { env, emailConfigured } from '@/lib/env';
import { loadMerchantContext } from '@/lib/gateway/context';
import { escapeHtml, sendEmail } from '@/lib/notifier';
import { endBuyerSession, linkToken, startBuyerSession } from '@/lib/buyer-session';
import type { ActionState } from '@/components/action-form';

async function storeBySlug(slug: string) {
  return prisma.account.findUnique({ where: { slug }, select: { id: true, slug: true, name: true } });
}

/** Order reference + email: the same proof the order lookup page accepts. */
export async function signInWithOrderAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = String(formData.get('store') ?? '');
  const ref = String(formData.get('ref') ?? '').trim().toUpperCase();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!ref || !email) return { error: 'Enter your order reference and the email you used.' };

  const store = await storeBySlug(slug);
  if (!store) return { error: 'This store no longer exists.' };

  const order = await prisma.order.findFirst({
    where: { accountId: store.id, ref, buyerEmail: email },
    select: { id: true },
  });
  // Same answer whether the reference or the email is wrong.
  if (!order) return { error: 'No order matches that reference and email.' };

  startBuyerSession(store.id, email);
  redirect(`/my/${store.slug}`);
}

/** Email a sign-in link, but only to an address that has ordered here. */
export async function emailLinkAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = String(formData.get('store') ?? '');
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email.includes('@')) return { error: 'Enter the email you ordered with.' };
  if (!emailConfigured()) return { error: 'Email sign-in is not available for this store yet. Use your order reference instead.' };

  const store = await storeBySlug(slug);
  if (!store) return { error: 'This store no longer exists.' };

  const hasOrders = await prisma.order.findFirst({
    where: { accountId: store.id, buyerEmail: email },
    select: { id: true },
  });
  if (hasOrders) {
    const ctx = await loadMerchantContext(store.id);
    const storeName = ctx.notifications.storeName || store.name;
    const url = `${env.checkoutUrl}/my/${store.slug}/verify?token=${encodeURIComponent(linkToken(store.id, email))}`;
    await sendEmail({
      to: email,
      subject: `Your sign-in link for ${storeName}`,
      fromName: storeName,
      html: `<!doctype html><html><body style="margin:0;padding:24px;background:#0a0e1a;font-family:system-ui,sans-serif;color:#e8ecf7">
<table role="presentation" width="100%"><tr><td align="center"><table role="presentation" width="100%" style="max-width:520px;background:#10131c;border:1px solid #222738;border-radius:16px"><tr><td style="padding:28px">
<h2 style="margin:0 0 8px;font-size:18px">Sign in to your orders</h2>
<p style="margin:0;color:#9aa2bd;font-size:14px;line-height:1.6">Use this link to see your orders, downloads and invoices at ${escapeHtml(storeName)}. It works for 30 minutes.</p>
<p style="margin:22px 0 0"><a href="${url}" style="background:${ctx.profile.colorPrimary};color:#06240f;padding:11px 18px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">Open my orders</a></p>
<p style="margin:18px 0 0;color:#6b7391;font-size:12px">If you did not ask for this, ignore it.</p>
</td></tr></table></td></tr></table></body></html>`,
    });
  }
  // Identical reply either way, so this cannot be used to test which emails bought here.
  return { message: 'If that email has orders here, a sign-in link is on its way. Check your inbox.' };
}

export async function signOutAction(formData: FormData): Promise<void> {
  endBuyerSession();
  redirect(`/my/${String(formData.get('store') ?? '')}`);
}
