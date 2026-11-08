import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireTenant } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { prettyMethod } from '@/lib/notifier';
import { CARRIERS, trackingUrl } from '@/lib/shipping';
import { Field, PageHeader, Section, StatusBadge } from '@/components/ui';
import { ActionForm, SubmitButton } from '@/components/action-form';
import {
  addNoteAction,
  cancelAction,
  markPaidAction,
  recordClaimAction,
  refundAction,
  revealGiftCardAction,
  shipAction,
} from '../actions';

export const metadata: Metadata = { title: 'Order' };

export default async function OrderPage({ params }: { params: { id: string } }) {
  const { account } = await requireTenant();

  const order = await prisma.order.findFirst({
    where: { id: params.id, accountId: account.id },
    include: {
      product: true,
      events: { orderBy: { createdAt: 'desc' } },
      renewalOf: { select: { id: true, ref: true } },
    },
  });
  if (!order) notFound();

  const subtotal = order.amountCents + order.discountCents - order.shippingCents;
  const tracking = trackingUrl(order.trackingCarrier, order.trackingNumber);
  const customFields = readCustomFields(order.meta);

  return (
    <>
      <PageHeader
        title={order.ref}
        description={`${order.product.name} · placed ${order.createdAt.toISOString().slice(0, 16).replace('T', ' ')}`}
        action={<StatusBadge status={order.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Section title="Amount">
            <dl className="space-y-2 text-sm">
              <Row label="Subtotal" value={formatMoney(subtotal, order.currency)} />
              {order.discountCents > 0 ? (
                <Row
                  label={`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`}
                  value={`− ${formatMoney(order.discountCents, order.currency)}`}
                />
              ) : null}
              {order.shippingCents > 0 ? (
                <Row label="Shipping" value={formatMoney(order.shippingCents, order.currency)} />
              ) : null}
              <div className="flex items-center justify-between border-t border-ink-600/70 pt-2.5">
                <dt className="text-sm font-semibold text-white">Total</dt>
                <dd className="text-base font-semibold tabular-nums text-mint">
                  {formatMoney(order.amountCents, order.currency)}
                </dd>
              </div>
            </dl>
          </Section>

          <Section title="Buyer">
            <dl className="space-y-2 text-sm">
              <Row label="Name" value={order.buyerName} />
              <Row label="Email" value={order.buyerEmail} />
              {order.buyerPhone ? <Row label="Phone" value={order.buyerPhone} /> : null}
              {order.buyerCountry ? <Row label="Country" value={order.buyerCountry} /> : null}
              {order.buyerCompany ? <Row label="Company" value={order.buyerCompany} /> : null}
              {formatAddress(order) ? <Row label="Address" value={formatAddress(order)!} /> : null}
              {order.buyerNote ? <Row label="Note" value={order.buyerNote} /> : null}
              {Object.entries(customFields).map(([key, value]) => (
                <Row key={key} label={key} value={value} />
              ))}
            </dl>
          </Section>

          <Section title="Payment">
            <dl className="space-y-2 text-sm">
              <Row
                label="Method"
                value={order.paymentMethod ? prettyMethod(order.paymentMethod) : 'Not chosen'}
              />
              {order.paymentReference ? (
                <Row label="Buyer reference" value={order.paymentReference} mono />
              ) : null}
              {order.txid ? <Row label="Transaction ID" value={order.txid} mono /> : null}
              {order.serviceExpiresAt ? (
                <Row label="Access until" value={order.serviceExpiresAt.toISOString().slice(0, 10)} />
              ) : null}
              {order.renewalOf ? (
                <div className="flex items-center justify-between">
                  <dt className="text-ink-300">Renews</dt>
                  <dd>
                    <Link
                      href={`/dashboard/orders/${order.renewalOf.id}`}
                      className="text-mint hover:underline"
                    >
                      {order.renewalOf.ref}
                    </Link>
                  </dd>
                </div>
              ) : null}
              {order.deliveredAt ? (
                <Row label="Delivered" value={order.deliveredAt.toISOString().slice(0, 16).replace('T', ' ')} />
              ) : null}
            </dl>

            {order.giftCardCodeEnc ? (
              <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
                <p className="text-sm font-semibold text-amber-100">Gift-card code submitted</p>
                <p className="mt-1 text-xs text-amber-200/80">
                  Encrypted at rest. Revealing it is recorded in the audit trail below, and the code
                  is erased when you mark the order paid. Verify it yourself in Amazon — MethodePay
                  does not check balances or redeem codes.
                </p>
                <ActionForm action={revealGiftCardAction} className="mt-3.5 space-y-3">
                  <input type="hidden" name="id" value={order.id} />
                  <SubmitButton variant="ghost">Reveal the code</SubmitButton>
                </ActionForm>
              </div>
            ) : null}
          </Section>

          {order.product.requiresShipping ? (
            <Section title="Shipping" description={order.shippedAt ? 'Already marked as shipped.' : undefined}>
              {tracking ? (
                <p className="mb-4 text-sm text-ink-200">
                  {order.trackingNumber} ·{' '}
                  <a href={tracking} target="_blank" rel="noreferrer" className="text-mint hover:underline">
                    track it
                  </a>
                </p>
              ) : null}
              <ActionForm action={shipAction}>
                <input type="hidden" name="id" value={order.id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Carrier" htmlFor="carrier">
                    <select
                      id="carrier"
                      name="carrier"
                      defaultValue={order.trackingCarrier ?? ''}
                      className="input"
                    >
                      <option value="">Select…</option>
                      {CARRIERS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Tracking number" htmlFor="trackingNumber">
                    <input
                      id="trackingNumber"
                      name="trackingNumber"
                      defaultValue={order.trackingNumber ?? ''}
                      className="input"
                    />
                  </Field>
                </div>
                <SubmitButton variant="ghost">
                  {order.shippedAt ? 'Update tracking' : 'Mark as shipped'}
                </SubmitButton>
              </ActionForm>
            </Section>
          ) : null}

          <Section
            title="Audit trail"
            description="Who decided what, when, and on what evidence. This is what defends a chargeback."
          >
            <ol className="space-y-3.5">
              {order.events.map((event) => (
                <li key={event.id} className="border-l-2 border-ink-600 pl-3.5">
                  <p className="text-sm text-ink-100">
                    <span className="font-medium text-white">{humanEvent(event.type)}</span>
                    {event.note ? ` — ${event.note}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-400">
                    {event.actor} · {event.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
                  </p>
                </li>
              ))}
            </ol>
          </Section>
        </div>

        <div className="space-y-6">
          {order.status !== 'PAID' && order.status !== 'REFUNDED' ? (
            <Section
              title="Confirm this payment"
              description="Marks it paid, starts any access period, takes stock and emails the buyer their delivery."
            >
              <ActionForm action={markPaidAction}>
                <input type="hidden" name="id" value={order.id} />
                <Field label="Transaction ID" htmlFor="txid" hint="Optional: TXID, MTCN, bank memo.">
                  <input id="txid" name="txid" className="input" defaultValue={order.paymentReference ?? ''} />
                </Field>
                <Field label="What did you verify?" htmlFor="note" hint="Recorded against the order for good.">
                  <textarea
                    id="note"
                    name="note"
                    rows={2}
                    className="input"
                    placeholder="Saw 120 USDT land in the TRC20 wallet at 14:02."
                  />
                </Field>
                <SubmitButton confirm="Mark this order paid and deliver it to the buyer?">
                  Mark paid and deliver
                </SubmitButton>
              </ActionForm>
            </Section>
          ) : null}

          {order.status === 'PENDING' ? (
            <Section
              title="Buyer says they paid"
              description="Use this when they told you by phone or DM rather than through the checkout."
            >
              <ActionForm action={recordClaimAction}>
                <input type="hidden" name="id" value={order.id} />
                <Field label="Their reference" htmlFor="reference">
                  <input id="reference" name="reference" className="input" />
                </Field>
                <SubmitButton variant="ghost">Move to awaiting verification</SubmitButton>
              </ActionForm>
            </Section>
          ) : null}

          <Section title="Add a note">
            <ActionForm action={addNoteAction}>
              <input type="hidden" name="id" value={order.id} />
              <textarea
                name="note"
                rows={3}
                className="input"
                placeholder="Called the buyer, waiting on their bank."
                aria-label="Note"
              />
              <SubmitButton variant="ghost">Add note</SubmitButton>
            </ActionForm>
          </Section>

          {order.status === 'PAID' ? (
            <Section
              title="Refund"
              description="Records the refund and tells the buyer. Move the money in your processor or wallet — we never hold it."
            >
              <ActionForm action={refundAction}>
                <input type="hidden" name="id" value={order.id} />
                <Field label="Reason" htmlFor="reason" hint="Included in the email to the buyer.">
                  <input id="reason" name="reason" className="input" />
                </Field>
                <SubmitButton variant="danger" confirm="Mark this order refunded and email the buyer?">
                  Mark refunded
                </SubmitButton>
              </ActionForm>
            </Section>
          ) : null}

          {order.status === 'PENDING' || order.status === 'AWAITING_VERIFICATION' ? (
            <Section title="Cancel">
              <ActionForm action={cancelAction}>
                <input type="hidden" name="id" value={order.id} />
                <SubmitButton variant="danger" confirm="Cancel this order?">
                  Cancel order
                </SubmitButton>
              </ActionForm>
            </Section>
          ) : null}
        </div>
      </div>
    </>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-ink-300">{label}</dt>
      <dd className={`text-right text-ink-100 ${mono ? 'break-all font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}

function formatAddress(order: {
  buyerAddress1: string | null;
  buyerAddress2: string | null;
  buyerCity: string | null;
  buyerState: string | null;
  buyerPostalCode: string | null;
  buyerCountry: string | null;
}): string | null {
  const parts = [
    order.buyerAddress1,
    order.buyerAddress2,
    order.buyerCity,
    order.buyerState,
    order.buyerPostalCode,
    order.buyerCountry,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

function readCustomFields(meta: unknown): Record<string, string> {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return {};
  const fields = (meta as Record<string, unknown>).customFields;
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return {};
  return Object.fromEntries(
    Object.entries(fields as Record<string, unknown>)
      .filter(([, v]) => typeof v === 'string' && v)
      .map(([k, v]) => [k, String(v)]),
  );
}

function humanEvent(type: string): string {
  const map: Record<string, string> = {
    created: 'Order created',
    method_selected: 'Payment method chosen',
    payment_claimed: 'Buyer reported payment',
    paid: 'Payment confirmed',
    refunded: 'Refunded',
    cancelled: 'Cancelled',
    shipped: 'Shipped',
    note: 'Note',
    gift_card_revealed: 'Gift-card code viewed',
    webhook_received: 'Provider webhook',
  };
  return map[type] ?? type.replace(/_/g, ' ');
}
