'use client';

import { useState } from 'react';
import { ActionForm, SubmitButton } from '@/components/action-form';
import { addWalletsAction } from './actions';

export type CatalogCoin = {
  symbol: string;
  name: string;
  color: string;
  glyph: string;
  networks: { id: string; label: string; hint: string; format?: string; autoVerified: boolean }[];
};

/**
 * Add a coin on as many networks as the merchant wants, in one form. Every
 * network of the chosen coin gets its own address field; the ones left blank
 * are simply not offered.
 */
export function AddWalletForm({ catalog, saved }: { catalog: CatalogCoin[]; saved: Record<string, string[]> }) {
  const [symbol, setSymbol] = useState(catalog[0]?.symbol ?? '__other');
  const coin = catalog.find((c) => c.symbol === symbol) ?? null;
  const already = saved[symbol] ?? [];

  return (
    <ActionForm action={addWalletsAction} className="space-y-5">
      <fieldset>
        <legend className="label">Coin</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {catalog.map((c) => (
            <label
              key={c.symbol}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2 text-xs transition ${
                symbol === c.symbol ? 'border-mint/60 bg-mint/10 text-white' : 'border-ink-600 text-ink-200 hover:border-ink-400'
              }`}
            >
              <input
                type="radio"
                name="coin"
                value={c.symbol}
                checked={symbol === c.symbol}
                onChange={() => setSymbol(c.symbol)}
                className="sr-only"
              />
              <span
                aria-hidden
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
                style={{ background: c.color }}
              >
                {c.glyph}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{c.symbol}</span>
                {saved[c.symbol]?.length ? (
                  <span className="block text-[10px] text-mint">{saved[c.symbol].length} saved</span>
                ) : null}
              </span>
            </label>
          ))}
          <label
            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2 text-xs transition ${
              symbol === '__other' ? 'border-mint/60 bg-mint/10 text-white' : 'border-ink-600 text-ink-200 hover:border-ink-400'
            }`}
          >
            <input
              type="radio"
              name="coin"
              value="__other"
              checked={symbol === '__other'}
              onChange={() => setSymbol('__other')}
              className="sr-only"
            />
            <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink-600 text-[11px] font-bold text-white">
              +
            </span>
            <span className="font-semibold">Other</span>
          </label>
        </div>
      </fieldset>

      {coin ? (
        <fieldset className="space-y-3">
          <legend className="label">
            {coin.name} networks <span className="font-normal normal-case text-ink-400">· fill in the ones you accept</span>
          </legend>
          {coin.networks.map((n) => (
            <div key={n.id} className="rounded-xl border border-ink-600/70 bg-ink-900/40 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <label htmlFor={`address-${n.id}`} className="text-sm font-medium text-white">
                  {n.label}
                  <span className="ml-2 text-xs font-normal text-ink-400">{n.hint}</span>
                </label>
                <span className="flex gap-1.5">
                  {already.includes(n.id) ? (
                    <span className="rounded-full bg-ink-700 px-2 py-0.5 text-[10.5px] text-ink-200">Already saved</span>
                  ) : null}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
                      n.autoVerified ? 'bg-mint/10 text-mint' : 'bg-ink-700 text-ink-300'
                    }`}
                  >
                    {n.autoVerified ? 'Auto-verified' : 'Checked by hand'}
                  </span>
                </span>
              </div>
              <input
                id={`address-${n.id}`}
                name={`address:${n.id}`}
                className="input font-mono text-xs"
                spellCheck={false}
                autoComplete="off"
                placeholder={n.format ? `Format: ${n.format}` : 'Receive address'}
              />
            </div>
          ))}
        </fieldset>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="customCoin" className="label">
              Coin symbol
            </label>
            <input id="customCoin" name="customCoin" className="input uppercase" placeholder="AVAX" />
          </div>
          <div>
            <label htmlFor="customNetwork" className="label">
              Network
            </label>
            <input id="customNetwork" name="customNetwork" className="input" placeholder="Avalanche C-Chain" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="customAddress" className="label">
              Receive address
            </label>
            <input id="customAddress" name="customAddress" className="input font-mono text-xs" spellCheck={false} />
            <p className="mt-1.5 text-xs text-ink-400">
              Coins outside the list are shown to buyers but checked by hand: automatic verification cannot read them.
            </p>
          </div>
        </div>
      )}

      <p className="text-xs text-ink-400">
        Use a self-custody wallet. Exchange deposit addresses get flagged for third-party deposits and can be frozen.
      </p>
      <SubmitButton>{coin ? `Save ${coin.symbol}` : 'Save coin'}</SubmitButton>
    </ActionForm>
  );
}
