import type { CheckoutProfile } from '@prisma/client';
import { googleFontHref, themeVariables } from '@/lib/checkout/theme';

/**
 * The frame every checkout screen sits in.
 *
 * Styles are inline rather than Tailwind classes wherever they depend on
 * merchant settings: the palette is per-tenant and resolved at request time,
 * so it cannot be compiled into a stylesheet ahead of time.
 */
export function CheckoutShell({
  profile,
  children,
  wide = false,
}: {
  profile: CheckoutProfile;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const fontHref = googleFontHref(profile.fontFamily);

  return (
    <div
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
      {profile.customCss ? (
        // Merchant CSS, scoped to the checkout page it belongs to. It cannot
        // reach the dashboard, which is a separate document.
        <style dangerouslySetInnerHTML={{ __html: profile.customCss }} />
      ) : null}

      <div
        style={{
          maxWidth: wide ? 'var(--mp-width)' : 'min(560px, 100%)',
          margin: '0 auto',
          padding: '32px 16px 56px',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function MerchantHeader({
  profile,
  storeName,
}: {
  profile: CheckoutProfile;
  storeName: string;
}) {
  return (
    <header style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
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
  padded = true,
  style,
}: {
  children: React.ReactNode;
  padded?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: 'var(--mp-card)',
        border: '1px solid var(--mp-border)',
        borderRadius: 'var(--mp-radius)',
        padding: padded ? 20 : 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function TrustBadges({ profile }: { profile: CheckoutProfile }) {
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
    <ul
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        listStyle: 'none',
        padding: 0,
        margin: '16px 0 0',
      }}
    >
      {badges.map((badge) => (
        <li
          key={badge}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            color: 'var(--mp-text-muted)',
            border: '1px solid var(--mp-border)',
            borderRadius: 999,
            padding: '5px 10px',
          }}
        >
          <CheckMark />
          {COPY[badge] ?? badge}
        </li>
      ))}
    </ul>
  );
}

function CheckMark() {
  return (
    <svg aria-hidden width="11" height="11" viewBox="0 0 16 16" fill="none">
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
    <footer
      style={{
        marginTop: 28,
        paddingTop: 18,
        borderTop: '1px solid var(--mp-border)',
        fontSize: 11,
        color: 'var(--mp-text-faint)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'space-between',
      }}
    >
      <span>
        {storeName}
        {supportEmail ? ` · ${supportEmail}` : ''}
      </span>
      <span style={{ display: 'flex', gap: 12 }}>
        {profile.termsUrl ? (
          <a href={profile.termsUrl} style={{ color: 'inherit' }}>
            Terms
          </a>
        ) : null}
        {profile.privacyPolicyUrl ? (
          <a href={profile.privacyPolicyUrl} style={{ color: 'inherit' }}>
            Privacy
          </a>
        ) : null}
      </span>
    </footer>
  );
}
