'use client';

import { ActionForm, SubmitButton } from '@/components/action-form';
import { Field } from '@/components/ui';
import type { ConfigField, MethodConfig } from '@/lib/gateway/types';
import { saveMethodAction } from '../actions';

/**
 * One form, driven entirely by the rail declaration in the gateway registry.
 *
 * Adding a payment method anywhere in the platform means adding it to that
 * registry — no new screen, no new validator, no chance of the dashboard and
 * the checkout disagreeing about what a field is called.
 */
export function MethodConfigForm({
  methodKey,
  definition,
  enabled,
  canEnable,
  label,
  description,
  iconUrl,
  values,
}: {
  methodKey: string;
  definition: { fields: ConfigField[]; defaultLabel: string; defaultDescription: string };
  enabled: boolean;
  canEnable: boolean;
  label: string;
  description: string;
  iconUrl: string;
  values: MethodConfig;
}) {
  // `label` is handled by the dedicated input below, not twice.
  const fields = definition.fields.filter((f) => f.name !== 'label' && f.name !== 'description');

  return (
    <ActionForm action={saveMethodAction} className="space-y-5">
      <input type="hidden" name="key" value={methodKey} />

      <label className="flex items-start gap-2.5 rounded-xl border border-ink-600 bg-ink-900/50 p-3.5 text-sm">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={enabled}
          disabled={!canEnable}
          className="mt-0.5 h-4 w-4 accent-mint"
        />
        <span>
          <span className="block font-medium text-white">Available at checkout</span>
          <span className="block text-xs text-ink-400">
            {canEnable
              ? 'Buyers see it as soon as the settings below are complete.'
              : 'Your plan does not include this method yet.'}
          </span>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Button label" htmlFor="label" hint={`Default: ${definition.defaultLabel}`}>
          <input id="label" name="label" defaultValue={label} className="input" />
        </Field>
        <Field label="Icon URL" htmlFor="iconUrl" hint="Optional. Replaces the built-in mark.">
          <input id="iconUrl" name="iconUrl" type="url" defaultValue={iconUrl} className="input" />
        </Field>
      </div>

      <Field
        label="Description shown to buyers"
        htmlFor="description"
        hint={definition.defaultDescription}
      >
        <textarea id="description" name="description" rows={2} defaultValue={description} className="input" />
      </Field>

      {fields.length > 0 ? (
        <div className="space-y-4 border-t border-ink-600/70 pt-5">
          {fields.map((field) => {
            const value = values[field.name];

            if (field.type === 'checkbox') {
              return (
                <label key={field.name} className="flex items-center gap-2.5 text-sm text-ink-100">
                  <input
                    type="checkbox"
                    name={field.name}
                    defaultChecked={value === true}
                    className="h-4 w-4 accent-mint"
                  />
                  {field.label}
                </label>
              );
            }

            if (field.type === 'select') {
              return (
                <Field key={field.name} label={field.label} htmlFor={field.name} hint={field.help}>
                  <select
                    id={field.name}
                    name={field.name}
                    defaultValue={String(value ?? '')}
                    className="input"
                  >
                    {(field.options ?? []).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              );
            }

            if (field.type === 'textarea') {
              return (
                <Field key={field.name} label={field.label} htmlFor={field.name} hint={field.help}>
                  <textarea
                    id={field.name}
                    name={field.name}
                    rows={4}
                    defaultValue={String(value ?? '')}
                    placeholder={field.placeholder}
                    className="input"
                  />
                </Field>
              );
            }

            const isSecret = field.type === 'secret' || field.secret;
            return (
              <Field
                key={field.name}
                label={field.label}
                htmlFor={field.name}
                hint={
                  isSecret
                    ? value
                      ? `Stored and encrypted (${String(value)}). Leave blank to keep it.`
                      : (field.help ?? 'Encrypted at rest. Shown masked once saved.')
                    : field.help
                }
              >
                <input
                  id={field.name}
                  name={field.name}
                  type={field.type === 'url' ? 'url' : field.type === 'number' ? 'number' : 'text'}
                  // A password input would hide a value the merchant pasted and
                  // wants to proofread; the mask already protects the stored one.
                  defaultValue={isSecret ? '' : String(value ?? '')}
                  placeholder={isSecret && value ? String(value) : field.placeholder}
                  required={field.required && !isSecret ? true : undefined}
                  autoComplete={isSecret ? 'off' : undefined}
                  spellCheck={isSecret ? false : undefined}
                  className="input font-mono text-xs sm:text-sm"
                />
              </Field>
            );
          })}
        </div>
      ) : null}

      <div className="flex justify-end border-t border-ink-600/70 pt-5">
        <SubmitButton>Save method</SubmitButton>
      </div>
    </ActionForm>
  );
}
