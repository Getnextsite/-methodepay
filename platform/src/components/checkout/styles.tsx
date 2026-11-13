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

/* Two columns, ratio set per design via --mp-cols. */
.mp-split {
  display: grid;
  grid-template-columns: var(--mp-cols, 1fr 1fr);
  gap: var(--mp-gap, 22px);
  align-items: start;
}

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

@media (prefers-reduced-motion: reduce) {
  .mp-page * { transition: none !important; animation: none !important; }
}
`;
