'use client';

import { useState } from 'react';
import { ActionForm, SubmitButton, type ServerAction } from '@/components/action-form';
import { Field } from '@/components/ui';
import { SUPPORTED_CURRENCIES } from '@/lib/money';

export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  currency: string;
  imageUrl: string;
  active: boolean;
  type: 'DIGITAL' | 'PHYSICAL';
  durationDays: number;
  thanksTitle: string;
  thanksMessage: string;
  thanksRedirectUrl: string;
  deliveryFileUrl: string;
  hasAccessCode: boolean;
  manageStock: boolean;
  stock: number;
  weightGrams: number;
};

export function ProductForm({
  action,
  values,
  submitLabel,
}: {
  action: ServerAction;
  values: ProductFormValues;
  submitLabel: string;
}) {
  const [type, setType] = useState(values.type);
  const [manageStock, setManageStock] = useState(values.manageStock);
  const [isSubscription, setIsSubscription] = useState(values.durationDays > 0);

  return (
    <ActionForm action={action} className="space-y-6">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <section className="card space-y-4 p-5">
        <h2 className="text-sm font-semibold text-white">The basics</h2>

        <Field label="Name" htmlFor="name">
          <input id="name" name="name" required maxLength={190} defaultValue={values.name} className="input" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Price" htmlFor="price" hint="Numbers only, e.g. 49.00">
            <input
              id="price"
              name="price"
              inputMode="decimal"
              required
              defaultValue={values.price}
              className="input"
            />
          </Field>
          <Field label="Currency" htmlFor="currency">
            <select id="currency" name="currency" defaultValue={values.currency} className="input">
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kind" htmlFor="type">
            <select
              id="type"
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value as 'DIGITAL' | 'PHYSICAL')}
              className="input"
            >
              <option value="DIGITAL">Digital</option>
              <option value="PHYSICAL">Physical</option>
            </select>
          </Field>
        </div>

        <Field
          label="Checkout URL slug"
          htmlFor="slug"
          hint="Leave blank to generate one from the name. Changing it breaks links you have already shared."
        >
          <input id="slug" name="slug" maxLength={190} defaultValue={values.slug} className="input" />
        </Field>

        <Field label="Description" htmlFor="description" hint="Shown on the checkout page. Basic HTML is allowed.">
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={values.description}
            className="input"
          />
        </Field>

        <Field label="Image URL" htmlFor="imageUrl">
          <input
            id="imageUrl"
            name="imageUrl"
            type="url"
            defaultValue={values.imageUrl}
            className="input"
            placeholder="https://…"
          />
        </Field>

        <label className="flex items-center gap-2.5 text-sm text-ink-100">
          <input type="checkbox" name="active" defaultChecked={values.active} className="h-4 w-4 accent-mint" />
          Active — the checkout link works and buyers can pay
        </label>
      </section>

      <section className="card space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold text-white">Fulfilment</h2>
          <p className="mt-1 text-xs text-ink-400">
            Sent automatically the moment an order is marked paid — by a webhook, or by you.
          </p>
        </div>

        <Field label="Download or access URL" htmlFor="deliveryFileUrl">
          <input
            id="deliveryFileUrl"
            name="deliveryFileUrl"
            type="url"
            defaultValue={values.deliveryFileUrl}
            className="input"
            placeholder="https://…"
          />
        </Field>

        <Field
          label="Licence key or access details"
          htmlFor="deliveryAccessCode"
          hint={
            values.hasAccessCode
              ? 'A code is stored and encrypted. Leave blank to keep it, type to replace it.'
              : 'Encrypted at rest and included in the delivery email.'
          }
        >
          <textarea
            id="deliveryAccessCode"
            name="deliveryAccessCode"
            rows={3}
            className="input"
            placeholder={values.hasAccessCode ? '•••••••• (stored)' : ''}
          />
        </Field>

        {values.hasAccessCode ? (
          <label className="flex items-center gap-2.5 text-sm text-ink-300">
            <input type="checkbox" name="clearAccessCode" className="h-4 w-4 accent-mint" />
            Remove the stored code
          </label>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Thank-you headline" htmlFor="thanksTitle">
            <input
              id="thanksTitle"
              name="thanksTitle"
              maxLength={190}
              defaultValue={values.thanksTitle}
              className="input"
            />
          </Field>
          <Field label="Redirect after payment" htmlFor="thanksRedirectUrl" hint="Optional. Overrides the thank-you page.">
            <input
              id="thanksRedirectUrl"
              name="thanksRedirectUrl"
              type="url"
              defaultValue={values.thanksRedirectUrl}
              className="input"
            />
          </Field>
        </div>

        <Field label="Thank-you message" htmlFor="thanksMessage">
          <textarea
            id="thanksMessage"
            name="thanksMessage"
            rows={3}
            defaultValue={values.thanksMessage}
            className="input"
          />
        </Field>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-sm font-semibold text-white">Access period</h2>
        <label className="flex items-center gap-2.5 text-sm text-ink-100">
          <input
            type="checkbox"
            checked={isSubscription}
            onChange={(e) => setIsSubscription(e.target.checked)}
            className="h-4 w-4 accent-mint"
          />
          This product expires and can be renewed
        </label>
        {isSubscription ? (
          <Field
            label="Access length in days"
            htmlFor="durationDays"
            hint="A buyer who renews early keeps the days they already paid for — the new period extends from the old expiry."
          >
            <input
              id="durationDays"
              name="durationDays"
              type="number"
              min={1}
              defaultValue={values.durationDays || 30}
              className="input sm:max-w-[200px]"
            />
          </Field>
        ) : (
          <input type="hidden" name="durationDays" value={0} />
        )}
      </section>

      {type === 'PHYSICAL' ? (
        <section className="card space-y-4 p-5">
          <h2 className="text-sm font-semibold text-white">Stock and shipping</h2>
          <label className="flex items-center gap-2.5 text-sm text-ink-100">
            <input
              type="checkbox"
              name="manageStock"
              checked={manageStock}
              onChange={(e) => setManageStock(e.target.checked)}
              className="h-4 w-4 accent-mint"
            />
            Track stock
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            {manageStock ? (
              <Field label="Units in stock" htmlFor="stock" hint="Taken at payment, not at checkout.">
                <input
                  id="stock"
                  name="stock"
                  type="number"
                  min={0}
                  defaultValue={values.stock}
                  className="input"
                />
              </Field>
            ) : null}
            <Field label="Weight (grams)" htmlFor="weightGrams">
              <input
                id="weightGrams"
                name="weightGrams"
                type="number"
                min={0}
                defaultValue={values.weightGrams}
                className="input"
              />
            </Field>
          </div>
        </section>
      ) : (
        <>
          <input type="hidden" name="stock" value={values.stock} />
          <input type="hidden" name="weightGrams" value={values.weightGrams} />
        </>
      )}

      <div className="flex justify-end">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
