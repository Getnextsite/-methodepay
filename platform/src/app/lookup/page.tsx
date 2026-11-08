import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { ActionForm, SubmitButton, type ActionState } from '@/components/action-form';

export const metadata: Metadata = { title: 'Find your order', robots: { index: false } };

async function lookupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  'use server';
  const ref = String(formData.get('ref') ?? '').trim().toUpperCase();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();

  if (!ref || !email) return { error: 'Enter both your order reference and your email.' };

  // Both must match. A reference alone is short and quotable, which is exactly
  // why it must not be enough on its own to open somebody order.
  const order = await prisma.order.findFirst({
    where: { ref, buyerEmail: email },
    select: { nonce: true },
  });

  if (!order) {
    // One message whether the reference is wrong, the email is wrong, or the
    // order does not exist — anything more is an oracle for guessing refs.
    return {
      error:
        'No order matches that reference and email. Check both against your confirmation email.',
    };
  }

  redirect(`/o/${order.nonce}`);
}

export default function LookupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-7">
        <h1 className="text-xl font-semibold text-white">Find your order</h1>
        <p className="mt-1.5 text-sm text-ink-300">
          Enter the reference from your confirmation email and the address you used. You will see
          the status, any downloads and your access details.
        </p>

        <ActionForm action={lookupAction} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="ref">
              Order reference
            </label>
            <input
              id="ref"
              name="ref"
              required
              placeholder="MP-7F3K2Q"
              autoComplete="off"
              className="input font-mono uppercase"
            />
          </div>
          <div>
            <label className="label" htmlFor="email">
              Email you used
            </label>
            <input id="email" name="email" type="email" required autoComplete="email" className="input" />
          </div>
          <SubmitButton>Find my order</SubmitButton>
        </ActionForm>
      </div>
    </main>
  );
}
