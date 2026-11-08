import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireTenant } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { methodDefinition } from '@/lib/gateway/registry';
import { publicConfig } from '@/lib/gateway/config';
import { canUseMethod, entitlementsFor, PLANS, tierUnlocking } from '@/lib/entitlements';
import { env } from '@/lib/env';
import { Banner, PageHeader, Section } from '@/components/ui';
import { MethodConfigForm } from './form';

export async function generateMetadata({ params }: { params: { key: string } }): Promise<Metadata> {
  const def = methodDefinition(params.key);
  return { title: def ? def.defaultLabel : 'Payment method' };
}

export default async function MethodPage({ params }: { params: { key: string } }) {
  const def = methodDefinition(params.key);
  if (!def) notFound();

  const { account } = await requireTenant();
  const ent = entitlementsFor(account);
  const allowed = canUseMethod(ent, def.key);
  const needed = tierUnlocking(def.key);

  const row = await prisma.paymentMethodConfig.findUnique({
    where: { accountId_key: { accountId: account.id, key: def.key } },
  });

  const walletCount =
    def.key === 'crypto' ? await prisma.wallet.count({ where: { accountId: account.id, active: true } }) : 0;

  return (
    <>
      <PageHeader
        title={row?.label?.trim() || def.defaultLabel}
        description={def.setupHint}
        action={
          <Link href="/dashboard/methods" className="btn-ghost">
            All methods
          </Link>
        }
      />

      {!allowed && needed ? (
        <Banner
          tone="info"
          action={
            <Link href="/dashboard/billing" className="btn-ghost !py-2 !text-xs">
              See plans
            </Link>
          }
        >
          {def.defaultLabel} is part of the <strong>{PLANS[needed].label}</strong> plan and your
          store is on {ent.label}. You can fill the settings in now — the checkout switch unlocks
          when you upgrade.
        </Banner>
      ) : null}

      {def.key === 'crypto' && walletCount === 0 ? (
        <Banner
          tone="warn"
          action={
            <Link href="/dashboard/wallets" className="btn-ghost !py-2 !text-xs">
              Add a wallet
            </Link>
          }
        >
          Direct crypto needs at least one wallet address before buyers can see it.
        </Banner>
      ) : null}

      {def.key === 'stripe' ? (
        <Banner tone="info">
          Point a Stripe webhook at{' '}
          <code className="rounded bg-ink-950 px-1.5 py-0.5 text-xs text-mint">
            {env.appUrl}/api/webhooks/stripe
          </code>{' '}
          for the <code className="text-xs">checkout.session.completed</code> and{' '}
          <code className="text-xs">charge.refunded</code> events, then paste its signing secret
          below. Without it, card payments will not confirm themselves.
        </Banner>
      ) : null}

      {def.key === 'amazon_giftcard' ? (
        <Banner tone="warn">
          Gift-card codes are encrypted at rest, hidden from every notification, revealed only by an
          audited action, and erased when you mark the order paid. MethodePay never checks a balance
          or redeems a code — you verify each one in Amazon yourself.
        </Banner>
      ) : null}

      <Section>
        <MethodConfigForm
          methodKey={def.key}
          definition={{
            fields: def.fields,
            defaultLabel: def.defaultLabel,
            defaultDescription: def.defaultDescription,
          }}
          enabled={Boolean(row?.enabled)}
          canEnable={allowed}
          label={row?.label ?? ''}
          description={row?.description ?? ''}
          iconUrl={row?.iconUrl ?? ''}
          values={publicConfig(row, def.key)}
        />
      </Section>
    </>
  );
}
