'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { assertRole, ForbiddenError, requireTenant, type Tenant } from '@/lib/tenancy';
import { claimPayment, markCancelled, markPaid, markRefunded } from '@/lib/orders';
import { decryptSecret } from '@/lib/crypto';
import { loadMerchantContext } from '@/lib/gateway/context';
import { notifyBuyerShipped } from '@/lib/notifier';
import { dispatchWebhook } from '@/lib/webhooks';
import { trackingUrl } from '@/lib/shipping';
import type { ActionState } from '@/components/action-form';

/** Fetch an order inside the tenant scope, or nothing at all. */
async function scopedOrder(tenant: Tenant, id: string) {
  return prisma.order.findFirst({
    where: { id, accountId: tenant.account.id },
    include: { product: true },
  });
}

export async function markPaidAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'STAFF');
    const id = String(formData.get('id') ?? '');
    const txid = String(formData.get('txid') ?? '').trim();
    const note = String(formData.get('note') ?? '').trim();

    const order = await scopedOrder(tenant, id);
    if (!order) return { error: 'That order no longer exists.' };
    if (order.status === 'PAID') return { message: 'That order was already marked paid.' };

    const result = await markPaid(order.id, {
      txid,
      actor: tenant.user.email,
      // The note is the evidence. When a chargeback lands six weeks from now,
      // "Mohammed confirmed the USDT arrived, txid 0x…" is the whole defence.
      note: note || `Marked paid by ${tenant.user.email}.`,
    });
    if (!result.ok) return { error: 'Could not mark that order paid.' };
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath('/dashboard/orders');
  revalidatePath('/dashboard');
  return { message: 'Order marked paid. The buyer has been sent their delivery email.' };
}

export async function refundAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'ADMIN');
    const id = String(formData.get('id') ?? '');
    const reason = String(formData.get('reason') ?? '').trim();

    const order = await scopedOrder(tenant, id);
    if (!order) return { error: 'That order no longer exists.' };

    // Refunding here records the refund and tells the buyer. Moving the money
    // happens in the processor or the wallet — we are never in the flow of
    // funds, so we cannot and should not claim to have sent it back.
    await markRefunded(order.id, { reason, actor: tenant.user.email });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath('/dashboard/orders');
  return {
    message:
      'Order marked refunded and the buyer notified. Issue the actual refund in your processor or wallet.',
  };
}

export async function cancelAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'STAFF');
    const id = String(formData.get('id') ?? '');
    const order = await scopedOrder(tenant, id);
    if (!order) return { error: 'That order no longer exists.' };
    if (order.status === 'PAID') {
      return { error: 'A paid order cannot be cancelled. Refund it instead.' };
    }
    await markCancelled(order.id, tenant.user.email);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath('/dashboard/orders');
  return { message: 'Order cancelled.' };
}

export async function addNoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'STAFF');
    const id = String(formData.get('id') ?? '');
    const note = String(formData.get('note') ?? '').trim();
    if (!note) return { error: 'Write something first.' };

    const order = await scopedOrder(tenant, id);
    if (!order) return { error: 'That order no longer exists.' };

    await prisma.orderEvent.create({
      data: { orderId: order.id, type: 'note', note, actor: tenant.user.email },
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath('/dashboard/orders');
  return { message: 'Note added to the audit trail.' };
}

export async function shipAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'STAFF');
    const id = String(formData.get('id') ?? '');
    const carrier = String(formData.get('carrier') ?? '').trim() || null;
    const number = String(formData.get('trackingNumber') ?? '').trim() || null;

    const order = await scopedOrder(tenant, id);
    if (!order) return { error: 'That order no longer exists.' };

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { trackingCarrier: carrier, trackingNumber: number, shippedAt: new Date() },
    });

    await prisma.orderEvent.create({
      data: {
        orderId: order.id,
        type: 'shipped',
        actor: tenant.user.email,
        note: number ? `Shipped via ${carrier ?? 'carrier'} (${number}).` : 'Marked as shipped.',
        meta: { carrier, number },
      },
    });

    const ctx = await loadMerchantContext(tenant.account.id);
    await notifyBuyerShipped(ctx, updated, order.product, {
      carrier,
      number,
      url: trackingUrl(carrier, number),
    }).catch(() => {});
    await dispatchWebhook(tenant.account.id, 'order.shipped', {
      ref: order.ref,
      carrier,
      tracking_number: number,
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath('/dashboard/orders');
  return { message: 'Marked as shipped and the buyer notified.' };
}

/**
 * Reveal a buyer-submitted gift-card code.
 *
 * Deliberately an explicit, audited action rather than something rendered on
 * page load: the code is a bearer credential, so every look at it leaves a
 * record of who looked and when.
 */
export async function revealGiftCardAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'ADMIN');
    const id = String(formData.get('id') ?? '');

    const order = await scopedOrder(tenant, id);
    if (!order) return { error: 'That order no longer exists.' };
    if (!order.giftCardCodeEnc) {
      return { error: 'There is no gift-card code on this order. It is erased once the order is paid.' };
    }

    const code = decryptSecret(order.giftCardCodeEnc);
    if (!code) return { error: 'The stored code could not be decrypted.' };

    await prisma.orderEvent.create({
      data: {
        orderId: order.id,
        type: 'gift_card_revealed',
        actor: tenant.user.email,
        note: `Gift-card code viewed by ${tenant.user.email}.`,
      },
    });

    revalidatePath(`/dashboard/orders/${order.id}`);
    return {
      message: `Code: ${code}${order.giftCardCountry ? ` (${order.giftCardCountry} Amazon)` : ''} — verify it yourself in Amazon. MethodePay does not check balances or redeem codes.`,
    };
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }
}

/** Record a buyer-reported payment on the merchant behalf (phone, DM, in person). */
export async function recordClaimAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'STAFF');
    const id = String(formData.get('id') ?? '');
    const reference = String(formData.get('reference') ?? '').trim();

    const order = await scopedOrder(tenant, id);
    if (!order) return { error: 'That order no longer exists.' };

    await claimPayment(order.id, {
      reference,
      note: `Payment reported to ${tenant.user.email} outside the checkout.`,
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath('/dashboard/orders');
  return { message: 'Moved to awaiting verification.' };
}
