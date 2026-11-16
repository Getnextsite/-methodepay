import { requireTenant } from '@/lib/tenancy';
import { buildReport } from '@/lib/reports';
import { countryName, methodName } from '@/lib/labels';
import { csvCell, isoDay, resolvePeriod } from '@/lib/reports-period';
import { decimalString } from '@/lib/money';

export const dynamic = 'force-dynamic';

/**
 * Every sale and refund in a period as CSV, for an accountant or a
 * spreadsheet. Signed amounts (refunds negative) so a plain SUM is the net.
 */
export async function GET(request: Request) {
  const { account } = await requireTenant();
  const url = new URL(request.url);
  const period = resolvePeriod({
    range: url.searchParams.get('range') ?? 'custom',
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined,
  });
  const report = await buildReport(account.id, period, { method: methodName, country: countryName });

  const header = [
    'date_utc',
    'type',
    'order_ref',
    'product',
    'buyer_email',
    'buyer_country',
    'payment_method',
    'coupon',
    'currency',
    'amount',
    'discount',
    'shipping',
  ];
  const lines = [header.join(',')];
  for (const r of report.rows) {
    const sign = r.kind === 'refund' ? -1 : 1;
    lines.push(
      [
        r.at.toISOString().replace('T', ' ').slice(0, 19),
        r.kind,
        r.ref,
        r.product,
        r.buyerEmail,
        r.buyerCountry ?? '',
        r.method ? methodName(r.method) : '',
        r.coupon ?? '',
        r.currency,
        decimalString(sign * r.amountCents, r.currency),
        r.kind === 'sale' ? decimalString(r.discountCents, r.currency) : '',
        r.kind === 'sale' ? decimalString(r.shippingCents, r.currency) : '',
      ]
        .map(csvCell)
        .join(','),
    );
  }

  const name = `methodepay-${account.slug}-${isoDay(period.from)}-to-${isoDay(new Date(period.to.getTime() - 86_400_000))}.csv`;
  // A byte-order mark so Excel opens accented names correctly.
  return new Response('﻿' + lines.join('\r\n') + '\r\n', {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  });
}
