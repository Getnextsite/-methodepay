/**
 * How a buyer tells the merchant "I have paid" on a manual rail.
 *
 * The merchant picks any combination of three options:
 *   txid      a form where the buyer pastes a transaction ID / reference
 *   whatsapp  a button (and, on a computer, a QR code) that opens a WhatsApp
 *             chat prefilled with the order reference
 *   email     a button that opens an email prefilled with the order reference
 *
 * Stored in NotificationSettings.confirmChannels (JSON). Older accounts hold a
 * plain array such as ["whatsapp"]; that shape is still read.
 */
export type ConfirmChannels = {
  txid: boolean;
  whatsapp: boolean;
  email: boolean;
  /** Inbox for email confirmations. Blank falls back to the support email. */
  emailTo: string;
};

export const DEFAULT_CONFIRM_CHANNELS: ConfirmChannels = {
  txid: true,
  whatsapp: true,
  email: false,
  emailTo: '',
};

export function parseConfirmChannels(raw: unknown): ConfirmChannels {
  // Legacy shape: a list of messaging channels. The transaction-ID form was
  // always shown back then, so it stays on.
  if (Array.isArray(raw)) {
    return {
      txid: true,
      whatsapp: raw.includes('whatsapp'),
      email: raw.includes('email'),
      emailTo: '',
    };
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    return {
      txid: o.txid === true,
      whatsapp: o.whatsapp === true,
      email: o.email === true,
      emailTo: typeof o.emailTo === 'string' ? o.emailTo.trim().slice(0, 190) : '',
    };
  }
  return { ...DEFAULT_CONFIRM_CHANNELS };
}

export type ResolvedConfirm = {
  txid: boolean;
  /** wa.me link prefilled with the order reference, or null when not offered. */
  whatsappUrl: string | null;
  /** mailto link prefilled with the order reference, or null when not offered. */
  emailUrl: string | null;
};

/**
 * What the buyer actually sees. A channel needs both the merchant's tick and
 * somewhere to send the message; and if that leaves nothing at all, the
 * transaction-ID form comes back, because a payment screen with no way to
 * confirm is a dead end for the buyer.
 */
export function resolveConfirm(input: {
  channels: ConfirmChannels;
  whatsappNumber?: string | null;
  supportEmail?: string | null;
  message: string;
  subject: string;
}): ResolvedConfirm {
  const { channels, message, subject } = input;

  const digits = String(input.whatsappNumber ?? '').replace(/\D/g, '');
  const whatsappUrl =
    channels.whatsapp && digits.length >= 6
      ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
      : null;

  const inbox = (channels.emailTo || String(input.supportEmail ?? '')).trim();
  const emailUrl =
    channels.email && inbox.includes('@')
      ? `mailto:${inbox}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`
      : null;

  const txid = channels.txid || (!whatsappUrl && !emailUrl);
  return { txid, whatsappUrl, emailUrl };
}
