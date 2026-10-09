/**
 * Editorial copy and artwork for the clothing destination, kept in one place
 * like collectionHeroes.ts. Products, prices, colours, sizes and capsule
 * membership always come from Shopify; this file only says how the line and
 * each capsule are introduced. A new capsule without an entry still lists,
 * filters and links correctly; it just gets the generic capsule block. See
 * docs/clothing-destination.md.
 *
 * Keep every sentence checkable: the Quiet Current print is a code-generated,
 * watercolour-style design (never "painted" or "adapted from" a painting),
 * the garments are printed, cut and sewn by the supplier after each order,
 * and every garment image is a digital mockup. Evidence and sources:
 * docs/clothing-destination.md#copy-evidence.
 */

export type ClothingImage = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

export type CapsuleStory = {
  /** One short paragraph: what the print is and where it sits. */
  intro: string;
  /** A soft watercolour band across the top of the collection section. */
  band?: Omit<ClothingImage, 'alt'>;
  /**
   * Composite of the capsule's garments. Built from supplier digital
   * mockups, so the page labels it as such.
   */
  looksImage?: ClothingImage & {caption: string};
};

export const CLOTHING_PAGE_HERO = {
  title: 'Clothing, with an artistic touch.',
  text: 'Leggings, a sports bra, biker shorts and a tank top, printed with a soft watercolour-style design in two colourways.',
};

export const CLOTHING_HOME_FEATURE = {
  eyebrow: 'New · Clara Mendes Clothing',
  title: 'Clothing, with an',
  titleEmphasis: 'artistic touch.',
  text: 'Quiet Current: leggings, a sports bra, biker shorts and a tank top with a soft watercolour-style print.',
};

const CAPSULE_STORIES: Record<string, CapsuleStory> = {
  'quiet-current': {
    intro:
      'A digital, watercolour-style design inspired by the layered ridges in Clara Mendes’ print Where Mist Rests. Each piece is mostly solid colour, with soft washes at the sides or along the outer leg. The leggings and biker shorts add a fern.',
    // Recoloured from the same wash layers printed on the garments
    // (assets/clothing/README.md).
    band: {
      src: '/images/clothing/mineral-strata-moss.webp',
      width: 1600,
      height: 533,
    },
    looksImage: {
      src: '/images/clothing/quiet-current-looks.webp',
      width: 1360,
      height: 1000,
      alt: 'Quiet Current sports bra and leggings in Moss / Mist, and tank top and leggings in Clay / Oat',
      caption: 'Quiet Current in Moss / Mist and Clay / Oat. Digital mockups.',
    },
  },
};

export function capsuleStory(handle?: string | null): CapsuleStory | null {
  return handle ? (CAPSULE_STORIES[handle] ?? null) : null;
}

/** Homepage feature accent (full size). */
export const CLOTHING_HERO_ACCENT = '/images/clothing/olive-mineral.webp';

/** Smaller copy of the same olive watercolour for the /clothing hero. */
export const CLOTHING_PAGE_ACCENT = {
  src: '/images/clothing/olive-mineral-720.webp',
  width: 720,
  height: 480,
};

/**
 * Fern sprigs from the garment print, matched on the colourway's first word,
 * shown beside each colourway in the chooser.
 */
const COLOURWAY_ACCENTS: Record<string, string> = {
  moss: '/images/clothing/fern-moss.webp',
  clay: '/images/clothing/fern-clay.webp',
};

export function lookAccent(colour: string): string | null {
  const key = colour.trim().split(/[\s/]+/)[0]?.toLowerCase() ?? '';
  return COLOURWAY_ACCENTS[key] ?? null;
}
