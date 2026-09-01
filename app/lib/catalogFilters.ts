export type CatalogProductLike = {
  handle?: string | null;
  productType?: string | null;
  tags?: string[] | null;
  title?: string | null;
  vendor?: string | null;
};

export type CatalogCollectionLike = {
  handle?: string | null;
  products?: {
    nodes?: CatalogProductLike[] | null;
  } | null;
  title?: string | null;
};

export const ORIGINAL_ART_COLLECTIONS = [
  {
    id: 'original-art-quiet-form',
    handle: 'quiet-form',
    note: 'Warm architectural forms in ivory, oat, terracotta, and charcoal',
    title: 'Quiet Form',
  },
  {
    id: 'original-art-patina-blue',
    handle: 'patina-blue',
    note: 'Weathered indigo, cobalt, slate, and translucent mineral washes',
    title: 'Patina Blue',
  },
  {
    id: 'original-art-neo-deco',
    handle: 'neo-deco',
    note: 'Graphic black geometry with oxblood, green, and muted gold',
    title: 'Neo Deco',
  },
  {
    id: 'original-art-midnight-garden',
    handle: 'midnight-garden',
    note: 'Layered moonlit botanicals in navy, plum, teal, and copper',
    title: 'Midnight Garden',
  },
  {
    id: 'original-art-sunlit-mosaic',
    handle: 'sunlit-mosaic',
    note: 'Warm collage rhythms in terracotta, ochre, olive, and cobalt',
    title: 'Sunlit Mosaic',
  },
] as const;

const ORIGINAL_ART_COLLECTION_HANDLES = new Set(
  ORIGINAL_ART_COLLECTIONS.map((collection) => collection.handle),
);

const LAUNCH_PRODUCT_HANDLES = new Set([
  'quiet-form-i-art-print',
  'quiet-form-ii-art-print',
  'quiet-form-iii-art-print',
  'patina-blue-i-art-print',
  'patina-blue-ii-art-print',
  'patina-blue-iii-art-print',
  'neo-deco-i-art-print',
  'neo-deco-ii-art-print',
  'neo-deco-iii-art-print',
  'midnight-garden-i-art-print',
  'midnight-garden-ii-art-print',
  'midnight-garden-iii-art-print',
  'sunlit-mosaic-i-art-print',
  'sunlit-mosaic-ii-art-print',
  'sunlit-mosaic-iii-art-print',
]);

export const PHONE_CASE_HANDLE = 'art-snap-phone-case';

/** Collection the extension sync assigns; hidden until a member releases. */
export const EXTENSION_COLLECTION_HANDLE = 'clara-mendes-art-living';

/**
 * Draft extension products staged for release. Keys are Shopify product
 * handles from `data/art-product-extensions.json`. A handle becomes
 * storefront-visible (search, collections, recommendations, cross-sell,
 * sitemap, PDP) only when its flag is true AND the product is Active and
 * published to the Headless channel in Shopify Admin — both are required, so
 * neither an accidental publish nor an accidental flip can release alone.
 * Flip a flag only via its release runbook (docs/phone-case-release.md)
 * after every gate is signed off.
 */
// A handle flips to true only when its family is fully mapped in the
// connected Prodigi account (every variant "Fulfilled by Prodigi
// automatically") — releasing an unmapped family would sell orders no one
// can fulfil. Notebook, tote, cushion, and phone case additionally wait on
// Prodigi template assets that live outside this repo.
export const EXTENSION_RELEASE_FLAGS: Record<string, boolean> = {
  'art-canvas-tote': false,
  'art-cover-gratitude-journal': false,
  'art-cover-spiral-notebook': false,
  'art-linen-cushion-24x24': false,
  'art-premium-fleece-blanket-30x40': false,
  [PHONE_CASE_HANDLE]: false,
  'clara-mendes-art-calendar-2026': false,
  'classic-framed-art-print-16x20': false,
  // Released 2026-09-01: mapping re-verified in the Prodigi dashboard (5/5
  // auto, Excellent), Budget letter shipping selected, delivered costs quoted
  // (DE/CY), owner approved €8/€6 retail and waived the physical sample,
  // billing + 24h order-edit window re-verified, dedicated letter-post
  // shipping profile created in Admin.
  'fine-art-greeting-card': true,
  'fine-art-postcard': true,
  'large-fine-art-print-16x20': false,
  'stretched-canvas-art-16x20': false,
};

export const SKY_PRODUCT_HANDLE = 'your-sky-star-map';
export const NATAL_PRODUCT_HANDLE = 'first-light-birth-poster';

/**
 * Personalised products staged for release. Same dual gate as extensions:
 * flag AND Shopify publication. Flip via docs/your-sky-release.md once the
 * sandbox end-to-end order has been verified; First Light follows only
 * after Your Sky's first live order proves the fulfilment chain.
 */
export const PERSONALISED_RELEASE_FLAGS: Record<string, boolean> = {
  // Released 2026-09-01 after the sandbox E2E (order #1001) passed and the
  // live key/base went into Oxygen; see docs/your-sky-release.md §5.
  [SKY_PRODUCT_HANDLE]: true,
  [NATAL_PRODUCT_HANDLE]: false,
};

export function isReleasedExtensionHandle(handle?: string | null) {
  return Boolean(handle && EXTENSION_RELEASE_FLAGS[handle.toLowerCase()]);
}

export function isStagedPersonalisedHandle(handle?: string | null) {
  return Boolean(handle && handle.toLowerCase() in PERSONALISED_RELEASE_FLAGS);
}

/** True once any personalised product is live — gates its nav entry. */
export function hasReleasedPersonalised(
  flags: Record<string, boolean> = PERSONALISED_RELEASE_FLAGS,
) {
  return Object.values(flags).some(Boolean);
}

/** True once any extension family is live — gates the "Everyday" nav. */
export function hasReleasedExtensions() {
  return Object.values(EXTENSION_RELEASE_FLAGS).some(Boolean);
}

/** Staged (flagged but not yet released) extension handles — stripped from
 * the sitemap even if a product is accidentally published. */
export function isUnreleasedExtensionHandle(handle?: string | null) {
  const key = handle?.toLowerCase();
  if (!key) return false;
  if (key in EXTENSION_RELEASE_FLAGS) return !EXTENSION_RELEASE_FLAGS[key];
  if (key in PERSONALISED_RELEASE_FLAGS) return !PERSONALISED_RELEASE_FLAGS[key];
  return false;
}

/**
 * The launch prints plus every released extension. Exported as a function so
 * tests can prove what a flag flip changes without mutating module state.
 */
export function computeSellableHandles(
  extensionFlags: Record<string, boolean> = EXTENSION_RELEASE_FLAGS,
  personalisedFlags: Record<string, boolean> = PERSONALISED_RELEASE_FLAGS,
): ReadonlySet<string> {
  const handles = new Set(LAUNCH_PRODUCT_HANDLES);
  for (const flags of [extensionFlags, personalisedFlags]) {
    for (const [handle, released] of Object.entries(flags)) {
      if (released) handles.add(handle.toLowerCase());
    }
  }
  return handles;
}

const SELLABLE_PRODUCT_HANDLES = computeSellableHandles();

const LEGACY_COLLECTION_HANDLES = new Set([
  'accessories',
  'automated-collection',
  'bottoms',
  'ceramics',
  'daily-carry',
  'evening-gowns-formal-dresses',
  'featured',
  'frontpage',
  'gift-sets',
  'glow-tools',
  'health-wellness',
  'home-rituals',
  'hydrogen',
  'lighting',
  'men',
  'shoes',
  'snowboards',
  'storage',
  'accents',
  'textiles',
  'tops',
  'unisex',
  'wellness-reset',
  'women',
]);

const OFF_THEME_PRODUCT_HANDLES = new Set([
  '3-d-flower-glitter-sheer-neckline-mesh-mermaid-long-dress',
  'acne-cream',
  'amsterdam-tuxedo-jacket-peak',
  'anthony-black-vitale-barberis-italian-wool-tuxedo-pants',
  'arthro-sup-sachets',
  'aseptin-antiseptic-wash',
  'barcelona-black-tuxedo-jacket-notch-separates',
  'bead-embroidery-sheer-neckline-v-back-chiffon-a-line-long-dress',
  'bio-cell-collagen-60-caps',
  'bradford-steel-grey-tuxedo-jacket-shawl-separates',
  'bradley-heather-grey-luxury-wool-blend-suit-pants',
  'bradley-midnight-navy-luxury-wool-blend-suit-pants',
  'capri-black-full-dress-jacket-peak-separates',
  'daily-hydration-bottle',
  'fitted-dress-with-a-sweetheart-neckline-and-thin-straps',
  'fitted-sequin-dress-with-velvet-details',
  'glow-reset-ice-roller',
  'glow-tools-duo',
  'goddessyou-signature-case',
  'havana-tuxedo-jacket-shawl',
  'herringbone-pocket-square',
  'infinity-heather-grey-tuxedo-jacket-notch-separates',
  'j19012',
  'jewel-and-bead-embellished-long-dress-with-back-cut-out',
  'logan-black-luxury-wool-blend-tuxedo-pants',
  'long-bell-sleeve-lace-satin-gown',
  'milan-black-tuxedo-jacket-peak-separates',
  'reset-journal',
  'sebastian-grey-pindot-tuxedo-jacket-shawl-separates',
  'soft-sleep-satin-set',
  'strapless-floral-ball-gown',
  'the-daily-carry-pouch',
]);

const UNFULFILLABLE_PRODUCT_HANDLES = new Set([
  'drawer-reset-bundle',
  'soft-reset-candle',
  'the-home-ritual-warmer',
]);

const OFF_THEME_VENDOR_TERMS = [
  'mock.shop',
  'hydrogen',
  'stlouisbeautyline',
  'tux-usa',
];

/**
 * The current catalog is intentionally allowlisted. A product cannot become
 * sellable through the Hydrogen storefront merely because a supplier app or
 * old import publishes it in Shopify.
 */
export function isOffThemeProduct(product: CatalogProductLike) {
  if (isOffThemeProductHandle(product.handle)) return true;

  const vendor = product.vendor?.toLowerCase() ?? '';
  return OFF_THEME_VENDOR_TERMS.some((term) => vendor.includes(term));
}

export function isStoreThemeProduct(product: CatalogProductLike) {
  const handle = product.handle?.toLowerCase();

  return (
    Boolean(handle && SELLABLE_PRODUCT_HANDLES.has(handle)) &&
    !isOffThemeProduct(product) &&
    !isUnfulfillableProductHandle(product.handle)
  );
}

export function isDemoProduct(product: CatalogProductLike) {
  return !isStoreThemeProduct(product);
}

export function isOffThemeProductHandle(handle?: string | null) {
  return Boolean(handle && OFF_THEME_PRODUCT_HANDLES.has(handle.toLowerCase()));
}

export function isUnfulfillableProductHandle(handle?: string | null) {
  return Boolean(
    handle && UNFULFILLABLE_PRODUCT_HANDLES.has(handle.toLowerCase()),
  );
}

export function isOffThemeCollectionHandle(handle?: string | null) {
  return Boolean(handle && LEGACY_COLLECTION_HANDLES.has(handle.toLowerCase()));
}

export function filterDemoProducts<T extends CatalogProductLike>(
  products: T[],
) {
  return products.filter(isStoreThemeProduct);
}

export function isDemoCollection(collection: CatalogCollectionLike) {
  const handle = collection.handle?.toLowerCase();
  if (handle && LEGACY_COLLECTION_HANDLES.has(handle)) return true;

  // Keep populated collections only when they contain an approved product.
  // Empty legacy collections were the source of stale navigation leaking into
  // the live storefront, so only the five intentional art capsule handles may
  // appear before Shopify products are assigned.
  const hasProductSample = Array.isArray(collection.products?.nodes);
  const products = collection.products?.nodes?.filter(Boolean) ?? [];
  if (products.some((product) => !isDemoProduct(product))) return false;
  if (products.length > 0) return true;

  // With no product sample to judge by (the collection route's pre-query
  // guard), admit the extension collection once any extension is flagged.
  // An explicit empty product sample is the post-query check and must remain
  // hidden so a premature flag can never expose a zero-product page.
  if (handle === EXTENSION_COLLECTION_HANDLE && hasReleasedExtensions()) {
    return hasProductSample;
  }

  return !handle || !ORIGINAL_ART_COLLECTION_HANDLES.has(handle);
}

export function filterDemoCollections<T extends CatalogCollectionLike>(
  collections: T[],
) {
  return collections.filter((collection) => !isDemoCollection(collection));
}
