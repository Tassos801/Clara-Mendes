/**
 * Editorial copy and artwork for the clothing destination, kept in one place
 * like collectionHeroes.ts. Products, prices, colours, sizes and capsule
 * membership always come from Shopify; this file only says how a capsule is
 * introduced. A new capsule without an entry still lists, filters and links
 * correctly; it just gets the generic capsule block. See
 * docs/clothing-destination.md.
 */

export type ClothingImage = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

export type CapsuleStory = {
  /** Shown as "Collection 01 / Quiet Current". */
  number: string;
  paragraphs: string[];
  art: ClothingImage & {caption: string};
  /**
   * Composite of the capsule's garments. Built from supplier digital
   * mockups, so the page labels it as such.
   */
  looksImage?: ClothingImage;
};

export const CLOTHING_HOME_FEATURE = {
  eyebrow: 'New · Clara Mendes Clothing',
  title: 'Watercolour,',
  titleEmphasis: 'worn.',
  text: 'Our first clothing collection, Quiet Current: painted mineral washes on pieces made for movement and everyday wear.',
};

const CAPSULE_STORIES: Record<string, CapsuleStory> = {
  'quiet-current': {
    number: '01',
    paragraphs: [
      'Solid colour, with translucent mineral washes at the sides and along the outer leg, painted after Clara Mendes’ Where Mist Rests. The leggings and biker shorts add a fern in shadow.',
      'Two colourways: Moss / Mist and Clay / Oat.',
    ],
    art: {
      src: '/images/clothing/mineral-strata-moss.webp',
      width: 1600,
      height: 533,
      alt: 'Soft mineral washes in moss and mist, from the Quiet Current print',
      caption: 'Mineral wash, adapted from the Quiet Current print',
    },
    looksImage: {
      src: '/images/clothing/quiet-current-looks.webp',
      width: 1360,
      height: 1000,
      alt: 'Quiet Current studio bra and leggings in Moss / Mist, and studio tank and leggings in Clay / Oat',
    },
  },
};

export function capsuleStory(handle?: string | null): CapsuleStory | null {
  return handle ? (CAPSULE_STORIES[handle] ?? null) : null;
}

/** Small accents for colour-grouped looks, matched on the colour's first word. */
const LOOK_ACCENTS: Record<string, string> = {
  moss: '/images/clothing/fern-moss.webp',
  clay: '/images/clothing/fern-clay.webp',
};

export function lookAccent(colour: string): string | null {
  const key = colour.trim().split(/[\s/]+/)[0]?.toLowerCase() ?? '';
  return LOOK_ACCENTS[key] ?? null;
}

export const CLOTHING_HERO_ACCENT = '/images/clothing/olive-mineral.webp';
