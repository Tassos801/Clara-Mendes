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

type HeroEntry = CollectionHero & {
  /**
   * The subtitle for a US (USD) buyer: `shipping` is checkout's fee for one
   * piece to the US, or null when no quote came back (no figure then).
   */
  usSubtitle?: (shipping: string | null) => string;
};

const QUIET_CURRENT_LEAD =
  'Leggings, studio bra, biker shorts and tank with a watercolour-style mist print. Moss / Mist and Clay / Oat, XS–XL.';

const HEROES: Record<string, HeroEntry> = {
  'quiet-current': {
    eyebrow: 'Activewear · the movement edit',
    subtitle: `${QUIET_CURRENT_LEAD} Clothing shipping from €${APPAREL_SHIPPING_FROM_EUR}, one fee per order.`,
    usSubtitle: (shipping) =>
      shipping
        ? `${QUIET_CURRENT_LEAD} Clothing shipping ${shipping} to the United States, one fee per order.`
        : `${QUIET_CURRENT_LEAD} One clothing shipping fee per order.`,
    image: '/images/quiet-current/collection-hero.jpg',
    imageMobile: '/images/quiet-current/collection-hero-mobile.jpg',
    alt: 'Quiet Current studio bra and leggings in Moss / Mist, and tank and leggings in Clay / Oat, laid on the collection’s mist-and-fern print',
  },
  // Our own composition: credit "Inspired by Theo van Doesburg", never "Art
  // by". Images: scripts/build-counter-diagonal-art.mjs (Printful mockups;
  // the hoodie back carries the official logo credit since 2026-11-06, see
  // clothingEditorial.ts).
  // No money in the subtitle, so it reads the same in every market.
  'counter-diagonal': {
    eyebrow: 'Clothing · Inspired by Theo van Doesburg',
    subtitle:
      'One geometric design on hoodies, tees and more, tilted to the 45° angle of Van Doesburg’s counter-compositions. Made for you after you order.',
    image: '/images/clothing/counter-diagonal-collection-hero.jpg',
    imageMobile: '/images/clothing/counter-diagonal-collection-hero-mobile.jpg',
    alt: 'Counter-Diagonal heavyweight hoodie from the back and oversized tee with the chest emblem, digital mockups on deep blue',
  },
  // Our own composition: credit "Inspired by Sophie Taeuber-Arp", never
  // "Art by". Images: scripts/build-capsule-art.mjs --handle circle-rhythm
  // --looks (Printful mockups with the official logo credit). No money in
  // the subtitle, so it reads the same in every market.
  'circle-rhythm': {
    eyebrow: 'Clothing · Inspired by Sophie Taeuber-Arp',
    subtitle:
      'One design of circles, rings and bars on hoodies, tees and more, with a line from her 1922 essay on the printed pieces. Made for you after you order.',
    image: '/images/clothing/circle-rhythm-collection-hero.jpg',
    imageMobile: '/images/clothing/circle-rhythm-collection-hero-mobile.jpg',
    alt: 'Circle Rhythm heavyweight hoodie from the back and oversized tee with the chest emblem, digital mockups on blue',
  },
  // Our own composition: credit "Inspired by Kazimir Malevich", never "Art
  // by". Images: scripts/build-capsule-art.mjs --handle free-abyss --looks
  // --trim (Printful mockups with the official logo credit), on the line's
  // black #161616. No money in the subtitle.
  'free-abyss': {
    eyebrow: 'Clothing · Inspired by Kazimir Malevich',
    subtitle:
      'One Suprematist design of a black wedge and an ochre plane on hoodies, tees and more, with the closing line of his 1919 text on the printed pieces. Made for you after you order.',
    image: '/images/clothing/free-abyss-collection-hero.jpg',
    imageMobile: '/images/clothing/free-abyss-collection-hero-mobile.jpg',
    alt: 'Free Abyss heavyweight hoodie from the back and oversized tee with the chest emblem, digital mockups on black',
  },
};

// Plain heroes for loader data (no function field), built once so each
// handle always returns the same object.
const PLAIN_HEROES: Record<string, CollectionHero> = Object.fromEntries(
  Object.entries(HEROES).map(([handle, {usSubtitle: _us, ...hero}]) => [
    handle,
    hero,
  ]),
);

export function collectionHero(handle?: string | null): CollectionHero | null {
  return handle ? (PLAIN_HEROES[handle.toLowerCase()] ?? null) : null;
}

/** True when this hero's subtitle names a shipping fee (quote it for the US). */
export function heroNamesShipping(handle?: string | null): boolean {
  return Boolean(handle && HEROES[handle.toLowerCase()]?.usSubtitle);
}

/** The hero as a US (USD) buyer reads it, with checkout's fee or none. */
export function usCollectionHero(
  handle: string | null | undefined,
  shipping: string | null,
): CollectionHero | null {
  const entry = handle ? HEROES[handle.toLowerCase()] : undefined;
  if (!entry) return null;
  const {usSubtitle, ...hero} = entry;
  return usSubtitle ? {...hero, subtitle: usSubtitle(shipping)} : hero;
}
