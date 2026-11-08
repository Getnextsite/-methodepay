import type { Metadata } from 'next';
import { signOutAction } from '../(auth)/actions';

export const metadata: Metadata = { title: 'Store suspended' };

export default function SuspendedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-7">
        <h1 className="text-xl font-semibold text-white">This store is suspended</h1>
        <p className="mt-1.5 text-sm text-ink-300">
          Checkout links are not taking payments and the dashboard is read-locked. Your products,
          orders and settings are untouched and will be exactly as you left them once the suspension
          is lifted.
        </p>
        <p className="mt-4 text-sm text-ink-300">
          Email <span className="text-mint">support@methodepay.io</span> and quote your store name.
        </p>
        <form action={signOutAction} className="mt-6">
          <button type="submit" className="btn-ghost w-full">
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
