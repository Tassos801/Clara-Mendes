// Relative imports keep this module loadable by the plain-Node test runner.
import {
  CURATED_PRODUCTS,
  releasedCuratedProducts,
  type CuratedProduct,
  type CuratedSpecs,
} from './curatedProducts.ts';

export const BOOK_NOOK_PRODUCT_TYPE = 'Book Nooks';
export const BOOK_NOOKS_PATH = '/book-nooks';

/**
 * The themes a book nook is filed under. Order is display order; a theme
 * appears on the storefront only once a released nook uses it, so adding
 * themes ahead of products is safe.
 */
export const BOOK_NOOK_THEMES = [
  {
    slug: 'libraries',
    title: 'Libraries & Studies',
    note: 'Candlelit reading rooms, studies and secret archives.',
  },
  {
    slug: 'streets',
    title: 'Streets & Shops',
    note: 'Lantern-lit alleys, bookshops, cafés and corner stores.',
  },
  {
    slug: 'magic',
    title: 'Magic & Myth',
    note: 'Apothecaries, wizard towers and enchanted forests.',
  },
  {
    slug: 'gardens',
    title: 'Gardens & Seasons',
    note: 'Greenhouses, blossom lanes and snowy evenings.',
  },
  {
    slug: 'night',
    title: 'Night & Mystery',
    note: 'Detective offices, observatories and starlit rooftops.',
  },
] as const;

export type BookNookTheme = (typeof BOOK_NOOK_THEMES)[number];

export function isBookNook(product?: {productType?: string | null} | null) {
  return product?.productType === BOOK_NOOK_PRODUCT_TYPE;
}

/** Released nooks in registry order — the order they appear everywhere. */
export function releasedBookNooks(
  products: readonly CuratedProduct[] = CURATED_PRODUCTS,
) {
  return releasedCuratedProducts(products).filter(isBookNook);
}

export function getBookNookTheme(slug?: string | null) {
  return BOOK_NOOK_THEMES.find((theme) => theme.slug === slug) ?? null;
}

/** Themes with at least one released nook, with their counts. */
export function bookNookThemesInUse(
  products: readonly CuratedProduct[] = CURATED_PRODUCTS,
) {
  const nooks = releasedBookNooks(products);
  return BOOK_NOOK_THEMES.map((theme) => ({
    ...theme,
    count: nooks.filter((nook) => nook.theme === theme.slug).length,
  })).filter((theme) => theme.count > 0);
}

export function bookNookThemePath(slug: string) {
  return `${BOOK_NOOKS_PATH}?theme=${encodeURIComponent(slug)}`;
}

function formatRange(values: number[] | undefined, unit: string) {
  if (!values?.length) return null;
  const [min, max = min] = values;
  const plural = max === 1 ? unit : `${unit}s`;
  return min === max ? `${min} ${plural}` : `${min}–${max} ${plural}`;
}

/**
 * A plain-language build level from the supplier's time estimate, so a
 * shelf of ten kits can be compared at a glance.
 */
export function buildLevel(specs?: CuratedSpecs | null) {
  const hours = specs?.buildHours;
  if (!hours?.length) return null;
  const max = hours[hours.length - 1];
  const label =
    max <= 2
      ? 'Quick build'
      : max <= 4
        ? 'Evening build'
        : max <= 8
          ? 'Weekend build'
          : 'Long project';
  return {label, time: formatRange(hours, 'hour')};
}

/** "At a glance" rows for the product page; missing specs are omitted. */
export function bookNookSpecRows(specs?: CuratedSpecs | null) {
  if (!specs) return [];
  const rows: Array<{label: string; value: string}> = [];
  if (specs.pieces) rows.push({label: 'Pieces', value: String(specs.pieces)});
  const time = formatRange(specs.buildHours, 'hour');
  if (time) rows.push({label: 'Build time', value: time});
  if (specs.minAge) rows.push({label: 'Age', value: `${specs.minAge}+`});
  if (specs.sizeCm?.length === 3) {
    rows.push({
      label: 'Size',
      value: `${specs.sizeCm.join(' × ')} cm`,
    });
  }
  if (specs.lighting) rows.push({label: 'Light', value: specs.lighting});
  return rows;
}

/** The lowest-friction fact line for a card: "194 pieces · 2–3 hours". */
export function bookNookFactLine(specs?: CuratedSpecs | null) {
  return [
    specs?.pieces ? `${specs.pieces} pieces` : null,
    formatRange(specs?.buildHours, 'hour'),
  ]
    .filter(Boolean)
    .join(' · ');
}

type ShelfProduct = {handle: string};

/**
 * Pairs released nooks (registry order, catalogue numbers) with the
 * channel's Storefront products; unpublished kits are skipped.
 */
export function buildBookNookShelf<P extends ShelfProduct>(
  storefrontProducts: readonly P[],
  products: readonly CuratedProduct[] = CURATED_PRODUCTS,
) {
  const byHandle = new Map(
    storefrontProducts.map((product) => [product.handle, product]),
  );
  return releasedBookNooks(products).flatMap((nook, index) => {
    const product = byHandle.get(nook.handle);
    return product ? [{nook, number: index + 1, product}] : [];
  });
}

/** Countries every released nook delivers to — the safe promise for the range. */
export function bookNookDeliveryCountries(
  products: readonly CuratedProduct[] = CURATED_PRODUCTS,
) {
  const nooks = releasedBookNooks(products);
  if (!nooks.length) return [];
  return nooks
    .map((nook) => nook.verifiedDeliveryCountries)
    .reduce((shared, countries) =>
      shared.filter((country) => countries.includes(country)),
    );
}
