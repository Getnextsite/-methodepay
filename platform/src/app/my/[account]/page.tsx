import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { emailConfigured } from '@/lib/env';
import { decryptSecret } from '@/lib/crypto';
import { formatMoney } from '@/lib/money';
import { loadMerchantContext } from '@/lib/gateway/context';
import { buyerEmailFor } from '@/lib/buyer-session';
import { CheckoutShell, Card, MerchantHeader, PolicyFooter } from '@/components/checkout/shell';
import { EmailLinkForm, OrderSignInForm } from '@/components/checkout/portal-forms';
import { emailLinkAction, signInWithOrderAction, signOutAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your orders', robots: { index: false } };

const STATUS: Record<OrderStatus, { label: string; tone: 'ok' | 'wait' | 'off' }> = {
  PAID: { label: 'Paid', tone: 'ok' },
  AWAITING_VERIFICATION: { label: 'Being verified', tone: 'wait' },
  PENDING: { label: 'Not paid', tone: 'wait' },
  REFUNDED: { label: 'Refunded', tone: 'off' },
  CANCELLED: { label: 'Cancelled', tone: 'off' },
  EXPIRED: { label: 'Expired', tone: 'off' },
};

/**
 * Customer portal: every order a buyer placed with this store, with
 * downloads, access details, invoices and subscription renewals.
 */
export default async function PortalPage({
  params,
  searchParams,
}: {
  params: { account: string };
  searchParams: { expired?: string };
}) {
  const account = await prisma.account.findUnique({ where: { slug: params.account } });
  if (!account) notFound();

  const ctx = await loadMerchantContext(account.id);
  const storeName = ctx.notifications.storeName || account.name;
  const email = buyerEmailFor(account.id);

  if (!email) {
    return (
      <CheckoutShell profile={ctx.profile} width="post">
        <MerchantHeader profile={ctx.profile} storeName={storeName} />
        <div style={{ maxWidth: 460, margin: '0 auto' }} className="mp-stack">
          <Card>
            <h1 style={{ margin: 0, fontSize: 22, letterSpacing: '-0.02em' }}>Your orders</h1>
            <p className="mp-note" style={{ marginTop: 8 }}>
              Sign in to see everything you have bought from {storeName}: downloads, access
              details, invoices and renewals.
            </p>
            {searchParams.expired ? (
              <p role="alert" className="mp-alert" style={{ marginTop: 12 }}>
                That sign-in link has expired or was already replaced. Ask for a new one below.
              </p>
            ) : null}
            <div style={{ marginTop: 18 }}>
              <OrderSignInForm store={account.slug} action={signInWithOrderAction} />
            </div>
          </Card>
          {emailConfigured() ? (
            <Card>
              <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>No order reference to hand?</p>
              <EmailLinkForm store={account.slug} action={emailLinkAction} />
            </Card>
          ) : null}
        </div>
        <PolicyFooter profile={ctx.profile} storeName={storeName} supportEmail={ctx.notifications.supportEmail} />
      </CheckoutShell>
    );
  }

  const orders = await prisma.order.findMany({
    where: { accountId: account.id, buyerEmail: email },
    include: { product: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  // The latest paid order per subscription product is the one that counts.
  const subscriptions = new Map<string, (typeof orders)[number]>();
  for (const order of orders) {
    if (order.status !== 'PAID' || order.product.durationDays <= 0) continue;
    if (!subscriptions.has(order.productId)) subscriptions.set(order.productId, order);
  }

  const date = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <CheckoutShell profile={ctx.profile} width="post">
      <MerchantHeader profile={ctx.profile} storeName={storeName} />

      <div className="mp-portal-head">
        <div>
          <h1 style={{ margin: 0, fontSize: 24, letterSpacing: '-0.02em' }}>Your orders</h1>
          <p className="mp-note" style={{ marginTop: 6 }}>
            Signed in as <strong style={{ color: 'var(--mp-text)' }}>{email}</strong>
          </p>
        </div>
        <form action={signOutAction}>
          <input type="hidden" name="store" value={account.slug} />
          <button type="submit" className="mp-btn-ghost">Sign out</button>
        </form>
      </div>

      {subscriptions.size > 0 ? (
        <section style={{ marginTop: 22 }}>
          <h2 className="mp-portal-h2">Subscriptions</h2>
          <div className="mp-portal-grid">
            {[...subscriptions.values()].map((order) => {
              const end = order.serviceExpiresAt;
              const active = end ? end.getTime() > Date.now() : false;
              const daysLeft = end ? Math.ceil((end.getTime() - Date.now()) / 86_400_000) : 0;
              return (
                <Card key={order.id}>
                  <div className="mp-summary-head">
                    <p style={{ margin: 0, fontWeight: 700 }}>{order.product.name}</p>
                    <span className={`mp-pill mp-pill--${active ? 'ok' : 'off'}`}>{active ? 'Active' : 'Expired'}</span>
                  </div>
                  <p className="mp-note" style={{ marginTop: 8 }}>
                    {end
                      ? active
                        ? `Renews or ends on ${date(end)} (${daysLeft} day${daysLeft === 1 ? '' : 's'} left).`
                        : `Ended on ${date(end)}.`
                      : 'No end date.'}
                  </p>
                  {order.product.active ? (
                    <a href={`/renew/${order.ref}`} className="mp-btn" style={{ marginTop: 14, display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                      {active ? 'Renew early' : 'Renew now'}
                    </a>
                  ) : null}
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      <section style={{ marginTop: 26 }}>
        <h2 className="mp-portal-h2">Order history</h2>
        {orders.length === 0 ? (
          <Card>
            <p className="mp-note">No orders yet.</p>
          </Card>
        ) : (
          <div className="mp-stack">
            {orders.map((order) => {
              const status = STATUS[order.status];
              const paid = order.status === 'PAID';
              const access = paid ? decryptSecret(order.product.deliveryAccessCodeEnc) : '';
              return (
                <div key={order.id} className="mp-card mp-portal-order">
                  <div className="mp-portal-order-main">
                    <p style={{ margin: 0, fontWeight: 700 }}>{order.product.name}</p>
                    <p className="mp-summary-ref">
                      {order.ref} · {date(order.createdAt)} · {formatMoney(order.amountCents, order.currency)}
                    </p>
                  </div>
                  <span className={`mp-pill mp-pill--${status.tone}`}>{status.label}</span>
                  <div className="mp-portal-actions">
                    <a href={`/o/${order.nonce}`} className="mp-btn-ghost mp-portal-link">
                      {paid && (access || order.product.deliveryFileUrl) ? 'Access & details' : 'Details'}
                    </a>
                    {paid && order.product.deliveryFileUrl ? (
                      <a href={order.product.deliveryFileUrl} className="mp-btn-ghost mp-portal-link">Download</a>
                    ) : null}
                    <a href={`/o/${order.nonce}/invoice`} className="mp-btn-ghost mp-portal-link">
                      {paid ? 'Receipt' : 'Invoice'}
                    </a>
                    {order.status === 'PENDING' && order.product.active ? (
                      <a href={`/c/${account.slug}/${order.product.slug}?from=${order.nonce}`} className="mp-btn mp-portal-link">
                        Complete purchase
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <PolicyFooter profile={ctx.profile} storeName={storeName} supportEmail={ctx.notifications.supportEmail} />
    </CheckoutShell>
  );
}
