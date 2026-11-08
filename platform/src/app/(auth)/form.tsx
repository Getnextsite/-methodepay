'use client';

import { useFormState, useFormStatus } from 'react-dom';
import type { FormState } from './actions';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? 'Working…' : label}
    </button>
  );
}

export function AuthForm({
  action,
  submitLabel,
  children,
}: {
  action: (prev: FormState, data: FormData) => Promise<FormState>;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const [state, formAction] = useFormState(action, undefined);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {children}
      {state?.error ? (
        // role="alert" so the failure is announced, not just coloured red.
        <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
          {state.error}
        </p>
      ) : null}
      <Submit label={submitLabel} />
    </form>
  );
}
