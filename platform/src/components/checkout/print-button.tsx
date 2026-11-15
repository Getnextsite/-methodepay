'use client';

/** "Download PDF": the browser's print dialog, where Save as PDF is one click. */
export function PrintButton({ label = 'Download PDF' }: { label?: string }) {
  return (
    <button type="button" className="inv-btn" onClick={() => window.print()}>
      {label}
    </button>
  );
}
