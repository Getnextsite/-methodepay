'use client';

import Link from 'next/link';
import { ActionForm, SubmitButton } from '@/components/action-form';
import { Field } from '@/components/ui';
import { MethodIcon } from '@/components/checkout/method-icon';
import { RAIL_STATUS_COPY, type RailFieldSpec, type RailSpec } from '@/lib/onboarding/steps';
import { saveChatStep, saveCryptoStep, saveRailsStep, saveStoreStep } from './actions';

/**
 * The wizard forms.
 *
 * Every rail block is generated from its registry declaration, so a rail that
 * gains a field gains it here with no edit: the wizard, the rail's own
 * dashboard page and the checkout all read one source. Only the three steps
 * that touch something other than a rail — the store, the wallets table and
 * the notification channels — carry handwritten inputs.
 */

function Footer({ back, skip }: { back: string | null; skip: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-ink-600/70 pt-5">
      <div>
        {back ? (
          <Link href={`/onboarding/setup/${back}`} className="text-xs text-ink-400 hover:text-white">
            ← Back
          </Link>
        ) : null}
      </div>
      <div className="flex items-center gap-4">
        {skip ? (
          <Link href={`/onboarding/setup/${skip}`} className="text-xs text-ink-400 hover:text-white">
            I will do this later
          </Link>
        ) : null}
        <SubmitButton>Save and continue</SubmitButton>
      </div>
    </div>
  );
}

function RailField({ railKey, field }: { railKey: string; field: RailFieldSpec }) {
  const name = `${railKey}__${field.name}`;
  const value = field.value;

  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2.5 text-sm text-ink-100">
        <input type="checkbox" name={name} defaultChecked={value === true} className="h-4 w-4 accent-mint" />
        {field.label}
      </label>
    );
  }

  if (field.type === 'select') {
    return (
      <Field label={field.label} htmlFor={name} hint={field.help}>
        <select id={name} name={name} defaultValue={String(value ?? '')} className="input">
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
    );
  }

  if (field.type === 'textarea') {
    return (
      <Field label={field.label} htmlFor={name} hint={field.help}>
        <textarea id={name} name={name} rows={3} defaultValue={String(value ?? '')} className="input" />
      </Field>
    );
  }

  return (
    <Field label={field.label} htmlFor={name} hint={field.help}>
      <input
        id={name}
        name={name}
        type={field.type === 'secret' ? 'text' : field.type === 'number' ? 'number' : field.type}
        defaultValue={String(value ?? '')}
        placeholder={field.placeholder}
        autoComplete={field.secret ? 'off' : undefined}
        spellCheck={field.secret ? false : undefined}
        className={`input ${field.secret ? 'font-mono text-xs' : ''}`}
      />
    </Field>
  );
}

function RailBlock({ rail }: { rail: RailSpec }) {
  const status = RAIL_STATUS_COPY[rail.status];

  return (
    <section className="rounded-xl border border-ink-600 bg-ink-900/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2.5">
          <MethodIcon rail={rail.key} tone={rail.tone} size={22} />
          <span className="text-sm font-medium text-white">{rail.label}</span>
        </span>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>
          {status.label}
        </span>
      </div>

      <p className="mt-1.5 text-xs leading-relaxed text-ink-400">{rail.note}</p>

      <div className="mt-4 space-y-3.5">
        {rail.fields.map((field) => (
          <RailField key={field.name} railKey={rail.key} field={field} />
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- steps

export function StoreForm({
  values,
  next,
}: {
  values: { storeName: string; supportEmail: string; orderPrefix: string };
  next: string | null;
}) {
  return (
    <ActionForm action={saveStoreStep} className="space-y-5">
      <Field label="Store name" htmlFor="storeName" hint="Buyers see this at checkout and in emails.">
        <input
          id="storeName"
          name="storeName"
          required
          maxLength={120}
          defaultValue={values.storeName}
          className="input"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Support email"
          htmlFor="supportEmail"
          hint="Shown to buyers when something goes wrong."
        >
          <input
            id="supportEmail"
            name="supportEmail"
            type="email"
            defaultValue={values.supportEmail}
            className="input"
          />
        </Field>
        <Field label="Order reference prefix" htmlFor="orderPrefix" hint="Appears on every order, e.g. MP-7KQ2F1.">
          <input
            id="orderPrefix"
            name="orderPrefix"
            maxLength={8}
            defaultValue={values.orderPrefix}
            className="input font-mono text-xs uppercase"
          />
        </Field>
      </div>

      <Footer back={null} skip={next} />
    </ActionForm>
  );
}

export function CryptoForm({
  wallets,
  rail,
  back,
  next,
}: {
  wallets: { coin: string; network: string; address: string }[];
  rail: RailSpec;
  back: string | null;
  next: string | null;
}) {
  // Existing wallets, then three empty rows. Clearing an address deletes it.
  const rows = [...wallets, ...Array.from({ length: 3 }, () => ({ coin: '', network: '', address: '' }))];

  return (
    <ActionForm action={saveCryptoStep} className="space-y-5">
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="grid gap-2.5 sm:grid-cols-[7rem_8rem_1fr]">
            <input
              name={`wallet-${i}-coin`}
              list="mp-coins"
              placeholder="USDT"
              defaultValue={row.coin}
              aria-label={`Coin ${i + 1}`}
              className="input uppercase"
            />
            <input
              name={`wallet-${i}-network`}
              list="mp-networks"
              placeholder="TRC20"
              defaultValue={row.network}
              aria-label={`Network ${i + 1}`}
              className="input"
            />
            <input
              name={`wallet-${i}-address`}
              placeholder="Receive address"
              defaultValue={row.address}
              aria-label={`Address ${i + 1}`}
              className="input font-mono text-xs"
            />
          </div>
        ))}

        <datalist id="mp-coins">
          {['USDT', 'USDC', 'BTC', 'ETH', 'LTC', 'TRX', 'SOL', 'BNB'].map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <datalist id="mp-networks">
          {['TRC20', 'ERC20', 'BEP20', 'Polygon', 'Bitcoin', 'Lightning', 'Solana', 'Base', 'Arbitrum'].map(
            (n) => (
              <option key={n} value={n} />
            ),
          )}
        </datalist>
      </div>

      <p className="rounded-xl border border-ink-600 bg-ink-900/40 p-3.5 text-xs leading-relaxed text-ink-400">
        Use a wallet you control, not an exchange deposit address — exchanges read third-party
        deposits as merchant activity and freeze accounts over it. The QR code buyers scan is drawn
        from the address, so there is nothing else to upload.
      </p>

      <RailBlock rail={rail} />
      <Footer back={back} skip={next} />
    </ActionForm>
  );
}

export function ChatForm({
  values,
  rail,
  back,
  next,
}: {
  values: {
    telegramBotToken: string;
    telegramChatId: string;
    confirmWhatsapp: string;
    confirmTelegram: string;
    channels: string[];
  };
  rail: RailSpec;
  back: string | null;
  next: string | null;
}) {
  return (
    <ActionForm action={saveChatStep} className="space-y-6">
      <RailBlock rail={rail} />

      <section className="rounded-xl border border-ink-600 bg-ink-900/40 p-4">
        <p className="text-sm font-medium text-white">Where we alert you</p>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-400">
          A Telegram bot pings you the moment an order lands and when a buyer says they have paid.
          Message @BotFather to make a bot, then send it a message so it can reply to you.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Bot token" htmlFor="telegramBotToken" hint="Stored encrypted. Leave blank to keep the current one.">
            <input
              id="telegramBotToken"
              name="telegramBotToken"
              defaultValue={values.telegramBotToken}
              autoComplete="off"
              spellCheck={false}
              className="input font-mono text-xs"
            />
          </Field>
          <Field label="Chat ID" htmlFor="telegramChatId" hint="Yours, or a group the bot is in.">
            <input
              id="telegramChatId"
              name="telegramChatId"
              defaultValue={values.telegramChatId}
              className="input"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-ink-600 bg-ink-900/40 p-4">
        <p className="text-sm font-medium text-white">How buyers reach you to confirm</p>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-400">
          Shown on the order page after a manual payment, so a buyer who has sent money has an
          obvious way to tell you.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2.5">
            <label className="flex items-center gap-2.5 text-sm text-ink-100">
              <input
                type="checkbox"
                name="confirmViaWhatsapp"
                defaultChecked={values.channels.includes('whatsapp')}
                className="h-4 w-4 accent-mint"
              />
              WhatsApp
            </label>
            <input
              name="confirmWhatsapp"
              placeholder="212600000000"
              defaultValue={values.confirmWhatsapp}
              aria-label="WhatsApp number for confirmations"
              className="input"
            />
          </div>
          <div className="space-y-2.5">
            <label className="flex items-center gap-2.5 text-sm text-ink-100">
              <input
                type="checkbox"
                name="confirmViaTelegram"
                defaultChecked={values.channels.includes('telegram')}
                className="h-4 w-4 accent-mint"
              />
              Telegram
            </label>
            <input
              name="confirmTelegram"
              placeholder="yourhandle"
              defaultValue={values.confirmTelegram}
              aria-label="Telegram username for confirmations"
              className="input"
            />
          </div>
        </div>
      </section>

      <Footer back={back} skip={next} />
    </ActionForm>
  );
}

export function RailsForm({
  step,
  rails,
  back,
  next,
}: {
  step: string;
  rails: RailSpec[];
  back: string | null;
  next: string | null;
}) {
  return (
    <ActionForm action={saveRailsStep} className="space-y-5">
      <input type="hidden" name="step" value={step} />
      {rails.map((rail) => (
        <RailBlock key={rail.key} rail={rail} />
      ))}
      <Footer back={back} skip={next} />
    </ActionForm>
  );
}
