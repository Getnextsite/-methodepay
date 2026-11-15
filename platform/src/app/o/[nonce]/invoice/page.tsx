import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { loadMerchantContext } from '@/lib/gateway/context';
import { formatMoney } from '@/lib/money';
import { orderBumpOf } from '@/lib/offers';
import { parseInvoice } from '@/lib/invoice';
import { prettyMethod } from '@/lib/notifier';
import { PrintButton } from '@/components/checkout/print-button';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Invoice', robots: { index: false } };

/**
 * A printable invoice, or a receipt once the order is paid.
 *
 * Reached by the order's unguessable nonce, like the rest of the buyer pages.
 * It is plain HTML on a white A4 page; "Download PDF" opens the browser's print
 * dialog. That renders any script the buyer or seller wrote in, which a
 * server-side PDF library with embedded Latin fonts would not.
 */
export default async function InvoicePage({ params }: { params: { nonce: string } }) {
  const order = await prisma.order.findUnique({
    where: { nonce: params.nonce },
    include: { product: true, events: { where: { type: 'paid' }, orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  if (!order) notFound();

  const ctx = await loadMerchantContext(order.accountId);
  const seller = parseInvoice(ctx.notifications.invoice);
  const storeName = ctx.notifications.storeName || ctx.account.name;
  const paid = order.status === 'PAID';
  const paidAt = order.events[0]?.createdAt ?? null;

  const bump = orderBumpOf(order.meta);
  const subtotal = order.amountCents + order.discountCents - order.shippingCents - (bump?.amountCents ?? 0);
  const money = (c: number) => formatMoney(c, order.currency);
  const date = (d: Date) => d.toISOString().slice(0, 10);
  const buyerAddress = [
    order.buyerCompany,
    order.buyerAddress1,
    order.buyerAddress2,
    [order.buyerPostalCode, order.buyerCity].filter(Boolean).join(' '),
    order.buyerState,
    order.buyerCountry,
  ].filter(Boolean);

  return (
    <div className="inv-page">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="inv-toolbar">
        <a href={`/o/${order.nonce}`} className="inv-link">
          ← Back to your order
        </a>
        <PrintButton label={paid ? 'Download receipt (PDF)' : 'Download invoice (PDF)'} />
      </div>

      <article className="inv-sheet">
        <header className="inv-head">
          <div>
            {ctx.profile.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- merchant-hosted logo
              <img src={ctx.profile.logoUrl} alt={storeName} className="inv-logo" />
            ) : null}
            <p className="inv-seller-name">{seller.businessName || storeName}</p>
            {seller.address ? <p className="inv-pre">{seller.address}</p> : null}
            {seller.taxId ? <p>Tax ID: {seller.taxId}</p> : null}
            {ctx.notifications.supportEmail ? <p>{ctx.notifications.supportEmail}</p> : null}
          </div>
          <div className="inv-title-block">
            <h1>{paid ? 'Receipt' : 'Invoice'}</h1>
            <span className={`inv-status ${paid ? 'inv-status--paid' : ''}`}>
              {paid ? 'Paid' : order.status === 'REFUNDED' ? 'Refunded' : 'Unpaid'}
            </span>
          </div>
        </header>

        <section className="inv-meta">
          <div>
            <h2>Billed to</h2>
            <p className="inv-strong">{order.buyerName}</p>
            <p>{order.buyerEmail}</p>
            {buyerAddress.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <dl>
            <div>
              <dt>Number</dt>
              <dd>{order.ref}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{date(order.createdAt)}</dd>
            </div>
            {paidAt ? (
              <div>
                <dt>Paid on</dt>
                <dd>{date(paidAt)}</dd>
              </div>
            ) : null}
            {order.paymentMethod ? (
              <div>
                <dt>Payment</dt>
                <dd>{prettyMethod(order.paymentMethod)}</dd>
              </div>
            ) : null}
            {order.txid ? (
              <div>
                <dt>Transaction</dt>
                <dd className="inv-mono">{order.txid}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <table className="inv-lines">
          <thead>
            <tr>
              <th>Description</th>
              <th className="inv-num">Qty</th>
              <th className="inv-num">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                {order.product.name}
                {order.serviceExpiresAt ? (
                  <span className="inv-sub">Access until {date(order.serviceExpiresAt)}</span>
                ) : null}
              </td>
              <td className="inv-num">1</td>
              <td className="inv-num">{money(subtotal)}</td>
            </tr>
            {bump ? (
              <tr>
                <td>{bump.title}</td>
                <td className="inv-num">1</td>
                <td className="inv-num">{money(bump.amountCents)}</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <dl className="inv-totals">
          <div>
            <dt>Subtotal</dt>
            <dd>{money(subtotal + (bump?.amountCents ?? 0))}</dd>
          </div>
          {order.discountCents > 0 ? (
            <div>
              <dt>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
              <dd>− {money(order.discountCents)}</dd>
            </div>
          ) : null}
          {order.shippingCents > 0 ? (
            <div>
              <dt>Shipping{order.shippingMethod ? ` (${order.shippingMethod})` : ''}</dt>
              <dd>{money(order.shippingCents)}</dd>
            </div>
          ) : null}
          <div className="inv-grand">
            <dt>{paid ? 'Total paid' : 'Total due'}</dt>
            <dd>{money(order.amountCents)}</dd>
          </div>
        </dl>

        <footer className="inv-foot">
          {seller.footer ? <p className="inv-pre">{seller.footer}</p> : null}
          <p>
            {paid ? 'Thank you for your purchase.' : `Please pay using the payment page for order ${order.ref}.`}
          </p>
        </footer>
      </article>
    </div>
  );
}

const CSS = `
.inv-page { min-height: 100vh; background: #eef0f3; padding: 28px 16px 60px; font-family: system-ui, -apple-system, Segoe UI, Roboto, 'Noto Sans', 'Noto Sans Arabic', sans-serif; color: #14171f; }
.inv-toolbar { max-width: 794px; margin: 0 auto 14px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.inv-link { color: #3a4152; font-size: 14px; text-decoration: none; }
.inv-btn { padding: 10px 16px; font-size: 14px; font-weight: 600; font-family: inherit; color: #fff; background: #14171f; border: 0; border-radius: 10px; cursor: pointer; }
.inv-sheet { max-width: 794px; margin: 0 auto; background: #fff; border-radius: 6px; box-shadow: 0 10px 40px -18px rgba(0,0,0,.35); padding: 48px 52px; font-size: 13.5px; line-height: 1.55; }
.inv-sheet p { margin: 0; }
.inv-head { display: flex; justify-content: space-between; gap: 24px; padding-bottom: 26px; border-bottom: 2px solid #14171f; }
.inv-logo { max-height: 44px; width: auto; margin-bottom: 10px; display: block; }
.inv-seller-name { font-size: 16px; font-weight: 700; }
.inv-pre { white-space: pre-line; }
.inv-title-block { text-align: right; }
.inv-title-block h1 { margin: 0; font-size: 30px; letter-spacing: -0.02em; }
.inv-status { display: inline-block; margin-top: 6px; padding: 3px 10px; font-size: 12px; font-weight: 700; border-radius: 999px; background: #fdecc8; color: #8a5a00; }
.inv-status--paid { background: #d8f5e3; color: #0c6b34; }
.inv-meta { display: flex; justify-content: space-between; gap: 24px; margin-top: 26px; }
.inv-meta h2 { margin: 0 0 6px; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #6b7280; }
.inv-strong { font-weight: 700; }
.inv-meta dl { margin: 0; display: grid; gap: 4px; min-width: 240px; }
.inv-meta dl > div { display: flex; justify-content: space-between; gap: 16px; }
.inv-meta dt { color: #6b7280; }
.inv-meta dd { margin: 0; text-align: right; font-weight: 600; max-width: 260px; overflow-wrap: anywhere; }
.inv-mono { font-family: ui-monospace, Menlo, monospace; font-size: 11.5px; font-weight: 500 !important; }
.inv-lines { width: 100%; margin-top: 30px; border-collapse: collapse; }
.inv-lines th { padding: 9px 0; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #6b7280; text-align: left; border-bottom: 1px solid #d9dce3; }
.inv-lines td { padding: 12px 0; border-bottom: 1px solid #eceef2; vertical-align: top; }
.inv-num { text-align: right !important; white-space: nowrap; padding-left: 16px !important; }
.inv-sub { display: block; font-size: 12px; color: #6b7280; }
.inv-totals { margin: 18px 0 0 auto; max-width: 320px; display: grid; gap: 6px; }
.inv-totals > div { display: flex; justify-content: space-between; gap: 16px; }
.inv-totals dt { color: #4b5263; }
.inv-totals dd { margin: 0; font-variant-numeric: tabular-nums; }
.inv-grand { margin-top: 6px; padding-top: 10px; border-top: 2px solid #14171f; font-size: 16px; font-weight: 800; }
.inv-grand dt { color: #14171f; }
.inv-foot { margin-top: 44px; padding-top: 16px; border-top: 1px solid #eceef2; color: #6b7280; font-size: 12.5px; display: grid; gap: 6px; }
@media (max-width: 640px) {
  .inv-sheet { padding: 26px 20px; }
  .inv-head, .inv-meta { flex-direction: column; }
  .inv-title-block { text-align: left; }
}
@media print {
  @page { size: A4; margin: 14mm; }
  .inv-page { background: #fff; padding: 0; }
  .inv-toolbar { display: none; }
  .inv-sheet { box-shadow: none; padding: 0; max-width: none; }
}
`;
