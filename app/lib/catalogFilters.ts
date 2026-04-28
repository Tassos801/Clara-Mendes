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
    id: 'home-goods-lighting',
    handle: 'lighting',
    note: 'Table lamps, pendants, and ambient fixtures',
    title: 'Lighting',
  },
  {
    id: 'home-goods-textiles',
    handle: 'textiles',
    note: 'Throws, cushions, towels, and soft layers',
    title: 'Textiles',
  },
  {
    id: 'home-goods-ceramics',
    handle: 'ceramics',
    note: 'Vases, bowls, planters, and tabletop objects',
    title: 'Ceramics',
  },
  {
    id: 'home-goods-storage',
    handle: 'storage',
    note: 'Baskets, trays, boxes, and useful organizers',
    title: 'Storage',
  },
  {
    id: 'home-goods-accents',
    handle: 'accents',
    note: 'Small decor objects and finishing pieces',
    title: 'Accents',
  },
] as const;

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

const HOME_GOODS_PRODUCT_TERMS = [
  'accent',
  'basket',
  'baskets',
  'bathroom-reset',
  'bowl',
  'candle',
  'candle-warmer',
  'catchall',
  'ceramic',
  'ceramics',
  'cozy-home',
  'curtain',
  'decor',
  'drawer-reset',
  'frame',
  'home ritual',
  'home rituals',
  'home-rituals',
  'lamp',
  'lighting',
  'linen',
  'mirror',
  'object',
  'organizer',
  'planter',
  'pillow',
  'rug',
  'scent',
  'sculpture',
  'storage',
  'tabletop',
  'textile',
  'textiles',
  'throw',
  'tray',
  'vase',
  'warmer',
  'woven',
];

const OFF_THEME_VENDOR_TERMS = [
  'mock.shop',
  'hydrogen',
  'stlouisbeautyline',
  'tux-usa',
];

const OFF_THEME_PRODUCT_TERMS = [
  'acne',
  'antiseptic',
  'arthro',
  'beauty-tool',
  'collagen',
  'dress',
  'facial',
  'formal',
  'gown',
  'gua-sha',
  'hoodie',
  'ice-roller',
  'jacket',
  'journal',
  'mens pants',
  'mob',
  'nightgown',
  'pants',
  'phone-case',
  'pocket square',
  'prom',
  'satin-set',
  'sneaker',
  'snowboard',
  'supplement',
  'sweatpant',
  't-shirt',
  'tshirt',
  'tux',
  'tuxedo',
  'water-bottle',
  'wedding',
];

function getSearchableProductText(product: CatalogProductLike) {
  return [
    product.handle,
    product.productType,
    product.title,
    product.vendor,
    ...(product.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function isHomeGoodsProduct(product: CatalogProductLike) {
  const searchable = getSearchableProductText(product);
  return HOME_GOODS_PRODUCT_TERMS.some((term) =>
    searchable.includes(term.toLowerCase()),
  );
}

export function isOffThemeProduct(product: CatalogProductLike) {
  if (isOffThemeProductHandle(product.handle)) return true;

  const vendor = product.vendor?.toLowerCase() ?? '';
  if (OFF_THEME_VENDOR_TERMS.some((term) => vendor.includes(term))) {
    return true;
  }

  const searchable = getSearchableProductText(product);
  return OFF_THEME_PRODUCT_TERMS.some((term) => searchable.includes(term));
}

export function isStoreThemeProduct(product: CatalogProductLike) {
  return (
    isHomeGoodsProduct(product) &&
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
  const products = collection.products?.nodes?.filter(Boolean) ?? [];
  if (products.some((product) => !isDemoProduct(product))) return false;
  if (products.length > 0) return true;

  const handle = collection.handle?.toLowerCase();
  if (handle && DEMO_COLLECTION_HANDLES.has(handle)) return true;

  const title = collection.title?.toLowerCase() ?? '';
  return [
    'beauty',
    'dress',
    'formal',
    'gown',
    'health',
    'mock',
    'snowboard',
    'tux',
    'wellness reset',
  ].some((term) => title.includes(term));
}

export function filterDemoCollections<T extends CatalogCollectionLike>(
  collections: T[],
) {
  return collections.filter((collection) => !isDemoCollection(collection));
}
