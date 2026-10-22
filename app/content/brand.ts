/**
 * The brand voice in one place. Pages import these sentences instead of
 * holding their own, so the line reads the same everywhere and a change
 * is one edit. "Original" is no longer the umbrella claim: the capsules
 * are "our own work", museum reproductions are "borrowed from museums",
 * and everything else is called what it is.
 *
 * Relative imports only: scripts/brand.node-test.mjs loads this file in
 * plain Node, which cannot resolve the Vite "~" alias.
 */

export type HeroTile = {
  href: string;
  image: {alt: string; height: number; src: string; width: number};
  /** Short italic chip on the tile. Lower case, no full stop. */
  tag: string;
};

/**
 * The curiosity grid. Six very different things we make, each with a
 * small aside. Desktop shows all six; phones show the first four, so
 * the first four must stand on their own.
 */
export const HERO_TILES: readonly HeroTile[] = [
  {
    href: '/products/quiet-form-i-art-print',
    image: {
      alt: 'Quiet Form I: warm ivory arches and a charcoal circle, an art print of our own',
      height: 1400,
      src: '/images/product-art/quiet-form/quiet-form-01.webp',
      width: 1120,
    },
    tag: 'our own print',
  },
  {
    href: '/artists/hokusai',
    image: {
      alt: 'The Great Wave off Kanagawa by Hokusai, printed on a white-bordered sheet',
      height: 1280,
      src: '/images/product-art/floating-world/the-great-wave-off-kanagawa.sheet.webp',
      width: 1600,
    },
    tag: 'a borrowed Hokusai',
  },
  {
    href: '/products/art-tough-phone-case?Artwork=Midnight+Garden+I',
    image: {
      alt: 'A phone case printed edge to edge with the Midnight Garden artwork',
      height: 2000,
      src: '/images/art-product-extensions/snap-phone-case/midnight-garden.webp',
      width: 1600,
    },
    tag: 'a phone case',
  },
  {
    href: '/clothing',
    image: {
      alt: 'The Quiet Current studio tank in Moss / Mist, laid flat',
      height: 1125,
      src: 'https://cdn.shopify.com/s/files/1/1027/6533/0766/files/01-moss-flat-front_e847210a-10f9-4c6c-b296-0eedb07b5afd.jpg?width=900',
      width: 900,
    },
    tag: 'a tank top?',
  },
  {
    href: '/pastel-forms',
    image: {
      alt: 'The Butter Sun ceramic plant pot, pale yellow with a soft sun mark',
      height: 1254,
      src: '/images/pastel-plant-pots/butter-sun.webp',
      width: 1254,
    },
    tag: 'yes, a pot',
  },
  {
    href: '/book-nooks',
    image: {
      alt: 'The Twilight Library book nook, a lit miniature room between books',
      height: 1250,
      src: '/images/curated/twilight-library-diy-book-nook-kit/03-front.webp',
      width: 1000,
    },
    tag: 'a tiny world for your shelf',
  },
];

export const BRAND = {
  hero: {
    headline: "We don't know what we'll make next.",
    line: "We like art, and we promise it won't be boring.",
    primaryCta: {href: '/collections/all', label: 'See what we made'},
    secondaryCta: {href: '/our-story', label: 'Our story'},
    footnote:
      "Prints · phone cases · clothing · plant pots · book nooks · whatever's next",
  },
  collection: {
    eyebrow: 'Our own work',
    title: 'The collection so far.',
    /** `${works}` and `${capsules}` are number words from catalogSummary. */
    intro: (works: string, capsules: string) =>
      `Our own work: ${works} pieces in ${capsules} capsules, printed to order.`,
    cta: 'Shop the prints',
    note:
      'Unframed giclée prints in up to three sizes, on 200gsm Enhanced Matte Art paper, printed to order.',
  },
  livingEdit: {
    title: 'Art, made to live with.',
    footer: ['Our own prints', 'Tactile materials', 'Everyday living'],
  },
  storyBand: {
    eyebrow: 'Our story',
    title: 'It started with fifteen prints. Then it got interesting.',
    body: "Now there's clothing, ceramics, phone cases and book nooks. Next? We honestly don't know.",
    cta: 'Read the story',
  },
  ourStory: {
    title: "We like art. That's the plan.",
    intro: [
      'Clara Mendes started with fifteen prints of our own. Then we put art on phone cases, clothing and plant pots, and borrowed a few masterpieces from museums.',
      "We don't know what comes next. We promise it won't be boring.",
    ],
    capsulesLede:
      'Each capsule is a small family of our own works, composed so a single print carries a room and a pair or trio reads as one arrangement. Buy one now and add its companions later.',
    caseNote:
      'Every one of our own prints on a matte, dual-layer tough case for iPhone, Samsung Galaxy and Google Pixel.',
    closing: "Come back soon. It'll be different.",
    /** Meta description; kept under 155 characters. */
    description:
      "Clara Mendes started with fifteen prints of our own. Now: museum masterpieces, phone cases, clothing, plant pots and book nooks. Never boring.",
  },
  shopAll: {
    heading: "Everything we've made so far",
    eyebrow: 'Our own work, borrowed masterpieces, curious objects',
    description:
      'Shop Clara Mendes: our own art prints, museum masterpieces, canvas, cards, phone cases, ceramic plant pots, book nook kits and activewear.',
    printsOnlyDescription:
      'Shop our own Clara Mendes art prints, from quiet geometry to cinematic imagined worlds.',
    collectionFallback: 'A Clara Mendes collection: art on things worth living with.',
  },
  footer: {
    blurb:
      'We like art and follow it wherever it goes: our own prints, works borrowed from museums, and things you use every day.',
  },
  seo: {
    homeTitle: 'Art Prints, Clothing and Curious Objects | Clara Mendes',
    homeDescription:
      'We like art and follow it wherever it goes: our own prints, museum masterpieces, phone cases, clothing, plant pots and book nooks. Never boring.',
    defaultDescription:
      'We like art and follow it wherever it goes: our own prints, museum masterpieces, phone cases, clothing, plant pots and book nooks. Never boring.',
    manifestDescription:
      'Our own prints, museum masterpieces, clothing, phone cases, plant pots and book nooks.',
    journalDescription:
      "Karina of Time — καρίνα, Greek for keel — is the Clara Mendes journal: notes on art, colour, and whatever we're making next. New issues by email.",
  },
} as const;
