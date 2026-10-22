// Relative imports keep this module loadable by the plain-Node test runner,
// which cannot resolve the Vite "~" alias.
import {
  ART_PRODUCT_CATALOG,
  ART_PRODUCT_FAMILIES,
  type ArtProductCatalog,
} from './artProductCatalog.ts';
import {
  collectionKind,
  PRINT_CATALOG,
  printHandle,
  type PrintCatalog,
} from './printCatalog.ts';

/**
 * Default ("Featured") listing order for museum reproductions.
 *
 * Shopify lists newest first, so a museum release of dozens of products
 * would take over the first page of the shop. In the default order the
 * studio's own products keep their order and come first, and museum
 * products follow by product type — art prints, framed prints, canvas,
 * greeting cards, postcards, phone cases, mugs — and within a type by the
 * catalog's artwork sequence. Explicit sorts (price, title) are untouched.
 *
 * Museum products are identified from the catalogs: every product of a
 * `kind: "museum"` collection of data/print-catalog.json carries the
 * collection's title as a tag (prints and the family products of
 * data/art-product-catalog.json alike), so the Storefront search splits the
 * shop into two complementary sets with no product in both or neither.
 */

type Sources = {artProducts?: ArtProductCatalog; catalog?: PrintCatalog};

/** [product type, collection, artwork sequence], compared left to right. */
export type MuseumRank = readonly [number, number, number];

function buildRanks({
  artProducts = ART_PRODUCT_CATALOG,
  catalog = PRINT_CATALOG,
}: Sources): Map<string, MuseumRank> {
  const ranks = new Map<string, MuseumRank>();
  const museum = catalog.collections.filter(
    (collection) => collectionKind(collection) === 'museum',
  );
  museum.forEach((collection, collectionIndex) => {
    for (const print of collection.prints)
      ranks.set(printHandle(print), [0, collectionIndex, print.sequence]);
  });
  for (const product of artProducts.products) {
    const collectionIndex = museum.findIndex(
      (collection) => collection.slug === product.collection,
    );
    const print = museum[collectionIndex]?.prints.find(
      (entry) => entry.slug === product.print,
    );
    const family = ART_PRODUCT_FAMILIES.indexOf(product.family);
    if (!print || family < 0) continue;
    ranks.set(product.handle, [1 + family, collectionIndex, print.sequence]);
  }
  return ranks;
}

let defaultRanks: Map<string, MuseumRank> | null = null;

/** Listing rank of every museum product handle, released or not. */
export function museumListingRanks(sources: Sources = {}) {
  if (sources.artProducts || sources.catalog) return buildRanks(sources);
  defaultRanks ??= buildRanks({});
  return defaultRanks;
}

function compareRanks(a: MuseumRank, b: MuseumRank) {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

/**
 * Museum products in listing order: by product type, then collection, then
 * artwork sequence. A product the catalogs do not rank keeps its place
 * after the ranked ones. Stable, and returns a new array.
 */
export function sortMuseumProducts<T extends {handle: string}>(
  products: readonly T[],
  ranks: Map<string, MuseumRank> = museumListingRanks(),
): T[] {
  return products
    .map((product, index) => ({
      index,
      product,
      rank: ranks.get(product.handle),
    }))
    .sort((a, b) => {
      if (a.rank && b.rank)
        return compareRanks(a.rank, b.rank) || a.index - b.index;
      if (a.rank) return -1;
      if (b.rank) return 1;
      return a.index - b.index;
    })
    .map((row) => row.product);
}

/**
 * Comparator for one mixed list (an artist shop's "Featured"): products the
 * catalogs do not rank as museum products first, in their given order (the
 * comparator returns 0 between them, so a stable sort keeps it), then
 * museum products by type and artwork sequence.
 */
export function compareListingOrder(
  a: string,
  b: string,
  ranks: Map<string, MuseumRank> = museumListingRanks(),
) {
  const rankA = ranks.get(a);
  const rankB = ranks.get(b);
  if (rankA && rankB) return compareRanks(rankA, rankB);
  if (rankA) return 1;
  if (rankB) return -1;
  return 0;
}

/**
 * Storefront `products(query:)` clause selecting every museum product: the
 * tags of the museum collections. Null when the catalog has none, and the
 * shop then lists in Shopify's order as before.
 */
export function museumTagClause(
  catalog: PrintCatalog = PRINT_CATALOG,
): string | null {
  const tags = catalog.collections
    .filter((collection) => collectionKind(collection) === 'museum')
    .map((collection) => `tag:"${collection.title.replaceAll('"', '\\"')}"`);
  return tags.length ? `(${tags.join(' OR ')})` : null;
}

/**
 * The museum clause when the shop lists in its default order, or null when
 * the shopper chose a sort (price, title): explicit sorts keep Shopify's
 * order across the whole shop.
 */
export function featuredMuseumClause(
  sort: string,
  catalog: PrintCatalog = PRINT_CATALOG,
): string | null {
  return sort === 'featured' ? museumTagClause(catalog) : null;
}

/** The shop's search narrowed to its studio products (museum excluded). */
export function studioSearchQuery(base: string | null, museumClause: string) {
  return `${base ? `(${base}) ` : ''}NOT ${museumClause}`;
}

/** The shop's search narrowed to its museum products. */
export function museumSearchQuery(base: string | null, museumClause: string) {
  return `${base ? `(${base}) ` : ''}${museumClause}`;
}

// ------------------------------------------------- listing page shapes --

export type ListingPageInfo = {
  endCursor: string | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
};

export type ListingConnection<T> = {nodes: T[]; pageInfo: ListingPageInfo};

/** `getPaginationVariables` output from @shopify/hydrogen. */
export type ListingPaginationVariables =
  | {endCursor?: string | null; first: number}
  | {last: number; startCursor?: string | null};

/** A cursor this listing did not issue (stale, hand-edited or foreign). */
export class ListingCursorError extends Error {}
