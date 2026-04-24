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
  'featured',
  'frontpage',
  'hydrogen',
  'men',
  'shoes',
  'snowboards',
  'tops',
  'unisex',
  'women',
]);

const DEMO_PRODUCT_TERMS = [
  'hoodie',
  'sneaker',
  'snowboard',
  'sweatpant',
  't-shirt',
  'tshirt',
];

export function isDemoProduct(product: CatalogProductLike) {
  const vendor = product.vendor?.toLowerCase() ?? '';
  if (vendor.includes('mock.shop') || vendor === 'hydrogen') return true;

  const searchable = [
    product.handle,
    product.productType,
    product.title,
    ...(product.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return DEMO_PRODUCT_TERMS.some((term) => searchable.includes(term));
}

export function filterDemoProducts<T extends CatalogProductLike>(
  products: T[],
) {
  return products.filter((product) => !isDemoProduct(product));
}

export function isDemoCollection(collection: CatalogCollectionLike) {
  const products = collection.products?.nodes?.filter(Boolean) ?? [];
  if (products.some((product) => !isDemoProduct(product))) return false;
  if (products.length > 0) return true;

  const handle = collection.handle?.toLowerCase();
  if (handle && DEMO_COLLECTION_HANDLES.has(handle)) return true;

  const title = collection.title?.toLowerCase() ?? '';
  return title.includes('snowboard') || title.includes('mock');
}

export function filterDemoCollections<T extends CatalogCollectionLike>(
  collections: T[],
) {
  return collections.filter((collection) => !isDemoCollection(collection));
}
