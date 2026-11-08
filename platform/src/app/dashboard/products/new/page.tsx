import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireTenant } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { entitlementsFor, withinProductLimit } from '@/lib/entitlements';
import { PageHeader } from '@/components/ui';
import { createProductAction } from '../actions';
import { ProductForm } from '../product-form';

export const metadata: Metadata = { title: 'New product' };

export default async function NewProductPage() {
  const { account } = await requireTenant();
  const ent = entitlementsFor(account);
  const count = await prisma.product.count({ where: { accountId: account.id } });

  // Someone who bookmarked this URL should not get a form that cannot save.
  if (!withinProductLimit(ent, count)) redirect('/dashboard/products');

  return (
    <>
      <PageHeader
        title="New product"
        description="Name it, price it, and say how it gets delivered. Everything else has a sensible default."
      />
      <ProductForm
        action={createProductAction}
        submitLabel="Create product"
        values={{
          name: '',
          slug: '',
          description: '',
          price: '',
          currency: 'USD',
          imageUrl: '',
          active: true,
          type: 'DIGITAL',
          durationDays: 0,
          thanksTitle: '',
          thanksMessage: '',
          thanksRedirectUrl: '',
          deliveryFileUrl: '',
          hasAccessCode: false,
          manageStock: false,
          stock: 0,
          weightGrams: 0,
        }}
      />
    </>
  );
}
