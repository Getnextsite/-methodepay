import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      {/* Decorative only — hidden from assistive tech. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-mint/10 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-52 right-0 h-[420px] w-[620px] rounded-full bg-violet/10 blur-[120px]"
      />

      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-mint text-base font-bold text-[#06240f]">
            M
          </span>
          <span className="text-lg font-semibold tracking-tight text-white">MethodePay</span>
        </Link>
        {children}
      </div>
    </main>
  );
}
