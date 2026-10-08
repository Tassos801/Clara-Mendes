import {clothingCategory, clothingCapsules} from './clothing.ts';
import type {ClothingProduct} from './clothing.server';

export const CLOTHING_PAGE_SIZE = 12;
export const CLOTHING_SORTS = [
  {value: 'newest', label: 'Newest first'},
  {value: 'price-asc', label: 'Price: low to high'},
  {value: 'price-desc', label: 'Price: high to low'},
] as const;

export function selectClothing(
  products: ClothingProduct[],
  params: URLSearchParams,
) {
  const category = params.get('category') || '';
  const capsule = params.get('capsule') || '';
  const sort = CLOTHING_SORTS.some((item) => item.value === params.get('sort'))
    ? params.get('sort')!
    : 'newest';
  const filtered = products.filter(
    (product) =>
      (!category || clothingCategory(product)?.slug === category) &&
      (!capsule ||
        product.collections.nodes.some((item) => item.handle === capsule)),
  );
  if (sort !== 'newest') {
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
  return {
    category,
    capsule,
    sort,
    page,
    total: filtered.length,
    products: filtered.slice(0, page * CLOTHING_PAGE_SIZE),
    hasMore: page < maxPage,
  };
}

export function clothingColorOptions(product: ClothingProduct) {
  return (
    product.options.find((option) =>
      /^(colou?r|colou?rway)$/i.test(option.name),
    )?.optionValues ?? []
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
  if (key === 'category' && !value) next.delete('capsule');
  return `/clothing${next.size ? `?${next}` : ''}#pieces`;
}

export function clothingProductUrl(product: ClothingProduct, colorIndex = 0) {
  const color = clothingColorOptions(product)[colorIndex];
  const option = product.options.find((item) =>
    /^(colou?r|colou?rway)$/i.test(item.name),
  );
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

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL'];

/** "XS–XL" when the offered sizes are a known run; null when unknown or mixed. */
export function clothingSizeRange(products: ClothingProduct[]) {
  const sizes = new Set(
    products.flatMap(
      (product) =>
        product.options
          .find((option) => /^size$/i.test(option.name))
          ?.optionValues.map((value) => value.name.trim().toUpperCase()) ??
        [],
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

const UPPER_BODY = new Set(['outerwear', 'knitwear', 'tops', 'bras', 'dresses', 'one-pieces']);

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
 * Shopify's own swatch wins. Otherwise a colourway named only in palette
 * colours gets a split dot; anything else falls back to a text label.
 */
export function clothingSwatchBackground(
  name: string,
  swatchColor?: string | null,
) {
  if (swatchColor) return swatchColor;
  const tones = name
    .split('/')
    .map((part) => PALETTE_SWATCHES[part.trim().toLowerCase()]);
  if (!tones.length || tones.some((tone) => !tone)) return null;
  if (tones.length === 1) return tones[0];
  const step = 100 / tones.length;
  return `linear-gradient(135deg, ${tones
    .map((tone, index) => `${tone} ${index * step}% ${(index + 1) * step}%`)
    .join(', ')})`;
}
