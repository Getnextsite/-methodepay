import 'server-only';
import type { Order, Product } from '@prisma/client';
import { prisma } from './db';
import { env, emailConfigured } from './env';
import { formatMoney } from './money';
import { loadMerchantContext } from './gateway/context';
import { methodDefinition } from './gateway/registry';
import { escapeHtml, sendEmail } from './notifier';
import { parseRecovery, type RecoverySettings } from './recovery-settings';

export { parseRecovery, DEFAULT_RECOVERY, type RecoverySettings } from './recovery-settings';

/**
 * Abandoned checkout recovery.
 *
 * An order that stays PENDING (the buyer filled in the checkout but never
 * paid or reported paying) gets one reminder email after `delayHours`, with a
 * link straight back to it and, optionally, a discount code. One reminder per
 * order, never after 72 hours, and never if the buyer has since bought the
 * same product another way.
 */
const MAX_AGE_HOURS = 72;

function metaOf(order: Pick<Order, 'meta'>): Record<string, unknown> {
  return order.meta && typeof order.meta === 'object' && !Array.isArray(order.meta)
    ? (order.meta as Record<string, unknown>)
    : {};
}

export function recoverySentAt(order: Pick<Order, 'meta'>): string | null {
  const v = metaOf(order).recoverySentAt;
  return typeof v === 'string' ? v : null;
}

/** Where the reminder sends the buyer: their payment page if it is still usable, else a fresh checkout. */
export function recoveryLinks(
  order: Order,
  product: Product,
  accountSlug: string,
  couponCode: string,
): { primary: string; checkout: string } {
  const qs = new URLSearchParams({ from: order.nonce });
  if (couponCode) qs.set('coupon', couponCode);
  const checkout = `${env.checkoutUrl}/c/${accountSlug}/${product.slug}?${qs.toString()}`;

  const method = order.paymentMethod ?? '';
  const usesPayPage = method.startsWith('manual_') || methodDefinition(method)?.flow === 'instructions';
  const stillOpen = !order.expiresAt || order.expiresAt.getTime() > Date.now();
  return { primary: usesPayPage && stillOpen ? `${env.checkoutUrl}/pay/${order.nonce}` : checkout, checkout };
}

function fill(template: string, order: Order, product: Product): string {
  return template
    .split('{buyer_name}').join(order.buyerName.split(' ')[0] || order.buyerName)
    .split('{product}').join(product.name)
    .split('{amount}').join(formatMoney(order.amountCents, order.currency))
    .split('{order_ref}').join(order.ref);
}

/** Orders that qualify for a reminder right now. */
export async function abandonedOrders(accountId: string, settings: RecoverySettings, now = Date.now()) {
  const orders = await prisma.order.findMany({
    where: {
      accountId,
      status: 'PENDING',
      createdAt: {
        lte: new Date(now - settings.delayHours * 3600_000),
        gte: new Date(now - MAX_AGE_HOURS * 3600_000),
      },
    },
    include: { product: true },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });

  const due: typeof orders = [];
  for (const order of orders) {
    if (recoverySentAt(order)) continue;
    // Bought it anyway, by another order? Then there is nothing to recover.
    const later = await prisma.order.findFirst({
      where: {
        accountId,
        buyerEmail: order.buyerEmail,
        productId: order.productId,
        createdAt: { gt: order.createdAt },
        status: { in: ['PAID', 'AWAITING_VERIFICATION'] },
      },
      select: { id: true },
    });
    if (!later) due.push(order);
  }
  return due;
}

/** Send the reminders that are due for one store. */
export async function runRecovery(accountId: string): Promise<{ due: number; sent: number }> {
  const ctx = await loadMerchantContext(accountId);
  const settings = parseRecovery(ctx.notifications.recovery);
  if (!settings.enabled || !emailConfigured()) return { due: 0, sent: 0 };

  const storeName = ctx.notifications.storeName || ctx.account.name;
  const due = await abandonedOrders(accountId, settings);
  let sent = 0;

  for (const order of due) {
    const links = recoveryLinks(order, order.product, ctx.account.slug, settings.couponCode);
    const accent = ctx.profile.colorPrimary;
    const body = `<h2 style="margin:0 0 8px;font-size:18px">${escapeHtml(fill('Your order is waiting', order, order.product))}</h2>
<p style="margin:0;color:#c3c9dc;font-size:14px;line-height:1.6">${escapeHtml(fill(settings.message, order, order.product))}</p>
<table role="presentation" width="100%" style="border-top:1px solid #222738;margin-top:16px">
<tr><td style="padding:6px 0;color:#9aa2bd;font-size:13px">Product</td><td style="padding:6px 0;text-align:right;font-size:13px"><strong>${escapeHtml(order.product.name)}</strong></td></tr>
<tr><td style="padding:6px 0;color:#9aa2bd;font-size:13px">Total</td><td style="padding:6px 0;text-align:right;font-size:13px"><strong>${escapeHtml(formatMoney(order.amountCents, order.currency))}</strong></td></tr>
</table>
${
  settings.couponCode
    ? `<p style="margin:16px 0 0;font-size:14px">Use code <strong style="color:${accent}">${escapeHtml(settings.couponCode)}</strong> for a discount when you complete it.</p>`
    : ''
}
<p style="margin:22px 0 0"><a href="${links.primary}" style="background:${accent};color:#06240f;padding:11px 18px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">Complete your order</a></p>
${
  links.primary !== links.checkout
    ? `<p style="margin:12px 0 0;font-size:13px"><a href="${links.checkout}" style="color:#9aa2bd">Or choose another way to pay</a></p>`
    : ''
}`;

    const ok = await sendEmail({
      to: order.buyerEmail,
      subject: fill(settings.subject, order, order.product),
      html: `<!doctype html><html><body style="margin:0;padding:24px;background:#0a0e1a;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#e8ecf7"><table role="presentation" width="100%"><tr><td align="center"><table role="presentation" width="100%" style="max-width:560px;background:#10131c;border:1px solid #222738;border-radius:16px"><tr><td style="height:3px;background:${accent}"></td></tr><tr><td style="padding:28px">${body}</td></tr></table></td></tr></table></body></html>`,
      replyTo: ctx.notifications.supportEmail || undefined,
      fromName: storeName,
    });
    if (!ok) continue;

    sent += 1;
    await prisma.order.update({
      where: { id: order.id },
      data: { meta: { ...metaOf(order), recoverySentAt: new Date().toISOString() } as object },
    });
    await prisma.orderEvent.create({
      data: {
        orderId: order.id,
        type: 'recovery_sent',
        actor: 'system',
        note: `Abandoned checkout reminder emailed to ${order.buyerEmail}.`,
      },
    });
  }
  return { due: due.length, sent };
}

/** Every store, for the scheduled sweep. */
export async function runRecoveryForAll(): Promise<{ stores: number; sent: number }> {
  const accounts = await prisma.order.findMany({
    where: { status: 'PENDING', createdAt: { gte: new Date(Date.now() - MAX_AGE_HOURS * 3600_000) } },
    distinct: ['accountId'],
    select: { accountId: true },
  });
  let sent = 0;
  for (const { accountId } of accounts) {
    sent += (await runRecovery(accountId).catch(() => ({ sent: 0 }))).sent;
  }
  return { stores: accounts.length, sent };
}
