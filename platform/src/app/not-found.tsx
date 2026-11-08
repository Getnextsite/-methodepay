import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-7 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">404</p>
        <h1 className="mt-2 text-xl font-semibold text-white">Nothing here</h1>
        <p className="mt-1.5 text-sm text-ink-300">
          The page, product or order you were looking for does not exist, or the seller has taken it
          down.
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <Link href="/lookup" className="btn-ghost">
            Find an order by reference
          </Link>
          <Link href="/dashboard" className="btn-ghost">
            Go to the dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
