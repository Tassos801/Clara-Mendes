/**
 * Every hand-sized copy the storefront shows in place of a file Oxygen
 * would re-encode (see app/lib/publicImages.ts). Widths are about 2-3x the
 * largest CSS size each image is painted at (measured at 1440 px and on a
 * 3x 390 px phone); `format: 'png'` keeps an image's transparency.
 * scripts/write-storefront-images.mjs writes them;
 * scripts/siteSpeed.node-test.mjs checks them.
 */
import {
  PRINT_CATALOG,
  collectionKind,
  printSheetImage,
} from '../../app/lib/printCatalog.ts';
import {publicImageCopy} from '../../app/lib/publicImages.ts';

/** Journal plates: covers are at most 230 CSS px wide (4:5). */
export const JOURNAL_PLATE_WIDTH = 460;

const JOURNAL_PLATES = [
  'quiet-form',
  'patina-blue',
  'sunlit-mosaic',
  'neo-deco',
  'midnight-garden',
].flatMap((slug) =>
  [1, 2].map((plate) => `/images/product-art/${slug}/${slug}-0${plate}.webp`),
);

/** Gallery-page hero mockups: 4:3 crops, 670 CSS px wide on desktop. */
const GALLERY_MOCKUPS = [
  'sunlit-mosaic/sunlit-mosaic-01',
  'sunlit-mosaic/sunlit-mosaic-02',
  'patina-blue/patina-blue-01',
  'patina-blue/patina-blue-03',
  'neo-deco/neo-deco-01',
  'neo-deco/neo-deco-02',
  'midnight-garden/midnight-garden-01',
  'midnight-garden/midnight-garden-02',
  'quiet-form/quiet-form-01',
  'quiet-form/quiet-form-03',
].map((name) => `/images/product-art-mockups/${name}-room-detail-20x24.webp`);
export const GALLERY_HERO_WIDTHS = [1000, 1600];

const SKY_SWATCHES = ['classic', 'compass', 'full', 'minimal'].flatMap(
  (layout) =>
    ['linen', 'midnight-garden', 'quiet-form'].map(
      (theme) => `/images/your-sky/swatch-${layout}-${theme}.webp`,
    ),
);

const PASTEL_POTS = ['blush-arc', 'sage-stem', 'blue-drift', 'butter-sun'].map(
  (id) => `/images/pastel-plant-pots/${id}.webp`,
);

/** Museum sheets on the artists index, at their own size (<= 263 CSS px). */
const ARTIST_SHEETS = PRINT_CATALOG.collections
  .filter((collection) => collectionKind(collection) === 'museum')
  .flatMap((collection) =>
    collection.prints.map((print) => {
      const sheet = printSheetImage(collection, print);
      return {
        src: `/images/product-art/${collection.slug}/${print.slug}.sheet-small.webp`,
        widths: [sheet.width],
      };
    }),
  );

export const STOREFRONT_IMAGE_SOURCES = [
  ...JOURNAL_PLATES.map((src) => ({src, widths: [JOURNAL_PLATE_WIDTH]})),
  ...GALLERY_MOCKUPS.map((src) => ({src, widths: GALLERY_HERO_WIDTHS})),
  ...ARTIST_SHEETS,
  // Our Story: the founder portrait (339 CSS px) and the full-bleed
  // backdrop, an ICC-tagged JPEG also behind the Your Sky wall preview.
  {src: '/images/our-story/tassos-dimitriou.webp', widths: [640]},
  {src: '/images/backdrops/our-story-light.jpg', widths: [2560]},
  // Your Sky: hero (640 CSS px), occasions (390), swatches (93).
  {src: '/images/your-sky/hero-print.webp', widths: [1280]},
  ...['met', 'born', 'yes'].map((key) => ({
    src: `/images/your-sky/occasion-${key}.webp`,
    widths: [800],
  })),
  ...SKY_SWATCHES.map((src) => ({src, widths: [240], quality: 82})),
  // Pastel Forms: the pot (602 CSS px) and the series (1160 desktop, 318
  // on phones).
  ...PASTEL_POTS.map((src) => ({src, widths: [1200]})),
  {src: '/images/pastel-plant-pots/series.webp', widths: [960, 1536]},
  // Clothing hero accent (280 CSS px), a transparent watercolour.
  {
    src: '/images/clothing/olive-mineral-720.webp',
    widths: [600],
    format: 'png',
  },
  // Quiet Current: the looks composite (633 CSS px, hidden on phones) and
  // the colourway ferns (64 CSS px tall, transparent).
  {src: '/images/clothing/quiet-current-looks.webp', widths: [1280]},
  ...['moss', 'clay'].map((tone) => ({
    src: `/images/clothing/fern-${tone}.webp`,
    widths: [96],
    format: 'png',
  })),
  // The collection band (1240 CSS px) is transparent but drawn with
  // mix-blend-mode: multiply, where white leaves the section showing
  // exactly as transparency did, so it flattens onto white as a JPEG.
  {
    src: '/images/clothing/mineral-strata-moss.webp',
    widths: [1600],
    flatten: '#ffffff',
  },
];

/** One entry per file written: source, copy path, width, format. */
export const STOREFRONT_IMAGE_COPIES = STOREFRONT_IMAGE_SOURCES.flatMap(
  ({src, widths, format = 'jpg', quality = 78, flatten}) =>
    widths.map((width) => ({
      flatten,
      format,
      quality,
      src,
      to: publicImageCopy(src, width, format),
      width,
    })),
);
