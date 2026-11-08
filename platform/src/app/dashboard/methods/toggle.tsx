'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { toggleMethodAction } from './actions';

function Switch({ enabled, disabled }: { enabled: boolean; disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      role="switch"
      aria-checked={enabled}
      aria-label={enabled ? 'Switch this method off' : 'Switch this method on'}
      disabled={disabled || pending}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition disabled:opacity-40 ${
        enabled ? 'border-mint/60 bg-mint/30' : 'border-ink-500 bg-ink-700'
      }`}
    >
      <span
        aria-hidden
        className={`absolute top-0.5 h-4.5 w-4.5 rounded-full transition-all ${
          enabled ? 'left-[22px] bg-mint' : 'left-0.5 bg-ink-400'
        }`}
        style={{ height: 18, width: 18 }}
      />
    </button>
  );
}

export function ToggleMethod({
  methodKey,
  enabled,
  disabled,
}: {
  methodKey: string;
  enabled: boolean;
  disabled: boolean;
}) {
  const [state, formAction] = useFormState(toggleMethodAction, undefined);

  return (
    <div className="shrink-0 text-right">
      <form action={formAction}>
        <input type="hidden" name="key" value={methodKey} />
        <input type="hidden" name="enable" value={enabled ? '0' : '1'} />
        <Switch enabled={enabled} disabled={disabled} />
      </form>
      {state?.error ? (
        <p role="alert" className="mt-1 max-w-[180px] text-[11px] leading-snug text-red-300">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
