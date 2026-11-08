import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { loadMerchantContext } from '@/lib/gateway/context';
import { formatMoney } from '@/lib/money';
import { CheckoutShell, Card, MerchantHeader, PolicyFooter } from '@/components/checkout/shell';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Payment not completed', robots: { index: false } };

/**
 * Where a provider sends a buyer who backed out.
 *
 * The order is left PENDING rather than cancelled: somebody who abandoned a
 * card form at the 3-D Secure step very often comes back and pays another way,
 * and throwing their order away would make them start from nothing.
 */
export default async function CancelledPage({ params }: { params: { nonce: string } }) {
  const order = await prisma.order.findUnique({
    where: { nonce: params.nonce },
    include: { product: true, account: { select: { slug: true } } },
  });
  if (!order) notFound();

  const ctx = await loadMerchantContext(order.accountId);
  const storeName = ctx.notifications.storeName || ctx.account.name;

  return (
    <CheckoutShell profile={ctx.profile}>
      <MerchantHeader profile={ctx.profile} storeName={storeName} />
      <Card>
        <h1 style={{ margin: 0, fontSize: 22, letterSpacing: '-0.02em' }}>
          You did not finish paying
        </h1>
        <p style={{ margin: '9px 0 0', fontSize: 14, lineHeight: 1.65, color: 'var(--mp-text-muted)' }}>
          Nothing was charged. Your order {order.ref} for {order.product.name} is still reserved at{' '}
          {formatMoney(order.amountCents, order.currency)} — pick up where you left off, or choose a
          different payment method.
        </p>

        <div style={{ marginTop: 18, display: 'grid', gap: 9 }}>
          <a
            href={`/c/${order.account.slug}/${order.product.slug}`}
            style={{
              display: 'block',
              padding: '13px 18px',
              textAlign: 'center',
              fontSize: 14.5,
              fontWeight: 700,
              textDecoration: 'none',
              color: 'var(--mp-primary-contrast)',
              background: 'var(--mp-primary)',
              borderRadius: 'var(--mp-radius-sm)',
            }}
          >
            Try another payment method
          </a>
          <a
            href={`/o/${order.nonce}`}
            style={{
              display: 'block',
              padding: '12px 18px',
              textAlign: 'center',
              fontSize: 13.5,
              fontWeight: 600,
              textDecoration: 'none',
              color: 'var(--mp-text)',
              border: '1px solid var(--mp-border-strong)',
              borderRadius: 'var(--mp-radius-sm)',
            }}
          >
            See my order
          </a>
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
