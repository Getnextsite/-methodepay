import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { loadMerchantContext } from '@/lib/gateway/context';
import { resolveMethods } from '@/lib/gateway/resolve';
import { CheckoutShell, Card, MerchantHeader, PolicyFooter, TrustBadges } from '@/components/checkout/shell';
import { CheckoutForm } from '@/components/checkout/form';
import { formatMoney } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Renew your access', robots: { index: false } };

/**
 * Renewal link sent in reminder emails.
 *
 * It carries the previous order reference so the new order extends from the
 * old expiry rather than starting a fresh clock — somebody who renews a week
 * early keeps the week they already paid for.
 */
export default async function RenewPage({ params }: { params: { ref: string } }) {
  const previous = await prisma.order.findUnique({
    where: { ref: params.ref.toUpperCase() },
    include: { product: true },
  });
  if (!previous || previous.status !== 'PAID') notFound();

  const ctx = await loadMerchantContext(previous.accountId);
  const storeName = ctx.notifications.storeName || ctx.account.name;
  const product = previous.product;

  if (!product.active) {
    return (
      <CheckoutShell profile={ctx.profile}>
        <MerchantHeader profile={ctx.profile} storeName={storeName} />
        <Card>
          <h1 style={{ margin: 0, fontSize: 21 }}>This is no longer available to renew</h1>
          <p style={{ margin: '9px 0 0', fontSize: 14, color: 'var(--mp-text-muted)' }}>
            {storeName} has stopped selling {product.name}.
            {ctx.notifications.supportEmail ? ' Get in touch and they will sort you out.' : ''}
          </p>
          {ctx.notifications.supportEmail ? (
            <p style={{ margin: '14px 0 0', fontSize: 13.5 }}>
              <a
                href={`mailto:${ctx.notifications.supportEmail}?subject=Renewal%20${previous.ref}`}
                style={{ color: 'var(--mp-primary)' }}
              >
                {ctx.notifications.supportEmail}
              </a>
            </p>
          ) : null}
        </Card>
      </CheckoutShell>
    );
  }

  const methods = resolveMethods(ctx, product, { buyerCountry: previous.buyerCountry });
  const expiry = previous.serviceExpiresAt;
  const lapsed = expiry ? expiry.getTime() < Date.now() : false;

  return (
    <CheckoutShell profile={ctx.profile}>
      <MerchantHeader profile={ctx.profile} storeName={storeName} />

      <Card>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '.07em',
            textTransform: 'uppercase',
            color: 'var(--mp-text-faint)',
          }}
        >
          Renewing {previous.ref}
        </p>
        <h1 style={{ margin: '8px 0 0', fontSize: 22, letterSpacing: '-0.02em' }}>
          {product.name}
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 700, color: 'var(--mp-primary)' }}>
          {formatMoney(product.priceCents, product.currency)}
        </p>
        <p style={{ margin: '9px 0 0', fontSize: 13, lineHeight: 1.6, color: 'var(--mp-text-muted)' }}>
          {expiry
            ? lapsed
              ? `Your access ended on ${expiry.toISOString().slice(0, 10)}. Renewing starts a fresh ${product.durationDays} days.`
              : `Your access runs to ${expiry.toISOString().slice(0, 10)}. Renewing now adds ${product.durationDays} days on top — you keep the days you have already paid for.`
            : `Adds ${product.durationDays} days of access.`}
        </p>

        <div style={{ marginTop: 18 }}>
          <CheckoutForm
            productId={product.id}
            currency={product.currency}
            priceCents={product.priceCents}
            methods={methods}
            fieldVisibility={asRecord(ctx.profile.fieldVisibility)}
            customFields={[]}
            requiresShipping={product.requiresShipping}
            guarantee={null}
            renewalOfRef={previous.ref}
          >
            <TrustBadges profile={ctx.profile} />
          </CheckoutForm>
        </div>
      </Card>

      <PolicyFooter
        profile={ctx.profile}
        storeName={storeName}
        supportEmail={ctx.notifications.supportEmail}
      />
    </CheckoutShell>
  );
}

function asRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
  );
}
