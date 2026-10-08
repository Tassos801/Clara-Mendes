/** Merchant-owned classification. Titles and vendor names never grant membership. */
export const CLOTHING_PATH = '/clothing';
export const CLOTHING_TAG = 'clara-mendes-clothing';

export type ApprovalMetafield = {
  type?: string | null;
  value?: string | null;
};

export type ClothingProductLike = {
  handle?: string | null;
  productType?: string | null;
  tags?: string[] | null;
  storefrontApproved?: ApprovalMetafield | null;
  fulfillmentVerified?: ApprovalMetafield | null;
  collections?: {
    nodes?: Array<{
      handle: string;
      title: string;
      clothingKind?: ApprovalMetafield | null;
    }> | null;
  } | null;
};

const CATEGORIES = [
  {slug: 'leggings', label: 'Leggings', types: ['Yoga Leggings', 'Leggings']},
  {slug: 'bras', label: 'Bras', types: ['Sports Bra', 'Sports Bras', 'Bras']},
  {slug: 'shorts', label: 'Shorts', types: ['Biker Shorts', 'Shorts']},
  {
    slug: 'tops',
    label: 'Tops',
    types: [
      'Studio Top',
      'Tops',
      'T-Shirts',
      'T-Shirt',
      'Shirts',
      'Tank Tops',
      'Blouses',
      'Sweatshirts',
      'Hoodies',
    ],
  },
  {slug: 'dresses', label: 'Dresses', types: ['Dresses', 'Dress']},
  {slug: 'skirts', label: 'Skirts', types: ['Skirts', 'Skirt']},
  {slug: 'trousers', label: 'Trousers', types: ['Trousers', 'Pants', 'Jeans']},
  {
    slug: 'knitwear',
    label: 'Knitwear',
    types: ['Knitwear', 'Sweaters', 'Cardigans'],
  },
  {
    slug: 'outerwear',
    label: 'Outerwear',
    types: ['Outerwear', 'Jackets', 'Coats'],
  },
  {
    slug: 'one-pieces',
    label: 'One-pieces',
    types: ['Jumpsuits', 'Playsuits', 'Bodysuits'],
  },
] as const;

export type ClothingCategory = {slug: string; label: string};
export type ClothingCategoryCount = ClothingCategory & {count: number};
export type ClothingCapsule = {handle: string; title: string; count: number};

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

/** Only exact garment types grant membership; merchant tags cover new types. */
export function isClothingProductType(productType?: string | null) {
  const type = normalize(productType);
  return CATEGORIES.some(({types}) =>
    types.some((known) => normalize(known) === type),
  );
}

/** Garment category collections are navigation groups, not design capsules. */
export function isClothingCategoryCollection(collection: {
  handle?: string | null;
  title?: string | null;
}) {
  const handle = normalize(collection.handle);
  const title = normalize(collection.title);
  return (
    handle === 'clothing' ||
    title === 'clothing' ||
    CATEGORIES.some(
      ({slug, label, types}) =>
        handle === slug ||
        title === normalize(label) ||
        types.some((type) => title === normalize(type)),
    )
  );
}

export function clothingCategory(
  product: ClothingProductLike,
): ClothingCategory | null {
  const type = normalize(product.productType);
  const category = CATEGORIES.find((candidate) =>
    candidate.types.some((known) => normalize(known) === type),
  );
  if (category) return {slug: category.slug, label: category.label};
  if (product.tags?.some((tag) => normalize(tag) === CLOTHING_TAG)) {
    return {slug: 'clothing', label: 'Clothing'};
  }
  return null;
}

export function isClothingProduct(product: ClothingProductLike) {
  return clothingCategory(product) !== null;
}

/** Missing, inaccessible, text-typed or false approvals all fail closed. */
export function hasClothingApprovals(product: ClothingProductLike) {
  return [product.storefrontApproved, product.fulfillmentVerified].every(
    (field) => field?.type === 'boolean' && field.value === 'true',
  );
}

/** Classification only: apply the catalog eligibility filter before rendering. */
export function filterClothingProducts<T extends ClothingProductLike>(
  products: T[],
): T[] {
  return products.filter(isClothingProduct);
}

/** Counts must be built from eligible, channel-visible products. */
export function clothingCategories(
  products: ClothingProductLike[],
): ClothingCategoryCount[] {
  const counts = new Map<string, ClothingCategoryCount>();
  for (const product of products) {
    const category = clothingCategory(product);
    if (!category) continue;
    const existing = counts.get(category.slug);
    counts.set(category.slug, {...category, count: (existing?.count ?? 0) + 1});
  }
  return [
    ...CATEGORIES.map(({slug}) => counts.get(slug)),
    counts.get('clothing'),
  ].filter((category): category is ClothingCategoryCount => Boolean(category));
}

/** Capsules are explicit Shopify groups, separate from garment categories.
 * Quiet Current predates the merchant convention and retains its real group.
 */
export function clothingCapsules(
  products: ClothingProductLike[],
): ClothingCapsule[] {
  const capsules = new Map<string, ClothingCapsule>();
  for (const product of products.filter(isClothingProduct)) {
    const seen = new Set<string>();
    for (const collection of product.collections?.nodes ?? []) {
      const isCapsule =
        collection.handle === 'quiet-current' ||
        (collection.clothingKind?.type === 'single_line_text_field' &&
          collection.clothingKind.value === 'capsule');
      if (!isCapsule || isClothingCategoryCollection(collection) || seen.has(collection.handle))
        continue;
      seen.add(collection.handle);
      const previous = capsules.get(collection.handle);
      capsules.set(collection.handle, {
        handle: collection.handle,
        title: collection.title,
        count: (previous?.count ?? 0) + 1,
      });
    }
  }
  return [...capsules.values()].sort((a, b) => a.title.localeCompare(b.title));
}

/** Escapes Shopify's documented search value syntax, never GraphQL source. */
function quoteSearchValue(value: string) {
  return `"${value.replace(/[\\"]/g, (character) => `\\${character}`)}"`;
}

export const CLOTHING_PRODUCT_QUERY = `(${[
  `tag:${quoteSearchValue(CLOTHING_TAG)}`,
  ...CATEGORIES.flatMap(({types}) =>
    types.map((type) => `product_type:${quoteSearchValue(type)}`),
  ),
].join(' OR ')})`;

/** Category values are resolved against known keys; unknown input cannot widen the query. */
export function buildClothingSearchQuery({
  category,
}: {category?: string | null} = {}) {
  if (!category || category === 'all') return CLOTHING_PRODUCT_QUERY;
  if (category === 'clothing') return `tag:${quoteSearchValue(CLOTHING_TAG)}`;
  const selected = CATEGORIES.find(({slug}) => slug === category);
  return selected
    ? `(${selected.types.map((type) => `product_type:${quoteSearchValue(type)}`).join(' OR ')})`
    : 'tag:"__unknown-clothing-category__"';
}
