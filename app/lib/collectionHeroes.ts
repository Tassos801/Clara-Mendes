import {APPAREL_SHIPPING_FROM_EUR} from './storefrontBasics.ts';

/**
 * Collections whose catalog hero replaces the shared art-print interior with
 * their own image and copy. The image keeps its left side quiet so the white
 * title stays legible; the mobile crop is anchored right.
 */
export type CollectionHero = {
  eyebrow: string;
  subtitle?: string;
  image: string;
  imageMobile: string;
  alt: string;
};

const HEROES: Record<string, CollectionHero> = {
  'quiet-current': {
    eyebrow: 'Activewear · the movement edit',
    subtitle: `Leggings, studio bra, biker shorts and tank with a watercolour-style mist print. Moss / Mist and Clay / Oat, XS–XL. Clothing shipping from €${APPAREL_SHIPPING_FROM_EUR}, one fee per order.`,
    image: '/images/quiet-current/collection-hero.jpg',
    imageMobile: '/images/quiet-current/collection-hero-mobile.jpg',
    alt: 'Quiet Current studio bra and leggings in Moss / Mist, and tank and leggings in Clay / Oat, laid on the collection’s mist-and-fern print',
  },
  // Our own composition: credit "Inspired by Theo van Doesburg", never "Art
  // by". Images: scripts/build-counter-diagonal-art.mjs (Printful mockups).
  // No money in the subtitle, so it reads the same in every market.
  'counter-diagonal': {
    eyebrow: 'Clothing · Inspired by Theo van Doesburg',
    subtitle:
      'One geometric design on hoodies, tees and more, tilted to the 45° angle of Van Doesburg’s counter-compositions. Made for you after you order.',
    image: '/images/clothing/counter-diagonal-collection-hero.jpg',
    imageMobile: '/images/clothing/counter-diagonal-collection-hero-mobile.jpg',
    alt: 'Counter-Diagonal heavyweight hoodie from the back and oversized tee with the chest emblem, digital mockups on deep blue',
  },
};

export function collectionHero(handle?: string | null): CollectionHero | null {
  return handle ? (HEROES[handle.toLowerCase()] ?? null) : null;
}
