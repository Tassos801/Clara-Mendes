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
};

export function collectionHero(handle?: string | null): CollectionHero | null {
  return handle ? (HEROES[handle.toLowerCase()] ?? null) : null;
}
