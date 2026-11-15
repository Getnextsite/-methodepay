/**
 * Automatic crypto verification settings (NotificationSettings.chainVerify).
 *   enabled  check crypto payments on the blockchain at all (default on)
 *   mode     'auto' marks verified orders paid; 'review' leaves the final say to a human
 */
export type ChainVerifySettings = { enabled: boolean; mode: 'auto' | 'review' };

export function parseChainVerify(raw: unknown): ChainVerifySettings {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return {
    enabled: o.enabled !== false,
    mode: o.mode === 'review' ? 'review' : 'auto',
  };
}

