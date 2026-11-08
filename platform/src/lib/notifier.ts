import 'server-only';
import nodemailer from 'nodemailer';
import type { Order, Product } from '@prisma/client';
import { decryptSecret } from './crypto';
import { emailConfigured, env } from './env';
import { formatMoney } from './money';
import type { MerchantContext } from './gateway/types';

/**
 * Buyer and merchant notifications.
 *
 * Every function here returns a boolean and swallows transport errors. A dead
 * SMTP host or a revoked Telegram token must not roll back a payment that has
 * already settled — the order is the record of truth, the email is a courtesy.
 * Failures are logged, and the order event trail shows what was attempted.
 */

let transport: nodemailer.Transporter | null = null;

function mailer(): nodemailer.Transporter | null {
  if (!emailConfigured()) return null;
  if (transport) return transport;
  const { host, port, user, pass, secure } = env.smtp;
  transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
  });
  return transport;
}

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  fromName?: string;
};

export async function sendEmail(args: SendArgs): Promise<boolean> {
  const tx = mailer();
  if (!tx || !args.to) return false;
  try {
    await tx.sendMail({
      from: args.fromName ? `${args.fromName} <${extractAddress(env.smtp.from)}>` : env.smtp.from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      replyTo: args.replyTo,
    });
    return true;
  } catch (error) {
    console.error('[notifier] email failed', { to: args.to, subject: args.subject, error });
    return false;
  }
}

function extractAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return match ? match[1] : from;
}

export async function sendTelegram(ctx: MerchantContext, text: string): Promise<boolean> {
  const token = decryptSecret(ctx.notifications.telegramBotTokenEnc);
  const chatId = ctx.notifications.telegramChatId;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      cache: 'no-store',
    });
    return res.ok;
  } catch (error) {
    console.error('[notifier] telegram failed', error);
    return false;
  }
}

// ------------------------------------------------------------------ templates

function shell(body: string, accent = '#00ffa3'): string {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#0a0e1a;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#e8ecf7">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px;background:#10131c;border:1px solid #222738;border-radius:16px;overflow:hidden">
<tr><td style="height:3px;background:${accent}"></td></tr>
<tr><td style="padding:28px">${body}</td></tr>
</table>
<p style="color:#6b7391;font-size:12px;margin:16px 0 0">Sent by MethodePay</p>
</td></tr></table></body></html>`;
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:6px 0;color:#9aa2bd;font-size:13px">${escapeHtml(label)}</td>
<td style="padding:6px 0;text-align:right;font-size:13px;color:#e8ecf7"><strong>${escapeHtml(value)}</strong></td></tr>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function orderTable(order: Order, product: Product): string {
  return `<table role="presentation" width="100%" style="border-top:1px solid #222738;margin-top:16px">
${row('Reference', order.ref)}
${row('Product', product.name)}
${row('Amount', formatMoney(order.amountCents, order.currency))}
${order.paymentMethod ? row('Method', prettyMethod(order.paymentMethod)) : ''}
</table>`;
}

export function prettyMethod(key: string): string {
  if (key.startsWith('manual_')) return `Manual method ${key.slice(7)}`;
  return key
    .replace(/^op_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ------------------------------------------------------------------ messages

export async function notifyMerchantNewOrder(
  ctx: MerchantContext,
  order: Order,
  product: Product,
  opts: { claimed?: boolean } = {},
): Promise<boolean> {
  const wantsIt = opts.claimed
    ? ctx.notifications.notifyOnConfirm
    : ctx.notifications.notifyOnNewOrder;
  if (!wantsIt) return false;

  const headline = opts.claimed
    ? `Payment reported on ${order.ref}`
    : `New order ${order.ref}`;

  const recipients = [
    ...ctx.notifications.notifyEmails,
    ctx.notifications.supportEmail,
  ].filter(Boolean);

  const body = `<h2 style="margin:0 0 6px;font-size:18px">${escapeHtml(headline)}</h2>
<p style="margin:0;color:#9aa2bd;font-size:14px">${escapeHtml(order.buyerName)} &lt;${escapeHtml(order.buyerEmail)}&gt;${
    order.buyerCountry ? ` · ${escapeHtml(order.buyerCountry)}` : ''
  }</p>
${orderTable(order, product)}
${
  opts.claimed && order.paymentReference
    ? `<p style="margin:16px 0 0;font-size:14px">Buyer reference: <code style="background:#171b28;padding:2px 6px;border-radius:4px">${escapeHtml(order.paymentReference)}</code></p>`
    : ''
}
<p style="margin:20px 0 0"><a href="${env.appUrl}/dashboard/orders/${order.id}" style="background:#00ffa3;color:#06240f;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">Open the order</a></p>`;

  const emailed = await Promise.all(
    [...new Set(recipients)].map((to) =>
      sendEmail({ to, subject: headline, html: shell(body), replyTo: order.buyerEmail }),
    ),
  );

  const telegram = await sendTelegram(
    ctx,
    [
      opts.claimed ? `<b>Payment reported</b>` : `<b>New order</b>`,
      `Ref: <code>${escapeHtml(order.ref)}</code>`,
      `Product: ${escapeHtml(product.name)}`,
      `Amount: ${escapeHtml(formatMoney(order.amountCents, order.currency))}`,
      `Buyer: ${escapeHtml(order.buyerName)} (${escapeHtml(order.buyerEmail)})`,
      order.paymentMethod ? `Method: ${escapeHtml(prettyMethod(order.paymentMethod))}` : '',
      order.paymentReference ? `Reference: <code>${escapeHtml(order.paymentReference)}</code>` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  );

  return emailed.some(Boolean) || telegram;
}

/**
 * Deliver the goods. Digital products carry a file link and/or an access code;
 * the code is decrypted here and nowhere else in the buyer-facing path.
 */
export async function notifyBuyerDelivery(
  ctx: MerchantContext,
  order: Order,
  product: Product,
): Promise<boolean> {
  const accessCode = decryptSecret(product.deliveryAccessCodeEnc);
  const storeName = ctx.notifications.storeName || ctx.account.name;

  const parts: string[] = [
    `<h2 style="margin:0 0 6px;font-size:18px">Your order is ready</h2>`,
    `<p style="margin:0;color:#9aa2bd;font-size:14px">Thanks, ${escapeHtml(order.buyerName)} — payment on ${escapeHtml(order.ref)} is confirmed.</p>`,
    orderTable(order, product),
  ];

  if (product.thanksMessage) {
    parts.push(`<div style="margin:16px 0 0;font-size:14px;line-height:1.6">${product.thanksMessage}</div>`);
  }
  if (product.deliveryFileUrl) {
    parts.push(
      `<p style="margin:20px 0 0"><a href="${escapeHtml(product.deliveryFileUrl)}" style="background:#00ffa3;color:#06240f;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">Download your purchase</a></p>`,
    );
  }
  if (accessCode) {
    parts.push(
      `<p style="margin:20px 0 6px;color:#9aa2bd;font-size:13px">Your access details</p>
<pre style="background:#07080f;border:1px solid #222738;border-radius:10px;padding:14px;font-size:13px;color:#00ffa3;white-space:pre-wrap;margin:0">${escapeHtml(accessCode)}</pre>`,
    );
  }
  if (product.durationDays > 0 && order.serviceExpiresAt) {
    parts.push(
      `<p style="margin:16px 0 0;color:#9aa2bd;font-size:13px">Active until ${order.serviceExpiresAt.toISOString().slice(0, 10)}.</p>`,
    );
  }

  return sendEmail({
    to: order.buyerEmail,
    subject: `${storeName}: your order ${order.ref} is ready`,
    html: shell(parts.join('\n'), ctx.profile.colorPrimary),
    replyTo: ctx.notifications.supportEmail || undefined,
    fromName: storeName,
  });
}

/** Sent when the buyer picks a manual rail, so they have the reference in writing. */
export async function notifyBuyerInstructions(
  ctx: MerchantContext,
  order: Order,
  product: Product,
  instructionsHtml: string,
): Promise<boolean> {
  const storeName = ctx.notifications.storeName || ctx.account.name;
  const body = `<h2 style="margin:0 0 6px;font-size:18px">Finish your payment</h2>
<p style="margin:0;color:#9aa2bd;font-size:14px">Order ${escapeHtml(order.ref)} is reserved. Here is how to complete it.</p>
${orderTable(order, product)}
<div style="margin:16px 0 0;font-size:14px;line-height:1.6">${instructionsHtml}</div>
<p style="margin:20px 0 0"><a href="${env.checkoutUrl}/pay/${order.nonce}" style="background:${ctx.profile.colorPrimary};color:#06240f;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">Open your payment page</a></p>`;

  return sendEmail({
    to: order.buyerEmail,
    subject: `${storeName}: how to pay for ${order.ref}`,
    html: shell(body, ctx.profile.colorPrimary),
    replyTo: ctx.notifications.supportEmail || undefined,
    fromName: storeName,
  });
}

export async function notifyBuyerRefund(
  ctx: MerchantContext,
  order: Order,
  product: Product,
  reason: string,
): Promise<boolean> {
  const storeName = ctx.notifications.storeName || ctx.account.name;
  const body = `<h2 style="margin:0 0 6px;font-size:18px">Your order was refunded</h2>
<p style="margin:0;color:#9aa2bd;font-size:14px">Order ${escapeHtml(order.ref)} has been refunded in full.</p>
${orderTable(order, product)}
${reason ? `<p style="margin:16px 0 0;font-size:14px">${escapeHtml(reason)}</p>` : ''}
<p style="margin:16px 0 0;color:#9aa2bd;font-size:13px">Depending on your bank or wallet, the funds can take a few business days to appear.</p>`;

  return sendEmail({
    to: order.buyerEmail,
    subject: `${storeName}: refund for ${order.ref}`,
    html: shell(body, ctx.profile.colorPrimary),
    replyTo: ctx.notifications.supportEmail || undefined,
    fromName: storeName,
  });
}

export async function notifyBuyerShipped(
  ctx: MerchantContext,
  order: Order,
  product: Product,
  tracking: { carrier: string | null; number: string | null; url: string | null },
): Promise<boolean> {
  const storeName = ctx.notifications.storeName || ctx.account.name;
  const body = `<h2 style="margin:0 0 6px;font-size:18px">Your order is on its way</h2>
<p style="margin:0;color:#9aa2bd;font-size:14px">Order ${escapeHtml(order.ref)} has shipped.</p>
${orderTable(order, product)}
${
  tracking.number
    ? `<p style="margin:16px 0 0;font-size:14px">Tracking: <strong>${escapeHtml(tracking.number)}</strong>${
        tracking.url
          ? ` — <a href="${escapeHtml(tracking.url)}" style="color:${ctx.profile.colorPrimary}">track it</a>`
          : ''
      }</p>`
    : ''
}`;

  return sendEmail({
    to: order.buyerEmail,
    subject: `${storeName}: ${order.ref} has shipped`,
    html: shell(body, ctx.profile.colorPrimary),
    fromName: storeName,
  });
}

export async function notifyRenewalReminder(
  ctx: MerchantContext,
  order: Order,
  product: Product,
  daysLeft: number,
  renewUrl: string,
): Promise<boolean> {
  const storeName = ctx.notifications.storeName || ctx.account.name;
  const expired = daysLeft <= 0;
  const subject = (expired
    ? ctx.notifications.renewExpiredSubject
    : ctx.notifications.renewSubject
  )
    .split('{product}')
    .join(product.name)
    .split('{days}')
    .join(String(daysLeft));

  const body = `<h2 style="margin:0 0 6px;font-size:18px">${escapeHtml(subject)}</h2>
<p style="margin:0;color:#9aa2bd;font-size:14px">${
    expired
      ? `Your access to ${escapeHtml(product.name)} has ended.`
      : `Your access to ${escapeHtml(product.name)} ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`
  }</p>
${
  ctx.notifications.renewDiscountCode
    ? `<p style="margin:16px 0 0;font-size:14px">Use code <code style="background:#171b28;padding:2px 6px;border-radius:4px">${escapeHtml(ctx.notifications.renewDiscountCode)}</code> when you renew.</p>`
    : ''
}
<p style="margin:20px 0 0"><a href="${escapeHtml(renewUrl)}" style="background:${ctx.profile.colorPrimary};color:#06240f;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">Renew now</a></p>`;

  return sendEmail({
    to: order.buyerEmail,
    subject,
    html: shell(body, ctx.profile.colorPrimary),
    replyTo: ctx.notifications.supportEmail || undefined,
    fromName: storeName,
  });
}
