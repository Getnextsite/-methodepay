import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireTenant } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { fromCents } from '@/lib/money';
import { env } from '@/lib/env';
import { Banner, CopyBox, PageHeader, Section } from '@/components/ui';
import { ActionForm, SubmitButton } from '@/components/action-form';
import { deleteProductAction, updateProductAction } from '../actions';
import { ProductForm } from '../product-form';

export const metadata: Metadata = { title: 'Edit product' };

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { created?: string };
}) {
  const { account } = await requireTenant();

  const product = await prisma.product.findFirst({
    where: { id: params.id, accountId: account.id },
    include: { _count: { select: { orders: true } } },
  });
  if (!product) notFound();

  const checkoutUrl = `${env.checkoutUrl}/c/${account.slug}/${product.slug}`;

  return (
    <>
      <PageHeader
        title={product.name}
        description={`${product._count.orders} order${product._count.orders === 1 ? '' : 's'} against this product.`}
        action={
          <a href={checkoutUrl} target="_blank" rel="noreferrer" className="btn-ghost">
            Preview checkout
          </a>
        }
      />

      {searchParams.created ? (
        <Banner tone="good">
          Product created. Share the link below, or embed it as a button on any site.
        </Banner>
      ) : null}

      <div className="mb-6">
        <Section title="Checkout link" description="Paste it in a DM, a bio, an invoice or an ad.">
          <CopyBox value={checkoutUrl} />
        </Section>
      </div>

      <ProductForm
        action={updateProductAction}
        submitLabel="Save changes"
        values={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description ?? '',
          price: fromCents(product.priceCents, product.currency),
          currency: product.currency,
          imageUrl: product.imageUrl ?? '',
          active: product.active,
          type: product.type,
          durationDays: product.durationDays,
          thanksTitle: product.thanksTitle ?? '',
          thanksMessage: product.thanksMessage ?? '',
          thanksRedirectUrl: product.thanksRedirectUrl ?? '',
          deliveryFileUrl: product.deliveryFileUrl ?? '',
          hasAccessCode: Boolean(product.deliveryAccessCodeEnc),
          manageStock: product.manageStock,
          stock: product.stock,
          weightGrams: product.weightGrams,
        }}
      />

      <div className="mt-8">
        <Section
          title="Remove this product"
          description={
            product._count.orders > 0
              ? 'It has orders against it, so it will be deactivated rather than deleted — a receipt that cannot say what was bought is not a receipt.'
              : 'No orders reference it, so it can be deleted outright.'
          }
        >
          <ActionForm action={deleteProductAction} className="flex items-center gap-3">
            <input type="hidden" name="id" value={product.id} />
            <SubmitButton
              variant="danger"
              confirm={
                product._count.orders > 0
                  ? `Deactivate ${product.name}? Its checkout link will stop accepting payments.`
                  : `Delete ${product.name}? This cannot be undone.`
              }
            >
              {product._count.orders > 0 ? 'Deactivate product' : 'Delete product'}
            </SubmitButton>
          </ActionForm>
        </Section>
      </div>
    </>
  );
}
