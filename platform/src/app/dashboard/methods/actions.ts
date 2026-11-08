'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { assertRole, ForbiddenError, requireTenant } from '@/lib/tenancy';
import { canUseMethod, entitlementsFor, PLANS, tierUnlocking } from '@/lib/entitlements';
import { configIsReady, prepareConfigForStorage } from '@/lib/gateway/config';
import { methodDefinition } from '@/lib/gateway/registry';
import type { ActionState } from '@/components/action-form';

/**
 * Turn a rail on or off.
 *
 * The plan check lives here rather than only on the switch, because a disabled
 * HTML control is a suggestion and a POST is not.
 */
export async function toggleMethodAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'ADMIN');

    const key = String(formData.get('key') ?? '');
    const enable = formData.get('enable') === '1';
    const def = methodDefinition(key);
    if (!def) return { error: 'Unknown payment method.' };

    const ent = entitlementsFor(tenant.account);
    if (enable && !canUseMethod(ent, key)) {
      const needed = tierUnlocking(key);
      return {
        error: needed
          ? `${def.defaultLabel} is part of the ${PLANS[needed].label} plan. Your store is on ${ent.label}.`
          : `${def.defaultLabel} is not available on the ${ent.label} plan.`,
      };
    }

    await prisma.paymentMethodConfig.upsert({
      where: { accountId_key: { accountId: tenant.account.id, key } },
      create: { accountId: tenant.account.id, key, enabled: enable },
      update: { enabled: enable },
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath('/dashboard/methods');
  revalidatePath('/dashboard');
  return { message: 'Saved.' };
}

export async function saveMethodAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'ADMIN');

    const key = String(formData.get('key') ?? '');
    const def = methodDefinition(key);
    if (!def) return { error: 'Unknown payment method.' };

    const ent = entitlementsFor(tenant.account);
    const enable = formData.get('enabled') === 'on';
    if (enable && !canUseMethod(ent, key)) {
      const needed = tierUnlocking(key);
      return {
        error: needed
          ? `${def.defaultLabel} needs the ${PLANS[needed].label} plan. You can save the settings, but untick "available at checkout" until you upgrade.`
          : `${def.defaultLabel} is not available on your plan.`,
      };
    }

    const existing = await prisma.paymentMethodConfig.findUnique({
      where: { accountId_key: { accountId: tenant.account.id, key } },
    });

    const submitted: Record<string, unknown> = {};
    for (const field of def.fields) {
      submitted[field.name] = formData.get(field.name) ?? (field.type === 'checkbox' ? false : '');
    }
    const config = prepareConfigForStorage(key, submitted, existing);

    await prisma.paymentMethodConfig.upsert({
      where: { accountId_key: { accountId: tenant.account.id, key } },
      create: {
        accountId: tenant.account.id,
        key,
        enabled: enable,
        label: String(formData.get('label') ?? '').trim() || null,
        description: String(formData.get('description') ?? '').trim() || null,
        iconUrl: String(formData.get('iconUrl') ?? '').trim() || null,
        config: config as object,
      },
      update: {
        enabled: enable,
        label: String(formData.get('label') ?? '').trim() || null,
        description: String(formData.get('description') ?? '').trim() || null,
        iconUrl: String(formData.get('iconUrl') ?? '').trim() || null,
        config: config as object,
      },
    });

    revalidatePath('/dashboard/methods');
    revalidatePath(`/dashboard/methods/${key}`);

    // Tell the merchant the truth: switched on is not the same as live.
    // Readiness only asks whether required values are present, so checking the
    // stored shape (secrets still encrypted) gives the same answer as the
    // plaintext one without decrypting anything here.
    if (enable && !configIsReady(key, config)) {
      return {
        message: `Saved, but ${def.defaultLabel} is not live yet — ${def.setupHint} Until then buyers will not see it.`,
      };
    }
    return { message: 'Saved.' };
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }
}

export async function saveManualMethodAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'ADMIN');

    const slot = Number(formData.get('slot') ?? 0);
    if (!Number.isInteger(slot) || slot < 1 || slot > 5) return { error: 'Unknown method slot.' };

    const ent = entitlementsFor(tenant.account);
    const enable = formData.get('enabled') === 'on';
    if (enable && !canUseMethod(ent, `manual_${slot}`)) {
      return {
        error:
          ent.manualMethods === 0
            ? `Custom payment methods are part of the Starter plan and up. Your store is on ${ent.label}.`
            : `The ${ent.label} plan covers ${ent.manualMethods} custom method${ent.manualMethods === 1 ? '' : 's'}. Use slot 1${ent.manualMethods > 1 ? `–${ent.manualMethods}` : ''}, or upgrade.`,
      };
    }

    const name = String(formData.get('name') ?? '').trim();
    if (enable && !name) return { error: 'Give the method a name buyers will recognise.' };

    await prisma.manualMethod.upsert({
      where: { accountId_slot: { accountId: tenant.account.id, slot } },
      create: {
        accountId: tenant.account.id,
        slot,
        enabled: enable,
        name,
        iconUrl: String(formData.get('iconUrl') ?? '').trim() || null,
        instructions: String(formData.get('instructions') ?? '').trim() || null,
        videoUrl: String(formData.get('videoUrl') ?? '').trim() || null,
        buttonLabel: String(formData.get('buttonLabel') ?? '').trim() || null,
        buttonUrl: String(formData.get('buttonUrl') ?? '').trim() || null,
        requireReference: formData.get('requireReference') === 'on',
      },
      update: {
        enabled: enable,
        name,
        iconUrl: String(formData.get('iconUrl') ?? '').trim() || null,
        instructions: String(formData.get('instructions') ?? '').trim() || null,
        videoUrl: String(formData.get('videoUrl') ?? '').trim() || null,
        buttonLabel: String(formData.get('buttonLabel') ?? '').trim() || null,
        buttonUrl: String(formData.get('buttonUrl') ?? '').trim() || null,
        requireReference: formData.get('requireReference') === 'on',
      },
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath('/dashboard/methods');
  return { message: 'Saved.' };
}
