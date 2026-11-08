import 'server-only';
import { prisma } from '../db';
import type { MerchantContext } from './types';

/**
 * Load everything a checkout render or a gateway call needs, in one round trip
 * per table, and create the singleton rows on first touch.
 *
 * The plugin could lean on wp_options always existing. Here a brand new
 * account has no profile row yet, and the first buyer must not be the one who
 * discovers that.
 */
export async function loadMerchantContext(accountId: string): Promise<MerchantContext> {
  const [account, profile, notifications, methods, manualMethods, wallets] = await Promise.all([
    prisma.account.findUniqueOrThrow({ where: { id: accountId } }),
    prisma.checkoutProfile.upsert({
      where: { accountId },
      create: { accountId },
      update: {},
    }),
    prisma.notificationSettings.upsert({
      where: { accountId },
      create: { accountId },
      update: {},
    }),
    prisma.paymentMethodConfig.findMany({
      where: { accountId },
      orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }],
    }),
    prisma.manualMethod.findMany({ where: { accountId }, orderBy: { slot: 'asc' } }),
    prisma.wallet.findMany({
      where: { accountId, active: true },
      orderBy: [{ sortOrder: 'asc' }, { coin: 'asc' }],
    }),
  ]);

  return { account, profile, notifications, methods, manualMethods, wallets };
}

/** Defaults every new account gets, so the dashboard is never an empty room. */
export async function provisionAccountDefaults(accountId: string, storeName: string) {
  await prisma.$transaction([
    prisma.checkoutProfile.upsert({
      where: { accountId },
      create: {
        accountId,
        trustBadges: ['ssl', 'encrypted', 'money_back', 'support'],
        kycNoticeMethods: ['onramppay', 'stripe', 'alchemypay'],
        kycNoticeText:
          'Pay securely by card. For your protection you may be asked to verify your identity with a government ID and a selfie. That is a standard check required by the payment provider, not by us. Once verified, your payment is processed and your order is activated.',
        guaranteeText:
          'If within the next 30 days you hit a problem that makes the product unusable and we cannot resolve it, we will consider a full refund.',
      },
      update: {},
    }),
    prisma.notificationSettings.upsert({
      where: { accountId },
      create: {
        accountId,
        storeName,
        confirmChannels: ['whatsapp'],
        confirmMessage:
          'Hi, I have paid. My order reference is {order_ref} — {amount} {currency}. Please verify and activate it.',
      },
      update: {},
    }),
    // Five manual slots, matching the plugin. Empty slots are invisible.
    ...[1, 2, 3, 4, 5].map((slot) =>
      prisma.manualMethod.upsert({
        where: { accountId_slot: { accountId, slot } },
        create: { accountId, slot },
        update: {},
      }),
    ),
  ]);
}
