'use server';

import { revalidatePath } from 'next/cache';
import { requireTenant, assertRole, ForbiddenError } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { toCents } from '@/lib/money';
import { parseFraud } from '@/lib/fraud/score';
import type { ActionState } from '@/components/action-form';

export async function saveFraudAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'ADMIN');
    const currency = String(formData.get('currency') ?? 'USD');
    const maxAmount = String(formData.get('maxAmount') ?? '').trim();
    const fraud = parseFraud({
      enabled: formData.get('enabled') === 'on',
      blockHigh: formData.get('blockHigh') === 'on',
      mediumAt: Number(formData.get('mediumAt')),
      highAt: Number(formData.get('highAt')),
      velocityPerHour: Number(formData.get('velocityPerHour')),
      maxAmountCents: maxAmount ? toCents(maxAmount, currency) : 0,
      blockedCountries: String(formData.get('blockedCountries') ?? ''),
      blocklist: String(formData.get('blocklist') ?? ''),
    });
    await prisma.notificationSettings.upsert({
      where: { accountId: tenant.account.id },
      create: { accountId: tenant.account.id, fraud },
      update: { fraud },
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }
  revalidatePath('/dashboard/fraud');
  return { message: 'Fraud settings saved. They apply to the next checkout.' };
}

/** From an order: refuse this buyer's email (and IP, when known) from now on. */
export async function blockBuyerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'ADMIN');
    const order = await prisma.order.findFirst({
      where: { id: String(formData.get('orderId') ?? ''), accountId: tenant.account.id },
      select: { id: true, buyerEmail: true, buyerIp: true },
    });
    if (!order) return { error: 'That order no longer exists.' };

    const row = await prisma.notificationSettings.findUnique({
      where: { accountId: tenant.account.id },
      select: { fraud: true },
    });
    const current = parseFraud(row?.fraud);
    const additions = [order.buyerEmail, order.buyerIp].filter((v): v is string => Boolean(v));
    const fraud = parseFraud({ ...current, blocklist: [...current.blocklist, ...additions] });
    await prisma.notificationSettings.upsert({
      where: { accountId: tenant.account.id },
      create: { accountId: tenant.account.id, fraud },
      update: { fraud },
    });
    await prisma.orderEvent.create({
      data: {
        orderId: order.id,
        type: 'buyer_blocked',
        actor: tenant.user.email,
        note: `Blocked ${additions.join(' and ')} from future checkouts.`,
      },
    });
    revalidatePath(`/dashboard/orders/${order.id}`);
    revalidatePath('/dashboard/fraud');
    return { message: `Blocked ${additions.join(' and ')}. Their next checkout will be refused.` };
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }
}
