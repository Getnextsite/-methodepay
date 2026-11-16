/**
 * Layout CSS for the checkout.
 *
 * The split is deliberate: anything palette-dependent stays a CSS variable set
 * per tenant on the page root, and anything structural lives here as a class.
 * Inline styles cannot express a media query, a hover state or a focus ring —
 * which is most of what separates one layout from another, and a usable form
 * from a merely tidy one. So one stylesheet serves all six designs, and a
 * merchant palette change still needs no rebuild.
 *
 * Every class is prefixed `mp-` and only ever used inside the checkout
 * document, which is a separate page from the dashboard. Merchant custom CSS is
 * injected after this, so a merchant can override any of it.
 */
export function CheckoutStyles() {
  return <style dangerouslySetInnerHTML={{ __html: CSS }} />;
}

const CSS = `
.mp-page, .mp-page *, .mp-page *::before, .mp-page *::after { box-sizing: border-box; }
.mp-page { -webkit-font-smoothing: antialiased; }
.mp-page :focus-visible {
  outline: 2px solid var(--mp-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

/* ---------------------------------------------------------------- layout */

.mp-shell { margin: 0 auto; padding: 32px 18px 64px; }
.mp-shell--narrow { max-width: min(540px, 100%); }
.mp-shell--wide { max-width: var(--mp-width); }
.mp-shell--full { max-width: 100%; padding-left: 0; padding-right: 0; }
/* Screens after checkout: payment instructions, order status. Wide enough for
   two columns whatever width the merchant set for the checkout itself. */
.mp-shell--post { max-width: min(1140px, 100%); }

/* Two columns, ratio set per design via --mp-cols. */
.mp-split {
  display: grid;
  grid-template-columns: var(--mp-cols, 1fr 1fr);
  gap: var(--mp-gap, 22px);
  align-items: start;
}

/* After checkout: main content left, order summary right. */
.mp-split--post { --mp-cols: minmax(0, 1.5fr) minmax(300px, 1fr); --mp-gap: 24px; }

/* A rail that follows the buyer down a long form. */
.mp-sticky { position: sticky; top: 24px; }

.mp-stack { display: grid; gap: var(--mp-gap, 16px); align-content: start; }
.mp-center { text-align: center; }
.mp-measure { max-width: 34em; margin-inline: auto; }

@media (max-width: 900px) {
  .mp-split { grid-template-columns: 1fr; }
  .mp-sticky { position: static; }
  /* On one column the buy panel comes first; the pitch reads below it. */
  .mp-split--buy-first > .mp-order-last { order: 2; }
  .mp-split--buy-first > .mp-order-first { order: 1; }
  .mp-shell { padding: 22px 15px 48px; }
}

/* ---------------------------------------------------------------- surfaces */

.mp-card {
  background: var(--mp-card);
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-radius);
  padding: 22px;
}
@media (max-width: 560px) { .mp-card { padding: 18px; } }

.mp-card--lift { box-shadow: 0 24px 48px -32px rgba(0, 0, 0, 0.55); }
.mp-card--accent { border-color: color-mix(in srgb, var(--mp-primary) 38%, var(--mp-border)); }
.mp-card--flush { padding: 0; overflow: hidden; }
.mp-card--bare { background: transparent; border: 0; padding: 0; }

.mp-panel {
  padding: 16px;
  border-radius: var(--mp-radius-sm);
  border: 1px solid var(--mp-border);
  background: color-mix(in srgb, var(--mp-text) 3%, transparent);
}
.mp-panel--primary {
  border-color: color-mix(in srgb, var(--mp-primary) 32%, transparent);
  background: color-mix(in srgb, var(--mp-primary) 7%, transparent);
}

.mp-rule { border: 0; border-top: 1px solid var(--mp-border); margin: 18px 0; }
.mp-rule--tight { margin: 14px 0; }

/* ---------------------------------------------------------------- type */

.mp-eyebrow {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mp-text-faint);
}
.mp-eyebrow--primary { color: var(--mp-primary); }

.mp-title { margin: 0; font-size: 25px; line-height: 1.2; letter-spacing: -0.02em; font-weight: 700; }
.mp-title--sm { font-size: 20px; letter-spacing: -0.01em; }
.mp-title--lg { font-size: clamp(27px, 3.4vw, 34px); line-height: 1.15; letter-spacing: -0.025em; }
.mp-title--xl {
  font-size: clamp(30px, 5.4vw, 46px);
  line-height: 1.08;
  letter-spacing: -0.035em;
  font-weight: 800;
}

.mp-sub { margin: 9px 0 0; font-size: 15px; line-height: 1.6; color: var(--mp-text-muted); }
.mp-sub--lg { font-size: 16.5px; line-height: 1.62; }
.mp-note { margin: 0; font-size: 12.5px; line-height: 1.6; color: var(--mp-text-muted); }
.mp-fine { margin: 0; font-size: 11.5px; line-height: 1.6; color: var(--mp-text-faint); }

.mp-price { margin: 0; font-size: 27px; font-weight: 700; color: var(--mp-primary); letter-spacing: -0.02em; }
.mp-price--sm { font-size: 21px; }
.mp-price--xl { font-size: clamp(34px, 6vw, 48px); font-weight: 800; letter-spacing: -0.04em; }
.mp-price-row { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.mp-strike { font-size: 15px; color: var(--mp-text-faint); text-decoration: line-through; }

.mp-prose { font-size: 14px; line-height: 1.7; color: var(--mp-text-muted); }
.mp-prose--lg { font-size: 15px; }
.mp-prose > :first-child { margin-top: 0; }
.mp-prose > :last-child { margin-bottom: 0; }
.mp-prose img { max-width: 100%; height: auto; border-radius: var(--mp-radius-sm); }
.mp-prose a { color: var(--mp-primary); }

/* ---------------------------------------------------------------- bits */

.mp-ticks { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.mp-ticks > li {
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 10px;
  font-size: 14px;
  line-height: 1.5;
}
.mp-ticks svg { margin-top: 2px; }

.mp-chips { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; margin: 0; padding: 0; }
.mp-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--mp-text-muted);
  border: 1px solid var(--mp-border);
  border-radius: 999px;
  padding: 5px 11px;
  white-space: nowrap;
}

.mp-meta { margin: 0; padding: 0; display: grid; gap: 9px; font-size: 13px; }
.mp-meta-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding-bottom: 9px;
  border-bottom: 1px solid var(--mp-border);
}
.mp-meta-row:last-child { padding-bottom: 0; border-bottom: 0; }
.mp-meta dt { color: var(--mp-text-muted); }
.mp-meta dd { margin: 0; font-weight: 600; text-align: right; }

/* Product imagery in a fixed frame, so one tall photo cannot push the buy
   panel off the screen. */
.mp-media {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: var(--mp-ratio, 4 / 3);
  overflow: hidden;
  border-radius: var(--mp-radius);
  border: 1px solid var(--mp-border);
  background: color-mix(in srgb, var(--mp-text) 4%, transparent);
}
.mp-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.mp-media--tall { --mp-ratio: 1 / 1; }
.mp-media--wide { --mp-ratio: 16 / 9; }
.mp-monogram {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: clamp(56px, 13vw, 104px);
  font-weight: 800;
  letter-spacing: -0.05em;
  color: color-mix(in srgb, var(--mp-primary) 42%, transparent);
  background:
    radial-gradient(90% 90% at 50% 10%, color-mix(in srgb, var(--mp-primary) 11%, transparent), transparent 70%);
}

/* The buy box header, above the form in a product-led layout. */
.mp-buybox {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding-bottom: 16px;
  margin-bottom: 18px;
  border-bottom: 1px solid var(--mp-border);
}
.mp-media-tag {
  position: absolute;
  left: 12px;
  top: 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--mp-primary);
  color: var(--mp-primary-contrast);
}

/* Numbered steps, for the layouts that walk a buyer through. */
.mp-steps { list-style: none; counter-reset: mp 0; margin: 0; padding: 0; display: grid; gap: 14px; }
.mp-steps > li {
  counter-increment: mp;
  display: grid;
  grid-template-columns: 26px 1fr;
  gap: 12px;
  align-items: start;
}
.mp-steps > li::before {
  content: counter(mp);
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid color-mix(in srgb, var(--mp-primary) 45%, transparent);
  color: var(--mp-primary);
}

/* A money-back seal. Round, quiet, and only as loud as the number in it. */
.mp-seal {
  flex: 0 0 auto;
  width: 62px;
  height: 62px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  text-align: center;
  line-height: 1.05;
  border: 1px dashed color-mix(in srgb, var(--mp-primary) 55%, transparent);
  background: color-mix(in srgb, var(--mp-primary) 8%, transparent);
  color: var(--mp-primary);
}
.mp-seal b { display: block; font-size: 19px; letter-spacing: -0.02em; }
.mp-seal span { display: block; font-size: 8.5px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; }

.mp-quotes { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.mp-quotes--row { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.mp-quote {
  padding: 16px;
  border-radius: var(--mp-radius-sm);
  border: 1px solid var(--mp-border);
  background: color-mix(in srgb, var(--mp-text) 3%, transparent);
}
.mp-quote p { margin: 0; font-size: 13.5px; line-height: 1.65; }
.mp-quote footer { display: flex; align-items: center; gap: 9px; margin-top: 12px; }
.mp-avatar {
  width: 26px;
  height: 26px;
  flex: 0 0 auto;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  background: color-mix(in srgb, var(--mp-primary) 16%, transparent);
  color: var(--mp-primary);
}
.mp-stars { display: inline-flex; gap: 2px; color: var(--mp-primary); }

/* Express pins the total to the top, so the number never scrolls away. */
.mp-bar {
  position: sticky;
  top: 0;
  z-index: 5;
  background: color-mix(in srgb, var(--mp-bg-start) 88%, transparent);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--mp-border);
}
.mp-bar-inner {
  max-width: min(540px, 100%);
  margin: 0 auto;
  padding: 12px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

/* Hero bleeds its headline band to the full width of the viewport. */
.mp-band {
  padding: 48px 18px 40px;
  background:
    radial-gradient(120% 120% at 50% 0%, color-mix(in srgb, var(--mp-primary) 13%, transparent), transparent 62%);
}
.mp-band--foot {
  padding: 36px 18px 48px;
  border-top: 1px solid var(--mp-border);
  background: none;
}

/* ---------------------------------------------------------------- form */

.mp-form fieldset { border: 0; margin: 0; padding: 0; }
.mp-legend {
  padding: 0;
  margin-bottom: 10px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--mp-text-faint);
}
.mp-fields { display: grid; gap: 13px; }
.mp-fields--2 { grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); }

.mp-label { display: block; margin-bottom: 6px; font-size: 12.5px; font-weight: 500; color: var(--mp-text-muted); }
.mp-req { color: var(--mp-primary); }

.mp-input {
  width: 100%;
  padding: 12px 13px;
  font-size: 14px;
  font-family: inherit;
  color: var(--mp-text);
  background: color-mix(in srgb, var(--mp-text) 4%, transparent);
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-radius-sm);
  transition: border-color 0.15s, background 0.15s;
}
.mp-input::placeholder { color: var(--mp-text-faint); }
.mp-input:hover { border-color: var(--mp-border-strong); }
.mp-input:focus {
  border-color: var(--mp-primary);
  background: color-mix(in srgb, var(--mp-text) 6%, transparent);
}
.mp-input--mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: 0.06em; }
.mp-input--upper { text-transform: uppercase; }
textarea.mp-input { resize: vertical; min-height: 78px; }

/* Payment rails. The whole row is the hit target, not just the radio. */
.mp-methods { display: grid; gap: 9px; }
.mp-method {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 13px 14px;
  cursor: pointer;
  border-radius: var(--mp-radius-sm);
  border: 1px solid var(--mp-border);
  transition: border-color 0.15s, background 0.15s;
}
.mp-method:hover { border-color: var(--mp-border-strong); background: color-mix(in srgb, var(--mp-text) 3%, transparent); }
.mp-method--on {
  border-color: var(--mp-primary);
  background: color-mix(in srgb, var(--mp-primary) 8%, transparent);
}
.mp-method--on:hover { background: color-mix(in srgb, var(--mp-primary) 11%, transparent); }
.mp-method input { margin-top: 3px; accent-color: var(--mp-primary); }
.mp-method-body { min-width: 0; flex: 1; }
.mp-method-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.mp-method-name { font-weight: 600; font-size: 14px; }
.mp-method-desc { display: block; margin-top: 4px; font-size: 12.5px; line-height: 1.5; color: var(--mp-text-muted); }
.mp-dot { width: 8px; height: 8px; border-radius: 999px; display: inline-block; flex: 0 0 auto; }
.mp-tag {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  background: var(--mp-primary);
  color: var(--mp-primary-contrast);
  border-radius: 999px;
  padding: 3px 7px;
}

/* Rails laid out as a grid of buttons, for the one-tap layout. */
.mp-methods--tiles { grid-template-columns: repeat(auto-fit, minmax(154px, 1fr)); }
.mp-methods--tiles .mp-method { flex-direction: column; gap: 7px; padding: 14px; }
.mp-methods--tiles .mp-method input { position: absolute; opacity: 0; pointer-events: none; }
.mp-methods--tiles .mp-method-desc { display: none; }

.mp-totals { display: grid; gap: 8px; font-size: 13.5px; margin: 0; }
.mp-totals-row { display: flex; justify-content: space-between; gap: 12px; }
.mp-totals-row dt { color: var(--mp-text-muted); }
.mp-totals-row dd { margin: 0; }
.mp-totals-row--sum {
  border-top: 1px solid var(--mp-border);
  padding-top: 10px;
  font-size: 15.5px;
  font-weight: 700;
}
.mp-totals-row--sum dd { color: var(--mp-primary); }
.mp-totals-row--off dd { color: var(--mp-primary); }

.mp-coupon { display: flex; gap: 8px; }

.mp-btn {
  width: 100%;
  padding: 15px 18px;
  font-size: 15.5px;
  font-weight: 700;
  font-family: inherit;
  color: var(--mp-primary-contrast);
  background: var(--mp-primary);
  border: 0;
  border-radius: var(--mp-radius-sm);
  cursor: pointer;
  transition: filter 0.15s, transform 0.08s;
}
.mp-btn:hover:not(:disabled) { filter: brightness(1.07); }
.mp-btn:active:not(:disabled) { transform: translateY(1px); }
.mp-btn:disabled { opacity: 0.62; cursor: default; }
.mp-btn--lg { padding: 17px 20px; font-size: 16.5px; }

.mp-btn-ghost {
  padding: 12px 15px;
  font-size: 13.5px;
  font-weight: 600;
  font-family: inherit;
  color: var(--mp-text);
  background: transparent;
  border: 1px solid var(--mp-border-strong);
  border-radius: var(--mp-radius-sm);
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s, background 0.15s;
}
.mp-btn-ghost:hover:not(:disabled) { background: color-mix(in srgb, var(--mp-text) 5%, transparent); }
.mp-btn-ghost:disabled { opacity: 0.5; cursor: default; }

.mp-alert {
  margin: 0;
  padding: 12px 14px;
  border-radius: var(--mp-radius-sm);
  border: 1px solid rgba(255, 133, 133, 0.35);
  background: rgba(255, 133, 133, 0.1);
  color: #ff9d9d;
  font-size: 13px;
  line-height: 1.55;
}
.mp-ok { margin: 0; font-size: 12.5px; color: var(--mp-primary); }

/* ---------------------------------------------------------------- footer */

.mp-foot {
  margin-top: 30px;
  padding-top: 18px;
  border-top: 1px solid var(--mp-border);
  font-size: 11.5px;
  color: var(--mp-text-faint);
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
}
.mp-foot a { color: inherit; }
.mp-foot a:hover { color: var(--mp-text-muted); }
.mp-foot-links { display: flex; gap: 14px; }

/* ---------------------------------------------------------------- order summary */

.mp-summary-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.mp-summary-caps {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mp-text-faint);
}
.mp-pill { padding: 3px 10px; font-size: 11.5px; font-weight: 700; border-radius: 999px; white-space: nowrap; }
.mp-pill--ok { color: var(--mp-primary); background: color-mix(in srgb, var(--mp-primary) 14%, transparent); }
.mp-pill--wait { color: #f5b942; background: rgba(245, 185, 66, 0.13); }
.mp-pill--off { color: var(--mp-text-muted); background: color-mix(in srgb, var(--mp-text) 8%, transparent); }
.mp-summary-product { display: flex; align-items: center; gap: 12px; margin-top: 16px; }
.mp-summary-img {
  width: 52px;
  height: 52px;
  flex: 0 0 auto;
  object-fit: cover;
  border-radius: var(--mp-radius-sm);
  border: 1px solid var(--mp-border);
}
.mp-summary-img--blank {
  display: grid;
  place-items: center;
  font-size: 20px;
  font-weight: 800;
  color: var(--mp-primary);
  background: color-mix(in srgb, var(--mp-primary) 12%, transparent);
}
.mp-summary-name { margin: 0; font-size: 15px; font-weight: 700; line-height: 1.35; }
.mp-summary-ref { margin: 3px 0 0; font-size: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--mp-text-muted); }
.mp-summary-lines,
.mp-summary-meta { margin: 16px 0 0; padding-top: 14px; border-top: 1px solid var(--mp-border); display: grid; gap: 9px; font-size: 13.5px; }
.mp-summary-lines > div,
.mp-summary-meta > div { display: flex; justify-content: space-between; gap: 12px; }
.mp-summary-lines dt,
.mp-summary-meta dt { color: var(--mp-text-muted); }
.mp-summary-lines dd,
.mp-summary-meta dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }
.mp-summary-off dd { color: var(--mp-primary); }
.mp-summary-total { margin-top: 3px; padding-top: 10px; border-top: 1px dashed var(--mp-border); }
.mp-summary-total dt { color: var(--mp-text); font-weight: 700; }
.mp-summary-total dd { font-size: 19px; font-weight: 800; color: var(--mp-primary); }

/* The confirmation box already sits on a card; drop its own frame there. */
.mp-card > .mp-confirm { margin-top: 0; padding: 0; border: 0; }

/* ---------------------------------------------------------------- order links + portal */

.mp-order-links { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 8px 18px; font-size: 13px; }
.mp-order-links a { color: var(--mp-primary); text-decoration: none; font-weight: 600; }
.mp-order-links a:hover { text-decoration: underline; }
.mp-portal-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.mp-portal-h2 { margin: 0 0 12px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--mp-text-faint); }
.mp-portal-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
.mp-portal-order { display: grid; grid-template-columns: 1fr auto; gap: 10px 14px; align-items: center; }
.mp-portal-order-main { min-width: 0; }
.mp-portal-actions { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 8px; }
.mp-portal-link { padding: 8px 12px; font-size: 13px; text-decoration: none; display: inline-block; }
.mp-portal-link.mp-btn { width: auto; }

/* ---------------------------------------------------------------- order bump */

.mp-bump {
  border: 2px dashed color-mix(in srgb, var(--mp-primary) 55%, transparent);
  border-radius: var(--mp-radius-sm);
  background: color-mix(in srgb, var(--mp-primary) 6%, transparent);
  overflow: hidden;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.mp-bump--on {
  border-style: solid;
  border-color: var(--mp-primary);
  background: color-mix(in srgb, var(--mp-primary) 11%, transparent);
}
.mp-bump-head {
  margin: 0;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--mp-primary-contrast);
  background: var(--mp-primary);
}
.mp-bump-box { display: flex; gap: 12px; align-items: flex-start; padding: 14px; cursor: pointer; }
.mp-bump-check { margin-top: 3px; width: 18px; height: 18px; flex: 0 0 auto; accent-color: var(--mp-primary); cursor: pointer; }
.mp-bump-img { width: 56px; height: 56px; flex: 0 0 auto; object-fit: cover; border-radius: 8px; }
.mp-bump-text { display: grid; gap: 4px; min-width: 0; }
.mp-bump-title { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; }
.mp-bump-badge {
  padding: 2px 7px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  border-radius: 999px;
  color: var(--mp-primary-contrast);
  background: var(--mp-primary);
}
.mp-bump-desc { font-size: 12.5px; line-height: 1.55; color: var(--mp-text-muted); }
.mp-bump-price { display: flex; gap: 8px; align-items: baseline; font-size: 14px; }
.mp-bump-price s { color: var(--mp-text-faint); font-size: 12.5px; }
.mp-bump-price strong { color: var(--mp-primary); }

/* ---------------------------------------------------------------- upsell */

.mp-upsell {
  margin-top: 18px;
  border: 1px solid color-mix(in srgb, var(--mp-primary) 45%, var(--mp-border));
  border-radius: var(--mp-radius-sm);
  overflow: hidden;
}
.mp-upsell-head {
  margin: 0;
  padding: 9px 16px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--mp-primary-contrast);
  background: var(--mp-primary);
}
.mp-upsell-body { display: flex; gap: 14px; padding: 16px; }
.mp-upsell-img { width: 72px; height: 72px; flex: 0 0 auto; object-fit: cover; border-radius: 10px; }
.mp-upsell-title { margin: 0; font-size: 16px; font-weight: 700; }
.mp-upsell-desc { margin: 5px 0 0; font-size: 13px; line-height: 1.6; color: var(--mp-text-muted); }
.mp-upsell-price { margin: 7px 0 0; display: flex; gap: 8px; align-items: baseline; }
.mp-upsell-price s { font-size: 13px; color: var(--mp-text-faint); }
.mp-upsell-price strong { font-size: 17px; color: var(--mp-primary); }
.mp-upsell-actions { display: grid; gap: 8px; padding: 0 16px 16px; }
.mp-upsell-note { margin: 0; padding: 0 16px 14px; font-size: 11.5px; line-height: 1.55; color: var(--mp-text-faint); }

/* ---------------------------------------------------------------- payment confirmation */

.mp-confirm {
  margin-top: 18px;
  padding: 16px;
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-radius-sm);
}
.mp-confirm-title { margin: 0; font-size: 14.5px; font-weight: 700; }
.mp-confirm-sub { margin: 6px 0 0; font-size: 12.5px; line-height: 1.6; color: var(--mp-text-muted); }
.mp-confirm-ref { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--mp-text); }
.mp-confirm-channels { margin-top: 14px; display: grid; gap: 14px; }
.mp-confirm-buttons { display: grid; gap: 9px; align-content: start; }
.mp-confirm-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  color: var(--mp-text);
  border: 1px solid var(--mp-border-strong);
  border-radius: var(--mp-radius-sm);
  transition: filter 0.15s ease, background 0.15s ease;
}
.mp-confirm-btn:hover { background: color-mix(in srgb, var(--mp-text) 6%, transparent); }
.mp-confirm-btn--wa { color: #06270f; background: #25d366; border-color: #25d366; }
.mp-confirm-btn--wa:hover { background: #25d366; filter: brightness(1.06); }
.mp-confirm-qr { display: none; }
.mp-confirm-or {
  margin: 0 0 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mp-text-faint);
}
.mp-confirm-form { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--mp-border); }
.mp-confirm-done {
  margin-top: 16px;
  padding: 14px;
  border: 1px solid var(--mp-primary);
  border-radius: var(--mp-radius-sm);
  background: color-mix(in srgb, var(--mp-primary) 10%, transparent);
}

/* The QR is for buyers on a laptop or desktop (mouse or trackpad); on a phone
   or tablet the button is the fast way. */
@media (hover: hover) and (pointer: fine) {
  .mp-confirm-channels--qr { grid-template-columns: 1fr auto; align-items: center; }
  .mp-confirm-qr {
    display: grid;
    justify-items: center;
    gap: 7px;
    font-size: 11px;
    color: var(--mp-text-muted);
    text-align: center;
  }
  .mp-confirm-qr img { display: block; padding: 7px; background: #fff; border-radius: 10px; }
}

/* ---------------------------------------------------------------- handoff dialog */

.mp-modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(8, 8, 14, 0.62);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  animation: mp-modal-in 0.18s ease-out;
}
.mp-modal-card {
  width: 100%;
  max-width: 380px;
  display: grid;
  gap: 16px;
  padding: 22px;
  background: var(--mp-card);
  color: var(--mp-text);
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-radius);
  box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.55);
}
.mp-modal-head { display: flex; align-items: center; gap: 10px; }
.mp-modal-title { margin: 0; flex: 1; font-size: 16px; font-weight: 700; letter-spacing: -0.01em; }
.mp-modal-amount { font-size: 15px; font-weight: 700; color: var(--mp-primary); }
.mp-modal-qr {
  justify-self: center;
  padding: 12px;
  background: #fff;
  border-radius: var(--mp-radius-sm);
  line-height: 0;
}
.mp-modal-qr img { display: block; width: 200px; height: 200px; }
.mp-modal-actions { display: grid; gap: 10px; }
.mp-modal-actions .mp-btn-ghost { width: 100%; }
@keyframes mp-modal-in { from { opacity: 0; } to { opacity: 1; } }

/* ---------------------------------------------------------------- pay with crypto */

.mp-crypto { display: grid; gap: 22px; }
.mp-crypto-step { display: grid; gap: 10px; }
.mp-crypto-h {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 14px;
  font-weight: 700;
}
.mp-crypto-n {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 800;
  background: var(--mp-primary);
  color: var(--mp-primary-contrast);
}

.mp-coins { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 8px; }
.mp-coin {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 11px;
  text-align: left;
  font: inherit;
  color: var(--mp-text);
  background: color-mix(in srgb, var(--mp-text) 3%, transparent);
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-radius-sm);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.mp-coin:hover { border-color: color-mix(in srgb, var(--mp-primary) 45%, var(--mp-border)); }
.mp-coin[aria-selected='true'] {
  border-color: var(--mp-primary);
  background: color-mix(in srgb, var(--mp-primary) 10%, transparent);
  box-shadow: 0 0 0 1px var(--mp-primary) inset;
}
.mp-coin-badge {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 800;
  color: #fff;
}
.mp-coin-text { display: grid; min-width: 0; line-height: 1.25; }
.mp-coin-text strong { font-size: 13.5px; }
.mp-coin-text span { font-size: 11.5px; color: var(--mp-text-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.mp-nets { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 8px; }
.mp-net {
  display: grid;
  gap: 2px;
  padding: 10px 12px;
  text-align: left;
  font: inherit;
  color: var(--mp-text);
  background: transparent;
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-radius-sm);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.mp-net strong { font-size: 13px; }
.mp-net span { font-size: 11.5px; color: var(--mp-text-faint); }
.mp-net:hover { border-color: color-mix(in srgb, var(--mp-primary) 45%, var(--mp-border)); }
.mp-net[aria-selected='true'] {
  border-color: var(--mp-primary);
  background: color-mix(in srgb, var(--mp-primary) 10%, transparent);
  box-shadow: 0 0 0 1px var(--mp-primary) inset;
}
.mp-net--static { cursor: default; justify-self: start; min-width: 220px; }

.mp-paybox {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 20px;
  padding: 18px;
  border: 1px solid color-mix(in srgb, var(--mp-primary) 30%, var(--mp-border));
  border-radius: var(--mp-radius-sm);
  background: color-mix(in srgb, var(--mp-primary) 5%, transparent);
}
.mp-paybox-qr { display: grid; justify-items: center; align-content: start; gap: 8px; }
.mp-paybox-qr img, .mp-paybox-noqr {
  width: 168px;
  height: 168px;
  border-radius: 10px;
  background: #fff;
  padding: 7px;
}
.mp-paybox-noqr { display: grid; place-items: center; color: #777; font-size: 12px; }
.mp-paybox-info { min-width: 0; }
.mp-paybox-info > .mp-eyebrow { margin-bottom: 4px; }
.mp-paybox-amount {
  margin: 0;
  font-size: clamp(22px, 3.2vw, 28px);
  font-weight: 800;
  letter-spacing: -0.02em;
  word-break: break-all;
  font-variant-numeric: tabular-nums;
}
.mp-paybox-amount span { font-size: 0.55em; font-weight: 600; color: var(--mp-text-muted); letter-spacing: 0; }
.mp-paybox-amount--muted { color: var(--mp-text-muted); }
.mp-tabular { font-variant-numeric: tabular-nums; }
.mp-linkbtn {
  padding: 0;
  font: inherit;
  color: var(--mp-primary);
  background: none;
  border: 0;
  text-decoration: underline;
  cursor: pointer;
}
.mp-verify {
  margin: 12px 0 0;
  padding-left: 18px;
  position: relative;
  font-size: 12px;
  line-height: 1.55;
  color: var(--mp-text-muted);
}
.mp-verify::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 5px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--mp-text-faint);
}
.mp-verify--auto::before { background: #22c55e; box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2); }

.mp-warn {
  padding: 11px 13px;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--mp-text);
  border: 1px solid rgba(245, 158, 11, 0.45);
  background: rgba(245, 158, 11, 0.09);
  border-radius: var(--mp-radius-sm);
}

.mp-acc { display: grid; gap: 8px; }
.mp-acc details {
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-radius-sm);
  background: color-mix(in srgb, var(--mp-text) 2%, transparent);
}
.mp-acc summary {
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
}
.mp-acc summary::-webkit-details-marker { display: none; }
.mp-acc summary::after {
  content: '';
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-right: 2px solid var(--mp-text-muted);
  border-bottom: 2px solid var(--mp-text-muted);
  transform: rotate(45deg) translateY(-2px);
  transition: transform 0.15s;
}
.mp-acc details[open] summary::after { transform: rotate(-135deg) translateY(-2px); }
.mp-acc-steps, .mp-acc-body {
  margin: 0;
  padding: 0 14px 14px 32px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--mp-text-muted);
}
.mp-acc-body { padding-left: 14px; }
.mp-acc-body p { margin: 0 0 8px; }
.mp-acc-body p:last-child { margin-bottom: 0; }

@media (max-width: 560px) {
  .mp-paybox { grid-template-columns: 1fr; padding: 15px; }
  .mp-coins { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .mp-nets { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .mp-page * { transition: none !important; animation: none !important; }
}
`;
