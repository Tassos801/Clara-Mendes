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

export const CLOTHING_HERO_ACCENT = '/images/clothing/olive-mineral.webp';
