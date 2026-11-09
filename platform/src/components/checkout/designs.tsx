import type { CheckoutDesign, CheckoutProfile, Product } from '@prisma/client';
import { formatMoney } from '@/lib/money';
import { CheckoutForm, type CheckoutFormProps } from './form';
import {
  Card,
  CheckMark,
  MerchantHeader,
  PolicyFooter,
  Stars,
  TrustBadges,
  type ShellWidth,
} from './shell';

/**
 * The six checkout designs.
 *
 * They are not six skins on one page. Each one answers a different question
 * about where the buyer came from — a link they asked for, an ad they had never
 * seen before, a repeat purchase — and so each leads with something different:
 * the receipt, the product, the rails, the pitch or the proof. What they share
 * is the form and the theme variables, so a palette change still applies to all
 * of them and there is only one place payment can go wrong.
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

/**
 * How much room each layout gets.
 *
 * `full` means the design places its own containers, because it bleeds a band
 * to the edge of the viewport and cannot sit inside a fixed column.
 */
export function shellWidthFor(design: CheckoutDesign): ShellWidth {
  switch (design) {
    case 'LITE':
      return 'narrow';
    case 'EXPRESS':
    case 'HERO':
      return 'full';
    default:
      return 'wide';
  }
}

// ---------------------------------------------------------------- shared bits

function price(product: Product): string {
  return formatMoney(product.priceCents, product.currency);
}

/**
 * Facts taken from the product row, never invented.
 *
 * A checkout that says "instant delivery" because the layout had a slot for it
 * is how a merchant ends up with a chargeback, so every line here is read from
 * a field the merchant actually filled in and omitted otherwise.
 */
function ProductFacts({ product, className = '' }: { product: Product; className?: string }) {
  const rows: { k: string; v: string }[] = [];

  rows.push({ k: 'Type', v: product.type === 'PHYSICAL' ? 'Physical item' : 'Digital' });

  if (product.durationDays > 0) {
    rows.push({ k: 'Access', v: `${product.durationDays} days, renewable` });
  } else if (product.type === 'DIGITAL') {
    rows.push({ k: 'Access', v: 'One-off, no expiry' });
  }

  if (product.requiresShipping) {
    rows.push({ k: 'Delivery', v: 'Shipped to your address' });
  } else if (product.deliveryFileUrl) {
    rows.push({ k: 'Delivery', v: 'Download after payment' });
  } else {
    rows.push({ k: 'Delivery', v: 'Sent by email' });
  }

  if (product.manageStock) {
    rows.push({ k: 'Availability', v: product.stock <= 5 ? `Only ${product.stock} left` : 'In stock' });
  }

  return (
    <dl className={`mp-meta ${className}`.trim()}>
      {rows.map((row) => (
        <div key={row.k} className="mp-meta-row">
          <dt>{row.k}</dt>
          <dd>{row.v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Description({ product, large = false }: { product: Product; large?: boolean }) {
  if (!product.description) return null;
  return (
    <div
      className={`mp-prose${large ? ' mp-prose--lg' : ''}`}
      // Merchant-authored product copy. Stored as entered and rendered as HTML
      // so basic formatting works; the merchant is the only author.
      dangerouslySetInnerHTML={{ __html: product.description }}
    />
  );
}

function ProductImage({
  product,
  frame = '',
  fallback = false,
}: {
  product: Product;
  /** Extra classes on the frame, e.g. `mp-media--wide`. */
  frame?: string;
  /**
   * Draw a monogram when the merchant has not uploaded an image. Worth it on a
   * product-led layout, where an empty column reads as a broken page; pointless
   * on the others, which simply drop the image.
   */
  fallback?: boolean;
}) {
  if (!product.imageUrl && !fallback) return null;
  const low = product.manageStock && product.stock > 0 && product.stock <= 5;

  return (
    <div className={`mp-media ${frame}`.trim()}>
      {product.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- merchant-hosted asset
        <img src={product.imageUrl} alt={product.name} />
      ) : (
        <span className="mp-monogram" aria-hidden>
          {product.name.trim().charAt(0).toUpperCase()}
        </span>
      )}
      {low ? <span className="mp-media-tag">Only {product.stock} left</span> : null}
    </div>
  );
}

/** The order, as a receipt. The thing a buyer checks before they commit. */
function OrderSummary({
  product,
  showImage = true,
  showDescription = true,
}: {
  product: Product;
  showImage?: boolean;
  showDescription?: boolean;
}) {
  return (
    <div className="mp-stack" style={{ ['--mp-gap' as string]: '16px' }}>
      {showImage ? <ProductImage product={product} /> : null}

      <div>
        <p className="mp-eyebrow">Your order</p>
        <p className="mp-title mp-title--sm" style={{ marginTop: 8 }}>
          {product.name}
        </p>
        <div className="mp-price-row" style={{ marginTop: 6 }}>
          <p className="mp-price">{price(product)}</p>
          {product.durationDays > 0 ? (
            <span className="mp-fine">per {product.durationDays} days</span>
          ) : null}
        </div>
      </div>

      <ProductFacts product={product} />
      {showDescription ? <Description product={product} /> : null}
    </div>
  );
}

function GuaranteeNote({
  profile,
  seal = true,
}: {
  profile: CheckoutProfile;
  seal?: boolean;
}) {
  if (!profile.guaranteeText) return null;
  return (
    <div className="mp-panel mp-panel--primary" style={{ display: 'flex', gap: 14 }}>
      {seal ? (
        <span className="mp-seal" aria-hidden>
          <b>{profile.guaranteeDays}</b>
          <span>days</span>
        </span>
      ) : null}
      <div>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>{profile.guaranteeTitle}</p>
        <p className="mp-note" style={{ marginTop: 6 }}>
          {profile.guaranteeText}
        </p>
      </div>
    </div>
  );
}

function readTestimonials(profile: CheckoutProfile) {
  return Array.isArray(profile.testimonials)
    ? (profile.testimonials as unknown[]).filter(
        (t): t is { text: string; name?: string; role?: string } =>
          typeof t === 'object' &&
          t !== null &&
          typeof (t as { text?: unknown }).text === 'string' &&
          (t as { text: string }).text.trim() !== '',
      )
    : [];
}

function Quotes({
  profile,
  row = false,
  limit = 3,
}: {
  profile: CheckoutProfile;
  row?: boolean;
  limit?: number;
}) {
  const items = readTestimonials(profile).slice(0, limit);
  if (items.length === 0) return null;

  return (
    <ul className={`mp-quotes${row ? ' mp-quotes--row' : ''}`}>
      {items.map((item, index) => (
        <li key={index} className="mp-quote">
          <Stars />
          <p style={{ marginTop: 9 }}>&ldquo;{item.text}&rdquo;</p>
          {item.name ? (
            <footer>
              <span className="mp-avatar" aria-hidden>
                {item.name.trim().charAt(0).toUpperCase()}
              </span>
              <span className="mp-fine">
                {item.name}
                {item.role ? ` · ${item.role}` : ''}
              </span>
            </footer>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** What happens after the button, spelled out. Unknowns are what stall a sale. */
function WhatHappensNext({ product }: { product: Product }) {
  return (
    <div>
      <p className="mp-eyebrow" style={{ marginBottom: 14 }}>
        What happens next
      </p>
      <ol className="mp-steps">
        <li>
          <span className="mp-note" style={{ color: 'var(--mp-text)' }}>
            You pick how to pay and we show you exactly what to do.
          </span>
        </li>
        <li>
          <span className="mp-note" style={{ color: 'var(--mp-text)' }}>
            Nothing is charged until you confirm it on the payment screen.
          </span>
        </li>
        <li>
          <span className="mp-note" style={{ color: 'var(--mp-text)' }}>
            {product.requiresShipping
              ? 'Once payment clears we confirm your order by email and ship it.'
              : 'Once payment clears your order page unlocks and we email you a copy.'}
          </span>
        </li>
      </ol>
    </div>
  );
}

function Heading({ profile, product }: { profile: CheckoutProfile; product: Product }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h1 className="mp-title">{profile.checkoutTitle || 'Complete your order'}</h1>
      <p className="mp-sub">{profile.checkoutSubtitle || product.name}</p>
    </div>
  );
}

// ---------------------------------------------------------------- designs

/**
 * Classic — the receipt on the left, the form on the right.
 *
 * The layout nobody has to learn. The summary is a sticky rail so the thing
 * being bought stays on screen while the buyer works down a long form, and the
 * form gets the wider column because it is the part with the typing in it.
 */
function Classic({ profile, product, storeName, supportEmail, form, trust }: DesignProps) {
  return (
    <>
      <MerchantHeader profile={profile} storeName={storeName} />
      <Heading profile={profile} product={product} />

      <div
        className="mp-split mp-split--buy-first"
        style={{ ['--mp-cols' as string]: '0.86fr 1.14fr' }}
      >
        <div className="mp-stack mp-sticky mp-order-last">
          <Card>
            <OrderSummary product={product} />
          </Card>
          <GuaranteeNote profile={profile} />
        </div>

        <Card className="mp-card--lift mp-order-first">
          <CheckoutForm {...form}>{trust}</CheckoutForm>
        </Card>
      </div>

      <PolicyFooter profile={profile} storeName={storeName} supportEmail={supportEmail} />
    </>
  );
}

/**
 * Lite — one column, no cards, nothing to paint.
 *
 * Deliberately plain rather than merely narrow: no card surfaces, no imagery,
 * hairlines instead of borders. It is the layout for a buyer on a bad
 * connection, so every element it drops is the point rather than a compromise.
 */
function Lite({ profile, product, storeName, supportEmail, form, trust }: DesignProps) {
  return (
    <>
      <MerchantHeader profile={profile} storeName={storeName} />

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ minWidth: 0 }}>
          <p className="mp-eyebrow">You are buying</p>
          <h1 className="mp-title mp-title--sm" style={{ marginTop: 7 }}>
            {product.name}
          </h1>
        </div>
        <p className="mp-price" style={{ whiteSpace: 'nowrap' }}>
          {price(product)}
        </p>
      </div>

      {product.durationDays > 0 ? (
        <p className="mp-fine" style={{ marginTop: 8 }}>
          {product.durationDays} days of access, renewable.
        </p>
      ) : null}

      <hr className="mp-rule" />

      <CheckoutForm {...form}>{trust}</CheckoutForm>

      <PolicyFooter profile={profile} storeName={storeName} supportEmail={supportEmail} />
    </>
  );
}

/**
 * Storefront — product first, for goods people want to look at.
 *
 * The image gets a fixed frame so one tall photograph cannot push the buy
 * panel below the fold, and the buy panel sticks, because on this layout the
 * left column is the thing people scroll.
 */
function Storefront({ profile, product, storeName, supportEmail, form, trust }: DesignProps) {
  return (
    <>
      <MerchantHeader profile={profile} storeName={storeName} />

      <div
        className="mp-split mp-split--buy-first"
        style={{ ['--mp-cols' as string]: '1.04fr 0.96fr', ['--mp-gap' as string]: '28px' }}
      >
        <div className="mp-stack mp-order-last" style={{ ['--mp-gap' as string]: '20px' }}>
          <ProductImage product={product} frame="mp-media--wide" fallback />

          <div>
            <p className="mp-eyebrow">{storeName}</p>
            <h1 className="mp-title mp-title--lg" style={{ marginTop: 9 }}>
              {product.name}
            </h1>
            <div className="mp-price-row" style={{ marginTop: 12 }}>
              <p className="mp-price">{price(product)}</p>
              {product.durationDays > 0 ? (
                <span className="mp-fine">per {product.durationDays} days</span>
              ) : null}
            </div>
          </div>

          <Description product={product} large />
          <ProductFacts product={product} />
          <GuaranteeNote profile={profile} />
        </div>

        {/* A buy box: the price travels with the form as the left column
            scrolls, so the number is never more than a glance away. */}
        <Card className="mp-card--lift mp-sticky mp-order-first">
          <div className="mp-buybox">
            <div style={{ minWidth: 0 }}>
              <p className="mp-eyebrow">Buy now</p>
              <p className="mp-note" style={{ marginTop: 6, color: 'var(--mp-text)' }}>
                {product.name}
              </p>
            </div>
            <p className="mp-price mp-price--sm" style={{ whiteSpace: 'nowrap' }}>
              {price(product)}
            </p>
          </div>
          <CheckoutForm {...form}>{trust}</CheckoutForm>
        </Card>
      </div>

      <PolicyFooter profile={profile} storeName={storeName} supportEmail={supportEmail} />
    </>
  );
}

/**
 * Express — the total pinned to the top, the rails before the questions.
 *
 * For a buyer who has already decided. The price rides in a sticky bar so it
 * never scrolls away, the rails come first as tiles because choosing one is
 * the only decision left, and the totals panel is dropped rather than printed
 * twice.
 */
function Express({ profile, product, storeName, supportEmail, form, trust }: DesignProps) {
  return (
    <>
      <div className="mp-bar">
        <div className="mp-bar-inner">
          <span style={{ minWidth: 0, fontSize: 13.5, fontWeight: 600 }}>{product.name}</span>
          <span className="mp-price mp-price--sm" style={{ whiteSpace: 'nowrap' }}>
            {price(product)}
          </span>
        </div>
      </div>

      <div className="mp-shell mp-shell--narrow" style={{ paddingTop: 24 }}>
        <MerchantHeader profile={profile} storeName={storeName} />

        <p className="mp-eyebrow mp-eyebrow--primary">Express checkout</p>
        <h1 className="mp-title mp-title--sm" style={{ marginTop: 8, marginBottom: 20 }}>
          {profile.checkoutTitle || 'Pick how you want to pay'}
        </h1>

        <Card className="mp-card--lift">
          <CheckoutForm {...form} methodsFirst tiles compactTotals>
            {trust}
          </CheckoutForm>
        </Card>

        {profile.guaranteeText ? (
          <p className="mp-fine" style={{ marginTop: 16, textAlign: 'center' }}>
            {profile.guaranteeTitle} · {profile.guaranteeDays} days
          </p>
        ) : null}

        <PolicyFooter profile={profile} storeName={storeName} supportEmail={supportEmail} />
      </div>
    </>
  );
}

/**
 * Hero — checkout as a sales page, for cold traffic off an ad.
 *
 * The one layout that assumes the buyer has not been sold yet: a full-bleed
 * headline band carries the offer, the form sits in a narrow column under it,
 * and the proof goes below the fold where it answers the doubt that stopped
 * them rather than competing with the pitch.
 */
function Hero({ profile, product, storeName, supportEmail, form, trust }: DesignProps) {
  const quotes = readTestimonials(profile);

  return (
    <>
      <div className="mp-band">
        <div className="mp-shell mp-shell--narrow mp-center" style={{ padding: 0 }}>
          <MerchantHeader profile={profile} storeName={storeName} align="center" />

          <p className="mp-eyebrow mp-eyebrow--primary">
            {product.durationDays > 0 ? `${product.durationDays} days of access` : 'One-off purchase'}
          </p>
          <h1 className="mp-title mp-title--xl" style={{ marginTop: 12 }}>
            {profile.checkoutTitle || product.name}
          </h1>
          {profile.checkoutSubtitle ? (
            <p className="mp-sub mp-sub--lg mp-measure">{profile.checkoutSubtitle}</p>
          ) : null}

          <p className="mp-price mp-price--xl" style={{ marginTop: 22 }}>
            {price(product)}
          </p>
          {product.durationDays > 0 ? (
            <p className="mp-fine" style={{ marginTop: 8 }}>
              per {product.durationDays} days · cancel whenever you like
            </p>
          ) : null}
        </div>
      </div>

      <div className="mp-shell mp-shell--narrow" style={{ paddingTop: 8 }}>
        <Card className="mp-card--lift mp-card--accent">
          <CheckoutForm {...form} largeCta>
            {trust}
          </CheckoutForm>
        </Card>
      </div>

      {profile.guaranteeText || quotes.length > 0 ? (
        <div className="mp-band mp-band--foot">
          <div className="mp-shell mp-shell--wide mp-stack" style={{ padding: 0 }}>
            <GuaranteeNote profile={profile} />
            <Quotes profile={profile} row />
          </div>
        </div>
      ) : null}

      <div className="mp-shell mp-shell--narrow" style={{ paddingTop: 0 }}>
        <PolicyFooter profile={profile} storeName={storeName} supportEmail={supportEmail} />
      </div>
    </>
  );
}

/**
 * Trust — the proof wrapped around the pay button.
 *
 * For an unfamiliar brand or a big ticket, where the question is not what this
 * costs but whether the money will arrive anywhere. The form leads, and the
 * rail beside it answers the three things a hesitant buyer actually wants: what
 * happens after I pay, who says this worked, and what if it does not.
 */
function Trust({ profile, product, storeName, supportEmail, form, trust }: DesignProps) {
  return (
    <>
      <MerchantHeader profile={profile} storeName={storeName} />
      <Heading profile={profile} product={product} />

      <div
        className="mp-split mp-split--buy-first"
        style={{ ['--mp-cols' as string]: '1.12fr 0.88fr' }}
      >
        <Card className="mp-card--lift mp-card--accent mp-order-first">
          <CheckoutForm {...form}>{trust}</CheckoutForm>
        </Card>

        <div className="mp-stack mp-sticky mp-order-last">
          <Card>
            <OrderSummary product={product} showImage={false} showDescription={false} />
          </Card>

          <Card>
            <WhatHappensNext product={product} />
          </Card>

          <GuaranteeNote profile={profile} />
          <Quotes profile={profile} limit={2} />

          <div>
            <TrustBadges profile={profile} />
            <p className="mp-fine" style={{ marginTop: 12, display: 'flex', gap: 7 }}>
              <CheckMark />
              Your card details are entered on the payment provider site, never here.
            </p>
          </div>
        </div>
      </div>

      <PolicyFooter profile={profile} storeName={storeName} supportEmail={supportEmail} />
    </>
  );
}
