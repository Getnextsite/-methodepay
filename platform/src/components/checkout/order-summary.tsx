import type { Order, OrderStatus, Product } from '@prisma/client';
import { formatMoney } from '@/lib/money';
import { orderBumpOf } from '@/lib/offers';
import { prettyMethod } from '@/lib/notifier';

const STATUS: Record<OrderStatus, { label: string; tone: 'ok' | 'wait' | 'off' }> = {
  PAID: { label: 'Paid', tone: 'ok' },
  AWAITING_VERIFICATION: { label: 'Being verified', tone: 'wait' },
  PENDING: { label: 'Awaiting payment', tone: 'wait' },
  REFUNDED: { label: 'Refunded', tone: 'off' },
  CANCELLED: { label: 'Cancelled', tone: 'off' },
  EXPIRED: { label: 'Expired', tone: 'off' },
};

/**
 * The right-hand column on every screen after checkout: what was ordered,
 * what it costs, and where it stands. One component, so the payment page,
 * the order page and the cancelled page always agree on the numbers.
 */
export function OrderSummary({
  order,
  product,
  methodLabel,
  children,
}: {
  order: Order;
  product: Product;
  /** Shown as the payment method; defaults to the stored rail key, prettified. */
  methodLabel?: string;
  /** Extra panels under the summary, e.g. the confirmation box. */
  children?: React.ReactNode;
}) {
  const bump = orderBumpOf(order.meta);
  const subtotal =
    order.amountCents + order.discountCents - order.shippingCents - (bump?.amountCents ?? 0);
  const status = STATUS[order.status];
  const method =
    methodLabel ?? (order.paymentMethod ? prettyMethod(order.paymentMethod) : null);

  return (
    <aside className="mp-stack mp-sticky" aria-label="Order summary">
      <div className="mp-card">
        <div className="mp-summary-head">
          <p className="mp-summary-caps">Order summary</p>
          <span className={`mp-pill mp-pill--${status.tone}`}>{status.label}</span>
        </div>

        <div className="mp-summary-product">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- merchant-hosted image
            <img src={product.imageUrl} alt="" className="mp-summary-img" />
          ) : (
            <span className="mp-summary-img mp-summary-img--blank" aria-hidden>
              {product.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div style={{ minWidth: 0 }}>
            <p className="mp-summary-name">{product.name}</p>
            <p className="mp-summary-ref">{order.ref}</p>
          </div>
        </div>

        <dl className="mp-summary-lines">
          <div>
            <dt>Subtotal</dt>
            <dd>{formatMoney(subtotal, order.currency)}</dd>
          </div>
          {bump ? (
            <div>
              <dt>{bump.title}</dt>
              <dd>+ {formatMoney(bump.amountCents, order.currency)}</dd>
            </div>
          ) : null}
          {order.discountCents > 0 ? (
            <div className="mp-summary-off">
              <dt>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
              <dd>− {formatMoney(order.discountCents, order.currency)}</dd>
            </div>
          ) : null}
          {order.shippingCents > 0 ? (
            <div>
              <dt>Shipping</dt>
              <dd>{formatMoney(order.shippingCents, order.currency)}</dd>
            </div>
          ) : null}
          <div className="mp-summary-total">
            <dt>Total</dt>
            <dd>{formatMoney(order.amountCents, order.currency)}</dd>
          </div>
        </dl>

        <dl className="mp-summary-meta">
          {method ? (
            <div>
              <dt>Payment</dt>
              <dd>{method}</dd>
            </div>
          ) : null}
          <div>
            <dt>Placed</dt>
            <dd>{order.createdAt.toISOString().slice(0, 10)}</dd>
          </div>
          {order.serviceExpiresAt ? (
            <div>
              <dt>Access until</dt>
              <dd>{order.serviceExpiresAt.toISOString().slice(0, 10)}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {children}
    </aside>
  );
}
