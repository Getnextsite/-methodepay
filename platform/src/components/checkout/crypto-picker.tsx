'use client';

import { useEffect, useMemo, useState } from 'react';
import { CopyField } from './copy-field';

export type PickerNetwork = {
  walletId: string;
  id: string;
  label: string;
  hint: string;
  address: string;
  qr: string | null;
  /** Coin amount to send, already rounded up; null when no live price. */
  amount: string | null;
  autoVerified: boolean;
};

export type PickerCoin = {
  symbol: string;
  name: string;
  color: string;
  glyph: string;
  networks: PickerNetwork[];
};

/**
 * Pay with crypto, one decision at a time: coin, then network, then a single
 * payment card with the QR, the exact amount and the address. Showing every
 * wallet at once (the old screen) made buyers scroll past five QR codes and
 * guess which one was theirs, which is how funds end up on the wrong chain.
 */
export function CryptoPicker({
  coins,
  fiatAmount,
  quoteExpiresAt,
  instructionsHtml,
}: {
  coins: PickerCoin[];
  fiatAmount: string;
  quoteExpiresAt: number | null;
  instructionsHtml: string | null;
}) {
  const [coinIndex, setCoinIndex] = useState(0);
  const [netIndex, setNetIndex] = useState(0);
  const coin = coins[coinIndex] ?? coins[0];
  const net = coin.networks[netIndex] ?? coin.networks[0];

  function pickCoin(i: number) {
    setCoinIndex(i);
    setNetIndex(0);
  }

  // Arrow keys move between tabs, as a tab list should.
  function onTabKey(event: React.KeyboardEvent, count: number, current: number, select: (i: number) => void, group: string) {
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (current + delta + count) % count;
    select(next);
    document.getElementById(`${group}-${next}`)?.focus();
  }

  const remaining = useCountdown(quoteExpiresAt);
  const expired = remaining !== null && remaining <= 0;

  return (
    <div className="mp-crypto">
      {/* ------------------------------------------------ 1. coin */}
      <div className="mp-crypto-step">
        <p className="mp-crypto-h">
          <span className="mp-crypto-n" aria-hidden>
            1
          </span>
          Choose a coin
        </p>
        <div className="mp-coins" role="tablist" aria-label="Coin">
          {coins.map((c, i) => (
            <button
              key={c.symbol}
              id={`coin-${i}`}
              type="button"
              role="tab"
              aria-selected={i === coinIndex}
              tabIndex={i === coinIndex ? 0 : -1}
              className="mp-coin"
              onClick={() => pickCoin(i)}
              onKeyDown={(e) => onTabKey(e, coins.length, coinIndex, pickCoin, 'coin')}
            >
              <span className="mp-coin-badge" style={{ background: c.color }} aria-hidden>
                {c.glyph}
              </span>
              <span className="mp-coin-text">
                <strong>{c.symbol}</strong>
                <span>{c.name}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------ 2. network */}
      <div className="mp-crypto-step">
        <p className="mp-crypto-h">
          <span className="mp-crypto-n" aria-hidden>
            2
          </span>
          {coin.networks.length > 1 ? 'Choose the network' : 'Network'}
        </p>
        {coin.networks.length > 1 ? (
          <div className="mp-nets" role="tablist" aria-label={`${coin.symbol} network`}>
            {coin.networks.map((n, i) => (
              <button
                key={n.walletId}
                id={`net-${i}`}
                type="button"
                role="tab"
                aria-selected={i === netIndex}
                tabIndex={i === netIndex ? 0 : -1}
                className="mp-net"
                onClick={() => setNetIndex(i)}
                onKeyDown={(e) => onTabKey(e, coin.networks.length, netIndex, setNetIndex, 'net')}
              >
                <strong>{n.label}</strong>
                <span>{n.hint}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mp-net mp-net--static">
            <strong>{net.label}</strong>
            <span>{net.hint}</span>
          </div>
        )}
        <p className="mp-fine" style={{ marginTop: 8 }}>
          Pick the same network in the wallet or exchange you send from.
        </p>
      </div>

      {/* ------------------------------------------------ 3. pay */}
      <div className="mp-crypto-step" role="tabpanel" aria-label={`Pay with ${coin.symbol} on ${net.label}`}>
        <p className="mp-crypto-h">
          <span className="mp-crypto-n" aria-hidden>
            3
          </span>
          Send the payment
        </p>

        <div className="mp-paybox">
          <div className="mp-paybox-qr">
            {net.qr ? (
              // eslint-disable-next-line @next/next/no-img-element -- generated data URL
              <img src={net.qr} alt={`QR code of the ${coin.symbol} address on ${net.label}`} width={168} height={168} />
            ) : (
              <div className="mp-paybox-noqr">No QR</div>
            )}
            <span className="mp-fine">Scan with your wallet app</span>
          </div>

          <div className="mp-paybox-info">
            <p className="mp-eyebrow">Amount to send</p>
            {net.amount && !expired ? (
              <>
                <p className="mp-paybox-amount">
                  {net.amount} <span>{coin.symbol}</span>
                </p>
                <p className="mp-fine">
                  ≈ {fiatAmount}
                  {remaining !== null ? (
                    <>
                      {' '}
                      · rate held for <strong className="mp-tabular">{formatClock(remaining)}</strong>
                    </>
                  ) : null}
                </p>
                <CopyField label={`Amount in ${coin.symbol}`} value={net.amount} />
              </>
            ) : net.amount && expired ? (
              <>
                <p className="mp-paybox-amount mp-paybox-amount--muted">
                  {fiatAmount} <span>in {coin.symbol}</span>
                </p>
                <p className="mp-fine">
                  The rate has expired.{' '}
                  <button type="button" className="mp-linkbtn" onClick={() => window.location.reload()}>
                    Get a fresh rate
                  </button>
                </p>
              </>
            ) : (
              <>
                <p className="mp-paybox-amount">
                  {fiatAmount} <span>worth of {coin.symbol}</span>
                </p>
                <p className="mp-fine">Use the rate shown by your wallet or exchange when you send.</p>
              </>
            )}

            <CopyField label={`${coin.symbol} address · ${net.label}`} value={net.address} />

            <p className={`mp-verify ${net.autoVerified ? 'mp-verify--auto' : ''}`}>
              {net.autoVerified
                ? 'Confirmed automatically on the blockchain once you submit the transaction ID.'
                : 'The seller checks this payment by hand once you submit the transaction ID.'}
            </p>
          </div>
        </div>

        <div className="mp-warn" role="note">
          <strong>
            Send only {coin.symbol} on {net.label} to this address.
          </strong>{' '}
          Another coin or another network cannot be recovered, by the seller or by anyone else.
        </div>
      </div>

      {/* ------------------------------------------------ help */}
      <div className="mp-acc">
        <details>
          <summary>How to pay, step by step</summary>
          <ol className="mp-acc-steps">
            <li>Open your wallet or exchange and choose Send or Withdraw.</li>
            <li>
              Pick <strong>{coin.symbol}</strong> and the <strong>{net.label}</strong> network.
            </li>
            <li>Scan the QR code or paste the address. Check the first and last characters match.</li>
            <li>
              Enter{' '}
              {net.amount ? (
                <>
                  <strong>
                    {net.amount} {coin.symbol}
                  </strong>
                </>
              ) : (
                <>the {coin.symbol} amount worth {fiatAmount}</>
              )}{' '}
              and send.
            </li>
            <li>Copy the transaction ID (TXID or hash) and paste it below.</li>
          </ol>
        </details>
        <details>
          <summary>Paying from an exchange (Binance, Coinbase, Bybit…)</summary>
          <div className="mp-acc-body">
            <p>
              Exchanges take a withdrawal fee from the amount you enter. Add the fee on top so the full amount arrives;
              a short payment cannot be confirmed automatically.
            </p>
            <p>
              The transaction ID is in your withdrawal history, usually under <em>TxID</em> or <em>Hash</em>. It can
              take a few minutes to appear.
            </p>
          </div>
        </details>
        {instructionsHtml ? (
          <details>
            <summary>Notes from the seller</summary>
            <div className="mp-acc-body" dangerouslySetInnerHTML={{ __html: instructionsHtml }} />
          </details>
        ) : null}
      </div>
    </div>
  );
}

function useCountdown(until: number | null): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (until === null) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [until]);
  return useMemo(() => (until === null || now === null ? null : Math.max(0, Math.floor((until - now) / 1000))), [until, now]);
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
