import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { loadMerchantContext } from '@/lib/gateway/context';
import { resolveMethods } from '@/lib/gateway/resolve';
import { inStock } from '@/lib/shipping';
import { CheckoutShell, TrustBadges } from '@/components/checkout/shell';
import { CheckoutView } from '@/components/checkout/designs';

type Params = { account: string; product: string };

// Checkout pages are per-buyer and price-sensitive; never served from a cache.
export const dynamic = 'force-dynamic';

async function load(params: Params) {
  const account = await prisma.account.findUnique({ where: { slug: params.account } });
  if (!account || account.suspendedAt) return null;

  const product = await prisma.product.findUnique({
    where: { accountId_slug: { accountId: account.id, slug: params.product } },
  });
  if (!product) return null;

  return { account, product };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await load(params);
  if (!data) return { title: 'Not found' };
  return {
    title: `${data.product.name} · ${data.account.name}`,
    description: data.product.description?.replace(/<[^>]*>/g, ' ').slice(0, 160),
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutPage({ params }: { params: Params }) {
  const data = await load(params);
  if (!data) notFound();

  const { account, product } = data;
  const ctx = await loadMerchantContext(account.id);
  const storeName = ctx.notifications.storeName || account.name;

  // An inactive product, or one that has sold out, gets an honest page rather
  // than a checkout that fails after the buyer has typed their details in.
  if (!product.active || !inStock(product)) {
    return (
      <CheckoutShell profile={ctx.profile}>
        <div
          style={{
            background: 'var(--mp-card)',
            border: '1px solid var(--mp-border)',
            borderRadius: 'var(--mp-radius)',
            padding: 28,
            textAlign: 'center',
          }}
        >
          <h1 style={{ margin: 0, fontSize: 20 }}>
            {product.active ? 'Sold out' : 'This is not available'}
          </h1>
          <p style={{ margin: '10px 0 0', fontSize: 14, color: 'var(--mp-text-muted)' }}>
            {product.active
              ? `${product.name} is out of stock right now.`
              : `${storeName} is not selling this at the moment.`}
          </p>
          {ctx.notifications.supportEmail ? (
            <p style={{ margin: '16px 0 0', fontSize: 13 }}>
              <a href={`mailto:${ctx.notifications.supportEmail}`} style={{ color: 'var(--mp-primary)' }}>
                Contact {storeName}
              </a>
            </p>
          ) : null}
        </div>
      </CheckoutShell>
    );
  }

  const methods = resolveMethods(ctx, product);
  const wide = ctx.profile.design !== 'LITE' && ctx.profile.design !== 'EXPRESS';

  return (
    <CheckoutShell profile={ctx.profile} wide={wide}>
      <CheckoutView
        profile={ctx.profile}
        product={product}
        storeName={storeName}
        supportEmail={ctx.notifications.supportEmail}
        trust={ctx.profile.design === 'TRUST' ? null : <TrustBadges profile={ctx.profile} />}
        form={{
          productId: product.id,
          currency: product.currency,
          priceCents: product.priceCents,
          methods,
          fieldVisibility: asRecord(ctx.profile.fieldVisibility),
          customFields: readCustomFields(ctx.profile.customFields),
          requiresShipping: product.requiresShipping,
          guarantee: ctx.profile.guaranteeText
            ? {
                title: ctx.profile.guaranteeTitle,
                text: ctx.profile.guaranteeText,
                days: ctx.profile.guaranteeDays,
              }
            : null,
        }}
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

function readCustomFields(
  value: unknown,
): { label: string; type: string; required: boolean; options: string[] }[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((f): f is Record<string, unknown> => typeof f === 'object' && f !== null)
    .filter((f) => typeof f.label === 'string' && f.label.trim() !== '' && f.type !== 'hidden')
    .map((f) => ({
      label: String(f.label),
      type: typeof f.type === 'string' ? f.type : 'text',
      required: Boolean(f.required),
      options:
        typeof f.options === 'string'
          ? f.options.split(',').map((o) => o.trim()).filter(Boolean)
          : Array.isArray(f.options)
            ? f.options.map(String)
            : [],
    }));
}
