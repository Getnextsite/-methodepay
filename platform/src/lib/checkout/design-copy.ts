import type { CheckoutDesign } from '@prisma/client';

/**
 * How each layout is described to merchants.
 *
 * Kept out of the page module because a Next.js route file may only export
 * route conventions, and shared by the designer, the plan comparison and
 * anywhere else a layout has to be named.
 */
export const DESIGN_COPY: Record<CheckoutDesign, { name: string; tag: string; blurb: string }> = {
  CLASSIC: {
    name: 'Classic',
    tag: 'Two-column',
    blurb: 'Order summary left, methods right. The layout nobody has to learn.',
  },
  LITE: {
    name: 'Lite',
    tag: 'Single column',
    blurb: 'Stripped to product, price, pay. Fastest path on a 3G phone.',
  },
  STOREFRONT: {
    name: 'Storefront',
    tag: 'Product-led',
    blurb: 'Image, description and price block for physical or digital goods.',
  },
  EXPRESS: {
    name: 'Express',
    tag: 'One-tap',
    blurb: 'Method buttons above the fold. Built for repeat buyers.',
  },
  HERO: {
    name: 'Hero',
    tag: 'Landing page',
    blurb: 'Full-bleed headline and offer stack. Checkout as a sales page.',
  },
  TRUST: {
    name: 'Trust',
    tag: 'Proof-heavy',
    blurb: 'Badges, guarantees and testimonials framing the pay button.',
  },
};

export const ALL_DESIGNS = Object.keys(DESIGN_COPY) as CheckoutDesign[];
