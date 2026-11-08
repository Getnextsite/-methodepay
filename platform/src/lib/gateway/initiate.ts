import 'server-only';
import type { Order, Product } from '@prisma/client';
import { prisma } from '../db';
import { formatMoney } from '../money';
import { readConfig } from './config';
import { methodDefinition } from './registry';
import { initiatePaypal } from './providers/paypal';
import { initiateAlchemyPay, initiateOnRamPay } from './providers/onramp';
import { initiateStripe } from './providers/stripe';
import type { InitiateInput, InitiateResult, MerchantContext, MethodConfig } from './types';

/**
 * Route a chosen rail to whatever has to happen next.
 *
 * Automatic rails get a hosted page created server-side and the buyer is
 * redirected. Manual rails get our own payment screen, and the order sits in
 * AWAITING_VERIFICATION until a human confirms. Nothing here ever marks an
 * order PAID — only a verified webhook or a merchant action does that.
 */
export async function initiate(args: {
  order: Order;
  product: Product;
  ctx: MerchantContext;
  methodKey: string;
  origin: string;
}): Promise<InitiateResult> {
  const { order, product, ctx, methodKey, origin } = args;

  // Manual slots carry no registry entry; they are merchant-authored.
  if (methodKey.startsWith('manual_')) {
    const slot = Number(methodKey.slice('manual_'.length));
    const manual = ctx.manualMethods.find((m) => m.slot === slot && m.enabled) ?? null;
    if (!manual) return { kind: 'error', message: 'That payment method is no longer available.' };
    return { kind: 'instructions', screen: methodKey };
  }

  const def = methodDefinition(methodKey);
  if (!def) return { kind: 'error', message: 'Unknown payment method.' };

  const row = ctx.methods.find((m) => m.key === methodKey) ?? null;
  if (!row?.enabled) return { kind: 'error', message: 'That payment method is no longer available.' };

  const config = readConfig(row, methodKey);
  const input: InitiateInput = { order, product, ctx, method: row, manual: null, config, origin };

  await prisma.orderEvent.create({
    data: {
      orderId: order.id,
      type: 'method_selected',
      note: `Buyer selected ${row.label?.trim() || def.defaultLabel}.`,
      actor: 'buyer',
      meta: { method: methodKey },
    },
  });

  switch (methodKey) {
    case 'stripe':
      return initiateStripe(input);
    case 'paypal':
      return initiatePaypal(input);
    case 'alchemypay':
      return initiateAlchemyPay(input);
    case 'onramppay':
      return initiateOnRamPay(input);
    case 'op_binance':
      return initiateOnRamPay(input, 'binance');
    case 'op_revolut':
      return initiateOnRamPay(input, 'revolut');
    case 'op_upi':
      return initiateOnRamPay(input, 'upi');
    case 'op_paypalus':
      return initiateOnRamPay(input, 'paypal');
    case 'whatsapp':
      return { kind: 'chat', url: whatsappUrl(order, product, ctx, config) };
    // Everything else is walked through on our own payment screen: direct
    // crypto, bank transfer, Western Union, PayPal F&F, the buy-crypto-first
    // flows, the FinchPay handoff and the gift-card submission.
    default:
      return { kind: 'instructions', screen: methodKey };
  }
}

/**
 * Prefilled WhatsApp thread. Where WhatsApp is the shop, this is the whole
 * checkout: the buyer taps once and lands in a conversation that already knows
 * the order reference and the amount, so nobody has to type "which order?".
 */
export function whatsappUrl(
  order: Order,
  product: Product,
  ctx: MerchantContext,
  config: MethodConfig,
): string {
  const template =
    String(config.messageTemplate ?? '').trim() ||
    'Hello! I want to place an order:\n\nOrder {order_ref}\nProduct: {product_name}\nAmount: {amount}\n\nMy name: {buyer_name}\nMy email: {buyer_email}';

  const message = fillPlaceholders(template, order, product);
  const number = String(config.number ?? '').replace(/\D/g, '');
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function fillPlaceholders(template: string, order: Order, product: Product): string {
  const map: Record<string, string> = {
    '{order_ref}': order.ref,
    '{order_id}': order.ref,
    '{product_name}': product.name,
    '{amount}': formatMoney(order.amountCents, order.currency),
    '{amount_plain}': (order.amountCents / 100).toFixed(2),
    '{currency}': order.currency,
    '{buyer_name}': order.buyerName,
    '{buyer_email}': order.buyerEmail,
    '{buyer_country}': order.buyerCountry ?? '',
  };
  return Object.entries(map).reduce(
    (acc, [token, value]) => acc.split(token).join(value),
    template,
  );
}

/** Where the buyer goes after a rail is chosen. */
export function nextUrlFor(result: InitiateResult, order: Order, origin: string): string | null {
  switch (result.kind) {
    case 'redirect':
    case 'chat':
      return result.url;
    case 'iframe':
    case 'instructions':
      return `${origin}/pay/${order.nonce}`;
    case 'error':
      return null;
  }
}
