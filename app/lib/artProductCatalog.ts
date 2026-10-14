// Relative imports keep this module loadable by the plain-Node test runner
// and by scripts/product.mjs, which cannot resolve the Vite "~" alias.
import catalogData from '../../data/art-product-catalog.json' with {type: 'json'};
import {
  ART_REGISTRY,
  findArtist,
  findArtwork,
  masterSize,
  orientationOf,
  screenArtworkRights,
  type ArtRegistry,
} from './artRegistry.ts';
import {
  cropPlan,
  MUSEUM_CROPS,
  type CropShape,
  type MuseumCrops,
  type PixelBox,
} from './museumCrops.ts';
import {
  PRINT_CATALOG,
  printSku,
  type PrintCatalog,
  type PrintCatalogCollection,
  type PrintCatalogPrint,
} from './printCatalog.ts';
import {TOUGH_CASE_PHONES} from './toughCase.ts';

/**
 * Museum works on other products (docs/artist-shops/status.md): a framed
 * print, a canvas, a greeting card, a postcard and a tough phone case per
 * artwork, each its own hidden Shopify Draft (one product per artwork per
 * type, Society6-style) — never variants of the live studio products.
 *
 * `data/art-product-catalog.json` is the single source, like the print
 * catalog: the product pipeline (`npm run product -- … --families`) writes
 * the asset records, Shopify ids and mappings into it, and a product is
 * storefront-visible only when `released` is true AND Shopify has it Active
 * and published. Validation blocks a release until the artist is approved,
 * the rights and master reviews are cleared, the crops are approved, the
 * assets are current, Shopify ids exist and every variant's fulfilment
 * mapping is verified against the current file.
 */

export const ART_PRODUCT_FAMILIES = [
  'framed-print',
  'canvas',
  'greeting-card',
  'postcard',
  'phone-case',
] as const;
export type ArtProductFamily = (typeof ART_PRODUCT_FAMILIES)[number];

/** Artist-shop product types, shared with app/lib/artistShops.ts. */
export type ArtFamilyLabel =
  'Framed prints' | 'Canvas' | 'Cards' | 'Postcards' | 'Phone cases';

export type ShippingReach = 'eu' | 'selected' | 'worldwide';

type FileSpec = {
  /** Portrait pixel size; families that follow the artwork turn it. */
  height: number;
  width: number;
  dpi: number;
  followsOrientation: boolean;
  /** Where the artwork sits inside a multi-panel file. */
  panel?: PixelBox;
};

export type ArtFamilySpec = {
  artistFamily: ArtFamilyLabel;
  /** Shopify productType, the same as the live studio product of the type. */
  productType: string;
  /** "<print title> <titleSuffix>", like "… Art Print" for prints. */
  titleSuffix: string;
  /** Prodigi Shopify-channel mapping, or the orders/paid webhook (API). */
  route: 'channel' | 'api';
  /** The approved crop (app/lib/museumCrops.ts); null keeps the work whole. */
  shape: CropShape | null;
  optionName: string;
  /** Single-variant families; phone cases have one variant per device. */
  single: {key: string; option: string; skuSuffix: string} | null;
  file: FileSpec;
  /** Lowest native ppi accepted (owner decisions of 2026-10-13). */
  minPpi: number;
  tags: string[];
  /** Product noun in running copy. */
  noun: string;
  /** How the image was made, for the product page's artwork credit. */
  reproduction: string;
  /** Spec-sheet bullets of the Shopify description. */
  bullets: string[];
  /** Product-page details, in order. */
  details: Array<{label: string; text: string}>;
  seoSuffix: string;
  shippingReach: ShippingReach;
};

const DEVICE_COUNT = TOUGH_CASE_PHONES.length;
const COLOURS = 'Printed to order; screen and print colours can vary slightly.';

export const FAMILY_SPECS: Record<ArtProductFamily, ArtFamilySpec> = {
  'framed-print': {
    artistFamily: 'Framed prints',
    productType: 'Framed Art',
    titleSuffix: 'Framed Art Print',
    route: 'channel',
    shape: null,
    optionName: 'Size',
    single: {key: '16x20', option: '16 × 20 in', skuSuffix: 'CFP16X20'},
    // The bordered 16×20 print file from `prepare`, reused as it is.
    file: {height: 6000, width: 4800, dpi: 300, followsOrientation: true},
    minPpi: 200,
    tags: ['Wall Art', 'Framed Art'],
    noun: 'framed print',
    reproduction:
      'Printed whole on a white border from a public-domain museum image.',
    bullets: [
      'Natural classic frame in solid wood with clear Perspex glazing',
      'Giclée print in archival pigment inks on 200gsm Enhanced Matte Art paper',
      '16 × 20 inch print, the full composition on a white border',
      'Delivered ready to hang',
    ],
    details: [
      {
        label: 'Frame',
        text: 'Natural classic frame in satin-laminated solid wood, with a 20 mm face and shatterproof clear Perspex glazing. Delivered ready to hang.',
      },
      {
        label: 'Print',
        text: `Giclée print in archival pigment inks on 200gsm Enhanced Matte Art paper, 16 × 20 in, with the whole composition on a white border. ${COLOURS}`,
      },
    ],
    seoSuffix:
      'Framed at 16 × 20 in and reproduced whole from a public-domain museum image.',
    shippingReach: 'selected',
  },
  canvas: {
    artistFamily: 'Canvas',
    productType: 'Canvas Art',
    titleSuffix: 'Canvas Print',
    route: 'channel',
    shape: 'canvas',
    optionName: 'Size',
    single: {key: '16x20', option: '16 × 20 in', skuSuffix: 'CAN16X20'},
    // The live canvas files: 16×20 at 150 dpi, mirror-wrapped by Prodigi.
    file: {height: 3000, width: 2400, dpi: 150, followsOrientation: true},
    minPpi: 140,
    tags: ['Wall Art', 'Canvas Art'],
    noun: 'canvas',
    reproduction:
      'Cropped to the canvas from a public-domain museum image; nothing is painted in.',
    bullets: [
      '400gsm artist-grade canvas on a 38 mm pine frame',
      '16 × 20 inch canvas with mirrored edges',
      'Ready to hang',
    ],
    details: [
      {
        label: 'Canvas',
        text: `400gsm artist-grade canvas, hand-stretched over a 38 mm pine frame at 16 × 20 in. The edges mirror the picture, so none of it wraps out of sight. Ready to hang. ${COLOURS}`,
      },
    ],
    seoSuffix:
      'On 16 × 20 in stretched canvas, cropped from a public-domain museum image.',
    shippingReach: 'selected',
  },
  'greeting-card': {
    artistFamily: 'Cards',
    productType: 'Cards',
    titleSuffix: 'Greeting Card',
    route: 'channel',
    shape: 'card',
    optionName: 'Size',
    single: {key: 'card', option: '5 × 7 in', skuSuffix: 'CARD'},
    // The live four-panel card file; the front panel holds the artwork.
    file: {
      height: 2161,
      width: 6117,
      dpi: 300,
      followsOrientation: false,
      panel: {height: 2161, left: 1529, top: 0, width: 1529},
    },
    minPpi: 300,
    tags: ['Cards'],
    noun: 'greeting card',
    reproduction:
      'Cropped to the card front from a public-domain museum image; nothing is painted in.',
    bullets: [
      '324gsm Mohawk fine-art card with a kraft envelope',
      'Blank 5 × 7 inch folded card',
      'Sent by letter post',
    ],
    details: [
      {
        label: 'Card',
        text: `Blank 5 × 7 inch folded card on 324gsm Mohawk fine-art stock, with a kraft envelope. Sent by letter post. ${COLOURS}`,
      },
    ],
    seoSuffix:
      'On a blank 5 × 7 in greeting card, cropped from a public-domain museum image.',
    shippingReach: 'eu',
  },
  postcard: {
    artistFamily: 'Postcards',
    productType: 'Postcards',
    titleSuffix: 'Postcard',
    route: 'channel',
    shape: 'postcard',
    optionName: 'Size',
    single: {key: 'postcard', option: '7 × 5 in', skuSuffix: 'POST'},
    // The live two-sided postcard file; the right half holds the artwork.
    file: {
      height: 1559,
      width: 4323,
      dpi: 300,
      followsOrientation: false,
      panel: {height: 1559, left: 2161, top: 0, width: 2162},
    },
    minPpi: 300,
    tags: ['Postcards'],
    noun: 'postcard',
    reproduction:
      'Cropped to the postcard from a public-domain museum image; nothing is painted in.',
    bullets: [
      '324gsm Mohawk card with a smooth white surface',
      '7 × 5 inch postcard, ready for an address and a stamp',
      'Sent by letter post',
    ],
    details: [
      {
        label: 'Postcard',
        text: `7 × 5 inch postcard on 324gsm Mohawk card with a smooth white surface; the back is ready for an address and a stamp. Sent by letter post. ${COLOURS}`,
      },
    ],
    seoSuffix:
      'On a 7 × 5 in postcard, cropped from a public-domain museum image.',
    shippingReach: 'eu',
  },
  'phone-case': {
    artistFamily: 'Phone cases',
    productType: 'Phone Cases',
    titleSuffix: 'Tough Phone Case',
    route: 'api',
    shape: 'case',
    optionName: 'Device',
    single: null,
    // The live tough-case contract: one 4:5 file, centre-cropped per device.
    file: {height: 2500, width: 2000, dpi: 300, followsOrientation: false},
    minPpi: 300,
    tags: ['Phone Cases', 'Tough Case'],
    noun: 'phone case',
    reproduction:
      'Cropped to the case from a public-domain museum image; nothing is painted in.',
    bullets: [
      'Matte tough case: an impact-resistant polycarbonate shell over a shock-absorbing silicone liner',
      'Printed edge to edge for the phone model you choose',
      'Similar model names are not interchangeable; check your exact model before ordering',
    ],
    details: [
      {
        label: 'Case',
        text: `Matte dual-layer tough case: an impact-resistant polycarbonate shell over a shock-absorbing silicone liner. The artwork is printed edge to edge and wraps the sides. ${COLOURS}`,
      },
      {
        label: 'Fit',
        text: `Made for the model you choose from ${DEVICE_COUNT} iPhone, Google Pixel and Samsung Galaxy models. The artwork is centred on every model; similar model names are not interchangeable, so check the model in your phone settings before ordering.`,
      },
    ],
    seoSuffix:
      'On a matte tough phone case, cropped from a public-domain museum image.',
    shippingReach: 'worldwide',
  },
};

export type ArtProductMapping = {
  verified: boolean;
  /** Channel families: the Prodigi channel product, read back on a fresh load. */
  channelProductId?: string;
  /** API families: the deployed print-file path the webhook sends to Prodigi. */
  printUrlPath?: string;
  /** The print file the verified mapping uses. */
  assetSha256?: string;
  verifiedAt?: string;
  note?: string;
};

export type ArtProductVariant = {
  /** "16x20", "card", "postcard" or a device code. */
  key: string;
  /** The Shopify option value. */
  option: string;
  sku: string;
  priceEUR: string;
  providerSku: string;
  inventory: {policy: 'DENY'; quantity: number; tracked: boolean};
  mapping: ArtProductMapping;
};

export type ArtAssetFile = {
  dpi?: number;
  height: number;
  /** Relative to the machine's launch folder, forward slashes. */
  path: string;
  sha256: string;
  width: number;
};

export type ArtProductAssets = {
  /** The rendered region in master pixels (original less trim); null when whole. */
  box: PixelBox | null;
  /** Native pixels per printed inch. */
  ppi: number;
  preparedAt: string;
  preview: ArtAssetFile;
  print: ArtAssetFile;
  sourceSignature: string;
};

export type ArtFamilyProduct = {
  artworkId: string;
  assets?: ArtProductAssets;
  /** The print-catalog collection the artwork is sold in. */
  collection: string;
  family: ArtProductFamily;
  handle: string;
  orientation: 'landscape' | 'portrait';
  /** The print-catalog print (slug) the product is derived from. */
  print: string;
  released: boolean;
  shopify?: {productId: string; variantIds: Record<string, string>};
  title: string;
  variants: ArtProductVariant[];
};

export type ArtFamilyConfig = {
  priceEUR: string;
  /** Prodigi SKU; phone cases take one per device from the case manifest. */
  providerSku: string;
  /** Prodigi dashboard settings for channel-mapped families (handoff). */
  providerSettings?: string;
};

export type ArtProductCollection = {
  /** Running copy for the family descriptions. */
  copy: string;
  families: Partial<Record<ArtProductFamily, ArtFamilyConfig>>;
  /** The print-catalog collection slug. */
  slug: string;
};

export type ArtProductCatalog = {
  $comment?: string;
  collections: ArtProductCollection[];
  currency: string;
  products: ArtFamilyProduct[];
  version: number;
};

export const ART_PRODUCT_CATALOG = catalogData as unknown as ArtProductCatalog;

/** Bumped whenever the asset renderer changes pixels. */
export const ART_ASSET_RENDERER = 1;

export function familyHandle(
  print: Pick<PrintCatalogPrint, 'slug'>,
  family: ArtProductFamily,
) {
  return `${print.slug}-${family}`;
}

export function familyTitle(
  print: Pick<PrintCatalogPrint, 'title'>,
  family: ArtProductFamily,
) {
  return `${print.title} ${FAMILY_SPECS[family].titleSuffix}`;
}

/** CM-<collection>-<sequence>-<suffix>, the print SKU scheme. */
export function familySku(
  collection: Pick<PrintCatalogCollection, 'skuCode'>,
  print: Pick<PrintCatalogPrint, 'sequence'>,
  family: ArtProductFamily,
  deviceCode?: string,
) {
  const base = `CM-${collection.skuCode}-${String(print.sequence).padStart(2, '0')}`;
  const single = FAMILY_SPECS[family].single;
  if (single) return `${base}-${single.skuSuffix}`;
  if (!deviceCode) throw new Error(`${family} SKUs need a device code`);
  return `${base}-CASE-${deviceCode}`;
}

/** Where the orders/paid webhook tells Prodigi to fetch a case file. */
export function casePrintUrlPath(
  product: Pick<ArtFamilyProduct, 'collection' | 'print'>,
) {
  return `/print-files/${product.collection}/${product.print}-phone-case.jpg`;
}

/** Pixel size of a family's production file for one orientation. */
export function familyFileSize(
  family: ArtProductFamily,
  orientation: 'landscape' | 'portrait',
) {
  const {file} = FAMILY_SPECS[family];
  return file.followsOrientation && orientation === 'landscape'
    ? {height: file.width, width: file.height}
    : {height: file.height, width: file.width};
}

/**
 * The crop a family product renders from, in master pixels, with its native
 * ppi; the phone case renders its 4:5 file box. Null for whole-work families.
 */
export function familyCrop(
  family: ArtProductFamily,
  artworkId: string,
  {
    crops = MUSEUM_CROPS,
    registry = ART_REGISTRY,
  }: {crops?: MuseumCrops; registry?: ArtRegistry} = {},
) {
  const shape = FAMILY_SPECS[family].shape;
  if (!shape) return null;
  const plan = cropPlan(artworkId, {data: crops, registry});
  const entry = plan?.shapes.find((candidate) => candidate.shape === shape);
  if (!plan || !entry) return null;
  return {
    box: entry.box,
    ppi: entry.ppi,
    render: shape === 'case' && entry.file ? entry.file : entry.box,
    size: plan.size,
  };
}

/**
 * Every pixel-affecting input of a product's files, as a stable string:
 * renderer version, family, file size and dpi, the original's checksum and
 * trim, and the crop (or the whole-work layout). Machine paths and review
 * timestamps are excluded, so it is the same on every PC. A recorded asset
 * whose signature differs is stale.
 */
export function familySourceSignature(
  product: Pick<ArtFamilyProduct, 'artworkId' | 'family' | 'orientation'>,
  {
    crops = MUSEUM_CROPS,
    registry = ART_REGISTRY,
  }: {crops?: MuseumCrops; registry?: ArtRegistry} = {},
) {
  const artwork = findArtwork(product.artworkId, registry);
  if (!artwork?.original) return '';
  const trim = artwork.trim;
  const spec = FAMILY_SPECS[product.family];
  const crop = familyCrop(product.family, product.artworkId, {
    crops,
    registry,
  });
  const file = familyFileSize(product.family, product.orientation);
  const recorded = crops.crops[product.artworkId];
  return JSON.stringify({
    renderer: ART_ASSET_RENDERER,
    family: product.family,
    file: [file.width, file.height, spec.file.dpi],
    source: artwork.original.sha256,
    trim: trim ? [trim.left, trim.top, trim.right, trim.bottom] : [0, 0, 0, 0],
    layout:
      crop && spec.shape
        ? {
            area: recorded?.area,
            box: [
              crop.render.left,
              crop.render.top,
              crop.render.width,
              crop.render.height,
            ],
            crop: recorded?.[spec.shape],
          }
        : 'bordered-16x20',
  });
}

/** What still blocks a product's release; empty when it may be released. */
export function familyReleaseIssues(
  product: ArtFamilyProduct,
  {
    crops = MUSEUM_CROPS,
    registry = ART_REGISTRY,
  }: {crops?: MuseumCrops; registry?: ArtRegistry} = {},
): string[] {
  const artwork = findArtwork(product.artworkId, registry);
  const artist = artwork && findArtist(artwork.artistId, registry);
  const spec = FAMILY_SPECS[product.family];
  const issues: string[] = [];
  if (!artist?.approval.approved) issues.push('artist approval');
  if (
    !artwork ||
    artwork.reviews.rights.status !== 'cleared' ||
    !screenArtworkRights(artwork, artist, {
      year: Number(artwork.reviews.rights.at?.slice(0, 4)) || undefined,
    }).pass
  )
    issues.push('a cleared rights review');
  if (artwork?.reviews.master.status !== 'cleared')
    issues.push('a cleared master review');
  if (spec?.shape && !crops.approval.approved) issues.push('crop approval');
  if (
    !product.assets ||
    product.assets.sourceSignature !==
      familySourceSignature(product, {crops, registry})
  )
    issues.push('current assets');
  if (
    !product.shopify?.productId ||
    product.variants.some(
      (variant) => !product.shopify?.variantIds?.[variant.key],
    )
  )
    issues.push('Shopify ids');
  if (
    product.variants.some(
      (variant) =>
        !variant.mapping.verified ||
        !product.assets ||
        variant.mapping.assetSha256 !== product.assets.print.sha256 ||
        (spec?.route === 'channel'
          ? !variant.mapping.channelProductId
          : variant.mapping.printUrlPath !== casePrintUrlPath(product)),
    )
  )
    issues.push('a verified fulfilment mapping of the current file');
  return issues;
}

export function releasedArtProductHandles(
  catalog: ArtProductCatalog = ART_PRODUCT_CATALOG,
) {
  return catalog.products
    .filter((product) => product.released === true)
    .map((product) => product.handle);
}

/** Staged family handles stay out of listings and sitemaps if published. */
export function isUnreleasedArtProductHandle(
  handle?: string | null,
  catalog: ArtProductCatalog = ART_PRODUCT_CATALOG,
) {
  const key = handle?.toLowerCase();
  if (!key) return false;
  return catalog.products.some(
    (product) => product.handle === key && product.released !== true,
  );
}

export function artProductByHandle(
  handle?: string | null,
  catalog: ArtProductCatalog = ART_PRODUCT_CATALOG,
) {
  const key = handle?.toLowerCase();
  return key
    ? (catalog.products.find((product) => product.handle === key) ?? null)
    : null;
}

export type ArtProductPage = {
  details: Array<{label: string; text: string}>;
  family: ArtProductFamily;
  shippingReach: ShippingReach;
  /**
   * The one size of a single-variant product ("16 × 20 in", "5 × 7 in"),
   * shown by the price because there is no size picker; null for cases.
   */
  size: string | null;
};

/** Product-page copy for a released family product; null otherwise. */
export function artProductPage(
  handle?: string | null,
  catalog: ArtProductCatalog = ART_PRODUCT_CATALOG,
): ArtProductPage | null {
  const product = artProductByHandle(handle, catalog);
  if (!product?.released) return null;
  const spec = FAMILY_SPECS[product.family];
  return {
    details: spec.details,
    family: product.family,
    shippingReach: spec.shippingReach,
    size: spec.single?.option ?? null,
  };
}

/** How a museum image was made into the product, for the artwork credit. */
export function reproductionSentence(
  handle?: string | null,
  catalog: ArtProductCatalog = ART_PRODUCT_CATALOG,
) {
  const product = artProductByHandle(handle, catalog);
  // Prints, like framed prints, keep the whole composition on a border.
  return FAMILY_SPECS[product?.family ?? 'framed-print'].reproduction;
}

export type ArtCaseLine = {
  attributes: Record<string, string>;
  printUrlPath: string;
  providerSku: string;
};

/**
 * The Prodigi item for a paid museum phone-case line, by Shopify SKU: only
 * for released products whose API route is verified, so a staged Draft can
 * never reach Prodigi through the webhook.
 */
export function artCaseLineForSku(
  sku?: string | null,
  catalog: ArtProductCatalog = ART_PRODUCT_CATALOG,
): ArtCaseLine | null {
  const key = sku?.trim().toUpperCase();
  if (!key) return null;
  for (const product of catalog.products) {
    if (product.family !== 'phone-case' || product.released !== true) continue;
    const variant = product.variants.find((entry) => entry.sku === key);
    if (!variant) continue;
    const phone = TOUGH_CASE_PHONES.find((entry) => entry.code === variant.key);
    if (
      !phone ||
      phone.prodigiSku !== variant.providerSku ||
      !variant.mapping.verified ||
      !variant.mapping.printUrlPath ||
      variant.mapping.printUrlPath !== casePrintUrlPath(product)
    )
      return null;
    return {
      attributes: phone.prodigiAttributes,
      printUrlPath: variant.mapping.printUrlPath,
      providerSku: variant.providerSku,
    };
  }
  return null;
}

const PRICE = /^\d+\.\d{2}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Everything that would make the family catalog unsafe to ship. Run by the
 * test suite and by every family step of `npm run product`.
 */
export function validateArtProductCatalog(
  catalog: ArtProductCatalog = ART_PRODUCT_CATALOG,
  {
    crops = MUSEUM_CROPS,
    printCatalog = PRINT_CATALOG,
    registry = ART_REGISTRY,
  }: {
    crops?: MuseumCrops;
    printCatalog?: PrintCatalog;
    registry?: ArtRegistry;
  } = {},
): string[] {
  const problems: string[] = [];
  if (catalog.currency !== 'EUR')
    problems.push('art-product-catalog: currency must be EUR');
  const collections = new Map<string, ArtProductCollection>();
  for (const entry of catalog.collections ?? []) {
    const at = `art-product-catalog collection ${entry.slug}`;
    if (collections.has(entry.slug)) problems.push(`${at}: duplicate`);
    collections.set(entry.slug, entry);
    const source = printCatalog.collections.find((c) => c.slug === entry.slug);
    if (!source) problems.push(`${at}: not a print-catalog collection`);
    else if (source.kind !== 'museum')
      problems.push(`${at}: families are for museum collections`);
    if (!entry.copy?.trim()) problems.push(`${at}: missing copy`);
    for (const [family, config] of Object.entries(entry.families ?? {})) {
      if (!ART_PRODUCT_FAMILIES.includes(family as ArtProductFamily))
        problems.push(`${at}: unknown family ${family}`);
      if (!PRICE.test(config?.priceEUR ?? ''))
        problems.push(`${at}: ${family} priceEUR must look like "29.99"`);
      if (!config?.providerSku?.trim())
        problems.push(`${at}: ${family} missing providerSku`);
    }
  }

  const printSkus = new Set(
    printCatalog.collections.flatMap((collection) =>
      collection.prints.flatMap((print) =>
        collection.variants.map((variant) =>
          printSku(collection, print, variant.size),
        ),
      ),
    ),
  );
  const handles = new Set<string>();
  const identities = new Set<string>();
  const skus = new Set<string>();
  for (const product of catalog.products ?? []) {
    const at = `art-product ${product.handle || '(no handle)'}`;
    const spec = FAMILY_SPECS[product.family];
    if (!spec) {
      problems.push(`${at}: unknown family ${product.family}`);
      continue;
    }
    if (!SLUG.test(product.handle ?? ''))
      problems.push(`${at}: invalid handle`);
    if (handles.has(product.handle)) problems.push(`${at}: duplicate handle`);
    handles.add(product.handle);
    // One product per artwork per product type.
    const identity = `${product.artworkId}:${product.family}`;
    if (identities.has(identity))
      problems.push(
        `${at}: ${product.artworkId} already has a ${product.family} product`,
      );
    identities.add(identity);
    if (typeof product.released !== 'boolean')
      problems.push(`${at}: released must be true or false`);

    const config = collections.get(product.collection)?.families[
      product.family
    ];
    if (!config)
      problems.push(
        `${at}: collection ${product.collection} does not offer ${product.family}`,
      );
    const collection = printCatalog.collections.find(
      (c) => c.slug === product.collection,
    );
    const print = collection?.prints.find((p) => p.slug === product.print);
    if (!collection || !print) {
      problems.push(
        `${at}: unknown print ${product.collection}/${product.print}`,
      );
      continue;
    }
    if (print.artworkId !== product.artworkId)
      problems.push(`${at}: artwork must be ${print.artworkId}, as its print`);
    if (product.handle !== familyHandle(print, product.family))
      problems.push(
        `${at}: handle must be ${familyHandle(print, product.family)}`,
      );
    if (product.title !== familyTitle(print, product.family))
      problems.push(
        `${at}: title must be "${familyTitle(print, product.family)}"`,
      );
    const artwork = findArtwork(product.artworkId, registry);
    const master = artwork && masterSize(artwork);
    if (!artwork) problems.push(`${at}: unknown artwork ${product.artworkId}`);
    else if (master && orientationOf(master) !== product.orientation)
      problems.push(`${at}: orientation must be ${orientationOf(master)}`);

    const expected = spec.single
      ? [
          {
            key: spec.single.key,
            option: spec.single.option,
            providerSku: config?.providerSku,
          },
        ]
      : TOUGH_CASE_PHONES.map((phone) => ({
          key: phone.code,
          option: phone.label,
          providerSku: phone.prodigiSku,
        }));
    const variants = product.variants ?? [];
    if (
      variants.length !== expected.length ||
      variants.some((variant, index) => variant.key !== expected[index].key)
    )
      problems.push(
        `${at}: variants must be ${expected.length === 1 ? expected[0].key : `the ${expected.length} case devices in manifest order`}`,
      );
    for (const [index, variant] of variants.entries()) {
      const want = expected[index];
      const where = `${at} ${variant.key}`;
      const sku = familySku(
        collection,
        print,
        product.family,
        spec.single ? undefined : variant.key,
      );
      if (variant.sku !== sku) problems.push(`${where}: SKU must be ${sku}`);
      if (skus.has(variant.sku) || printSkus.has(variant.sku))
        problems.push(`${where}: duplicate SKU ${variant.sku}`);
      skus.add(variant.sku);
      if (want && variant.option !== want.option)
        problems.push(`${where}: option must be "${want.option}"`);
      if (want && variant.providerSku !== want.providerSku)
        problems.push(`${where}: provider SKU must be ${want.providerSku}`);
      if (
        !PRICE.test(variant.priceEUR ?? '') ||
        variant.priceEUR !== config?.priceEUR
      )
        problems.push(
          `${where}: price must be the collection's ${config?.priceEUR}`,
        );
      const inventory = variant.inventory;
      if (
        inventory?.policy !== 'DENY' ||
        inventory.quantity !== 0 ||
        inventory.tracked !== !product.released
      )
        problems.push(
          product.released
            ? `${where}: a released variant is untracked with DENY`
            : `${where}: a staged variant is tracked at zero with DENY`,
        );
      if (typeof variant.mapping?.verified !== 'boolean')
        problems.push(`${where}: mapping.verified must be true or false`);
    }
    if (product.released === true)
      problems.push(
        ...familyReleaseIssues(product, {crops, registry}).map(
          (issue) => `${at}: released without ${issue}`,
        ),
      );
  }
  return problems;
}
