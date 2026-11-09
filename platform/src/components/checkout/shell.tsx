import type { CheckoutProfile } from '@prisma/client';
import { googleFontHref, themeVariables } from '@/lib/checkout/theme';
import { CheckoutStyles } from './styles';

/**
 * The frame every checkout screen sits in.
 *
 * The palette is per-tenant and resolved at request time, so it cannot be
 * compiled into a stylesheet ahead of time: it arrives as CSS custom properties
 * on this element. Everything structural is a class from `styles.tsx`, because
 * media queries and hover states are exactly what a checkout needs and exactly
 * what an inline style cannot express.
 */
export type ShellWidth = 'narrow' | 'wide' | 'full';

export function CheckoutShell({
  profile,
  children,
  width = 'narrow',
}: {
  profile: CheckoutProfile;
  children: React.ReactNode;
  width?: ShellWidth;
}) {
  // Lite exists to load fast on a bad connection, and a webfont is a blocking
  // request for a face nobody came for. It falls back to the system stack,
  // which is already on the device.
  const fontHref = profile.design === 'LITE' ? null : googleFontHref(profile.fontFamily);

  return (
    <div
      className="mp-page"
      style={{
        ...(themeVariables(profile) as React.CSSProperties),
        minHeight: '100vh',
        background: `linear-gradient(165deg, var(--mp-bg-start), var(--mp-bg-end))`,
        color: 'var(--mp-text)',
        fontFamily: 'var(--mp-font)',
        fontSize: 'var(--mp-font-size)',
      }}
    >
      {fontHref ? <link rel="stylesheet" href={fontHref} /> : null}
      <CheckoutStyles />
      {profile.customCss ? (
        // Merchant CSS, scoped to the checkout page it belongs to, and injected
        // after ours so it wins. It cannot reach the dashboard, which is a
        // separate document.
        <style dangerouslySetInnerHTML={{ __html: profile.customCss }} />
      ) : null}

      {/* A full-bleed design manages its own containers; the others get one. */}
      {width === 'full' ? children : <div className={`mp-shell mp-shell--${width}`}>{children}</div>}
    </div>
  );
}

export function MerchantHeader({
  profile,
  storeName,
  align = 'start',
}: {
  profile: CheckoutProfile;
  storeName: string;
  align?: 'start' | 'center';
}) {
  return (
    <header
      style={{
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        gap: 12,
      }}
    >
      {profile.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- merchant-hosted asset of unknown dimensions
        <img
          src={profile.logoUrl}
          alt={storeName}
          style={{ maxHeight: profile.logoMaxHeight, width: 'auto' }}
        />
      ) : (
        <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>{storeName}</span>
      )}
    </header>
  );
}

export function Card({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode;
  /** Appended to `mp-card`, e.g. `mp-card--lift mp-sticky`. */
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`mp-card ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

export function TrustBadges({
  profile,
  className = '',
}: {
  profile: CheckoutProfile;
  className?: string;
}) {
  if (!profile.showTrustBadges) return null;
  const badges = Array.isArray(profile.trustBadges)
    ? (profile.trustBadges as unknown[]).filter((b): b is string => typeof b === 'string')
    : [];
  if (badges.length === 0) return null;

  const COPY: Record<string, string> = {
    ssl: 'SSL secured',
    encrypted: 'Encrypted payment',
    money_back: `${profile.guaranteeDays}-day money back`,
    support: 'Human support',
    no_card_stored: 'Card details never stored',
  };

  return (
    <ul className={`mp-chips ${className}`.trim()} style={{ marginTop: 16 }}>
      {badges.map((badge) => (
        <li key={badge} className="mp-chip">
          <CheckMark />
          {COPY[badge] ?? badge}
        </li>
      ))}
    </ul>
  );
}

export function CheckMark({ size = 11 }: { size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M3 8.5l3.2 3.2L13 5"
        stroke="var(--mp-primary)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Stars({ count = 5 }: { count?: number }) {
  return (
    <span className="mp-stars" aria-label={`${count} out of 5`}>
      {Array.from({ length: count }, (_, i) => (
        <svg key={i} aria-hidden width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1.6l1.9 4 4.4.6-3.2 3 .8 4.3L8 11.4l-3.9 2.1.8-4.3-3.2-3 4.4-.6z" />
        </svg>
      ))}
    </span>
  );
}

export function PolicyFooter({
  profile,
  storeName,
  supportEmail,
}: {
  profile: CheckoutProfile;
  storeName: string;
  supportEmail: string;
}) {
  return (
    <footer className="mp-foot">
      <span>
        {storeName}
        {supportEmail ? ` · ${supportEmail}` : ''}
      </span>
      <span className="mp-foot-links">
        {profile.termsUrl ? <a href={profile.termsUrl}>Terms</a> : null}
        {profile.privacyPolicyUrl ? <a href={profile.privacyPolicyUrl}>Privacy</a> : null}
      </span>
    </footer>
  );
}
