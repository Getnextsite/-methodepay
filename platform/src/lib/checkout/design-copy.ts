import type { CheckoutDesign } from '@prisma/client';

/**
 * How each layout is described to merchants.
 *
 * Merchants pick a layout from these sentences alone, so each one says what
 * the design actually leads with rather than what it looks like. Kept out of
 * the page module because a Next.js route file may only export route
 * conventions, and shared by the designer, the plan comparison and anywhere
 * else a layout has to be named.
 */
export const DESIGN_COPY: Record<CheckoutDesign, { name: string; tag: string; blurb: string }> = {
  CLASSIC: {
    name: 'Classic',
    tag: 'Two-column',
    blurb: 'Receipt on the left and it follows you down the form. The layout nobody has to learn.',
  },
  LITE: {
    name: 'Lite',
    tag: 'Single column',
    blurb: 'No cards, no imagery, no webfont to download. The fastest path on a bad connection.',
  },
  STOREFRONT: {
    name: 'Storefront',
    tag: 'Product-led',
    blurb: 'Image and description lead, and a buy box keeps the price beside you as you scroll.',
  },
  EXPRESS: {
    name: 'Express',
    tag: 'One-tap',
    blurb: 'Rails first as tiles, total pinned to the top. Built for buyers who have decided.',
  },
  HERO: {
    name: 'Hero',
    tag: 'Landing page',
    blurb: 'Full-bleed headline and offer stack, proof below the fold. Checkout as a sales page.',
  },
  TRUST: {
    name: 'Trust',
    tag: 'Proof-heavy',
    blurb: 'What happens next, the guarantee and real quotes sat beside the pay button.',
  },
};

export const ALL_DESIGNS = Object.keys(DESIGN_COPY) as CheckoutDesign[];
