'use client';

import { useMemo, useState } from 'react';
import type { AvailableMethod } from '@/lib/gateway/types';

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
      <div style={panel}>
        <p style={{ margin: 0, fontWeight: 600 }}>No payment methods available</p>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--mp-text-muted)' }}>
          This store has not finished setting up a way to pay. Please contact the seller.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <fieldset style={fieldsetReset}>
        <legend style={legend}>Your details</legend>
        <div style={grid2}>
          <Input name="buyerName" label="Full name" required autoComplete="name" />
          <Input name="buyerEmail" label="Email" type="email" required autoComplete="email" />
        </div>

        {BUYER_FIELDS.filter((f) => visibility[f.key] && visibility[f.key] !== 'hidden').map(
          (field) => {
            const required = visibility[field.key] === 'required';
            if (field.type === 'textarea') {
              return (
                <Field key={field.key} label={field.label} name={field.name} required={required}>
                  <textarea id={field.name} name={field.name} rows={3} required={required} style={input} />
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
                    style={{ ...input, textTransform: 'uppercase' }}
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
                <select id={name} name={name} required={field.required} style={input}>
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
      </fieldset>

      <fieldset style={{ ...fieldsetReset, marginTop: 22 }}>
        <legend style={legend}>How would you like to pay?</legend>
        <div style={{ display: 'grid', gap: 8 }}>
          {methods.map((option) => {
            const active = option.key === method;
            return (
              <label
                key={option.key}
                style={{
                  display: 'flex',
                  gap: 11,
                  alignItems: 'flex-start',
                  padding: 13,
                  cursor: 'pointer',
                  borderRadius: 'var(--mp-radius-sm)',
                  border: `1px solid ${active ? 'var(--mp-primary)' : 'var(--mp-border)'}`,
                  background: active ? 'color-mix(in srgb, var(--mp-primary) 8%, transparent)' : 'transparent',
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={option.key}
                  checked={active}
                  onChange={() => setMethod(option.key)}
                  style={{ marginTop: 3, accentColor: 'var(--mp-primary)' }}
                />
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {option.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- merchant-hosted icon
                      <img src={option.iconUrl} alt="" style={{ height: 16, width: 'auto' }} />
                    ) : (
                      <span
                        aria-hidden
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          background: option.tone,
                          display: 'inline-block',
                        }}
                      />
                    )}
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{option.label}</span>
                    {option.recommended ? (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '.04em',
                          textTransform: 'uppercase',
                          background: 'var(--mp-primary)',
                          color: 'var(--mp-primary-contrast)',
                          borderRadius: 999,
                          padding: '2px 7px',
                        }}
                      >
                        Recommended
                      </span>
                    ) : null}
                  </span>
                  {option.description ? (
                    <span
                      style={{
                        display: 'block',
                        marginTop: 3,
                        fontSize: 12.5,
                        lineHeight: 1.5,
                        color: 'var(--mp-text-muted)',
                      }}
                    >
                      {option.description}
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>

        {selected?.kycNotice ? (
          <p
            style={{
              margin: '12px 0 0',
              padding: 12,
              borderRadius: 'var(--mp-radius-sm)',
              border: '1px solid var(--mp-border)',
              fontSize: 12.5,
              lineHeight: 1.6,
              color: 'var(--mp-text-muted)',
            }}
          >
            {selected.kycNotice}
          </p>
        ) : null}

        {selected?.requiresGiftCard ? (
          <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
            <Field label="Gift card code" name="giftCardCode" required hint="16 characters, as printed on the card.">
              <input
                id="giftCardCode"
                name="giftCardCode"
                required
                minLength={14}
                maxLength={25}
                autoComplete="off"
                spellCheck={false}
                style={{ ...input, fontFamily: 'ui-monospace, monospace', letterSpacing: '.06em' }}
              />
            </Field>
            <Field label="Which Amazon region is it for?" name="giftCardCountry">
              <input
                id="giftCardCountry"
                name="giftCardCountry"
                list="mp-countries"
                maxLength={2}
                placeholder="US"
                style={{ ...input, textTransform: 'uppercase' }}
              />
            </Field>
            <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.6, color: 'var(--mp-text-faint)' }}>
              Your code is encrypted and reviewed by the seller by hand. Your order stays pending
              until they confirm it — no balance is checked or redeemed automatically.
            </p>
          </div>
        ) : null}
      </fieldset>

      <div style={{ ...panel, marginTop: 22 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={coupon}
            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            placeholder="Discount code"
            aria-label="Discount code"
            style={{ ...input, textTransform: 'uppercase' }}
          />
          <button
            type="button"
            onClick={applyCoupon}
            disabled={checkingCoupon || !coupon.trim()}
            style={{ ...secondaryButton, whiteSpace: 'nowrap' }}
          >
            {checkingCoupon ? 'Checking…' : 'Apply'}
          </button>
        </div>
        {totals.couponLabel ? (
          <p role="status" style={{ margin: '9px 0 0', fontSize: 12.5, color: 'var(--mp-primary)' }}>
            {totals.couponLabel} applied.
          </p>
        ) : null}
        {totals.couponError ? (
          <p role="alert" style={{ margin: '9px 0 0', fontSize: 12.5, color: '#ff8585' }}>
            {totals.couponError}
          </p>
        ) : null}

        <dl style={{ margin: '14px 0 0', display: 'grid', gap: 7, fontSize: 13.5 }}>
          <Line label="Subtotal" value={money(priceCents, currency)} />
          {totals.discountCents > 0 ? (
            <Line label="Discount" value={`− ${money(totals.discountCents, currency)}`} accent />
          ) : null}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderTop: '1px solid var(--mp-border)',
              paddingTop: 9,
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            <dt>Total</dt>
            <dd style={{ margin: 0, color: 'var(--mp-primary)' }}>{money(total, currency)}</dd>
          </div>
        </dl>
      </div>

      {children}

      {error ? (
        <p
          role="alert"
          style={{
            margin: '18px 0 0',
            padding: 12,
            borderRadius: 'var(--mp-radius-sm)',
            border: '1px solid #ff858540',
            background: '#ff85851a',
            color: '#ffb3b3',
            fontSize: 13,
          }}
        >
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={submitting} style={primaryButton}>
        {submitting ? 'Taking you to payment…' : `Pay ${money(total, currency)}`}
      </button>

      <p style={{ margin: '12px 0 0', fontSize: 11.5, textAlign: 'center', color: 'var(--mp-text-faint)' }}>
        You will see exactly what to do next before anything is charged.
      </p>
    </form>
  );
}

// ---------------------------------------------------------------- bits

function Line({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <dt style={{ color: 'var(--mp-text-muted)' }}>{label}</dt>
      <dd style={{ margin: 0, color: accent ? 'var(--mp-primary)' : 'inherit' }}>{value}</dd>
    </div>
  );
}

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
    <div style={{ marginTop: 12 }}>
      <label htmlFor={name} style={labelStyle}>
        {label}
        {required ? <span aria-hidden style={{ color: 'var(--mp-primary)' }}> *</span> : null}
      </label>
      {children}
      {hint ? (
        <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--mp-text-faint)' }}>{hint}</p>
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
        <textarea id={name} name={name} rows={3} required={required} style={input} />
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
        style={input}
      />
    </Field>
  );
}

function money(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

const fieldsetReset: React.CSSProperties = { border: 0, margin: 0, padding: 0 };

const legend: React.CSSProperties = {
  padding: 0,
  marginBottom: 4,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '.06em',
  textTransform: 'uppercase',
  color: 'var(--mp-text-faint)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 5,
  fontSize: 12.5,
  fontWeight: 500,
  color: 'var(--mp-text-muted)',
};

const input: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 13px',
  fontSize: 14,
  fontFamily: 'inherit',
  color: 'var(--mp-text)',
  background: 'color-mix(in srgb, var(--mp-bg-start) 55%, transparent)',
  border: '1px solid var(--mp-border)',
  borderRadius: 'var(--mp-radius-sm)',
  outlineOffset: 2,
};

const panel: React.CSSProperties = {
  padding: 16,
  borderRadius: 'var(--mp-radius-sm)',
  border: '1px solid var(--mp-border)',
  background: 'color-mix(in srgb, var(--mp-bg-start) 40%, transparent)',
};

const primaryButton: React.CSSProperties = {
  marginTop: 18,
  width: '100%',
  padding: '15px 18px',
  fontSize: 15.5,
  fontWeight: 700,
  fontFamily: 'inherit',
  color: 'var(--mp-primary-contrast)',
  background: 'var(--mp-primary)',
  border: 0,
  borderRadius: 'var(--mp-radius-sm)',
  cursor: 'pointer',
};

const secondaryButton: React.CSSProperties = {
  padding: '11px 15px',
  fontSize: 13.5,
  fontWeight: 600,
  fontFamily: 'inherit',
  color: 'var(--mp-text)',
  background: 'transparent',
  border: '1px solid var(--mp-border-strong)',
  borderRadius: 'var(--mp-radius-sm)',
  cursor: 'pointer',
};

const grid2: React.CSSProperties = {
  display: 'grid',
  gap: 12,
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
};
