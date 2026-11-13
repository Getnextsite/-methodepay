import { NextResponse } from 'next/server';
import { z } from 'zod';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db';
import { loadMerchantContext } from '@/lib/gateway/context';
import { resolveMethods } from '@/lib/gateway/resolve';
import { initiate, nextUrlFor } from '@/lib/gateway/initiate';
import { createOrder } from '@/lib/orders';
import { inStock } from '@/lib/shipping';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * Rails a buyer on a computer usually wants to finish on their phone: the
 * wallet apps (Binance, Revolut, UPI, PayPal, Cash App) and WhatsApp all live
 * there. For these the checkout offers a QR of the payment link instead of
 * redirecting straight away, as the plugin did.
 */
const QR_RAILS = new Set([
  'op_binance',
  'op_revolut',
  'op_upi',
  'op_paypalus',
  'op_cashapp',
  'whatsapp',
]);

async function qrFor(url: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 1, width: 360 });
  } catch {
    // A missing QR only costs the shortcut; the buyer still gets the link.
    return null;
  }
}

const schema = z.object({
  productId: z.string().min(1),
  paymentMethod: z.string().min(1).max(64),
  buyerName: z.string().trim().min(1).max(190),
  buyerEmail: z.string().trim().email().max(190),
  buyerPhone: z.string().trim().max(64).optional(),
  buyerCountry: z.string().trim().max(8).optional(),
  buyerState: z.string().trim().max(120).optional(),
  buyerCity: z.string().trim().max(120).optional(),
  buyerPostalCode: z.string().trim().max(32).optional(),
  buyerAddress1: z.string().trim().max(255).optional(),
  buyerAddress2: z.string().trim().max(255).optional(),
  buyerCompany: z.string().trim().max(190).optional(),
  buyerNote: z.string().trim().max(2000).optional(),
  couponCode: z.string().trim().max(64).optional(),
  giftCardCode: z.string().trim().max(32).optional(),
  giftCardCountry: z.string().trim().max(8).optional(),
  renewalOfRef: z.string().trim().max(32).optional(),
});

/**
 * Create an order and hand the buyer whatever comes next.
 *
 * Nothing on the request is trusted for money: the price comes from the
 * product row, the discount from the coupon table, and the chosen rail has to
 * appear in the list this buyer would actually have been shown. A crafted POST
 * cannot buy a $500 product for a dollar, nor pay through a rail the merchant
 * has switched off or their plan does not include.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue ? `${issue.path.join('.') || 'Form'}: ${issue.message}` : 'Check the form.' },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const product = await prisma.product.findUnique({ where: { id: input.productId } });
  if (!product || !product.active) {
    return NextResponse.json({ error: 'That product is no longer available.' }, { status: 404 });
  }
  if (!inStock(product)) {
    return NextResponse.json({ error: 'That product is out of stock.' }, { status: 409 });
  }

  const ctx = await loadMerchantContext(product.accountId);
  if (ctx.account.suspendedAt) {
    return NextResponse.json({ error: 'This store is not accepting payments.' }, { status: 403 });
  }

  // The authority on which rails exist is the same function the page used to
  // draw them, so the two can never disagree.
  const available = resolveMethods(ctx, product, { buyerCountry: input.buyerCountry });
  const chosen = available.find((m) => m.key === input.paymentMethod);
  if (!chosen) {
    return NextResponse.json(
      { error: 'That payment method is not available. Please pick another.' },
      { status: 409 },
    );
  }
  if (chosen.requiresGiftCard && !input.giftCardCode) {
    return NextResponse.json({ error: 'Enter the gift card code.' }, { status: 400 });
  }

  // A renewal extends an existing order rather than starting a fresh clock.
  let renewalOfId: string | undefined;
  if (input.renewalOfRef) {
    const previous = await prisma.order.findFirst({
      where: { ref: input.renewalOfRef, accountId: product.accountId, status: 'PAID' },
      select: { id: true },
    });
    renewalOfId = previous?.id;
  }

  const customFields: Record<string, string> = {};
  if (body && typeof body === 'object') {
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      if (key.startsWith('custom_') && typeof value === 'string' && value.trim()) {
        customFields[key] = value.trim().slice(0, 500);
      }
    }
  }

  const order = await createOrder({
    accountId: product.accountId,
    product,
    buyerName: input.buyerName,
    buyerEmail: input.buyerEmail,
    buyerPhone: input.buyerPhone,
    buyerCountry: input.buyerCountry,
    buyerState: input.buyerState,
    buyerCity: input.buyerCity,
    buyerPostalCode: input.buyerPostalCode,
    buyerAddress1: input.buyerAddress1,
    buyerAddress2: input.buyerAddress2,
    buyerCompany: input.buyerCompany,
    buyerNote: input.buyerNote,
    couponCode: input.couponCode,
    paymentMethod: chosen.key,
    giftCardCode: input.giftCardCode,
    giftCardCountry: input.giftCardCountry,
    customFields,
    renewalOfId,
  });

  const origin = env.checkoutUrl || new URL(request.url).origin;
  const result = await initiate({ order, product, ctx, methodKey: chosen.key, origin });

  if (result.kind === 'error') {
    // The order already exists, so leave a trace of why the buyer bounced —
    // a dead end nobody can see is a dead end nobody fixes.
    await prisma.orderEvent.create({
      data: {
        orderId: order.id,
        type: 'initiate_failed',
        actor: 'system',
        note: result.message,
        meta: { method: chosen.key },
      },
    });
    return NextResponse.json({ error: result.message }, { status: 502 });
  }

  const url = nextUrlFor(result, order, origin);
  if (!url) {
    return NextResponse.json({ error: 'Could not start that payment.' }, { status: 502 });
  }

  // Chat and instruction rails have nothing to settle yet, so the buyer is
  // told what to do and the order waits for a human.
  if (result.kind === 'chat') {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'AWAITING_VERIFICATION' },
    });
  }

  const qr =
    QR_RAILS.has(chosen.key) && (result.kind === 'redirect' || result.kind === 'chat')
      ? await qrFor(url)
      : null;

  return NextResponse.json({ url, ref: order.ref, ...(qr ? { qr } : {}) });
}
