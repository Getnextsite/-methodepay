'use client';

import { useState } from 'react';

/**
 * A value the buyer must transfer somewhere else exactly: a wallet address, an
 * IBAN, a payment reference. Typing one of these by hand is how money goes to
 * the wrong place, so copying is one tap and confirmed visibly.
 */
export function CopyField({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied or unavailable (older browsers, some
      // in-app webviews). The value is on screen and selectable either way.
      setCopied(false);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <p
        style={{
          margin: '0 0 5px',
          fontSize: 11.5,
          fontWeight: 600,
          color: 'var(--mp-text-faint)',
        }}
      >
        {label}
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <code
          style={{
            flex: 1,
            minWidth: 0,
            overflowWrap: 'anywhere',
            padding: '11px 13px',
            fontSize: 13,
            fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit',
            background: 'color-mix(in srgb, var(--mp-bg-start) 60%, transparent)',
            border: '1px solid var(--mp-border)',
            borderRadius: 'var(--mp-radius-sm)',
          }}
        >
          {value}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${label}`}
          style={{
            flexShrink: 0,
            padding: '0 14px',
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: 'inherit',
            color: copied ? 'var(--mp-primary-contrast)' : 'var(--mp-text)',
            background: copied ? 'var(--mp-primary)' : 'transparent',
            border: '1px solid var(--mp-border-strong)',
            borderRadius: 'var(--mp-radius-sm)',
            cursor: 'pointer',
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
