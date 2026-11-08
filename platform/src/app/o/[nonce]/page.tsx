import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { loadMerchantContext } from '@/lib/gateway/context';
import { decryptSecret } from '@/lib/crypto';
import { formatMoney } from '@/lib/money';
import { trackingUrl } from '@/lib/shipping';
import { CheckoutShell, Card, MerchantHeader, PolicyFooter } from '@/components/checkout/shell';
import { CopyField } from '@/components/checkout/copy-field';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your order', robots: { index: false } };

const HEADLINES: Record<OrderStatus, { title: string; body: string }> = {
  PAID: {
    title: 'Payment confirmed',
    body: 'Thank you. Everything below is yours, and a copy is on its way to your inbox.',
  },
  AWAITING_VERIFICATION: {
    title: 'Waiting on the seller',
    body: 'Your payment has been reported and is being verified. You will get an email the moment it is confirmed.',
  },
  PENDING: {
    title: 'Payment not finished',
    body: 'We have your order but no payment yet. You can still complete it.',
  },
  REFUNDED: {
    title: 'This order was refunded',
    body: 'Depending on your bank or wallet, the money can take a few business days to arrive.',
  },
  CANCELLED: {
    title: 'This order was cancelled',
    body: 'Nothing was charged. Start again if you still want it.',
  },
  EXPIRED: {
    title: 'This order expired',
    body: 'It was not completed in time. Start a new one and it will work.',
  },
};

export default async function OrderStatusPage({
  params,
  searchParams,
}: {
  params: { nonce: string };
  searchParams: { paid?: string };
}) {
  const order = await prisma.order.findUnique({
    where: { nonce: params.nonce },
    include: { product: true },
  });
  if (!order) notFound();

  const ctx = await loadMerchantContext(order.accountId);
  const storeName = ctx.notifications.storeName || ctx.account.name;

  // A merchant redirect target wins over our own page, as it did in the plugin:
  // many sellers send buyers straight into a members area.
  if (order.status === 'PAID' && order.product.thanksRedirectUrl) {
    redirect(order.product.thanksRedirectUrl);
  }

  const copy = HEADLINES[order.status];
  const accessCode = order.status === 'PAID' ? decryptSecret(order.product.deliveryAccessCodeEnc) : '';
  const tracking = trackingUrl(order.trackingCarrier, order.trackingNumber);

  return (
    <CheckoutShell profile={ctx.profile}>
      <MerchantHeader profile={ctx.profile} storeName={storeName} />

      <Card>
        {order.status === 'PAID' ? <Tick /> : null}

        <p style={caps}>Order {order.ref}</p>
        <h1 style={{ margin: '8px 0 0', fontSize: 23, letterSpacing: '-0.02em' }}>
          {order.status === 'PAID' && order.product.thanksTitle
            ? order.product.thanksTitle
            : copy.title}
        </h1>
        <p style={{ margin: '9px 0 0', fontSize: 14, lineHeight: 1.65, color: 'var(--mp-text-muted)' }}>
          {searchParams.paid && order.status !== 'PAID'
            ? 'Your payment went through on the provider side. We are waiting for their confirmation to land — this page updates itself when it does, usually within a minute.'
            : copy.body}
        </p>

        <dl
          style={{
            margin: '18px 0 0',
            paddingTop: 16,
            borderTop: '1px solid var(--mp-border)',
            display: 'grid',
            gap: 8,
            fontSize: 13.5,
          }}
        >
          <Row label="Product" value={order.product.name} />
          <Row label="Total" value={formatMoney(order.amountCents, order.currency)} />
          <Row label="Placed" value={order.createdAt.toISOString().slice(0, 10)} />
          {order.serviceExpiresAt ? (
            <Row label="Access until" value={order.serviceExpiresAt.toISOString().slice(0, 10)} />
          ) : null}
        </dl>

        {order.status === 'PAID' && order.product.thanksMessage ? (
          <div
            style={{
              marginTop: 18,
              fontSize: 13.5,
              lineHeight: 1.7,
              color: 'var(--mp-text-muted)',
            }}
            dangerouslySetInnerHTML={{ __html: order.product.thanksMessage }}
          />
        ) : null}

        {order.status === 'PAID' && order.product.deliveryFileUrl ? (
          <a
            href={order.product.deliveryFileUrl}
            style={{
              display: 'block',
              marginTop: 18,
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
            Download your purchase
          </a>
        ) : null}

        {accessCode ? <CopyField label="Your access details" value={accessCode} /> : null}

        {tracking ? (
          <p style={{ margin: '16px 0 0', fontSize: 13 }}>
            Shipped
            {order.trackingNumber ? ` · ${order.trackingNumber}` : ''} —{' '}
            <a href={tracking} target="_blank" rel="noreferrer" style={{ color: 'var(--mp-primary)' }}>
              track your parcel
            </a>
          </p>
        ) : null}

        {order.status === 'PENDING' || order.status === 'AWAITING_VERIFICATION' ? (
          <a
            href={`/pay/${order.nonce}`}
            style={{
              display: 'block',
              marginTop: 18,
              padding: '12px 18px',
              textAlign: 'center',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              color: 'var(--mp-text)',
              border: '1px solid var(--mp-border-strong)',
              borderRadius: 'var(--mp-radius-sm)',
            }}
          >
            {order.status === 'PENDING' ? 'Complete your payment' : 'See the payment details again'}
          </a>
        ) : null}

        {ctx.notifications.supportEmail ? (
          <p style={{ margin: '18px 0 0', fontSize: 12.5, color: 'var(--mp-text-faint)' }}>
            Something wrong? Email{' '}
            <a
              href={`mailto:${ctx.notifications.supportEmail}?subject=Order%20${order.ref}`}
              style={{ color: 'var(--mp-primary)' }}
            >
              {ctx.notifications.supportEmail}
            </a>{' '}
            and quote {order.ref}.
          </p>
        ) : null}
      </Card>

      <PolicyFooter
        profile={ctx.profile}
        storeName={storeName}
        supportEmail={ctx.notifications.supportEmail}
      />
    </CheckoutShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <dt style={{ color: 'var(--mp-text-muted)' }}>{label}</dt>
      <dd style={{ margin: 0, textAlign: 'right' }}>{value}</dd>
    </div>
  );
}

function Tick() {
  return (
    <div
      aria-hidden
      style={{
        width: 44,
        height: 44,
        marginBottom: 14,
        display: 'grid',
        placeItems: 'center',
        borderRadius: 999,
        background: 'color-mix(in srgb, var(--mp-primary) 18%, transparent)',
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 12.5l5 5L20 6.5"
          stroke="var(--mp-primary)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

const caps: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '.07em',
  textTransform: 'uppercase',
  color: 'var(--mp-text-faint)',
};
