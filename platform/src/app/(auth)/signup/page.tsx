import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { signUpAction } from '../actions';
import { AuthForm } from '../form';

export const metadata: Metadata = { title: 'Create your store' };

export default async function SignupPage() {
  if (await currentUser()) redirect('/dashboard');

  return (
    <div className="card p-7">
      <h1 className="text-xl font-semibold text-white">Create your store</h1>
      <p className="mt-1.5 text-sm text-ink-300">
        Fourteen days on the trial, no card. WhatsApp, direct crypto and bank transfer work
        immediately — they need no processor approval.
      </p>

      <AuthForm action={signUpAction} submitLabel="Create my store">
        <div>
          <label className="label" htmlFor="storeName">
            Store name
          </label>
          <input
            id="storeName"
            name="storeName"
            required
            maxLength={120}
            className="input"
            placeholder="Atlas Digital"
          />
          <p className="mt-1.5 text-xs text-ink-400">
            Buyers see this on your checkout and in their receipts.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="name">
            Your name
          </label>
          <input id="name" name="name" required maxLength={120} autoComplete="name" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
            className="input"
          />
          <p className="mt-1.5 text-xs text-ink-400">At least 10 characters.</p>
        </div>
      </AuthForm>

      <p className="mt-6 text-sm text-ink-300">
        Already have a store?{' '}
        <Link href="/login" className="font-medium text-mint hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
