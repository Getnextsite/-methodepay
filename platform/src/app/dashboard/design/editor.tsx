'use client';

import { useState } from 'react';
import type { CheckoutDesign } from '@prisma/client';
import { ActionForm, SubmitButton } from '@/components/action-form';
import { Field } from '@/components/ui';
import { saveDesignAction } from './actions';

type Values = {
  design: CheckoutDesign;
  colorPrimary: string;
  colorBgStart: string;
  colorBgEnd: string;
  colorText: string;
  colorCardBg: string;
  logoUrl: string;
  logoMaxHeight: number;
  fontFamily: string;
  layoutWidth: number;
  cardRadius: number;
  baseFontSize: number;
  customCss: string;
  checkoutTitle: string;
  checkoutSubtitle: string;
  privacyPolicyUrl: string;
  termsUrl: string;
  showTrustBadges: boolean;
  trustBadges: string[];
  guaranteeTitle: string;
  guaranteeText: string;
  guaranteeDays: number;
  fieldVisibility: Record<string, string>;
  kycNoticeEnabled: boolean;
  kycNoticeMethods: string[];
  kycNoticeText: string;
};

const BADGES = [
  { value: 'ssl', label: 'SSL secured' },
  { value: 'encrypted', label: 'Encrypted payment' },
  { value: 'money_back', label: 'Money-back guarantee' },
  { value: 'support', label: 'Human support' },
  { value: 'no_card_stored', label: 'We never store your card' },
];

const BUYER_FIELDS = [
  { key: 'phone', label: 'Phone' },
  { key: 'country', label: 'Country' },
  { key: 'state', label: 'State / region' },
  { key: 'city', label: 'City' },
  { key: 'postalCode', label: 'Postal code' },
  { key: 'address1', label: 'Address line 1' },
  { key: 'address2', label: 'Address line 2' },
  { key: 'company', label: 'Company' },
  { key: 'note', label: 'Order note' },
];

const KYC_METHODS = [
  { value: 'onramppay', label: 'OnRamPay' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'alchemypay', label: 'Alchemy Pay' },
  { value: 'op_binance', label: 'Binance Pay' },
  { value: 'op_revolut', label: 'Revolut' },
  { value: 'finchpay_btc', label: 'FinchPay card' },
];

const FONTS = ['Inter', 'System UI', 'Roboto', 'Open Sans', 'Poppins', 'DM Sans', 'Georgia'];

export function DesignEditor({
  values,
  fullEditor,
  availableDesigns,
  allDesigns,
  designCopy,
}: {
  values: Values;
  fullEditor: boolean;
  availableDesigns: CheckoutDesign[];
  allDesigns: CheckoutDesign[];
  designCopy: Record<CheckoutDesign, { name: string; tag: string; blurb: string }>;
}) {
  const [design, setDesign] = useState(values.design);
  const [colors, setColors] = useState({
    primary: values.colorPrimary,
    bgStart: values.colorBgStart,
    bgEnd: values.colorBgEnd,
    text: values.colorText,
    card: values.colorCardBg,
  });
  const [radius, setRadius] = useState(values.cardRadius);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-start">
      <ActionForm action={saveDesignAction} className="space-y-6">
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-white">Layout</h2>
          <p className="mt-1 text-xs text-ink-400">
            Switch layout without touching a template or a line of CSS.
          </p>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {allDesigns.map((option) => {
              const locked = !availableDesigns.includes(option);
              const copy = designCopy[option];
              return (
                <label
                  key={option}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3.5 transition ${
                    design === option
                      ? 'border-mint/60 bg-mint/5'
                      : 'border-ink-600 bg-ink-900/40 hover:border-ink-500'
                  } ${locked ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <input
                    type="radio"
                    name="design"
                    value={option}
                    checked={design === option}
                    disabled={locked}
                    onChange={() => setDesign(option)}
                    className="mt-1 h-4 w-4 accent-mint"
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{copy.name}</span>
                      <span className="chip !px-2 !py-0.5 !text-[10px]">{copy.tag}</span>
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-ink-400">
                      {locked ? 'Available on a higher plan.' : copy.blurb}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="text-sm font-semibold text-white">Colours</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorInput
              name="colorPrimary"
              label="Accent"
              value={colors.primary}
              onChange={(v) => setColors((c) => ({ ...c, primary: v }))}
            />
            <ColorInput
              name="colorText"
              label="Text"
              value={colors.text}
              onChange={(v) => setColors((c) => ({ ...c, text: v }))}
            />
            <ColorInput
              name="colorBgStart"
              label="Background from"
              value={colors.bgStart}
              onChange={(v) => setColors((c) => ({ ...c, bgStart: v }))}
            />
            <ColorInput
              name="colorBgEnd"
              label="Background to"
              value={colors.bgEnd}
              onChange={(v) => setColors((c) => ({ ...c, bgEnd: v }))}
            />
            <ColorInput
              name="colorCardBg"
              label="Card"
              value={colors.card}
              onChange={(v) => setColors((c) => ({ ...c, card: v }))}
            />
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="text-sm font-semibold text-white">Copy</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Checkout headline" htmlFor="checkoutTitle">
              <input
                id="checkoutTitle"
                name="checkoutTitle"
                defaultValue={values.checkoutTitle}
                className="input"
                placeholder="Complete your order"
              />
            </Field>
            <Field label="Sub-headline" htmlFor="checkoutSubtitle">
              <input
                id="checkoutSubtitle"
                name="checkoutSubtitle"
                defaultValue={values.checkoutSubtitle}
                className="input"
              />
            </Field>
            <Field label="Privacy policy URL" htmlFor="privacyPolicyUrl">
              <input
                id="privacyPolicyUrl"
                name="privacyPolicyUrl"
                type="url"
                defaultValue={values.privacyPolicyUrl}
                className="input"
              />
            </Field>
            <Field label="Terms URL" htmlFor="termsUrl">
              <input id="termsUrl" name="termsUrl" type="url" defaultValue={values.termsUrl} className="input" />
            </Field>
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="text-sm font-semibold text-white">Trust block</h2>
          <label className="flex items-center gap-2.5 text-sm text-ink-100">
            <input
              type="checkbox"
              name="showTrustBadges"
              defaultChecked={values.showTrustBadges}
              className="h-4 w-4 accent-mint"
            />
            Show trust badges under the pay button
          </label>
          <fieldset>
            <legend className="label">Badges</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {BADGES.map((badge) => (
                <label key={badge.value} className="flex items-center gap-2.5 text-sm text-ink-200">
                  <input
                    type="checkbox"
                    name="trustBadges"
                    value={badge.value}
                    defaultChecked={values.trustBadges.includes(badge.value)}
                    className="h-4 w-4 accent-mint"
                  />
                  {badge.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Field label="Guarantee headline" htmlFor="guaranteeTitle">
              <input
                id="guaranteeTitle"
                name="guaranteeTitle"
                defaultValue={values.guaranteeTitle}
                className="input"
              />
            </Field>
            <Field label="Guarantee days" htmlFor="guaranteeDays">
              <input
                id="guaranteeDays"
                name="guaranteeDays"
                type="number"
                min={0}
                max={365}
                defaultValue={values.guaranteeDays}
                className="input"
              />
            </Field>
          </div>
          <Field label="Guarantee wording" htmlFor="guaranteeText">
            <textarea
              id="guaranteeText"
              name="guaranteeText"
              rows={3}
              defaultValue={values.guaranteeText}
              className="input"
            />
          </Field>
        </section>

        <section className="card space-y-4 p-5">
          <div>
            <h2 className="text-sm font-semibold text-white">Buyer fields</h2>
            <p className="mt-1 text-xs text-ink-400">
              Every extra required field costs you conversions. Ask for what you will actually use.
              Physical products collect an address regardless.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {BUYER_FIELDS.map((field) => (
              <Field key={field.key} label={field.label} htmlFor={`field_${field.key}`}>
                <select
                  id={`field_${field.key}`}
                  name={`field_${field.key}`}
                  defaultValue={values.fieldVisibility[field.key] ?? 'hidden'}
                  className="input !py-2 !text-xs"
                >
                  <option value="hidden">Hidden</option>
                  <option value="optional">Optional</option>
                  <option value="required">Required</option>
                </select>
              </Field>
            ))}
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <div>
            <h2 className="text-sm font-semibold text-white">Identity-check notice</h2>
            <p className="mt-1 text-xs text-ink-400">
              Telling buyers up front that an on-ramp may ask for ID cuts abandonment at the KYC
              step, and stops the &ldquo;why does it want my passport?&rdquo; support messages.
            </p>
          </div>
          <label className="flex items-center gap-2.5 text-sm text-ink-100">
            <input
              type="checkbox"
              name="kycNoticeEnabled"
              defaultChecked={values.kycNoticeEnabled}
              className="h-4 w-4 accent-mint"
            />
            Show the notice
          </label>
          <fieldset>
            <legend className="label">On these methods</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {KYC_METHODS.map((method) => (
                <label key={method.value} className="flex items-center gap-2.5 text-sm text-ink-200">
                  <input
                    type="checkbox"
                    name="kycNoticeMethods"
                    value={method.value}
                    defaultChecked={values.kycNoticeMethods.includes(method.value)}
                    className="h-4 w-4 accent-mint"
                  />
                  {method.label}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Notice text" htmlFor="kycNoticeText">
            <textarea
              id="kycNoticeText"
              name="kycNoticeText"
              rows={4}
              defaultValue={values.kycNoticeText}
              className="input"
            />
          </Field>
        </section>

        {fullEditor ? (
          <section className="card space-y-4 p-5">
            <h2 className="text-sm font-semibold text-white">Brand and layout</h2>
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <Field label="Logo URL" htmlFor="logoUrl">
                <input id="logoUrl" name="logoUrl" type="url" defaultValue={values.logoUrl} className="input" />
              </Field>
              <Field label="Logo height (px)" htmlFor="logoMaxHeight">
                <input
                  id="logoMaxHeight"
                  name="logoMaxHeight"
                  type="number"
                  min={16}
                  max={160}
                  defaultValue={values.logoMaxHeight}
                  className="input"
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Font" htmlFor="fontFamily">
                <select id="fontFamily" name="fontFamily" defaultValue={values.fontFamily} className="input">
                  {FONTS.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Base font size (px)" htmlFor="baseFontSize">
                <input
                  id="baseFontSize"
                  name="baseFontSize"
                  type="number"
                  min={13}
                  max={20}
                  defaultValue={values.baseFontSize}
                  className="input"
                />
              </Field>
              <Field label="Content width (px)" htmlFor="layoutWidth">
                <input
                  id="layoutWidth"
                  name="layoutWidth"
                  type="number"
                  min={640}
                  max={1440}
                  step={20}
                  defaultValue={values.layoutWidth}
                  className="input"
                />
              </Field>
              <Field label="Corner radius (px)" htmlFor="cardRadius">
                <input
                  id="cardRadius"
                  name="cardRadius"
                  type="number"
                  min={0}
                  max={40}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="input"
                />
              </Field>
            </div>
            <Field
              label="Custom CSS"
              htmlFor="customCss"
              hint="Injected into the checkout page. Scoped to the checkout only."
            >
              <textarea
                id="customCss"
                name="customCss"
                rows={5}
                defaultValue={values.customCss}
                className="input font-mono text-xs"
                spellCheck={false}
              />
            </Field>
          </section>
        ) : null}

        <div className="flex justify-end">
          <SubmitButton>Save design</SubmitButton>
        </div>
      </ActionForm>

      <aside className="lg:sticky lg:top-9">
        <p className="label">Live preview</p>
        <Preview
          colors={colors}
          radius={radius}
          design={design}
          designName={designCopy[design].name}
        />
        <p className="mt-3 text-xs text-ink-400">
          A sketch of the colour and shape choices. Open a product checkout for the real thing.
        </p>
      </aside>
    </div>
  );
}

function ColorInput({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input font-mono text-xs"
          aria-describedby={`${name}-swatch`}
        />
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} colour picker`}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-ink-600 bg-transparent"
        />
      </div>
    </div>
  );
}

/**
 * A deliberately simplified preview.
 *
 * It shows what the merchant is changing right now — colour, contrast, corner
 * radius, where the eye lands — without pretending to be a pixel-accurate copy
 * of six layouts. A preview that drifts from reality is worse than one that is
 * honestly a sketch, so the real checkout is one click away.
 */
function Preview({
  colors,
  radius,
  design,
  designName,
}: {
  colors: { primary: string; bgStart: string; bgEnd: string; text: string; card: string };
  radius: number;
  design: CheckoutDesign;
  designName: string;
}) {
  const twoColumn = design === 'CLASSIC' || design === 'STOREFRONT';
  const heroTop = design === 'HERO';

  return (
    <div
      className="overflow-hidden border border-ink-600"
      style={{
        borderRadius: radius + 6,
        background: `linear-gradient(160deg, ${colors.bgStart}, ${colors.bgEnd})`,
        color: colors.text,
      }}
    >
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded" style={{ background: colors.primary }} />
            <div className="h-2 w-16 rounded-full" style={{ background: colors.text, opacity: 0.5 }} />
          </div>
          <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase" style={{ background: colors.primary, color: colors.bgStart }}>
            {designName}
          </span>
        </div>

        {heroTop ? (
          <div className="mb-3">
            <div className="mb-1.5 h-3 w-4/5 rounded-full" style={{ background: colors.text, opacity: 0.8 }} />
            <div className="h-2 w-3/5 rounded-full" style={{ background: colors.text, opacity: 0.35 }} />
          </div>
        ) : null}

        <div className={twoColumn ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
          <div className="space-y-2 p-3" style={{ background: colors.card, borderRadius: radius }}>
            <div className="h-2 w-2/3 rounded-full" style={{ background: colors.text, opacity: 0.45 }} />
            <div className="h-5 w-1/2 rounded" style={{ background: colors.primary, opacity: 0.85 }} />
            <div className="h-2 w-full rounded-full" style={{ background: colors.text, opacity: 0.18 }} />
            <div className="h-2 w-5/6 rounded-full" style={{ background: colors.text, opacity: 0.18 }} />
          </div>

          <div className="space-y-2 p-3" style={{ background: colors.card, borderRadius: radius }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-2"
                style={{
                  borderRadius: Math.max(4, radius - 6),
                  border: `1px solid ${i === 0 ? colors.primary : 'rgba(255,255,255,.12)'}`,
                }}
              >
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: i === 0 ? colors.primary : 'rgba(255,255,255,.25)' }}
                />
                <div className="h-2 flex-1 rounded-full" style={{ background: colors.text, opacity: 0.3 }} />
              </div>
            ))}
            <div
              className="mt-1 grid h-8 place-items-center text-[10px] font-bold"
              style={{ background: colors.primary, color: colors.bgStart, borderRadius: Math.max(4, radius - 4) }}
            >
              PAY NOW
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
