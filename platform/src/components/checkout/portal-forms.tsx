'use client';

import { useFormState, useFormStatus } from 'react-dom';
import type { ActionState } from '@/components/action-form';

type Action = (prev: ActionState, data: FormData) => Promise<ActionState>;

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="mp-btn" disabled={pending} style={{ marginTop: 4 }}>
      {pending ? 'One moment…' : children}
    </button>
  );
}

function Result({ state }: { state: ActionState }) {
  if (state?.error) return <p role="alert" className="mp-alert">{state.error}</p>;
  if (state?.message) return <p role="status" className="mp-ok">{state.message}</p>;
  return null;
}

/** Sign in with an order reference and the email it was placed with. */
export function OrderSignInForm({ store, action }: { store: string; action: Action }) {
  const [state, formAction] = useFormState(action, undefined);
  return (
    <form action={formAction} className="mp-stack" style={{ ['--mp-gap' as string]: '12px' }}>
      <input type="hidden" name="store" value={store} />
      <div>
        <label htmlFor="ref" className="mp-label">Order reference</label>
        <input id="ref" name="ref" required autoComplete="off" placeholder="MP-7F3K2Q" className="mp-input mp-input--mono mp-input--upper" />
      </div>
      <div>
        <label htmlFor="email-ref" className="mp-label">Email you ordered with</label>
        <input id="email-ref" name="email" type="email" required autoComplete="email" className="mp-input" />
      </div>
      <Result state={state} />
      <Submit>See my orders</Submit>
    </form>
  );
}

/** Email a one-time sign-in link. */
export function EmailLinkForm({ store, action }: { store: string; action: Action }) {
  const [state, formAction] = useFormState(action, undefined);
  return (
    <form action={formAction} className="mp-stack" style={{ ['--mp-gap' as string]: '12px' }}>
      <input type="hidden" name="store" value={store} />
      <div>
        <label htmlFor="email-link" className="mp-label">Your email</label>
        <input id="email-link" name="email" type="email" required autoComplete="email" className="mp-input" />
      </div>
      <Result state={state} />
      <Submit>Email me a sign-in link</Submit>
    </form>
  );
}
