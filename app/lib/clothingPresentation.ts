import {
  clothingCategory,
  clothingCategoryGroup,
  clothingCapsuleOrder,
  clothingCapsules,
  clothingCategoryRank,
  clothingGroupSlug,
} from './clothing.ts';
import type {ClothingProduct} from './clothing.server';
import {garmentColourHex, isColourOptionName} from './garmentColours.ts';

/** Six rows of four on desktop before "Show more". */
export const CLOTHING_PAGE_SIZE = 24;
/** "Show more" for this many pieces or fewer would be a stub: show them. */
export const CLOTHING_PAGE_SLACK = 8;
export const CLOTHING_SORTS = [
  {value: 'featured', label: 'Featured'},
  {value: 'newest', label: 'Newest first'},
  {value: 'price-asc', label: 'Price: low to high'},
  {value: 'price-desc', label: 'Price: high to low'},
] as const;
export const DEFAULT_CLOTHING_SORT = 'featured';

/**
 * Featured order: the lead capsule's pieces first, then the next capsule's
 * (the capsule page order of clothingCapsules), each in garment order
 * (hoodies, sweatshirts, tees, long sleeves, ..., accessories), newest first
 * within a kind; pieces in no capsule last. Products arrive newest first,
 * and Array.prototype.sort is stable, so ties keep that order.
 */
export function featuredClothingOrder<T extends ClothingProduct>(
  products: T[],
): T[] {
  const order = clothingCapsuleOrder(products);
  const rank = (product: ClothingProduct) =>
    Math.min(
      order.length,
      ...product.collections.nodes
        .map((item) => order.indexOf(item.handle))
        .filter((index) => index >= 0),
    );
  return [...products].sort(
    (a, b) =>
      rank(a) - rank(b) || clothingCategoryRank(a) - clothingCategoryRank(b),
  );
}

/** In a line? An empty handle means every line. */
export function inClothingLine(product: ClothingProduct, capsule: string) {
  return (
    !capsule ||
    product.collections.nodes.some((item) => item.handle === capsule)
  );
}

/** In a tab? An empty slug means every group. */
export function inClothingGroup(product: ClothingProduct, category: string) {
  return !category || clothingCategoryGroup(product)?.slug === category;
}

/**
 * Line filter chips with counts inside the chosen tab, so the line and
 * the tab narrow together. A line with nothing in this tab drops out.
 */
export function clothingLineChips(
  products: ClothingProduct[],
  category: string,
) {
  const inTab = products.filter((product) =>
    inClothingGroup(product, category),
  );
  return clothingCapsules(products)
    .map((capsule) => ({
      handle: capsule.handle,
      title: capsule.title,
      count: inTab.filter((product) => inClothingLine(product, capsule.handle))
        .length,
    }))
    .filter((chip) => chip.count > 0);
}

export function selectClothing(
  products: ClothingProduct[],
  params: URLSearchParams,
) {
  // Old links name a single category (`hoodies`); they open its group.
  const category = clothingGroupSlug(params.get('category')) ?? '';
  const capsule = params.get('capsule') || '';
  const sort = CLOTHING_SORTS.some((item) => item.value === params.get('sort'))
    ? params.get('sort')!
    : DEFAULT_CLOTHING_SORT;
  let filtered = products.filter(
    (product) =>
      inClothingGroup(product, category) && inClothingLine(product, capsule),
  );
  if (sort === 'featured') filtered = featuredClothingOrder(filtered);
  else if (sort !== 'newest') {
    const price = (product: ClothingProduct) =>
      Number(clothingDisplayPrice(product)?.amount ?? 0);
    filtered.sort(
      (a, b) => (price(a) - price(b)) * (sort === 'price-desc' ? -1 : 1),
    );
  }
  const requested = Number(params.get('page') || '1');
  const maxPage = Math.max(1, Math.ceil(filtered.length / CLOTHING_PAGE_SIZE));
  const page = Math.min(
    Number.isSafeInteger(requested) && requested > 0 ? requested : 1,
    maxPage,
  );
  const shown =
    filtered.length - page * CLOTHING_PAGE_SIZE <= CLOTHING_PAGE_SLACK
      ? filtered.length
      : page * CLOTHING_PAGE_SIZE;
  return {
    category,
    capsule,
    sort,
    page,
    total: filtered.length,
    products: filtered.slice(0, shown),
    hasMore: shown < filtered.length,
  };
}

export function clothingColorOptions(product: ClothingProduct) {
  return (
    product.options.find((option) => isColourOptionName(option.name))
      ?.optionValues ?? []
  );
}

/** Keep the display image and PDP options on the same selected variant. */
export function clothingDisplayImage(product: ClothingProduct, colorIndex = 0) {
  return (
    clothingColorOptions(product)[colorIndex]?.firstSelectableVariant?.image ??
    product.featuredImage
  );
}

export function clothingDisplayPrice(product: ClothingProduct, colorIndex = 0) {
  return (
    clothingColorOptions(product)[colorIndex]?.firstSelectableVariant?.price ??
    product.priceRange?.minVariantPrice
  );
}

export function clothingFilterUrl(
  params: URLSearchParams,
  key: 'category' | 'capsule',
  value: string,
) {
  const next = new URLSearchParams(params);
  next.delete('page');
  if (value) next.set(key, value);
  else next.delete(key);
  return `/clothing${next.size ? `?${next}` : ''}#pieces`;
}

export function clothingProductUrl(product: ClothingProduct, colorIndex = 0) {
  const color = clothingColorOptions(product)[colorIndex];
  const option = product.options.find((item) => isColourOptionName(item.name));
  const options = color?.firstSelectableVariant?.selectedOptions;
  const search = options?.length
    ? new URLSearchParams(
        options.map(({name, value}) => [name, value]),
      ).toString()
    : color && option
      ? new URLSearchParams({[option.name]: color.name}).toString()
      : '';
  return `/products/${product.handle}${search ? `?${search}` : ''}`;
}

export function clothingDisplayTitle(product: ClothingProduct) {
  const capsule = clothingCapsules([product]).find(
    (item) =>
      product.title.startsWith(item.title) &&
      /^[\s—–:-]/.test(product.title.slice(item.title.length)),
  );
  return capsule
    ? product.title.slice(capsule.title.length).replace(/^\s*[—–:-]?\s*/, '') ||
        product.title
    : product.title;
}

/**
 * Category links and sorting only help once the grid runs past two rows.
 * Below this the page shows the plain grid; a capsule filter still appears
 * when there are two or more capsules.
 */
export const CLOTHING_TOOLS_MIN_PRODUCTS = 9;

export function showClothingTools(total: number) {
  return total >= CLOTHING_TOOLS_MIN_PRODUCTS;
}

const SIZE_ORDER = [
  'XXS',
  '2XS',
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  '2XL',
  'XXXL',
  '3XL',
  '4XL',
  '5XL',
  '6XL',
];

/** "XS–XL" when the offered sizes are a known run; null when unknown or mixed. */
export function clothingSizeRange(products: ClothingProduct[]) {
  const sizes = new Set(
    products.flatMap(
      (product) =>
        product.options
          .find((option) => /^size$/i.test(option.name))
          ?.optionValues.map((value) => value.name.trim().toUpperCase()) ?? [],
    ),
  );
  if (!sizes.size) return null;
  const known = SIZE_ORDER.filter((size) => sizes.has(size));
  if (known.length !== sizes.size) return null;
  return known.length === 1 ? known[0] : `${known[0]}–${known.at(-1)}`;
}

/** True only when every piece carries the merchant's "Made to order" tag. */
export function allMadeToOrder(products: Array<{tags?: string[] | null}>) {
  return (
    products.length > 0 &&
    products.every((product) =>
      product.tags?.some((tag) => tag.trim().toLowerCase() === 'made to order'),
    )
  );
}

export type ClothingLookPiece = {
  id: string;
  title: string;
  url: string;
  image: NonNullable<ReturnType<typeof clothingDisplayImage>> | null;
};

export type ClothingLook = {colour: string; pieces: ClothingLookPiece[]};

const UPPER_BODY = new Set([
  'outerwear',
  'knitwear',
  'hoodies',
  'sweatshirts',
  't-shirts',
  'long-sleeves',
  'tops',
  'studio-tops',
  'bras',
  'dresses',
  'one-pieces',
]);

/** How the page names each garment type in running text. */
const GARMENT_NOUNS: Record<string, string> = {
  hoodies: 'hoodies',
  hoodie: 'hoodies',
  sweatshirts: 'sweatshirts',
  sweatshirt: 'sweatshirts',
  't-shirts': 'tees',
  't-shirt': 'tees',
  'long sleeve shirts': 'long sleeves',
  'long sleeve shirt': 'long sleeves',
  'long sleeve t-shirts': 'long sleeves',
  // Artist activewear, tops before bottoms.
  'studio top': 'tanks',
  'sports bra': 'sports bras',
  'yoga leggings': 'leggings',
  'biker shorts': 'biker shorts',
  hats: 'hats',
  caps: 'caps',
  beanies: 'beanies',
  'tote bags': 'totes',
};

/**
 * "hoodies, sweatshirts, tees and totes": the kinds of garment these pieces
 * really are, in page order, so the copy never names a piece that is not
 * on sale. Null for types without a running-text name.
 */
export function clothingGarmentPhrase(products: ClothingProduct[]) {
  const order = [...new Set(Object.values(GARMENT_NOUNS))];
  const nouns: string[] = [];
  for (const product of products) {
    const noun = GARMENT_NOUNS[product.productType?.trim().toLowerCase() ?? ''];
    if (!noun) return null;
    if (!nouns.includes(noun)) nouns.push(noun);
  }
  nouns.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  if (!nouns.length) return null;
  return nouns.length === 1
    ? nouns[0]
    : `${nouns.slice(0, -1).join(', ')} and ${nouns.at(-1)}`;
}

/**
 * Coordinated looks: colourways shared by two or more pieces, each shown
 * with that colour's real variant image. Tops come before bottoms so a look
 * reads like an outfit.
 */
export function clothingLooks(products: ClothingProduct[]): ClothingLook[] {
  const looks = new Map<string, ClothingLookPiece[]>();
  const ordered = [...products].sort(
    (a, b) =>
      Number(!UPPER_BODY.has(clothingCategory(a)?.slug ?? '')) -
      Number(!UPPER_BODY.has(clothingCategory(b)?.slug ?? '')),
  );
  for (const product of ordered) {
    clothingColorOptions(product).forEach((colour, index) => {
      const pieces = looks.get(colour.name) ?? [];
      pieces.push({
        id: product.id,
        title: clothingDisplayTitle(product),
        url: clothingProductUrl(product, index),
        image: clothingDisplayImage(product, index) ?? null,
      });
      looks.set(colour.name, pieces);
    });
  }
  return [...looks]
    .filter(([, pieces]) => pieces.length > 1)
    .map(([colour, pieces]) => ({colour, pieces}));
}

/**
 * Two homepage tiles that show the range: one piece from each of the first
 * two looks, never the same product twice. Falls back to the newest pieces.
 */
export function clothingFeaturePicks(products: ClothingProduct[]) {
  const looks = clothingLooks(products);
  const picks: Array<ClothingLookPiece & {colour: string}> = [];
  for (const look of looks.slice(0, 2)) {
    const piece = look.pieces.find(
      (candidate) => !picks.some((pick) => pick.id === candidate.id),
    );
    if (piece) picks.push({...piece, colour: look.colour});
  }
  if (picks.length === 2) return picks;
  return products.slice(0, 2).map((product) => ({
    id: product.id,
    title: clothingDisplayTitle(product),
    url: clothingProductUrl(product),
    image: clothingDisplayImage(product) ?? null,
    colour: clothingColorOptions(product)[0]?.name ?? '',
  }));
}

/** Brand palette names used in colourway names ("Moss / Mist"). */
const PALETTE_SWATCHES: Record<string, string> = {
  ink: '#26231F',
  ivory: '#FBFAF6',
  oat: '#F4F0E8',
  mist: '#DFE4DC',
  clay: '#9C6F5D',
  moss: '#6F7769',
};

/**
 * Shopify's own swatch wins. A single fabric colour ("Dust", "Faded Bone")
 * takes its Printful catalog hex (garmentColours.ts), else the brand
 * palette's. A colourway named in palette colours ("Moss / Mist") gets a
 * split dot. Anything else falls back to a text label.
 */
export function clothingSwatchBackground(
  name: string,
  swatchColor?: string | null,
) {
  if (swatchColor) return swatchColor;
  const parts = name.split('/').map((part) => part.trim().toLowerCase());
  if (parts.length === 1)
    return garmentColourHex(parts[0]) ?? PALETTE_SWATCHES[parts[0]] ?? null;
  const tones = parts.map((part) => PALETTE_SWATCHES[part]);
  if (tones.some((tone) => !tone)) return null;
  const step = 100 / tones.length;
  return `linear-gradient(135deg, ${tones
    .map((tone, index) => `${tone} ${index * step}% ${(index + 1) * step}%`)
    .join(', ')})`;
}
