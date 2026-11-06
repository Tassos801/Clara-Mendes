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
   * mockups, so the page labels it as such. A generic capsule uses its
   * collection image, with no caption.
   */
  looksImage?: ClothingImage & {caption: string | null};
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
  /**
   * False when the capsule's colours are just each blank's colour, not
   * coordinated colourways, so "Choose a colourway" would mislead.
   */
  colourwayChooser?: false;
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
    // Each garment comes in its own blank colour (Dust, Bone, Ivory, ...).
    colourwayChooser: false,
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
  // Our own composition (design pack Clara-Mendes-Taeuber-Arp-2026-11,
  // hero/palette.json: red #C8341E, blue #2B56AE, ochre #D9A030, rose
  // #D98A82, grey #7E7C78, black #171817). Credit "Inspired by Sophie
  // Taeuber-Arp", never "Art by". The printed pieces carry a line from her
  // 1922 essay "Bemerkungen über den Unterricht im ornamentalen Entwerfen"
  // (our translation); the cap and beanie carry the emblem only (line copy).
  // Images: scripts/build-capsule-art.mjs --handle circle-rhythm
  // --band-rows 0-0.43,0.5-0.76, from the brand-free composition and
  // emblem SVGs.
  'circle-rhythm': {
    credit: 'Inspired by Sophie Taeuber-Arp',
    // Each garment comes in its own blank colours (Dust, Bone, Ivory, ...).
    colourwayChooser: false,
    intro:
      'Circles, rings, short bars and small crosses in red, blue, ochre, rose and grey, set out in the spirit of Sophie Taeuber-Arp’s abstract compositions. We drew it ourselves; it is not a reproduction of any of her works. The printed pieces carry a line from her 1922 essay on teaching ornamental design, in our translation; the cap and beanie carry the emblem only.',
    band: {
      src: '/images/clothing/circle-rhythm-band.w1600.jpg',
      width: 1600,
      height: 427,
    },
    hero: {
      eyebrow: 'New · Circle Rhythm',
      text: (garments) =>
        `${garments ? `${garments[0].toUpperCase()}${garments.slice(1)} in` : 'Clothing in'} one design of circles, rings and bars, inspired by Sophie Taeuber-Arp. Made for you after you order.`,
      cta: 'Shop Circle Rhythm',
    },
    accent: {
      src: '/images/clothing/circle-rhythm-emblem.w240.png',
      width: 240,
      height: 240,
      className: 'clothing-hero-art clothing-hero-art--emblem',
    },
  },
  // Our own composition (design pack Clara-Mendes-Malevich-2026-11,
  // hero/palette.json: black #161616, red #C23A22, yellow-ochre #E09A18,
  // blue #2F4AB8, green #2F6B45). Credit "Inspired by Kazimir Malevich",
  // never "Art by"; the name "Malevich" is used only in the credit and copy,
  // never as a product name (trademark check, malevich-line, 6 Nov). The
  // printed pieces carry the closing line of his 1919 text "Suprematism"
  // (our translation); the cap and beanie carry the emblem only (line
  // copy). Images: scripts/build-capsule-art.mjs --handle free-abyss
  // --composition free-abyss-composition-light.svg --band-strip 0.5:1100.
  'free-abyss': {
    credit: 'Inspired by Kazimir Malevich',
    // Each garment comes in its own blank colours (White, Faded White, ...).
    colourwayChooser: false,
    intro:
      'A black wedge and a yellow-ochre plane rise on one tilted axis among red, blue and green bars and two thin signal lines, with open space all around, after Kazimir Malevich’s Suprematism. We drew it ourselves; it is not a reproduction of a Malevich painting. The printed pieces carry the closing line of his 1919 text “Suprematism”, in our translation; the cap and beanie carry the emblem only.',
    band: {
      src: '/images/clothing/free-abyss-band.w1600.jpg',
      width: 1600,
      height: 427,
    },
    hero: {
      eyebrow: 'New · Free Abyss',
      text: (garments) =>
        `${garments ? `${garments[0].toUpperCase()}${garments.slice(1)} in` : 'Clothing in'} one Suprematist design, inspired by Kazimir Malevich. Made for you after you order.`,
      cta: 'Shop Free Abyss',
    },
    accent: {
      src: '/images/clothing/free-abyss-emblem.w240.png',
      width: 240,
      height: 240,
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

/** What Shopify says about a capsule collection that has no entry here. */
export type CapsuleCollectionSummary = {
  title: string;
  description?: string | null;
  image?: {
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
};

/** At most this many characters of a collection description, cut at a sentence. */
const GENERIC_INTRO_LIMIT = 420;

function introFrom(description?: string | null) {
  const text = description?.replace(/\s+/g, ' ').trim() ?? '';
  if (text.length <= GENERIC_INTRO_LIMIT) return text;
  const cut = text.slice(0, GENERIC_INTRO_LIMIT);
  const end = cut.lastIndexOf('. ');
  return end > 80 ? cut.slice(0, end + 1) : `${cut.replace(/\s+\S*$/, '')}…`;
}

/**
 * The generic block for a capsule without an entry above: the merchant's
 * collection description as its intro and the collection image as its
 * looks image. Shopify supplies both, so nothing here makes a claim.
 */
export function genericCapsuleStory(
  summary?: CapsuleCollectionSummary | null,
): CapsuleStoryData | null {
  if (!summary) return null;
  const intro = introFrom(summary.description);
  const image = summary.image;
  return {
    intro,
    looksImage:
      image?.url && image.width && image.height
        ? {
            src: `${image.url}${image.url.includes('?') ? '&' : '?'}width=1280`,
            width: 1280,
            height: Math.round((1280 * image.height) / image.width),
            alt: image.altText || summary.title,
            caption: null,
          }
        : undefined,
  };
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
 * The /clothing hero: the lead capsule's own hero when it has one; a generic
 * one, named after the collection, for a capsule without an entry here;
 * else the long-standing page hero (the Quiet Current wording).
 */
export function clothingPageHero(
  handle: string | null | undefined,
  garments: string | null,
  generic?: {title: string; madeToOrder: boolean} | null,
) {
  const story = capsuleStory(handle);
  const hero = story?.hero;
  if (hero)
    return {
      eyebrow: hero.eyebrow,
      title: CLOTHING_PAGE_HERO.title,
      text: hero.text(garments),
      cta: hero.cta,
    };
  if (!story && generic)
    return {
      eyebrow: `New · ${generic.title}`,
      title: CLOTHING_PAGE_HERO.title,
      text: `${garments ? `${garments[0].toUpperCase()}${garments.slice(1)}` : 'Clothing'} from the ${generic.title} collection.${generic.madeToOrder ? ' Made for you after you order.' : ''}`,
      cta: `Shop ${generic.title}`,
    };
  return {
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
