'use client';

import { useState } from 'react';

export type UpsellOffer = {
  headline: string;
  title: string;
  description: string;
  imageUrl: string;
  price: string;
  originalPrice: string | null;
  acceptLabel: string;
  declineLabel: string;
  /** Checkout for the offered product, prefilled from this order. */
  href: string;
};

/**
 * Post-purchase offer on the order page. Accepting opens a separate checkout;
 * declining just hides it for this visit.
 */
export function UpsellCard({ offer }: { offer: UpsellOffer }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  return (
    <section className="mp-upsell" aria-label="A special offer">
      {offer.headline ? <p className="mp-upsell-head">{offer.headline}</p> : null}
      <div className="mp-upsell-body">
        {offer.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- merchant-hosted image
          <img src={offer.imageUrl} alt="" className="mp-upsell-img" loading="lazy" />
        ) : null}
        <div style={{ minWidth: 0 }}>
          <h2 className="mp-upsell-title">{offer.title}</h2>
          {offer.description ? <p className="mp-upsell-desc">{offer.description}</p> : null}
          <p className="mp-upsell-price">
            {offer.originalPrice ? <s>{offer.originalPrice}</s> : null}
            <strong>{offer.price}</strong>
          </p>
        </div>
      </div>
      <div className="mp-upsell-actions">
        <a href={offer.href} className="mp-btn" style={{ textAlign: 'center', textDecoration: 'none' }}>
          {offer.acceptLabel}
        </a>
        <button type="button" className="mp-btn-ghost" onClick={() => setHidden(true)}>
          {offer.declineLabel}
        </button>
      </div>
      <p className="mp-upsell-note">
        This is a separate purchase: you choose how to pay for it, and nothing is charged
        automatically.
      </p>
    </section>
  );
}
