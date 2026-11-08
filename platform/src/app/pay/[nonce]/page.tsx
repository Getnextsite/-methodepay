import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db';
import { loadMerchantContext } from '@/lib/gateway/context';
import { readConfig } from '@/lib/gateway/config';
import { methodDefinition } from '@/lib/gateway/registry';
import { initiateAlchemyPay, finchpayWidgetUrl } from '@/lib/gateway/providers/onramp';
import { fillPlaceholders } from '@/lib/gateway/initiate';
import { formatMoney, fromCents } from '@/lib/money';
import { CheckoutShell, Card, MerchantHeader, PolicyFooter } from '@/components/checkout/shell';
import { CopyField } from '@/components/checkout/copy-field';
import { ConfirmPayment } from '@/components/checkout/confirm';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Complete your payment', robots: { index: false } };

export default async function PayPage({ params }: { params: { nonce: string } }) {
  const order = await prisma.order.findUnique({
    where: { nonce: params.nonce },
    include: { product: true },
  });
  if (!order) notFound();

  // A settled order has nothing left to do here.
  if (order.status === 'PAID' || order.status === 'REFUNDED') redirect(`/o/${order.nonce}`);

  const ctx = await loadMerchantContext(order.accountId);
  const storeName = ctx.notifications.storeName || ctx.account.name;
  const methodKey = order.paymentMethod ?? '';
  const def = methodDefinition(methodKey);
  const row = ctx.methods.find((m) => m.key === methodKey) ?? null;
  const config = readConfig(row, methodKey);
  const manual =
    methodKey.startsWith('manual_')
      ? ctx.manualMethods.find((m) => m.slot === Number(methodKey.slice(7))) ?? null
      : null;

  const label = manual?.name || row?.label?.trim() || def?.defaultLabel || 'Payment';
  const amount = formatMoney(order.amountCents, order.currency);

  const confirmMessage = fillPlaceholders(
    ctx.notifications.confirmMessage ??
      'Hi, I have paid. My order reference is {order_ref} — {amount} {currency}. Please verify and activate it.',
    order,
    order.product,
  );
  const contact =
    ctx.notifications.confirmWhatsapp || ctx.notifications.confirmTelegram
      ? {
          whatsapp: ctx.notifications.confirmWhatsapp,
          telegram: ctx.notifications.confirmTelegram,
          message: confirmMessage,
        }
      : null;

  return (
    <CheckoutShell profile={ctx.profile}>
      <MerchantHeader profile={ctx.profile} storeName={storeName} />

      <Card>
        <p style={caps}>Order {order.ref}</p>
        <h1 style={{ margin: '8px 0 0', fontSize: 21, letterSpacing: '-0.015em' }}>
          Pay {amount} with {label}
        </h1>
        <p style={{ margin: '7px 0 0', fontSize: 13.5, color: 'var(--mp-text-muted)' }}>
          {order.product.name}
        </p>

        <div
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: '1px solid var(--mp-border)',
          }}
        >
          <Instructions
            methodKey={methodKey}
            config={config}
            order={order}
            manual={manual}
            wallets={ctx.wallets}
            origin={env.checkoutUrl}
            ctx={ctx}
          />
        </div>

        <CopyField label="Your order reference" value={order.ref} />

        <ConfirmPayment
          nonce={order.nonce}
          requireReference={manual ? manual.requireReference : requiresReference(methodKey)}
          referenceLabel={referenceLabel(methodKey)}
          contact={contact}
        />
      </Card>

      <p style={{ margin: '16px 0 0', fontSize: 12, textAlign: 'center', color: 'var(--mp-text-faint)' }}>
        Keep this page. You can return to it any time at{' '}
        <span style={{ color: 'var(--mp-text-muted)' }}>{env.checkoutUrl}/pay/{order.nonce}</span>
      </p>

      <PolicyFooter
        profile={ctx.profile}
        storeName={storeName}
        supportEmail={ctx.notifications.supportEmail}
      />
    </CheckoutShell>
  );
}

// ---------------------------------------------------------------- per rail

type InstructionProps = {
  methodKey: string;
  config: Record<string, string | number | boolean | undefined>;
  order: { amountCents: number; currency: string; ref: string; nonce: string; giftCardCodeEnc: string | null };
  manual: { name: string; instructions: string | null; videoUrl: string | null; buttonLabel: string | null; buttonUrl: string | null } | null;
  wallets: { id: string; coin: string; network: string; address: string; qrImageUrl: string | null }[];
  origin: string;
  ctx: Awaited<ReturnType<typeof loadMerchantContext>>;
};

async function Instructions(props: InstructionProps) {
  const { methodKey, config, order, manual, wallets } = props;

  if (manual) {
    return (
      <>
        {manual.instructions ? <Html html={manual.instructions} /> : null}
        {manual.buttonUrl ? (
          <ExternalButton href={manual.buttonUrl} label={manual.buttonLabel || `Open ${manual.name}`} />
        ) : null}
        {manual.videoUrl ? <VideoEmbed url={manual.videoUrl} /> : null}
      </>
    );
  }

  switch (methodKey) {
    case 'crypto':
      return <CryptoInstructions order={order} wallets={wallets} config={config} />;

    case 'bank_transfer':
      return (
        <>
          <Steps
            steps={[
              'Open your banking app and start a transfer.',
              'Use the details below exactly as written.',
              `Put the reference ${referencePrefix(config)}${order.ref} in the memo — without it the payment cannot be matched to your order.`,
            ]}
          />
          <CopyField label="Account holder" value={String(config.holderName ?? '')} mono={false} />
          <CopyField label="IBAN / account number" value={String(config.iban ?? '')} />
          {config.swift ? <CopyField label="SWIFT / BIC" value={String(config.swift)} /> : null}
          {config.bankName ? (
            <CopyField label="Bank" value={String(config.bankName)} mono={false} />
          ) : null}
          <CopyField label="Transfer reference" value={`${referencePrefix(config)}${order.ref}`} />
          <CopyField label="Amount" value={fromCents(order.amountCents, order.currency)} />
          {config.instructions ? <Html html={String(config.instructions)} /> : null}
        </>
      );

    case 'western_union':
      return (
        <>
          <Steps
            steps={[
              'Go to a Western Union agent, or use their app.',
              'Send to the receiver below, exactly as spelled.',
              'Come back here and submit the MTCN from your receipt.',
            ]}
          />
          <CopyField
            label="Receiver name"
            value={`${config.firstName ?? ''} ${config.lastName ?? ''}`.trim()}
            mono={false}
          />
          <CopyField
            label="Receiver location"
            value={[config.city, config.country].filter(Boolean).join(', ')}
            mono={false}
          />
          <CopyField label="Amount" value={fromCents(order.amountCents, order.currency)} />
          {config.instructions ? <Html html={String(config.instructions)} /> : null}
        </>
      );

    case 'paypal_ff':
      return (
        <>
          {config.instructions ? <Html html={String(config.instructions)} /> : null}
          {config.buttonUrl ? (
            <ExternalButton
              href={String(config.buttonUrl)}
              label={String(config.buttonLabel ?? 'Pay on PayPal')}
            />
          ) : null}
          <CopyField label="Amount to send" value={fromCents(order.amountCents, order.currency)} />
          <Note>
            Paste your PayPal transaction ID below once you have sent it. The seller checks it by
            hand before your order is activated.
          </Note>
        </>
      );

    case 'bc_paypal':
    case 'bc_cashapp': {
      const coin = String(config.coin ?? 'BTC');
      const address = String(config.wallet ?? '');
      const qr = await qrDataUrl(address);
      return (
        <>
          <Steps
            steps={[
              methodKey === 'bc_paypal'
                ? `Open PayPal and buy ${fromCents(order.amountCents, order.currency)} of ${coin}.`
                : `Open Cash App and buy ${fromCents(order.amountCents, order.currency)} of ${coin}.`,
              `Withdraw it to the ${coin} address below.`,
              'Come back and paste the transaction ID.',
            ]}
          />
          {config.instructions ? <Html html={String(config.instructions)} /> : null}
          {qr ? <Qr src={qr} alt={`${coin} address QR code`} /> : null}
          <CopyField label={`${coin} address (${config.network ?? ''})`} value={address} />
          {config.videoUrl ? <VideoEmbed url={String(config.videoUrl)} /> : null}
          <Note>
            Networks matter. Sending {coin} on the wrong network loses the funds, and nobody can
            recover them — not the seller, not us.
          </Note>
        </>
      );
    }

    case 'finchpay_btc': {
      const address = String(config.wallet ?? '');
      const qr = await qrDataUrl(address);
      const widget = finchpayWidgetUrl(order.amountCents, order.currency);
      return (
        <>
          <Steps
            steps={[
              `Note the amount: ${fromCents(order.amountCents, order.currency)}.`,
              'Copy the Bitcoin address below.',
              'Open FinchPay, pay by card, and send the Bitcoin to that address.',
            ]}
          />
          {qr ? <Qr src={qr} alt="Bitcoin address QR code" /> : null}
          <CopyField label="Bitcoin address" value={address} />
          <ExternalButton href={widget} label="Open FinchPay and pay by card" />
          <Note>
            FinchPay handles the card payment and identity check; this store never sees your card
            details. Once the Bitcoin lands, tell the seller below.
          </Note>
        </>
      );
    }

    case 'amazon_giftcard':
      return (
        <>
          <Steps
            steps={[
              `Buy an Amazon eGift Card for ${fromCents(order.amountCents, order.currency)}.`,
              'Send it to yourself so you receive the 16-character code.',
              order.giftCardCodeEnc
                ? 'Your code has been submitted — the seller is verifying it.'
                : 'Submit the code to the seller.',
            ]}
          />
          {config.purchaseUrl ? (
            <ExternalButton
              href={String(config.purchaseUrl)}
              label={String(config.buttonLabel ?? 'Buy the gift card')}
            />
          ) : null}
          {config.instructions ? <Html html={String(config.instructions)} /> : null}
          {order.giftCardCodeEnc ? (
            <Note>
              Your code is stored encrypted and reviewed by hand. The seller does not check balances
              automatically, so allow a little time. Your order activates once they confirm it.
            </Note>
          ) : (
            <Note>
              Return to the checkout and submit the code with your order, or send it to the seller
              using the contact options below.
            </Note>
          )}
        </>
      );

    case 'alchemypay': {
      // Rebuilt rather than stored: the signature is time-sensitive, so a
      // buyer who reloads this page tomorrow needs a fresh one.
      const result = initiateAlchemyPay({
        order: order as never,
        product: { name: '' } as never,
        ctx: props.ctx,
        method: null,
        manual: null,
        config,
        origin: props.origin,
      });
      if (result.kind !== 'iframe') {
        return <Note>This payment method is temporarily unavailable. Please pick another.</Note>;
      }
      return (
        <>
          <Note>
            Pay by card, bank transfer or local wallet below. You stay on this page the whole time.
          </Note>
          <iframe
            src={result.url}
            title="Alchemy Pay"
            style={{
              width: '100%',
              height: result.height ?? 760,
              marginTop: 14,
              border: '1px solid var(--mp-border)',
              borderRadius: 'var(--mp-radius-sm)',
              background: '#fff',
            }}
            allow="accelerometer; camera; payment; microphone"
          />
        </>
      );
    }

    default:
      return (
        <Note>
          Follow the seller instructions to send {fromCents(order.amountCents, order.currency)}, then
          confirm below with your payment reference.
        </Note>
      );
  }
}

async function CryptoInstructions({
  order,
  wallets,
  config,
}: {
  order: { amountCents: number; currency: string };
  wallets: InstructionProps['wallets'];
  config: InstructionProps['config'];
}) {
  if (wallets.length === 0) {
    return <Note>This store has no wallet addresses set up yet. Please contact the seller.</Note>;
  }

  // Server-rendered QR for each wallet: no client library, no layout shift,
  // and it still works with JavaScript disabled.
  const withQr = await Promise.all(
    wallets.map(async (wallet) => ({
      ...wallet,
      qr: wallet.qrImageUrl ?? (await qrDataUrl(wallet.address)),
    })),
  );

  return (
    <>
      <Steps
        steps={[
          `Send exactly ${fromCents(order.amountCents, order.currency)} worth of the coin you choose.`,
          'Use the matching network — the wrong network loses the funds.',
          'Paste the transaction ID below so the seller can verify it.',
        ]}
      />
      {config.instructions ? <Html html={String(config.instructions)} /> : null}

      <div style={{ marginTop: 14, display: 'grid', gap: 14 }}>
        {withQr.map((wallet) => (
          <div
            key={wallet.id}
            style={{
              padding: 14,
              border: '1px solid var(--mp-border)',
              borderRadius: 'var(--mp-radius-sm)',
            }}
          >
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>
              {wallet.coin}
              {wallet.network ? (
                <span style={{ color: 'var(--mp-text-muted)', fontWeight: 400 }}>
                  {' '}
                  · {wallet.network}
                </span>
              ) : null}
            </p>
            {wallet.qr ? <Qr src={wallet.qr} alt={`${wallet.coin} address QR code`} /> : null}
            <CopyField label="Address" value={wallet.address} />
          </div>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- helpers

async function qrDataUrl(value: string): Promise<string | null> {
  if (!value) return null;
  try {
    return await QRCode.toDataURL(value, {
      margin: 1,
      width: 200,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    });
  } catch {
    // A missing QR is a cosmetic loss; the address is still copyable.
    return null;
  }
}

function Qr({ src, alt }: { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- generated data URL
    <img
      src={src}
      alt={alt}
      width={160}
      height={160}
      style={{
        display: 'block',
        margin: '14px auto 0',
        borderRadius: 8,
        background: '#fff',
        padding: 6,
      }}
    />
  );
}

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 10 }}>
      {steps.map((step, index) => (
        <li key={index} style={{ display: 'flex', gap: 10, fontSize: 13.5, lineHeight: 1.6 }}>
          <span
            aria-hidden
            style={{
              flexShrink: 0,
              width: 21,
              height: 21,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              background: 'var(--mp-primary)',
              color: 'var(--mp-primary-contrast)',
            }}
          >
            {index + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: '14px 0 0',
        padding: 12,
        borderRadius: 'var(--mp-radius-sm)',
        border: '1px solid var(--mp-border)',
        fontSize: 12.5,
        lineHeight: 1.65,
        color: 'var(--mp-text-muted)',
      }}
    >
      {children}
    </p>
  );
}

function Html({ html }: { html: string }) {
  return (
    <div
      style={{ marginTop: 12, fontSize: 13.5, lineHeight: 1.7, color: 'var(--mp-text-muted)' }}
      // Merchant-authored instructions for their own checkout.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function ExternalButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'block',
        marginTop: 14,
        padding: '13px 18px',
        textAlign: 'center',
        fontSize: 14.5,
        fontWeight: 700,
        textDecoration: 'none',
        color: 'var(--mp-primary-contrast)',
        background: 'var(--mp-primary)',
        borderRadius: 'var(--mp-radius-sm)',
      }}
    >
      {label}
    </a>
  );
}

function VideoEmbed({ url }: { url: string }) {
  const embed = toEmbedUrl(url);
  if (!embed) return null;
  return (
    <div style={{ marginTop: 14, aspectRatio: '16 / 9' }}>
      <iframe
        src={embed}
        title="How to pay"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
        allowFullScreen
        style={{
          width: '100%',
          height: '100%',
          border: '1px solid var(--mp-border)',
          borderRadius: 'var(--mp-radius-sm)',
        }}
      />
    </div>
  );
}

function toEmbedUrl(url: string): string | null {
  const youtube = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/.exec(url);
  if (youtube) return `https://www.youtube-nocookie.com/embed/${youtube[1]}`;
  const vimeo = /vimeo\.com\/(?:video\/)?(\d+)/.exec(url);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

function referencePrefix(config: InstructionProps['config']): string {
  return String(config.referencePrefix ?? '');
}

function requiresReference(methodKey: string): boolean {
  // Rails where a reference is the only way to match the money to the order.
  return ['bank_transfer', 'western_union', 'paypal_ff', 'crypto', 'bc_paypal', 'bc_cashapp'].includes(
    methodKey,
  );
}

function referenceLabel(methodKey: string): string {
  const map: Record<string, string> = {
    western_union: 'MTCN from your receipt',
    bank_transfer: 'Transfer reference or memo',
    paypal_ff: 'PayPal transaction ID',
    crypto: 'Transaction ID (TXID)',
    bc_paypal: 'Transaction ID (TXID)',
    bc_cashapp: 'Transaction ID (TXID)',
    amazon_giftcard: 'Gift card code reference',
  };
  return map[methodKey] ?? 'Payment reference';
}

const caps: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '.07em',
  textTransform: 'uppercase',
  color: 'var(--mp-text-faint)',
};
