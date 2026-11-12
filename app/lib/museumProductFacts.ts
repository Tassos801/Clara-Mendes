// Relative imports keep this module loadable by the plain-Node test runner.
import {
  ART_PRODUCT_CATALOG,
  ART_PRODUCT_FAMILIES,
  FAMILY_SPECS,
  artProductByHandle,
  type ArtProductCatalog,
  type ArtProductFamily,
  type ShippingReach,
} from './artProductCatalog.ts';
import {
  ART_REGISTRY,
  findArtist,
  findArtwork,
  type ArtRegistry,
} from './artRegistry.ts';
import {
  PRINT_CATALOG,
  PRINT_SIZES,
  collectionKind,
  printHandle,
  type PrintCatalog,
  type PrintSizeKey,
} from './printCatalog.ts';
import {
  DISPATCH_WINDOW_BUSINESS_DAYS,
  fulfilmentWindows,
} from './storefrontBasics.ts';

/**
 * What a museum product is, in words a shopper (or an assistant reading the
 * page) matches on: the product type, its size, the work and the artist.
 * Built from the released catalogs (data/print-catalog.json museum
 * collections and data/art-product-catalog.json), so a new family or work
 * describes itself the day it releases.
 */
export type MuseumProductFacts = {
  /** The art-product family, or 'print' for a print-catalog art print. */
  family: ArtProductFamily | 'print';
  /** "Throw blanket", "Art print", … */
  noun: string;
  /** ", 50 × 60 in" / ", 8 × 10, 16 × 20 or 20 × 24 in" / " for iPhone …". */
  sizes: string;
  work: string;
  artist: string;
  /** The museum's date for the work ("ca. 1830–32"), when recorded. */
  date: string | null;
  /** The print catalog's one- or two-sentence caption of the work. */
  caption: string;
};

type Sources = {
  artProducts?: ArtProductCatalog;
  catalog?: PrintCatalog;
  registry?: ArtRegistry;
};

const META_MAX = 155;

/** The meta-description noun of a family; the catalog noun otherwise. */
const FAMILY_NOUN: Partial<Record<ArtProductFamily, string>> = {
  'framed-print': 'framed art print',
  canvas: 'canvas print',
  'phone-case': 'tough phone case',
};

function capitalise(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function joinOr(items: string[]) {
  return items.length < 2
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} or ${items.at(-1)}`;
}

function joinAnd(items: string[]) {
  return items.length < 2
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

/**
 * "8 × 10 in", "16 × 20 in" -> "8 × 10 or 16 × 20 in" when every size shares
 * its unit; labels like "A3 (42 × 29.7 cm)" lose the bracket.
 */
export function sizePhrase(labels: string[]) {
  const clean = [
    ...new Set(labels.map((label) => label.replace(/\s*\(.*\)\s*$/, ''))),
  ];
  const unit = clean[0]?.match(/\s(in|cm|oz)$/)?.[1];
  if (unit && clean.every((label) => label.endsWith(` ${unit}`)))
    return `${joinOr(clean.map((label) => label.slice(0, -unit.length - 1)))} ${unit}`;
  return joinOr(clean);
}

const DEVICE_BRANDS: Array<[RegExp, string]> = [
  [/^iphone/i, 'iPhone'],
  [/^(samsung|galaxy)/i, 'Samsung Galaxy'],
  [/^(google|pixel)/i, 'Google Pixel'],
];

function deviceBrands(options: string[]) {
  return DEVICE_BRANDS.filter(([pattern]) =>
    options.some((option) => pattern.test(option)),
  ).map(([, brand]) => brand);
}

/** The released museum product behind a handle, described; null otherwise. */
export function museumProductFacts(
  handle?: string | null,
  {
    artProducts = ART_PRODUCT_CATALOG,
    catalog = PRINT_CATALOG,
    registry = ART_REGISTRY,
  }: Sources = {},
): MuseumProductFacts | null {
  const key = handle?.trim().toLowerCase();
  if (!key) return null;
  const credit = (artworkId?: string) => {
    const artwork = artworkId ? findArtwork(artworkId, registry) : null;
    const artist = artwork ? findArtist(artwork.artistId, registry) : null;
    return artwork && artist ? {artwork, artist} : null;
  };

  const product = artProductByHandle(key, artProducts);
  if (product) {
    if (product.released !== true) return null;
    const collection = catalog.collections.find(
      (entry) => entry.slug === product.collection,
    );
    const print = collection?.prints.find(
      (entry) => entry.slug === product.print,
    );
    const who = credit(product.artworkId);
    if (!print || !who) return null;
    const spec = FAMILY_SPECS[product.family];
    const options = product.variants.map((variant) =>
      (variant.option ?? '').split(' / ')[0].trim(),
    );
    const sizes =
      product.family === 'phone-case'
        ? ` for ${joinAnd(deviceBrands(options))}`
        : `, ${sizePhrase(spec.single ? [spec.single.option] : options)}`;
    return {
      family: product.family,
      noun: capitalise(FAMILY_NOUN[product.family] ?? spec.noun),
      sizes,
      work: print.title,
      artist: who.artist.name,
      date: who.artwork.date || null,
      caption: print.description,
    };
  }

  for (const collection of catalog.collections) {
    if (collectionKind(collection) !== 'museum') continue;
    const print = collection.prints.find((entry) => printHandle(entry) === key);
    if (!print) continue;
    if (print.released !== true) return null;
    const who = credit(print.artworkId);
    if (!who) return null;
    const sizes = (print.releasedSizes ?? [])
      .map((size) => PRINT_SIZES[size as PrintSizeKey]?.label)
      .filter((label): label is string => Boolean(label));
    return {
      family: 'print',
      noun: 'Art print',
      sizes: sizes.length ? `, ${sizePhrase(sizes)}` : '',
      work: print.title,
      artist: who.artist.name,
      date: who.artwork.date || null,
      caption: print.description,
    };
  }
  return null;
}

/** Cuts at a word boundary and marks the cut; never mid-word. */
export function clipAtWord(text: string, maxLength: number) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  const room = normalized.slice(0, maxLength - 1);
  const cut = room.lastIndexOf(' ');
  return `${(cut > 0 ? room.slice(0, cut) : room).replace(/[\s,;:.–—-]+$/, '')}…`;
}

/**
 * The product page's meta description: what it is first ("Throw blanket,
 * 50 × 60 in: The Great Wave off Kanagawa by Katsushika Hokusai (ca.
 * 1830–32)."), then the caption, whole when it fits, else cut at a word.
 * Null for anything that is not a released museum product.
 */
export function museumMetaDescription(
  handle?: string | null,
  sources: Sources = {},
  maxLength = META_MAX,
): string | null {
  const facts = museumProductFacts(handle, sources);
  if (!facts) return null;
  const lead = (withDate: boolean) =>
    `${facts.noun}${facts.sizes}: ${facts.work} by ${facts.artist}${
      withDate && facts.date ? ` (${facts.date})` : ''
    }.`;
  const caption = facts.caption.replace(/\s+/g, ' ').trim();
  for (const withDate of [true, false]) {
    const whole = `${lead(withDate)} ${caption}`;
    if (whole.length <= maxLength) return whole;
  }
  const head = lead(true).length <= maxLength ? lead(true) : lead(false);
  const room = maxLength - head.length - 1;
  // A caption stub shorter than a few words says nothing; stop at the lead.
  if (room < 30) return clipAtWord(head, maxLength);
  return `${head} ${clipAtWord(caption, room)}`;
}

/** A released museum product type, for llms.txt. */
export type MuseumFamilyFacts = {
  family: ArtProductFamily | 'print';
  /** Plural, lower-case, as in running text: "throw blankets". */
  label: string;
  /** The first spec bullet: material and make. */
  spec: string;
  /** Every released size ("8 × 12, 12 × 16 or 16 × 24 in"), or the devices. */
  sizes: string;
  dispatch: string;
  reach: ShippingReach;
  /** Print-catalog collections that sell it. */
  collections: string[];
};

const FAMILY_LABEL: Record<ArtProductFamily, string> = {
  'framed-print': 'framed prints',
  canvas: 'stretched canvas prints',
  'greeting-card': 'greeting cards',
  postcard: 'postcards',
  'phone-case': 'tough phone cases',
  mug: 'mugs',
  'hanger-print': 'prints with a wooden hanger',
  'acrylic-print': 'acrylic prints',
  'metal-print': 'metal prints',
  'printful-mug': 'mugs',
  cushion: 'cushions',
  blanket: 'throw blankets',
};

/**
 * Every museum product type with at least one released product, art prints
 * first, then the families in catalog order.
 */
export function releasedMuseumFamilies({
  artProducts = ART_PRODUCT_CATALOG,
  catalog = PRINT_CATALOG,
}: Sources = {}): MuseumFamilyFacts[] {
  const museumCollections = catalog.collections.filter(
    (collection) => collectionKind(collection) === 'museum',
  );
  const printCollections = museumCollections.filter((collection) =>
    collection.prints.some((print) => print.released === true),
  );
  const prints: MuseumFamilyFacts[] = printCollections.length
    ? [
        {
          family: 'print',
          label: 'art prints',
          spec: 'Giclée print in archival pigment inks on 200gsm Enhanced Matte Art paper, unframed, the whole work on a white border',
          sizes: sizePhrase(
            [
              ...new Set(
                printCollections.flatMap((collection) =>
                  collection.prints.flatMap((print) =>
                    print.released ? (print.releasedSizes ?? []) : [],
                  ),
                ),
              ),
            ]
              .sort(
                (a, b) =>
                  Object.keys(PRINT_SIZES).indexOf(a) -
                  Object.keys(PRINT_SIZES).indexOf(b),
              )
              .map((size) => PRINT_SIZES[size as PrintSizeKey].label),
          ),
          dispatch: DISPATCH_WINDOW_BUSINESS_DAYS,
          reach: 'worldwide',
          collections: printCollections.map((collection) => collection.title),
        },
      ]
    : [];
  const families = ART_PRODUCT_FAMILIES.flatMap((family) => {
    const released = artProducts.products.filter(
      (product) => product.family === family && product.released === true,
    );
    if (!released.length) return [];
    const spec = FAMILY_SPECS[family];
    const windows = fulfilmentWindows(
      spec.productType,
      released[0].handle,
      spec.tags,
      spec.printfulTechnique ?? null,
    );
    const collections = museumCollections
      .filter((collection) =>
        released.some((product) => product.collection === collection.slug),
      )
      .map((collection) => collection.title);
    const options = released.flatMap((product) =>
      product.variants.map((variant) =>
        (variant.option ?? '').split(' / ')[0].trim(),
      ),
    );
    return [
      {
        family,
        label: FAMILY_LABEL[family],
        spec: spec.bullets[0],
        sizes:
          family === 'phone-case'
            ? `${joinAnd(deviceBrands(options))} models`
            : sizePhrase(spec.single ? [spec.single.option] : options),
        dispatch: windows?.dispatch ?? DISPATCH_WINDOW_BUSINESS_DAYS,
        reach: spec.shippingReach,
        collections,
      },
    ];
  });
  return [...prints, ...families];
}
