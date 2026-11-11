'use client';

import { useMemo, useState } from 'react';
import { formatMoney } from '@/lib/money';
import type { AvailableMethod } from '@/lib/gateway/types';
import { MethodIcon } from './method-icon';

export type CheckoutFormProps = {
  productId: string;
  currency: string;
  priceCents: number;
  methods: AvailableMethod[];
  fieldVisibility: Record<string, string>;
  customFields: { label: string; type: string; required: boolean; options: string[] }[];
  requiresShipping: boolean;
  guarantee: { title: string; text: string; days: number } | null;
  renewalOfRef?: string;
  /**
   * Ask how they want to pay before asking who they are. For a buyer who has
   * already decided, the rail is the only question that remains.
   */
  methodsFirst?: boolean;
  /** Render the rails as a grid of tiles rather than a stacked list. */
  tiles?: boolean;
  /**
   * Drop the subtotal line when the layout already prints the price elsewhere.
   * The discount field and the payable total always stay: a buyer holding a
   * code needs somewhere to type it, whatever the layout.
   */
  compactTotals?: boolean;
  /** Bigger pay button, for layouts where it is the only thing on screen. */
  largeCta?: boolean;
  /** Rendered above the submit button; the merchant trust block. */
  children?: React.ReactNode;
};

type Totals = { discountCents: number; couponLabel: string | null; couponError: string | null };

const BUYER_FIELDS = [
  { key: 'phone', name: 'buyerPhone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
  { key: 'country', name: 'buyerCountry', label: 'Country', type: 'country', autoComplete: 'country' },
  { key: 'address1', name: 'buyerAddress1', label: 'Address', type: 'text', autoComplete: 'address-line1' },
  { key: 'address2', name: 'buyerAddress2', label: 'Address line 2', type: 'text', autoComplete: 'address-line2' },
  { key: 'city', name: 'buyerCity', label: 'City', type: 'text', autoComplete: 'address-level2' },
  { key: 'state', name: 'buyerState', label: 'State / region', type: 'text', autoComplete: 'address-level1' },
  { key: 'postalCode', name: 'buyerPostalCode', label: 'Postal code', type: 'text', autoComplete: 'postal-code' },
  { key: 'company', name: 'buyerCompany', label: 'Company', type: 'text', autoComplete: 'organization' },
  { key: 'note', name: 'buyerNote', label: 'Order note', type: 'textarea', autoComplete: 'off' },
] as const;

// A short list covering the regions these rails actually serve, plus a free
// text fallback so nobody is locked out by an incomplete dropdown.
const COUNTRIES = [
  'US', 'CA', 'GB', 'IE', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'PT', 'PL', 'SE', 'NO', 'DK', 'FI',
  'CH', 'AT', 'CZ', 'RO', 'GR', 'TR', 'RU', 'UA', 'AE', 'SA', 'QA', 'KW', 'EG', 'MA', 'DZ', 'TN',
  'NG', 'GH', 'KE', 'TZ', 'UG', 'ZA', 'SN', 'CI', 'CM', 'IN', 'PK', 'BD', 'LK', 'NP', 'ID', 'MY',
  'SG', 'PH', 'TH', 'VN', 'CN', 'JP', 'KR', 'AU', 'NZ', 'BR', 'AR', 'CL', 'CO', 'PE', 'MX',
];

export function CheckoutForm(props: CheckoutFormProps) {
  const {
    productId,
    currency,
    priceCents,
    methods,
    fieldVisibility,
    customFields,
    requiresShipping,
    renewalOfRef,
    methodsFirst = false,
    tiles = false,
    compactTotals = false,
    largeCta = false,
    children,
  } = props;

  const [method, setMethod] = useState(methods[0]?.key ?? '');
  const [coupon, setCoupon] = useState('');
  const [totals, setTotals] = useState<Totals>({
    discountCents: 0,
    couponLabel: null,
    couponError: null,
  });
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => methods.find((m) => m.key === method) ?? null, [methods, method]);
  const total = Math.max(0, priceCents - totals.discountCents);

  // Physical goods need somewhere to go, whatever the merchant chose to ask
  // for. Shipping beats the field-visibility setting rather than the reverse.
  const visibility = useMemo(() => {
    const v = { ...fieldVisibility };
    if (requiresShipping) {
      for (const key of ['address1', 'city', 'postalCode', 'country'] as const) {
        if (v[key] !== 'required') v[key] = 'required';
      }
    }
    return v;
  }, [fieldVisibility, requiresShipping]);

  async function applyCoupon() {
    if (!coupon.trim()) return;
    setCheckingCoupon(true);
    setTotals((t) => ({ ...t, couponError: null }));
    try {
      const res = await fetch('/api/checkout/coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, code: coupon.trim() }),
      });
      const json = (await res.json()) as {
        valid?: boolean;
        discountCents?: number;
        label?: string;
        reason?: string;
      };
      if (json.valid) {
        setTotals({
          discountCents: json.discountCents ?? 0,
          couponLabel: json.label ?? 'Discount applied',
          couponError: null,
        });
      } else {
        setTotals({
          discountCents: 0,
          couponLabel: null,
          couponError: json.reason ?? 'That coupon is not valid.',
        });
      }
    } catch {
      setTotals((t) => ({ ...t, couponError: 'Could not check that coupon. Try again.' }));
    } finally {
      setCheckingCoupon(false);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = { productId, paymentMethod: method };
    formData.forEach((value, key) => {
      if (typeof value === 'string') payload[key] = value;
    });
    if (totals.couponLabel) payload.couponCode = coupon.trim();
    if (renewalOfRef) payload.renewalOfRef = renewalOfRef;

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (json.url) {
        window.location.href = json.url;
        return;
      }
      setError(json.error ?? 'Something went wrong. Please try again.');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (methods.length === 0) {
    return (
      <div className="mp-panel">
        <p style={{ margin: 0, fontWeight: 600 }}>No payment methods available</p>
        <p className="mp-note" style={{ marginTop: 6 }}>
          This store has not finished setting up a way to pay. Please contact the seller.
        </p>
      </div>
    );
  }

  const details = (
    <fieldset>
      <legend className="mp-legend">Your details</legend>
      <div className="mp-fields">
        <div className="mp-fields mp-fields--2">
          <Input name="buyerName" label="Full name" required autoComplete="name" />
          <Input name="buyerEmail" label="Email" type="email" required autoComplete="email" />
        </div>

        {BUYER_FIELDS.filter((f) => visibility[f.key] && visibility[f.key] !== 'hidden').map(
          (field) => {
            const required = visibility[field.key] === 'required';
            if (field.type === 'textarea') {
              return (
                <Field key={field.key} label={field.label} name={field.name} required={required}>
                  <textarea
                    id={field.name}
                    name={field.name}
                    rows={3}
                    required={required}
                    className="mp-input"
                  />
                </Field>
              );
            }
            if (field.type === 'country') {
              return (
                <Field key={field.key} label={field.label} name={field.name} required={required}>
                  <input
                    id={field.name}
                    name={field.name}
                    list="mp-countries"
                    required={required}
                    autoComplete="country"
                    placeholder="US"
                    maxLength={2}
                    className="mp-input mp-input--upper"
                  />
                  <datalist id="mp-countries">
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </Field>
              );
            }
            return (
              <Input
                key={field.key}
                name={field.name}
                label={field.label}
                type={field.type}
                required={required}
                autoComplete={field.autoComplete}
              />
            );
          },
        )}

        {customFields.map((field, index) => {
          const name = `custom_${index}`;
          if (field.type === 'select') {
            return (
              <Field key={name} label={field.label} name={name} required={field.required}>
                <select id={name} name={name} required={field.required} className="mp-input">
                  <option value="">Select…</option>
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
            );
          }
          return (
            <Input
              key={name}
              name={name}
              label={field.label}
              type={field.type === 'textarea' ? 'textarea' : 'text'}
              required={field.required}
            />
          );
        })}
      </div>
    </fieldset>
  );

  const payment = (
    <fieldset>
      <legend className="mp-legend">How would you like to pay?</legend>
      <div className={`mp-methods${tiles ? ' mp-methods--tiles' : ''}`}>
        {methods.map((option) => {
          const active = option.key === method;
          return (
            <label
              key={option.key}
              className={`mp-method${active ? ' mp-method--on' : ''}`}
              style={tiles ? { position: 'relative' } : undefined}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={option.key}
                checked={active}
                onChange={() => setMethod(option.key)}
              />
              <span className="mp-method-body">
                <span className="mp-method-head">
                  {option.iconUrl ? (
                    // A merchant with the rights to the real artwork wins.
                    // eslint-disable-next-line @next/next/no-img-element -- merchant-hosted icon
                    <img src={option.iconUrl} alt="" style={{ height: 20, width: 'auto' }} />
                  ) : (
                    <MethodIcon rail={option.key} tone={option.tone} size={20} />
                  )}
                  <span className="mp-method-name">{option.label}</span>
                  {option.recommended ? <span className="mp-tag">Recommended</span> : null}
                </span>
                {option.description ? (
                  <span className="mp-method-desc">{option.description}</span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>

      {selected?.kycNotice ? (
        <p className="mp-panel mp-note" style={{ marginTop: 12 }}>
          {selected.kycNotice}
        </p>
      ) : null}

      {selected?.requiresGiftCard ? (
        <div className="mp-fields" style={{ marginTop: 14 }}>
          <Field
            label="Gift card code"
            name="giftCardCode"
            required
            hint="16 characters, as printed on the card."
          >
            <input
              id="giftCardCode"
              name="giftCardCode"
              required
              minLength={14}
              maxLength={25}
              autoComplete="off"
              spellCheck={false}
              className="mp-input mp-input--mono"
            />
          </Field>
          <Field label="Which Amazon region is it for?" name="giftCardCountry">
            <input
              id="giftCardCountry"
              name="giftCardCountry"
              list="mp-countries"
              maxLength={2}
              placeholder="US"
              className="mp-input mp-input--upper"
            />
          </Field>
          <p className="mp-fine">
            Your code is encrypted and reviewed by the seller by hand. Your order stays pending until
            they confirm it — no balance is checked or redeemed automatically.
          </p>
        </div>
      ) : null}
    </fieldset>
  );

  return (
    <form className="mp-form" onSubmit={onSubmit} noValidate>
      <div className="mp-stack" style={{ ['--mp-gap' as string]: '22px' }}>
        {methodsFirst ? payment : details}
        {methodsFirst ? details : payment}

        <div className="mp-panel">
            <div className="mp-coupon">
              <input
                value={coupon}
                onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                placeholder="Discount code"
                aria-label="Discount code"
                className="mp-input mp-input--upper"
              />
              <button
                type="button"
                onClick={applyCoupon}
                disabled={checkingCoupon || !coupon.trim()}
                className="mp-btn-ghost"
              >
                {checkingCoupon ? 'Checking…' : 'Apply'}
              </button>
            </div>
            {totals.couponLabel ? (
              <p role="status" className="mp-ok" style={{ marginTop: 10 }}>
                {totals.couponLabel} applied.
              </p>
            ) : null}
            {totals.couponError ? (
              <p role="alert" className="mp-alert" style={{ marginTop: 10 }}>
                {totals.couponError}
              </p>
            ) : null}

            <dl className="mp-totals" style={{ marginTop: 15 }}>
              {compactTotals && totals.discountCents === 0 ? null : (
                <div className="mp-totals-row">
                  <dt>Subtotal</dt>
                  <dd>{money(priceCents, currency)}</dd>
                </div>
              )}
              {totals.discountCents > 0 ? (
                <div className="mp-totals-row mp-totals-row--off">
                  <dt>Discount</dt>
                  <dd>− {money(totals.discountCents, currency)}</dd>
                </div>
              ) : null}
              <div className="mp-totals-row mp-totals-row--sum">
                <dt>Total</dt>
                <dd>{money(total, currency)}</dd>
              </div>
            </dl>
          </div>

        {children}

        {error ? (
          <p role="alert" className="mp-alert">
            {error}
          </p>
        ) : null}

        <div>
          <button
            type="submit"
            disabled={submitting}
            className={`mp-btn${largeCta ? ' mp-btn--lg' : ''}`}
          >
            {submitting ? 'Taking you to payment…' : `Pay ${money(total, currency)}`}
          </button>
          <p className="mp-fine" style={{ marginTop: 12, textAlign: 'center' }}>
            You will see exactly what to do next before anything is charged.
          </p>
        </div>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- bits

function Field({
  label,
  name,
  required = false,
  hint,
  children,
}: {
  label: string;
  name: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="mp-label">
        {label}
        {required ? (
          <span aria-hidden className="mp-req">
            {' '}
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint ? (
        <p className="mp-fine" style={{ marginTop: 5 }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Input({
  name,
  label,
  type = 'text',
  required = false,
  autoComplete,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  if (type === 'textarea') {
    return (
      <Field label={label} name={name} required={required}>
        <textarea id={name} name={name} rows={3} required={required} className="mp-input" />
      </Field>
    );
  }
  return (
    <Field label={label} name={name} required={required}>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="mp-input"
      />
    </Field>
  );
}

// One formatter for the whole page. Intl with an undefined locale resolves
// differently on the server and in the browser, which both desynchronises the
// rail from the totals and risks a hydration mismatch on the only number that
// matters.
function money(cents: number, currency: string): string {
  return formatMoney(cents, currency);
}
