// Relative imports keep this module loadable by the plain-Node test runner.
import {
  ART_PRODUCT_CATALOG,
  type ArtProductCatalog,
  type ShippingReach,
} from './artProductCatalog.ts';
import {lifeDatesLabel, type ArtRegistry} from './artRegistry.ts';
import {
  ARTIST_PRODUCT_FAMILIES,
  artistPath,
  publicArtists,
} from './artistShops.ts';
import {CAPSULES, shopCapsulePath} from './capsules.ts';
import {ORIGINAL_ART_COLLECTIONS} from './catalogFilters.ts';
import {
  clothingCapsules,
  clothingCategoryRank,
  type ClothingProductLike,
} from './clothing.ts';
import {CLOTHING_ARTISTS} from './clothingArtists.ts';
import {galleryPagePath, listGalleryPages} from './galleryPages.ts';
import {releasedMuseumFamilies} from './museumProductFacts.ts';
import {
  PRINT_CATALOG,
  collectionKind,
  printHandle,
  releasedPrintCollections,
  type PrintCatalog,
} from './printCatalog.ts';
import {
  DELIVERY_EU_BUSINESS_DAYS,
  DELIVERY_INTERNATIONAL_BUSINESS_DAYS,
  DELIVERY_US_BUSINESS_DAYS,
  DISPATCH_WINDOW_BUSINESS_DAYS,
  RETURN_WINDOW_DAYS,
  STOREFRONT_ORIGIN,
  SUPPORT_EMAIL,
} from './storefrontBasics.ts';

/**
 * /llms.txt (llmstxt.org): the plain-text map AI assistants read when they
 * crawl the shop. The brand voice and policy facts are written here; every
 * list of product types, collections, works and artists is built from the
 * released catalogs (data/print-catalog.json, data/art-product-catalog.json,
 * the art registry) and, for clothing, from the listed Shopify products, so
 * a release shows up here the day it ships. Timings and reach come from the
 * storefrontBasics constants and the family specs the product pages use.
 * scripts/llmsTxt.node-test.mjs fails when a released family or an artist
 * with released products is missing.
 */

/** The clothing the shop lists now: garment types and design lines. */
export type ClothingSummary = {
  /** Plural, lower-case garment types in page order ("hoodies", …). */
  types: string[];
  /** Capsule collections in page order, lead line first. */
  lines: Array<{handle: string; title: string}>;
};

type Sources = {
  artProducts?: ArtProductCatalog;
  catalog?: PrintCatalog;
  registry?: ArtRegistry;
};

const url = (path: string) => `${STOREFRONT_ORIGIN}${path}`;

const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];
const TENS = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
];

export function numberWord(value: number): string {
  if (value < 20) return NUMBER_WORDS[value] ?? String(value);
  if (value < 100) {
    const unit = value % 10;
    return `${TENS[Math.floor(value / 10)]}${unit ? `-${NUMBER_WORDS[unit]}` : ''}`;
  }
  return String(value);
}

function capitalise(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function lowerFirst(text: string) {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function joinAnd(items: string[]) {
  return items.length < 2
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

function surname(name: string) {
  return name.split(' ').at(-1) ?? name;
}

/** The garment types and lines of the listed clothing (newest first). */
export function clothingSummary(
  products: ClothingProductLike[],
  isOffTheme: (handle: string) => boolean = () => false,
): ClothingSummary {
  const types = [...products]
    .sort((a, b) => clothingCategoryRank(a) - clothingCategoryRank(b))
    .map((product) => {
      const type = (product.productType ?? '').trim().toLowerCase();
      return !type || type.endsWith('s') ? type : `${type}s`;
    });
  return {
    types: [...new Set(types)].filter(Boolean),
    lines: clothingCapsules(products)
      .filter((capsule) => !isOffTheme(capsule.handle))
      .map(({handle, title}) => ({handle, title})),
  };
}

/** Where a museum family ships, in the product pages' words. */
function reachPhrase(reach: ShippingReach) {
  if (reach === 'eu') return 'ships within the EU only';
  if (reach === 'selected')
    return 'ships across the EU, and outside the EU to selected countries (checkout confirms the address)';
  return 'ships across the EU and to most other countries, not the United Kingdom';
}

type MuseumCollection = {
  slug: string;
  title: string;
  note: string;
  works: number;
  labels: string[];
  artists: Array<{name: string; path: string}>;
  /** The shop filter, when the collection has released art prints. */
  path: string | null;
};

function museumCollections(sources: Sources): MuseumCollection[] {
  const catalog = sources.catalog ?? PRINT_CATALOG;
  const artProducts = sources.artProducts ?? ART_PRODUCT_CATALOG;
  const families = releasedMuseumFamilies(sources);
  const artists = publicArtists(sources);
  const withPrints = new Set(
    releasedPrintCollections(catalog).map((collection) => collection.slug),
  );
  return catalog.collections.flatMap((collection) => {
    if (collectionKind(collection) !== 'museum') return [];
    const works = new Set([
      ...collection.prints
        .filter((print) => print.released === true)
        .map((print) => print.slug),
      ...artProducts.products
        .filter(
          (product) =>
            product.released === true && product.collection === collection.slug,
        )
        .map((product) => product.print),
    ]);
    if (!works.size) return [];
    const handles = new Set([
      ...collection.prints.map(printHandle),
      ...artProducts.products
        .filter((product) => product.collection === collection.slug)
        .map((product) => product.handle),
    ]);
    return [
      {
        slug: collection.slug,
        title: collection.title,
        note: collection.note,
        works: works.size,
        labels: [
          ...new Set(
            families
              .filter((family) => family.collections.includes(collection.title))
              .map((family) => family.label),
          ),
        ],
        artists: artists
          .filter((entry) =>
            entry.products.some((product) => handles.has(product.handle)),
          )
          .map((entry) => ({
            name: entry.artist.name,
            path: artistPath(entry.artist),
          })),
        path: withPrints.has(collection.slug)
          ? shopCapsulePath(collection.slug)
          : null,
      },
    ];
  });
}

/** The first released product of a family, as a worked example. */
function exampleProduct(family: string, sources: Sources) {
  const catalog = sources.catalog ?? PRINT_CATALOG;
  const artProducts = sources.artProducts ?? ART_PRODUCT_CATALOG;
  if (family === 'print') {
    for (const collection of catalog.collections) {
      if (collectionKind(collection) !== 'museum') continue;
      const print = collection.prints.find((entry) => entry.released === true);
      if (print)
        return {handle: printHandle(print), title: `${print.title} Art Print`};
    }
    return null;
  }
  const product = artProducts.products.find(
    (entry) => entry.family === family && entry.released === true,
  );
  return product ? {handle: product.handle, title: product.title} : null;
}

export function buildLlmsTxt({
  clothing = null,
  ...sources
}: Sources & {clothing?: ClothingSummary | null} = {}): string {
  const catalog = sources.catalog ?? PRINT_CATALOG;
  const studio = releasedPrintCollections(catalog).filter(
    (collection) => collection.kind === 'studio',
  );
  const ownWorks =
    CAPSULES.reduce((sum, capsule) => sum + capsule.handles.length, 0) +
    studio.reduce((sum, collection) => sum + collection.handles.length, 0);
  const ownCapsules = ORIGINAL_ART_COLLECTIONS.length + studio.length;
  const museum = museumCollections(sources);
  const families = releasedMuseumFamilies(sources);
  const artists = publicArtists(sources);
  const museumNames = joinAnd(
    artists.map((entry) => surname(entry.artist.name)),
  );
  const museumTitles = joinAnd(museum.map((collection) => collection.title));
  const clothingArtists = CLOTHING_ARTISTS.filter((entry) =>
    clothing?.lines.some((line) => line.handle === entry.capsule),
  );

  const lines: string[] = [];
  const push = (...text: string[]) => lines.push(...text);

  push(
    '# Clara Mendes — shopclaramendes.com',
    '',
    '> Independent art studio shop. We like art and follow it wherever it goes.',
    `> ${capitalise(numberWord(ownWorks))} works of our own across ${numberWord(ownCapsules)} capsules, giclée-printed to order`,
    '> on 200gsm Enhanced Matte Art paper in 8 × 10, 16 × 20, and 20 × 24 in.',
    `> Around the art: public-domain museum works by ${museumNames} as`,
    `> ${joinAnd([...new Set(families.map((family) => family.label))])};`,
    '> our own works on greeting cards, postcards, stretched canvas and tough',
    '> phone cases; personalised star maps, clothing, ceramic plant pots and',
    '> DIY book nook kits. Ships to the EU and most countries; not the United',
    '> Kingdom.',
    '',
    'Key facts',
    '',
    '- The capsule prints are our own compositions; no licensed stock art.',
    `  ${museumTitles} reproduce${museum.length === 1 ? 's' : ''} public-domain works from museum open-access`,
    '  collections and credit each one.',
    `- Prints are made to order and dispatched within ${DISPATCH_WINDOW_BUSINESS_DAYS} business days; delivery`,
    `  is estimated at ${DELIVERY_EU_BUSINESS_DAYS} business days after dispatch across the EU and ${DELIVERY_INTERNATIONAL_BUSINESS_DAYS}`,
    '  elsewhere. Canvas and framed pieces ship outside the EU to selected',
    '  countries; cards and postcards ship within the EU only.',
    '- United States: prints (including hanger, acrylic and metal prints),',
    `  canvas, phone cases and unframed Your Sky maps are estimated at ${DELIVERY_US_BUSINESS_DAYS}`,
    '  business days after dispatch.',
    '- Each museum product type has its own dispatch time and reach, listed',
    '  under "Museum product types" below.',
    '- Other lines have their own timings and rates, shown on each product page',
    '  and in the shipping policy: clothing is made to order; plant pots ship untracked from the UK (not to',
    '  the US); book nook kits ship from our fulfilment partner with delivery',
    '  included.',
    '- Outside the EU, import taxes and duties may be payable on delivery.',
    `- ${RETURN_WINDOW_DAYS}-day return window from delivery for unused items; personalised orders`,
    `  and assembled kits cannot be returned. Support: ${SUPPORT_EMAIL},`,
    '  replies within one business day.',
    '- Prices in EUR (buyers in the United States see USD); secure Shopify',
    '  checkout.',
    '',
    '## Our own capsules',
    '',
    '- [Quiet Form](https://shopclaramendes.com/collections/quiet-form): warm',
    '  architectural abstracts in ivory, oat, terracotta, and charcoal.',
    '- [Patina Blue](https://shopclaramendes.com/collections/patina-blue):',
    '  weathered indigo and cobalt mineral-wash abstracts.',
    '- [Neo Deco](https://shopclaramendes.com/collections/neo-deco): graphic',
    '  Deco-inspired geometry in black, oxblood, green, and muted gold.',
    '- [Midnight Garden](https://shopclaramendes.com/collections/midnight-garden):',
    '  dark botanicals in navy, plum, teal, and copper.',
    '- [Sunlit Mosaic](https://shopclaramendes.com/collections/sunlit-mosaic):',
    '  warm collage rhythms in terracotta, ochre, olive, and cobalt.',
  );
  for (const collection of studio)
    push(
      `- [${collection.title}](${url(shopCapsulePath(collection.slug))}):`,
      `  ${lowerFirst(collection.note)} — ${numberWord(collection.handles.length)} ${collection.handles.length === 1 ? 'print' : 'prints'}.`,
    );

  push('', '## Museum collections', '');
  for (const collection of museum) {
    const name = collection.path
      ? `[${collection.title}](${url(collection.path)})`
      : collection.title;
    push(
      `- ${name}: ${collection.note}; ${numberWord(collection.works)} ${collection.works === 1 ? 'work' : 'works'} as`,
      `  ${joinAnd(collection.labels)}. By artist: ${collection.artists
        .map((artist) => `[${artist.name}](${url(artist.path)})`)
        .join(', ')}.`,
    );
  }

  push('', '## Museum product types', '');
  for (const family of families) {
    const example = exampleProduct(family.family, sources);
    push(
      `- ${capitalise(family.label)} (${joinAnd(family.collections)}): ${family.sizes}; ${lowerFirst(family.spec)}.`,
      `  Made to order and dispatched within ${family.dispatch} business days; ${reachPhrase(family.reach)}.`,
      ...(example
        ? [
            `  Example: [${example.title}](${url(`/products/${example.handle}`)}).`,
          ]
        : []),
    );
  }

  push(
    '',
    '## Artists',
    '',
    '- [Artists](https://shopclaramendes.com/artists): a shop per artist, with the',
    '  source of every work.',
  );
  for (const {artist, products} of artists) {
    const works = new Set(
      products.map((product) => product.artworkId ?? product.handle),
    ).size;
    const kinds = ARTIST_PRODUCT_FAMILIES.filter((family) =>
      products.some((product) => product.family === family),
    );
    const labels = kinds.map(
      (kind) => ARTIST_LABELS[kind] ?? kind.toLowerCase(),
    );
    const about = [lifeDatesLabel(artist), artist.nationality]
      .filter(Boolean)
      .join(', ');
    push(
      `- [${artist.name}](${url(artistPath(artist))})${about ? ` (${about})` : ''}: ${numberWord(works)} ${works === 1 ? 'work' : 'works'} as`,
      `  ${joinAnd(labels)}.`,
    );
  }
  for (const entry of clothingArtists) {
    const line = clothing?.lines.find((item) => item.handle === entry.capsule);
    push(
      `- ${entry.name} (${entry.meta.join(', ')}): inspires our clothing line`,
      `  [${line?.title ?? entry.capsule}](${url(`/collections/${entry.capsule}`)}), our own composition, not a reproduction.`,
    );
  }

  const clothingLine = clothing?.types.length
    ? [
        `- [Clothing](https://shopclaramendes.com/clothing): ${joinAnd(clothing.types)}`,
        `  in ${numberWord(clothing.lines.length)} original ${clothing.lines.length === 1 ? 'design' : 'designs'}${
          clothing.lines.length
            ? ` — ${clothing.lines
                .map((line) => {
                  const artist = CLOTHING_ARTISTS.find(
                    (entry) => entry.capsule === line.handle,
                  );
                  return `${line.title}${artist ? ` (inspired by ${artist.name})` : ''}`;
                })
                .join(', ')} —`
            : ''
        } made to order.`,
      ]
    : [
        '- [Clothing](https://shopclaramendes.com/clothing): made-to-order clothing in',
        '  our own designs, each line inspired by an artist.',
      ];

  push(
    '',
    '## Beyond the wall',
    '',
    '- [Art for Everyday Living](https://shopclaramendes.com/collections/clara-mendes-art-living):',
    '  the five founding capsules on greeting cards, postcards and stretched',
    '  canvas.',
    '- [Art Tough Phone Case](https://shopclaramendes.com/products/art-tough-phone-case):',
    `  all ${numberWord(ownWorks)} of our own works on a matte, dual-layer case for iPhone,`,
    '  Samsung Galaxy and Google Pixel.',
    '- [Your Sky](https://shopclaramendes.com/your-sky): a personalised star map of',
    '  a chosen place and minute, unframed or framed.',
    ...clothingLine,
    '- [Pastel Forms](https://shopclaramendes.com/pastel-forms): four small ceramic',
    '  plant pots in soft pastel colours.',
    '- [Book Nooks](https://shopclaramendes.com/book-nooks): ten DIY kits for',
    '  miniature rooms that sit between books on a shelf.',
    '',
    '## Curated edits',
    '',
    ...listGalleryPages().map(
      (page) => `- [${page.title}](${url(galleryPagePath(page.slug))})`,
    ),
    '',
    '## Store',
    '',
    '- [Shop all](https://shopclaramendes.com/collections/all)',
    '- [Art gifts](https://shopclaramendes.com/gifts): museum-art throw blankets,',
    '  mugs and cushions, framed prints, phone cases and book nook kits, grouped',
    '  by price.',
    '- [Our story](https://shopclaramendes.com/our-story)',
    '- [Karina of Time — journal](https://shopclaramendes.com/blogs/karina-of-time):',
    '  the studio journal (καρίνα, Greek for keel); essays on the capsules and the',
    '  rooms the prints live in, published as numbered issues.',
    '- [Shipping policy](https://shopclaramendes.com/policies/shipping-policy)',
    '- [Refund policy](https://shopclaramendes.com/policies/refund-policy)',
    '- [Contact](https://shopclaramendes.com/contact)',
  );
  return `${lines.join('\n')}\n`;
}

/** Artist-shop family labels -> the running-text labels above. */
const ARTIST_LABELS: Record<string, string> = {
  Prints: 'art prints',
  'Framed prints': 'framed prints',
  Canvas: 'stretched canvas prints',
  Cards: 'greeting cards',
  Postcards: 'postcards',
  'Phone cases': 'tough phone cases',
  'Hanger prints': 'prints with a wooden hanger',
  'Acrylic prints': 'acrylic prints',
  'Metal prints': 'metal prints',
  Mugs: 'mugs',
  Cushions: 'cushions',
  Blankets: 'throw blankets',
};
