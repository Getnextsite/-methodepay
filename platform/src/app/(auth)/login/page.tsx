import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { signInAction } from '../actions';
import { AuthForm } from '../form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage() {
  if (await currentUser()) redirect('/dashboard');

  return (
    <div className="card p-7">
      <h1 className="text-xl font-semibold text-white">Sign in</h1>
      <p className="mt-1.5 text-sm text-ink-300">
        Your products, orders and checkout links are where you left them.
      </p>

      <AuthForm action={signInAction} submitLabel="Sign in">
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
            autoComplete="current-password"
            required
            className="input"
          />
        </div>
      </AuthForm>

      <p className="mt-6 text-sm text-ink-300">
        No account yet?{' '}
        <Link href="/signup" className="font-medium text-mint hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
