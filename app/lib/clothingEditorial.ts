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
 * and every garment image is a digital mockup. Counter-Diagonal is our own
 * composition: always credit it "Inspired by Theo van Doesburg", never "Art
 * by" or as his work. Evidence and sources:
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
  /** Shown under the capsule name, e.g. "Inspired by Theo van Doesburg". */
  credit?: string;
  /** A soft band of the capsule's art across the top of its section. */
  band?: Omit<ClothingImage, 'alt'> & {
    /** CSS object-position for the band's crop. */
    position?: string;
  };
  /**
   * Composite of the capsule's garments. Built from supplier digital
   * mockups, so the page labels it as such.
   */
  looksImage?: ClothingImage & {caption: string};
  /**
   * The page hero while this capsule leads /clothing. `text` receives the
   * kinds of garment really on sale ("hoodies, tees and totes") so the copy
   * never names a piece that is not listed.
   */
  hero?: {
    eyebrow: string;
    text: (garments: string | null) => string;
    cta: string;
  };
  /** Decorative art beside the hero button (empty alt). */
  accent?: {src: string; width: number; height: number; className: string};
};

export const CLOTHING_PAGE_HERO = {
  title: 'Clothing, with an artistic touch.',
  text: 'Leggings, a sports bra, biker shorts and a tank top, printed with a soft watercolour-style design in two colourways.',
};

const CAPSULE_STORIES: Record<string, CapsuleStory> = {
  // Our own composition (design pack Clara-Mendes-Van-Doesburg-Hoodie-
  // 2026-10-30, README: "set at Van Doesburg's 45° counter-composition
  // angle", palette red #B91616, blue #0A3B79, yellow #E3A216, black
  // #171817). Images: scripts/build-counter-diagonal-art.mjs.
  'counter-diagonal': {
    credit: 'Inspired by Theo van Doesburg',
    intro:
      'One composition of red, blue, yellow and black planes, tilted to the 45° angle of Theo van Doesburg’s counter-compositions. We drew it ourselves; it is not a copy of any of his paintings. Every piece carries the composition, its small emblem, or both.',
    band: {
      src: '/images/clothing/counter-diagonal-band.w1600.jpg',
      width: 1600,
      height: 427,
      position: 'center 40%',
    },
    looksImage: {
      src: '/images/clothing/counter-diagonal-looks.w1280.jpg',
      width: 1280,
      height: 960,
      alt: 'Counter-Diagonal heavyweight hoodie from the back, with the full diagonal composition, beside the oversized tee with the small chest emblem',
      caption:
        'Counter-Diagonal heavyweight hoodie and oversized tee. Digital mockups.',
    },
    hero: {
      eyebrow: 'New · Counter-Diagonal',
      text: (garments) =>
        `${garments ? `${garments[0].toUpperCase()}${garments.slice(1)} in` : 'Clothing in'} one geometric design, inspired by Theo van Doesburg. Made for you after you order.`,
      cta: 'Shop Counter-Diagonal',
    },
    accent: {
      src: '/images/clothing/counter-diagonal-emblem.w240.png',
      width: 240,
      height: 263,
      className: 'clothing-hero-art clothing-hero-art--emblem',
    },
  },
  'quiet-current': {
    intro:
      'A digital, watercolour-style design inspired by the layered ridges in Clara Mendes’ print Where Mist Rests. Each piece is mostly solid colour, with soft washes at the sides or along the outer leg. The leggings and biker shorts add a fern.',
    // Recoloured from the same wash layers printed on the garments
    // (assets/clothing/README.md). Plain JPEG copies, like
    // CLOTHING_PAGE_ACCENT; the band is flattened onto white, which its
    // multiply blend shows the same as transparency.
    band: {
      src: '/images/clothing/mineral-strata-moss.w1600.jpg',
      width: 1600,
      height: 533,
    },
    looksImage: {
      src: '/images/clothing/quiet-current-looks.w1280.jpg',
      width: 1280,
      height: 941,
      alt: 'Quiet Current sports bra and leggings in Moss / Mist, and tank top and leggings in Clay / Oat',
      caption: 'Quiet Current in Moss / Mist and Clay / Oat. Digital mockups.',
    },
  },
};

export function capsuleStory(handle?: string | null): CapsuleStory | null {
  return handle ? (CAPSULE_STORIES[handle] ?? null) : null;
}

/** A capsule story as loader data: everything but the hero text function. */
export type CapsuleStoryData = Omit<CapsuleStory, 'hero'>;

export function capsuleStoryData(
  handle?: string | null,
): CapsuleStoryData | null {
  const story = capsuleStory(handle);
  if (!story) return null;
  const {hero: _hero, ...data} = story;
  return data;
}

/**
 * The /clothing hero: the lead capsule's own hero when it has one, else the
 * long-standing page hero (the Quiet Current wording).
 */
export function clothingPageHero(
  handle: string | null | undefined,
  garments: string | null,
) {
  const hero = capsuleStory(handle)?.hero;
  return hero
    ? {
        eyebrow: hero.eyebrow,
        title: CLOTHING_PAGE_HERO.title,
        text: hero.text(garments),
        cta: hero.cta,
      }
    : {
        eyebrow: null,
        title: CLOTHING_PAGE_HERO.title,
        text: CLOTHING_PAGE_HERO.text,
        cta: 'Shop clothing',
      };
}

/**
 * A 600 px copy of the olive watercolour for the /clothing hero (280 CSS
 * px wide), as a palette PNG: it is transparent, and Oxygen turns a
 * transparent WebP into a PNG five times its size.
 */
export const CLOTHING_PAGE_ACCENT = {
  src: '/images/clothing/olive-mineral-720.w600.png',
  width: 600,
  height: 400,
};

/**
 * Fern sprigs from the garment print, matched on the colourway's first word,
 * shown beside each colourway in the chooser (64 CSS px tall). 96 px palette
 * PNGs, since they are transparent.
 */
const COLOURWAY_ACCENTS: Record<string, string> = {
  moss: '/images/clothing/fern-moss.w96.png',
  clay: '/images/clothing/fern-clay.w96.png',
};

export const COLOURWAY_ACCENT_SIZE = {width: 96, height: 221};

export function lookAccent(colour: string): string | null {
  const key = colour.trim().split(/[\s/]+/)[0]?.toLowerCase() ?? '';
  return COLOURWAY_ACCENTS[key] ?? null;
}
