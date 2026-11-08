'use client';

import { useState } from 'react';

/**
 * The buyer telling us they have paid.
 *
 * This does not mark the order paid, and the wording never suggests it does —
 * a manual rail settles when the merchant sees the money, and promising a
 * buyer otherwise just moves the disappointment later.
 */
export function ConfirmPayment({
  nonce,
  requireReference,
  referenceLabel,
  contact,
}: {
  nonce: string;
  requireReference: boolean;
  referenceLabel: string;
  contact: { whatsapp?: string | null; telegram?: string | null; message: string } | null;
}) {
  const [reference, setReference] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (state === 'sending') return;
    if (requireReference && !reference.trim()) {
      setError(`Enter your ${referenceLabel.toLowerCase()} so the seller can find your payment.`);
      return;
    }
    setError(null);
    setState('sending');
    try {
      const res = await fetch('/api/checkout/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nonce, reference: reference.trim() }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error ?? 'Could not send that. Please try again.');
        setState('idle');
        return;
      }
      setState('done');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
      setState('idle');
    }
  }

  if (state === 'done') {
    return (
      <div
        role="status"
        style={{
          marginTop: 18,
          padding: 16,
          borderRadius: 'var(--mp-radius-sm)',
          border: '1px solid var(--mp-primary)',
          background: 'color-mix(in srgb, var(--mp-primary) 10%, transparent)',
        }}
      >
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Thanks — the seller has been told.</p>
        <p style={{ margin: '7px 0 0', fontSize: 13, lineHeight: 1.6, color: 'var(--mp-text-muted)' }}>
          They will verify the payment and activate your order. You will get an email the moment
          they do. Keep your reference in case you need to chase it.
        </p>
        {contact ? <ContactLinks contact={contact} /> : null}
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 18 }}>
      <div
        style={{
          padding: 16,
          borderRadius: 'var(--mp-radius-sm)',
          border: '1px solid var(--mp-border)',
        }}
      >
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Already paid?</p>
        <p style={{ margin: '6px 0 0', fontSize: 12.5, lineHeight: 1.6, color: 'var(--mp-text-muted)' }}>
          Tell the seller so they can verify it. Your order is activated once they confirm the money
          arrived — not before.
        </p>

        <div style={{ marginTop: 12 }}>
          <label
            htmlFor="paymentReference"
            style={{ display: 'block', marginBottom: 5, fontSize: 12.5, color: 'var(--mp-text-muted)' }}
          >
            {referenceLabel}
            {requireReference ? (
              <span aria-hidden style={{ color: 'var(--mp-primary)' }}> *</span>
            ) : (
              <span style={{ color: 'var(--mp-text-faint)' }}> (optional)</span>
            )}
          </label>
          <input
            id="paymentReference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '11px 13px',
              fontSize: 14,
              fontFamily: 'ui-monospace, monospace',
              color: 'var(--mp-text)',
              background: 'color-mix(in srgb, var(--mp-bg-start) 55%, transparent)',
              border: '1px solid var(--mp-border)',
              borderRadius: 'var(--mp-radius-sm)',
            }}
          />
        </div>

        {error ? (
          <p role="alert" style={{ margin: '9px 0 0', fontSize: 12.5, color: '#ff9c9c' }}>
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={state === 'sending'}
          style={{
            marginTop: 14,
            width: '100%',
            padding: '13px 18px',
            fontSize: 14.5,
            fontWeight: 700,
            fontFamily: 'inherit',
            color: 'var(--mp-primary-contrast)',
            background: 'var(--mp-primary)',
            border: 0,
            borderRadius: 'var(--mp-radius-sm)',
            cursor: 'pointer',
          }}
        >
          {state === 'sending' ? 'Sending…' : 'I have paid'}
        </button>

        {contact ? <ContactLinks contact={contact} /> : null}
      </div>
    </form>
  );
}

function ContactLinks({
  contact,
}: {
  contact: { whatsapp?: string | null; telegram?: string | null; message: string };
}) {
  const links: { href: string; label: string }[] = [];
  if (contact.whatsapp) {
    links.push({
      href: `https://wa.me/${contact.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(contact.message)}`,
      label: 'Message on WhatsApp',
    });
  }
  if (contact.telegram) {
    links.push({
      href: `https://t.me/${contact.telegram.replace(/^@/, '')}`,
      label: 'Message on Telegram',
    });
  }
  if (links.length === 0) return null;

  return (
    <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            padding: '9px 13px',
            borderRadius: 'var(--mp-radius-sm)',
            border: '1px solid var(--mp-border-strong)',
            color: 'var(--mp-text)',
            textDecoration: 'none',
          }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
