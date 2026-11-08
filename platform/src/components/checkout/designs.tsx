import type { CheckoutProfile, Product } from '@prisma/client';
import { formatMoney } from '@/lib/money';
import { CheckoutForm, type CheckoutFormProps } from './form';
import { Card, MerchantHeader, PolicyFooter, TrustBadges } from './shell';

/**
 * The six checkout designs.
 *
 * One form, six arrangements. They differ in what the buyer sees first — the
 * summary, the methods, the pitch or the proof — because the right answer
 * depends on where the traffic came from, and the merchant knows that and we
 * do not. Every variant reads the same theme variables, so a palette change
 * applies to all of them.
 */

export type DesignProps = {
  profile: CheckoutProfile;
  product: Product;
  storeName: string;
  supportEmail: string;
  form: CheckoutFormProps;
  /** Rendered inside the form, above the pay button. */
  trust: React.ReactNode;
};

export function CheckoutView(props: DesignProps) {
  switch (props.profile.design) {
    case 'LITE':
      return <Lite {...props} />;
    case 'STOREFRONT':
      return <Storefront {...props} />;
    case 'EXPRESS':
      return <Express {...props} />;
    case 'HERO':
      return <Hero {...props} />;
    case 'TRUST':
      return <Trust {...props} />;
    case 'CLASSIC':
    default:
      return <Classic {...props} />;
  }
}

// ---------------------------------------------------------------- shared bits

function Heading({ profile, product }: { profile: CheckoutProfile; product: Product }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h1 style={{ margin: 0, fontSize: 24, lineHeight: 1.25, letterSpacing: '-0.02em' }}>
        {profile.checkoutTitle || `Complete your order`}
      </h1>
      <p style={{ margin: '7px 0 0', fontSize: 14, color: 'var(--mp-text-muted)' }}>
        {profile.checkoutSubtitle || product.name}
      </p>
    </div>
  );
}

function Summary({
  product,
  compact = false,
}: {
  product: Product;
  compact?: boolean;
}) {
  return (
    <div>
      {product.imageUrl && !compact ? (
        // eslint-disable-next-line @next/next/no-img-element -- merchant-hosted asset
        <img
          src={product.imageUrl}
          alt={product.name}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            borderRadius: 'var(--mp-radius-sm)',
            marginBottom: 14,
          }}
        />
      ) : null}

      <p style={labelCaps}>You are buying</p>
      <p style={{ margin: '6px 0 0', fontSize: 17, fontWeight: 600 }}>{product.name}</p>
      <p style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 700, color: 'var(--mp-primary)' }}>
        {formatMoney(product.priceCents, product.currency)}
      </p>

      {product.durationDays > 0 ? (
        <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--mp-text-muted)' }}>
          {product.durationDays} days of access, renewable.
        </p>
      ) : null}

      {product.description ? (
        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: '1px solid var(--mp-border)',
            fontSize: 13.5,
            lineHeight: 1.65,
            color: 'var(--mp-text-muted)',
          }}
          // Merchant-authored product copy. Stored as entered and rendered as
          // HTML so basic formatting works; the merchant is the only author.
          dangerouslySetInnerHTML={{ __html: product.description }}
        />
      ) : null}

      {product.manageStock && product.stock <= 5 ? (
        <p style={{ margin: '12px 0 0', fontSize: 12.5, fontWeight: 600, color: 'var(--mp-primary)' }}>
          Only {product.stock} left.
        </p>
      ) : null}
    </div>
  );
}

function Guarantee({ profile }: { profile: CheckoutProfile }) {
  if (!profile.guaranteeText) return null;
  return (
    <div
      style={{
        marginTop: 18,
        padding: 15,
        borderRadius: 'var(--mp-radius-sm)',
        border: '1px solid var(--mp-border)',
      }}
    >
      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>{profile.guaranteeTitle}</p>
      <p style={{ margin: '6px 0 0', fontSize: 12.5, lineHeight: 1.6, color: 'var(--mp-text-muted)' }}>
        {profile.guaranteeText}
      </p>
    </div>
  );
}

function Testimonials({ profile }: { profile: CheckoutProfile }) {
  const items = Array.isArray(profile.testimonials)
    ? (profile.testimonials as unknown[]).filter(
        (t): t is { text: string; name?: string; role?: string } =>
          typeof t === 'object' && t !== null && typeof (t as { text?: unknown }).text === 'string' &&
          (t as { text: string }).text.trim() !== '',
      )
    : [];
  if (items.length === 0) return null;

  return (
    <ul style={{ listStyle: 'none', margin: '18px 0 0', padding: 0, display: 'grid', gap: 10 }}>
      {items.slice(0, 3).map((item, index) => (
        <li
          key={index}
          style={{
            padding: 14,
            borderRadius: 'var(--mp-radius-sm)',
            border: '1px solid var(--mp-border)',
          }}
        >
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>&ldquo;{item.text}&rdquo;</p>
          {item.name ? (
            <p style={{ margin: '7px 0 0', fontSize: 11.5, color: 'var(--mp-text-faint)' }}>
              {item.name}
              {item.role ? ` · ${item.role}` : ''}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- designs

/** Classic — order summary left, methods right. The layout nobody has to learn. */
function Classic({ profile, product, storeName, supportEmail, form, trust }: DesignProps) {
  return (
    <>
      <MerchantHeader profile={profile} storeName={storeName} />
      <Heading profile={profile} product={product} />
      <div
        style={{
          display: 'grid',
          gap: 18,
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          alignItems: 'start',
        }}
      >
        <Card>
          <Summary product={product} />
          <Guarantee profile={profile} />
        </Card>
        <Card>
          <CheckoutForm {...form}>{trust}</CheckoutForm>
        </Card>
      </div>
      <PolicyFooter profile={profile} storeName={storeName} supportEmail={supportEmail} />
    </>
  );
}

/** Lite — one column, stripped to product, price, pay. Fastest on a 3G phone. */
function Lite({ profile, product, storeName, supportEmail, form, trust }: DesignProps) {
  return (
    <>
      <MerchantHeader profile={profile} storeName={storeName} />
      <Card>
        <p style={labelCaps}>{product.name}</p>
        <p style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 700, color: 'var(--mp-primary)' }}>
          {formatMoney(product.priceCents, product.currency)}
        </p>
        <div style={{ marginTop: 18 }}>
          <CheckoutForm {...form}>{trust}</CheckoutForm>
        </div>
      </Card>
      <PolicyFooter profile={profile} storeName={storeName} supportEmail={supportEmail} />
    </>
  );
}

/** Storefront — product-led, for goods people want to look at before buying. */
function Storefront({ profile, product, storeName, supportEmail, form, trust }: DesignProps) {
  return (
    <>
      <MerchantHeader profile={profile} storeName={storeName} />
      <div
        style={{
          display: 'grid',
          gap: 20,
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          alignItems: 'start',
        }}
      >
        <div>
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- merchant-hosted asset
            <img
              src={product.imageUrl}
              alt={product.name}
              style={{
                width: '100%',
                display: 'block',
                borderRadius: 'var(--mp-radius)',
                border: '1px solid var(--mp-border)',
              }}
            />
          ) : null}
          <h1 style={{ margin: '18px 0 0', fontSize: 26, letterSpacing: '-0.02em' }}>
            {product.name}
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 700, color: 'var(--mp-primary)' }}>
            {formatMoney(product.priceCents, product.currency)}
          </p>
          {product.description ? (
            <div
              style={{ marginTop: 14, fontSize: 14, lineHeight: 1.7, color: 'var(--mp-text-muted)' }}
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          ) : null}
          <Guarantee profile={profile} />
        </div>
        <Card>
          <CheckoutForm {...form}>{trust}</CheckoutForm>
        </Card>
      </div>
      <PolicyFooter profile={profile} storeName={storeName} supportEmail={supportEmail} />
    </>
  );
}

/** Express — methods above the fold, for buyers who have already decided. */
function Express({ profile, product, storeName, supportEmail, form, trust }: DesignProps) {
  return (
    <>
      <MerchantHeader profile={profile} storeName={storeName} />
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 16,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 20, letterSpacing: '-0.01em' }}>{product.name}</h1>
        <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--mp-primary)' }}>
          {formatMoney(product.priceCents, product.currency)}
        </p>
      </div>
      <Card>
        <CheckoutForm {...form}>{trust}</CheckoutForm>
      </Card>
      <PolicyFooter profile={profile} storeName={storeName} supportEmail={supportEmail} />
    </>
  );
}

/** Hero — checkout as a sales page, for cold traffic from an ad. */
function Hero({ profile, product, storeName, supportEmail, form, trust }: DesignProps) {
  return (
    <>
      <MerchantHeader profile={profile} storeName={storeName} />
      <div style={{ textAlign: 'center', marginBottom: 26 }}>
        <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.15, letterSpacing: '-0.03em' }}>
          {profile.checkoutTitle || product.name}
        </h1>
        {profile.checkoutSubtitle ? (
          <p
            style={{
              margin: '12px auto 0',
              maxWidth: 480,
              fontSize: 15.5,
              lineHeight: 1.6,
              color: 'var(--mp-text-muted)',
            }}
          >
            {profile.checkoutSubtitle}
          </p>
        ) : null}
        <p style={{ margin: '18px 0 0', fontSize: 32, fontWeight: 800, color: 'var(--mp-primary)' }}>
          {formatMoney(product.priceCents, product.currency)}
        </p>
      </div>
      <Card>
        <CheckoutForm {...form}>{trust}</CheckoutForm>
      </Card>
      <Guarantee profile={profile} />
      <Testimonials profile={profile} />
      <PolicyFooter profile={profile} storeName={storeName} supportEmail={supportEmail} />
    </>
  );
}

/** Trust — proof around the pay button, for an unfamiliar brand or a big ticket. */
function Trust({ profile, product, storeName, supportEmail, form, trust }: DesignProps) {
  return (
    <>
      <MerchantHeader profile={profile} storeName={storeName} />
      <Heading profile={profile} product={product} />
      <div
        style={{
          display: 'grid',
          gap: 18,
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          alignItems: 'start',
        }}
      >
        <Card>
          <CheckoutForm {...form}>{trust}</CheckoutForm>
        </Card>
        <div>
          <Card>
            <Summary product={product} compact />
          </Card>
          <Guarantee profile={profile} />
          <Testimonials profile={profile} />
          <TrustBadges profile={profile} />
        </div>
      </div>
      <PolicyFooter profile={profile} storeName={storeName} supportEmail={supportEmail} />
    </>
  );
}

const labelCaps: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '.07em',
  textTransform: 'uppercase',
  color: 'var(--mp-text-faint)',
};
