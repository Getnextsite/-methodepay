'use client';

import { useState } from 'react';

type Channel = 'whatsapp' | 'email' | 'telegram';

/**
 * The buyer telling the seller they have paid.
 *
 * The merchant chooses which of these appear: a WhatsApp button (with a QR
 * code for buyers on a computer who would rather continue on their phone), an
 * email button, and a transaction-ID form. Every route carries the order
 * reference, so the seller can match the message to the order.
 *
 * None of this marks the order paid, and the wording never suggests it does —
 * a manual rail settles when the merchant sees the money, and promising a
 * buyer otherwise just moves the disappointment later.
 */
export function ConfirmPayment({
  nonce,
  orderRef,
  txid,
  whatsapp,
  email,
  telegramUrl,
}: {
  nonce: string;
  orderRef: string;
  /** The transaction-ID form, or null when the merchant switched it off. */
  txid: { required: boolean; label: string } | null;
  /** Prefilled wa.me link and a QR of that same link. */
  whatsapp: { url: string; qr: string | null } | null;
  /** Prefilled mailto link. */
  email: { url: string } | null;
  telegramUrl?: string | null;
}) {
  const [reference, setReference] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [via, setVia] = useState<Channel | 'txid' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chain, setChain] = useState<{ status: string; message: string; paid: boolean } | null>(null);

  /**
   * Tell the seller the buyer has started confirming on a channel. The link
   * itself opens normally; this only moves the order to "awaiting
   * verification" so it shows up in the seller's queue. Best-effort.
   */
  function notifyChannel(channel: Channel) {
    setVia(channel);
    try {
      void fetch('/api/checkout/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nonce, channel }),
        keepalive: true,
      });
    } catch {
      // The message the buyer is about to send carries the reference anyway.
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!txid || state === 'sending') return;
    if (txid.required && !reference.trim()) {
      setError(`Enter your ${txid.label.toLowerCase()} so the seller can find your payment.`);
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
      const json = (await res.json().catch(() => ({}))) as {
        chain?: { status: string; message: string };
        paid?: boolean;
      };
      if (json.chain) setChain({ ...json.chain, paid: json.paid === true });
      setVia('txid');
      setState('done');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
      setState('idle');
    }
  }

  const hasMessaging = Boolean(whatsapp || email || telegramUrl);

  return (
    <div className="mp-confirm">
      <p className="mp-confirm-title">Already paid? Confirm it with the seller</p>
      <p className="mp-confirm-sub">
        Send your order reference <strong className="mp-confirm-ref">{orderRef}</strong> so they can
        verify the payment. Your order is activated once they confirm the money arrived.
      </p>

      {hasMessaging ? (
        <div className={`mp-confirm-channels${whatsapp?.qr ? ' mp-confirm-channels--qr' : ''}`}>
          <div className="mp-confirm-buttons">
            {whatsapp ? (
              <a
                className="mp-confirm-btn mp-confirm-btn--wa"
                href={whatsapp.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => notifyChannel('whatsapp')}
              >
                <WhatsAppGlyph />
                Confirm on WhatsApp
              </a>
            ) : null}
            {email ? (
              <a
                className="mp-confirm-btn"
                href={email.url}
                onClick={() => notifyChannel('email')}
              >
                <MailGlyph />
                Confirm by email
              </a>
            ) : null}
            {telegramUrl ? (
              <a
                className="mp-confirm-btn"
                href={telegramUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => notifyChannel('telegram')}
              >
                Message on Telegram
              </a>
            ) : null}
            <p className="mp-fine">Your message is prefilled with the order reference.</p>
          </div>

          {whatsapp?.qr ? (
            <div className="mp-confirm-qr">
              {/* eslint-disable-next-line @next/next/no-img-element -- inline data URL */}
              <img
                src={whatsapp.qr}
                alt="QR code: scan to open WhatsApp on your phone with your order reference"
                width={132}
                height={132}
              />
              <span>Scan to continue on your phone</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {via && via !== 'txid' ? (
        <p role="status" className="mp-ok" style={{ marginTop: 12 }}>
          Opened {via === 'whatsapp' ? 'WhatsApp' : via === 'email' ? 'your email app' : 'Telegram'}.
          Send the prefilled message and the seller will verify your payment.
        </p>
      ) : null}

      {txid ? (
        state === 'done' ? (
          <div role="status" className="mp-confirm-done">
            {chain?.paid ? (
              <>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Payment confirmed on the blockchain.</p>
                <p className="mp-note" style={{ marginTop: 6 }}>{chain.message}</p>
                <a href={`/o/${nonce}`} className="mp-btn" style={{ marginTop: 12, display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                  See your order
                </a>
              </>
            ) : (
              <>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Thanks — the seller has been told.</p>
                <p className="mp-note" style={{ marginTop: 6 }}>
                  {chain && (chain.status === 'pending' || chain.status === 'verified')
                    ? `${chain.message} Your order is activated automatically once it is confirmed.`
                    : 'They will verify the payment and activate your order. You will get an email the moment they do. Keep your reference in case you need to chase it.'}
                </p>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="mp-confirm-form">
            {hasMessaging ? <p className="mp-confirm-or">or send the payment proof here</p> : null}
            <label htmlFor="paymentReference" className="mp-label">
              {txid.label}
              {txid.required ? (
                <span aria-hidden className="mp-req">
                  {' '}
                  *
                </span>
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
              className="mp-input mp-input--mono"
            />
            {error ? (
              <p role="alert" className="mp-alert" style={{ marginTop: 9 }}>
                {error}
              </p>
            ) : null}
            <button type="submit" disabled={state === 'sending'} className="mp-btn" style={{ marginTop: 12 }}>
              {state === 'sending' ? 'Sending…' : 'I have paid'}
            </button>
          </form>
        )
      ) : null}
    </div>
  );
}

function WhatsAppGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z" />
      <path d="M16.6 14.3c-.25-.13-1.47-.72-1.7-.8-.23-.09-.4-.13-.56.12-.17.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.13-.14.17-.25.25-.41.09-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.44.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.02 2.57.12.16 1.75 2.67 4.23 3.75.59.25 1.05.4 1.41.52.6.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.1-.23-.16-.48-.29z" />
    </svg>
  );
}

function MailGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m4 8 7.1 4.6a2 2 0 0 0 2.2 0L20 8" />
    </svg>
  );
}
