/** Abandoned checkout recovery settings (NotificationSettings.recovery). */
export type RecoverySettings = {
  enabled: boolean;
  delayHours: number;
  couponCode: string;
  subject: string;
  message: string;
};

export const DEFAULT_RECOVERY: RecoverySettings = {
  enabled: true,
  delayHours: 1,
  couponCode: '',
  subject: 'You left something behind: {product}',
  message:
    'Hi {buyer_name}, you started an order for {product} but did not finish paying. It is still reserved for you — pick up where you left off below.',
};


export function parseRecovery(raw: unknown): RecoverySettings {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const delay = Math.round(Number(o.delayHours));
  return {
    enabled: o.enabled !== false,
    delayHours: Number.isFinite(delay) && delay >= 1 && delay <= 48 ? delay : DEFAULT_RECOVERY.delayHours,
    couponCode: typeof o.couponCode === 'string' ? o.couponCode.trim().toUpperCase().slice(0, 64) : '',
    subject: typeof o.subject === 'string' && o.subject.trim() ? o.subject.trim().slice(0, 150) : DEFAULT_RECOVERY.subject,
    message: typeof o.message === 'string' && o.message.trim() ? o.message.trim().slice(0, 1000) : DEFAULT_RECOVERY.message,
  };
}

