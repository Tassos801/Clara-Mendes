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

export const HOME_GOODS_COLLECTIONS = [
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

const DEMO_COLLECTION_HANDLES = new Set([
  'accessories',
  'automated-collection',
  'bottoms',
  'daily-carry',
  'evening-gowns-formal-dresses',
  'featured',
  'frontpage',
  'glow-tools',
  'health-wellness',
  'hydrogen',
  'men',
  'shoes',
  'snowboards',
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
    Boolean(handle && LAUNCH_PRODUCT_HANDLES.has(handle)) &&
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
  return Boolean(handle && DEMO_COLLECTION_HANDLES.has(handle.toLowerCase()));
}

export function filterDemoProducts<T extends CatalogProductLike>(
  products: T[],
) {
  return products.filter(isStoreThemeProduct);
}

export function isDemoCollection(collection: CatalogCollectionLike) {
  const handle = collection.handle?.toLowerCase();
  if (handle && DEMO_COLLECTION_HANDLES.has(handle)) return true;

  // A collection whose sampled products are all demo products is demo too;
  // collections with any real product (or no products yet) stay visible.
  const products = collection.products?.nodes?.filter(Boolean) ?? [];
  if (products.some((product) => !isDemoProduct(product))) return false;
  if (products.length > 0) return true;

  return false;
}

export function filterDemoCollections<T extends CatalogCollectionLike>(
  collections: T[],
) {
  return collections.filter((collection) => !isDemoCollection(collection));
}
