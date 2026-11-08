'use client';

import { useFormState, useFormStatus } from 'react-dom';

export type ActionState = { error?: string; message?: string } | undefined;
export type ServerAction = (prev: ActionState, data: FormData) => Promise<ActionState>;

export function SubmitButton({
  children,
  variant = 'primary',
  className = '',
  confirm,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'ghost' | 'danger';
  className?: string;
  /** Shown in a native confirm before a destructive submit. */
  confirm?: string;
}) {
  const { pending } = useFormStatus();
  const cls =
    variant === 'danger' ? 'btn-danger' : variant === 'ghost' ? 'btn-ghost' : 'btn-primary';

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${cls} ${className}`}
      onClick={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {pending ? 'Working…' : children}
    </button>
  );
}

/**
 * A form bound to a server action, with inline success and failure messages.
 *
 * Every mutating screen in the dashboard uses this so feedback is consistent
 * and announced: a merchant who presses Save deserves to know it saved,
 * whether they are reading the screen or hearing it.
 */
export function ActionForm({
  action,
  children,
  className = 'space-y-4',
  id,
}: {
  action: ServerAction;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const [state, formAction] = useFormState(action, undefined);

  return (
    <form id={id} action={formAction} className={className}>
      {children}
      {state?.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300"
        >
          {state.error}
        </p>
      ) : null}
      {state?.message ? (
        <p
          role="status"
          className="rounded-xl border border-mint/40 bg-mint/10 px-3.5 py-2.5 text-sm text-mint"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
