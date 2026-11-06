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

/**
 * Page order: the Counter-Diagonal garments first (the line advertised),
 * then activewear, then other kinds, accessories last. Hats and tote bags
 * count as clothing only by these exact types: the museum Art Canvas Tote is
 * typed "Bags" and must stay off /clothing.
 */
const CATEGORIES = [
  {slug: 'hoodies', label: 'Hoodies', types: ['Hoodies', 'Hoodie']},
  {
    slug: 'sweatshirts',
    label: 'Sweatshirts',
    types: ['Sweatshirts', 'Sweatshirt'],
  },
  {slug: 't-shirts', label: 'T-shirts', types: ['T-Shirts', 'T-Shirt']},
  {
    slug: 'long-sleeves',
    label: 'Long sleeves',
    types: ['Long Sleeve Shirts', 'Long Sleeve Shirt', 'Long Sleeve T-Shirts'],
  },
  {
    slug: 'tops',
    label: 'Tops',
    types: ['Studio Top', 'Tops', 'Shirts', 'Tank Tops', 'Blouses'],
  },
  {slug: 'leggings', label: 'Leggings', types: ['Yoga Leggings', 'Leggings']},
  {slug: 'bras', label: 'Bras', types: ['Sports Bra', 'Sports Bras', 'Bras']},
  {slug: 'shorts', label: 'Shorts', types: ['Biker Shorts', 'Shorts']},
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
  {
    slug: 'accessories',
    label: 'Accessories',
    types: ['Hats', 'Caps', 'Beanies', 'Tote Bags'],
  },
] as const;

/**
 * A capsule is a published collection with `custom.collection_kind` =
 * `capsule` that holds a listed garment, so a new line (an artist capsule)
 * lists without a code change. Counter-Diagonal leads /clothing (the line
 * advertised in New York); the others follow, newest piece first.
 */
export const LEAD_CLOTHING_CAPSULE = 'counter-diagonal';

/**
 * Capsules from before the metafield, counted by handle. Quiet Current's
 * collection has no `custom.collection_kind` (Storefront read, 2026-11-06);
 * drop it here once the collection carries the metafield.
 */
export const LEGACY_CLOTHING_CAPSULES = ['quiet-current'] as const;

type CapsuleCollectionLike = {
  handle: string;
  title?: string | null;
  clothingKind?: ApprovalMetafield | null;
};

/** The metafield (or the lead or a legacy handle) makes a capsule. */
export function isClothingCapsuleCollection(collection: CapsuleCollectionLike) {
  const handle = normalize(collection.handle);
  const tagged =
    collection.clothingKind?.type === 'single_line_text_field' &&
    normalize(collection.clothingKind.value) === 'capsule';
  return (
    (tagged ||
      handle === LEAD_CLOTHING_CAPSULE ||
      (LEGACY_CLOTHING_CAPSULES as readonly string[]).includes(handle)) &&
    !isClothingCategoryCollection(collection)
  );
}

/**
 * Position in page order: the category's, then the type's place within it
 * (so hats come before totes in Accessories); unknown or tag-only garments
 * go last.
 */
export function clothingCategoryRank(product: ClothingProductLike) {
  const slug = clothingCategory(product)?.slug;
  const index = CATEGORIES.findIndex((category) => category.slug === slug);
  if (index < 0) return CATEGORIES.length;
  const types: readonly string[] = CATEGORIES[index].types;
  const type = types.findIndex(
    (known) => normalize(known) === normalize(product.productType),
  );
  return index + Math.max(type, 0) / 100;
}

export type ClothingCategory = {slug: string; label: string};
export type ClothingCategoryCount = ClothingCategory & {count: number};
export type ClothingCapsule = {handle: string; title: string; count: number};

/** The capsules' handles in page order (lead first), from clothingCapsules. */
export function clothingCapsuleOrder(products: ClothingProductLike[]) {
  return clothingCapsules(products).map((capsule) => capsule.handle);
}

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

/** Capsules are explicit Shopify groups, separate from garment categories
 * (isClothingCapsuleCollection). Products arrive newest first, so a
 * capsule's first sighting is its newest piece: Counter-Diagonal comes
 * first, then the capsule with the newest piece, and so on.
 */
export function clothingCapsules(
  products: ClothingProductLike[],
): ClothingCapsule[] {
  const capsules = new Map<string, ClothingCapsule & {newest: number}>();
  products.filter(isClothingProduct).forEach((product, position) => {
    const seen = new Set<string>();
    for (const collection of product.collections?.nodes ?? []) {
      if (
        !isClothingCapsuleCollection(collection) ||
        seen.has(collection.handle)
      )
        continue;
      seen.add(collection.handle);
      const previous = capsules.get(collection.handle);
      capsules.set(collection.handle, {
        handle: collection.handle,
        title: collection.title,
        count: (previous?.count ?? 0) + 1,
        newest: previous?.newest ?? position,
      });
    }
  });
  const lead = (handle: string) =>
    normalize(handle) === LEAD_CLOTHING_CAPSULE ? 0 : 1;
  return [...capsules.values()]
    .sort(
      (a, b) =>
        lead(a.handle) - lead(b.handle) ||
        a.newest - b.newest ||
        a.title.localeCompare(b.title),
    )
    .map(({newest: _newest, ...capsule}) => capsule);
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
