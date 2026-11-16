import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTenant } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { MAX_ATTEMPTS } from '@/lib/webhook-schedule';
import { PageHeader, Section } from '@/components/ui';
import { ActionForm, SubmitButton } from '@/components/action-form';
import { DeliveryStatus } from '@/components/delivery-status';
import { resendAction, retryNowAction } from '../actions';

export const metadata: Metadata = { title: 'Webhook delivery' };
export const dynamic = 'force-dynamic';

function when(d: Date | null | undefined): string {
  return d ? d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC' : '—';
}

export default async function DeliveryPage({ params }: { params: { id: string } }) {
  const { account, role } = await requireTenant();
  const delivery = await prisma.webhookDelivery.findFirst({
    where: { id: params.id, endpoint: { accountId: account.id } },
    include: { endpoint: true },
  });
  if (!delivery) notFound();
  const canEdit = role === 'OWNER' || role === 'ADMIN';

  const body = JSON.stringify(
    {
      id: delivery.id,
      event: delivery.event,
      created: Math.floor(delivery.createdAt.getTime() / 1000),
      attempt: Math.max(1, delivery.attempts),
      data: delivery.payload,
    },
    null,
    2,
  );

  const order = (delivery.payload as Record<string, unknown> | null)?.id;
  const orderId = typeof order === 'string' ? order : null;

  return (
    <>
      <PageHeader
        title={delivery.event}
        description={`Delivery ${delivery.id} to ${delivery.endpoint.url}`}
        action={
          <Link href="/dashboard/webhooks" className="btn-ghost !py-2 !text-xs">
            Back to webhooks
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          <Section title="Status">
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-400">Status</dt>
                <dd>
                  <DeliveryStatus status={delivery.status} />
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-400">Attempts</dt>
                <dd className="tabular-nums text-ink-100">
                  {delivery.attempts} of {MAX_ATTEMPTS}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-400">Created</dt>
                <dd className="text-ink-100">{when(delivery.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-400">Last attempt</dt>
                <dd className="text-ink-100">{when(delivery.lastAttemptAt)}</dd>
              </div>
              {delivery.status === 'retrying' ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-400">Next attempt</dt>
                  <dd className="text-amber-200">{when(delivery.nextAttemptAt)}</dd>
                </div>
              ) : null}
              {delivery.deliveredAt ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-400">Delivered</dt>
                  <dd className="text-mint">{when(delivery.deliveredAt)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3">
                <dt className="text-ink-400">Response</dt>
                <dd className="text-ink-100">
                  {delivery.responseCode ? `HTTP ${delivery.responseCode}` : 'none'}
                  {delivery.durationMs !== null ? ` in ${delivery.durationMs} ms` : ''}
                </dd>
              </div>
              {delivery.lastError ? (
                <div>
                  <dt className="text-ink-400">Error</dt>
                  <dd className="mt-1 text-red-300">{delivery.lastError}</dd>
                </div>
              ) : null}
              {orderId ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-400">Order</dt>
                  <dd>
                    <Link href={`/dashboard/orders/${orderId}`} className="text-mint hover:underline">
                      Open the order
                    </Link>
                  </dd>
                </div>
              ) : null}
            </dl>
            {canEdit ? (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-ink-600/60 pt-4">
                {delivery.status !== 'delivered' ? (
                  <ActionForm action={retryNowAction} className="">
                    <input type="hidden" name="id" value={delivery.id} />
                    <SubmitButton className="!px-3 !py-2 !text-xs">Retry now</SubmitButton>
                  </ActionForm>
                ) : null}
                <ActionForm action={resendAction} className="">
                  <input type="hidden" name="id" value={delivery.id} />
                  <SubmitButton variant="ghost" className="!px-3 !py-2 !text-xs">
                    Send again as new
                  </SubmitButton>
                </ActionForm>
              </div>
            ) : null}
          </Section>

          <Section title="Your server replied" description="The first 2,000 characters of the last response.">
            {delivery.responseBody ? (
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-ink-600 bg-ink-950 p-3 text-[11px] text-ink-200">
                {delivery.responseBody}
              </pre>
            ) : (
              <p className="text-sm text-ink-400">No response body.</p>
            )}
          </Section>
        </div>

        <Section
          title="Request body"
          description="Headers: Content-Type: application/json, MethodePay-Event, MethodePay-Delivery, MethodePay-Attempt, MethodePay-Signature."
        >
          <pre className="max-h-[640px] overflow-auto rounded-xl border border-ink-600 bg-ink-950 p-3 text-[11px] leading-relaxed text-ink-200">
            {body}
          </pre>
        </Section>
      </div>
    </>
  );
}
