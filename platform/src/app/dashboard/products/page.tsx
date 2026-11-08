import Link from 'next/link';
import type { Metadata } from 'next';
import { requireTenant } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { entitlementsFor } from '@/lib/entitlements';
import { formatMoney } from '@/lib/money';
import { env } from '@/lib/env';
import { EmptyState, PageHeader, Section, UpgradeHint } from '@/components/ui';

export const metadata: Metadata = { title: 'Products' };

export default async function ProductsPage() {
  const { account } = await requireTenant();
  const ent = entitlementsFor(account);

  const products = await prisma.product.findMany({
    where: { accountId: account.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { orders: true } } },
  });

  const atLimit = ent.products !== -1 && products.length >= ent.products;

  return (
    <>
      <PageHeader
        title="Products"
        description="Each product gets its own checkout link. No cart, no account, no funnel."
        action={
          atLimit ? (
            <div className="text-right">
              <button type="button" disabled className="btn-primary">
                Add a product
              </button>
              <div className="mt-1.5">
                <UpgradeHint>
                  You have used all {ent.products} products on {ent.label}.
                </UpgradeHint>
              </div>
            </div>
          ) : (
            <Link href="/dashboard/products/new" className="btn-primary">
              Add a product
            </Link>
          )
        }
      />

      <Section>
        {products.length === 0 ? (
          <EmptyState
            title="Nothing to sell yet"
            description="A product is a name, a price and a way to deliver it. That is enough to take money."
            action={
              <Link href="/dashboard/products/new" className="btn-primary">
                Add your first product
              </Link>
            }
          />
        ) : (
          <div className="-mx-5 -my-5 overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-ink-600/70">
                <tr>
                  <th className="table-head">Product</th>
                  <th className="table-head">Price</th>
                  <th className="table-head">Orders</th>
                  <th className="table-head">Checkout link</th>
                  <th className="table-head">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-600/50">
                {products.map((product) => (
                  <tr key={product.id} className="transition hover:bg-ink-700/30">
                    <td className="table-cell">
                      <Link
                        href={`/dashboard/products/${product.id}`}
                        className="font-medium text-white hover:text-mint"
                      >
                        {product.name}
                      </Link>
                      <p className="text-xs text-ink-400">
                        {product.type === 'PHYSICAL' ? 'Physical' : 'Digital'}
                        {product.durationDays > 0 ? ` · ${product.durationDays}-day access` : ''}
                        {product.manageStock ? ` · ${product.stock} in stock` : ''}
                      </p>
                    </td>
                    <td className="table-cell tabular-nums">
                      {formatMoney(product.priceCents, product.currency)}
                    </td>
                    <td className="table-cell tabular-nums text-ink-300">{product._count.orders}</td>
                    <td className="table-cell">
                      <code className="text-[11px] text-mint">
                        /c/{account.slug}/{product.slug}
                      </code>
                      {product.active ? (
                        <a
                          href={`${env.checkoutUrl}/c/${account.slug}/${product.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-2 text-[11px] text-ink-400 hover:text-mint"
                        >
                          open
                        </a>
                      ) : null}
                    </td>
                    <td className="table-cell">
                      {product.active ? (
                        <span className="chip border-mint/40 bg-mint/10 text-mint">Live</span>
                      ) : (
                        <span className="chip">Inactive</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}
