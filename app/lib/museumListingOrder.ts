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

// ------------------------------------------------------------- paging --

export type ListingPageInfo = {
  endCursor: string | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
};

export type ListingConnection<T> = {nodes: T[]; pageInfo: ListingPageInfo};

/** One Storefront page of the studio set, GraphQL cursor semantics. */
export type StudioPageRequest =
  {after: string | null; first: number} | {before: string | null; last: number};

export type ListingSources<T> = {
  /** Studio products in Shopify's order, paged by Storefront cursors. */
  studio: (request: StudioPageRequest) => Promise<ListingConnection<T>>;
  /** Every museum product of the search, already in listing order. */
  museum: () => Promise<T[]>;
};

/** Storefront `products(...)` paging variables for one studio request. */
export type StorefrontPageVariables = {
  endCursor?: string | null;
  first?: number;
  last?: number;
  reverse: boolean;
  startCursor?: string | null;
};

type StorefrontPageInfo = {
  endCursor?: string | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string | null;
};

/**
 * The Storefront API refuses `last` without `before`, so the end of the
 * studio set is read as the first products of the reversed order (whose
 * cursors also page the forward order) and turned back by
 * `studioConnection`.
 */
export function studioPageVariables(
  page: StudioPageRequest,
  reverse: boolean,
): StorefrontPageVariables {
  if ('first' in page)
    return {endCursor: page.after, first: page.first, reverse};
  if (!page.before) return {first: page.last, reverse: !reverse};
  return {last: page.last, reverse, startCursor: page.before};
}

/** A Storefront answer to `studioPageVariables(page)` as a studio page. */
export function studioConnection<T>(
  page: StudioPageRequest,
  nodes: T[],
  pageInfo: StorefrontPageInfo,
): ListingConnection<T> {
  if (!('first' in page) && !page.before)
    return {
      nodes: [...nodes].reverse(),
      pageInfo: {
        endCursor: pageInfo.startCursor ?? null,
        hasNextPage: false,
        hasPreviousPage: pageInfo.hasNextPage,
        startCursor: pageInfo.endCursor ?? null,
      },
    };
  return {
    nodes,
    pageInfo: {
      endCursor: pageInfo.endCursor ?? null,
      hasNextPage: pageInfo.hasNextPage,
      hasPreviousPage: pageInfo.hasPreviousPage,
      startCursor: pageInfo.startCursor ?? null,
    },
  };
}

/** `getPaginationVariables` output from @shopify/hydrogen. */
export type ListingPaginationVariables =
  | {endCursor?: string | null; first: number}
  | {last: number; startCursor?: string | null};

/** A cursor this listing did not issue (stale, hand-edited or foreign). */
export class ListingCursorError extends Error {}

const STUDIO = 's.';
const MUSEUM = 'm.';

/**
 * Cursors point at one product: `s.<Storefront cursor>` for a studio
 * product, `m.<index>` for a museum product's place in listing order. Both
 * are stable for a given search, so "Load more" and "Load previous" links
 * work from any page, including a deep page loaded directly.
 */
export function studioCursor(cursor: string) {
  return `${STUDIO}${cursor}`;
}

export function museumCursor(index: number) {
  return `${MUSEUM}${index}`;
}

type Position =
  {kind: 'studio'; cursor: string} | {kind: 'museum'; index: number};

export function parseListingCursor(cursor: string): Position {
  if (cursor.startsWith(STUDIO) && cursor.length > STUDIO.length)
    return {kind: 'studio', cursor: cursor.slice(STUDIO.length)};
  if (cursor.startsWith(MUSEUM)) {
    const raw = cursor.slice(MUSEUM.length);
    const index = Number(raw);
    if (/^\d{1,6}$/.test(raw) && Number.isSafeInteger(index))
      return {kind: 'museum', index};
  }
  throw new ListingCursorError(`Unknown listing cursor: ${cursor}`);
}

/**
 * One page of the default listing: studio products first (Storefront
 * paging), then museum products (an offset into the ranked set). A page that
 * reaches the end of the studio set is filled from the start of the museum
 * set, so every page but the last is full. Forward and backward paging use
 * the same positions, so no product repeats or goes missing.
 */
export async function studioThenMuseumPage<T>(
  variables: ListingPaginationVariables,
  sources: ListingSources<T>,
): Promise<ListingConnection<T>> {
  if ('first' in variables) {
    const cursor = variables.endCursor ?? null;
    const position = cursor ? parseListingCursor(cursor) : null;
    return position?.kind === 'museum'
      ? pageAfterMuseum(position.index, variables.first, sources)
      : pageFromStudio(position?.cursor ?? null, variables.first, sources);
  }
  const cursor = variables.startCursor ?? null;
  const position = cursor ? parseListingCursor(cursor) : null;
  if (position?.kind === 'studio') {
    const studio = await sources.studio({
      before: position.cursor,
      last: variables.last,
    });
    return {
      nodes: studio.nodes,
      pageInfo: {
        endCursor: wrap(studio.pageInfo.endCursor, studio.nodes),
        hasNextPage: true,
        hasPreviousPage: studio.pageInfo.hasPreviousPage,
        startCursor: wrap(studio.pageInfo.startCursor, studio.nodes),
      },
    };
  }
  const museum = await sources.museum();
  // No cursor: the last page of the whole listing.
  return pageBeforeMuseum(
    position ? position.index : museum.length,
    variables.last,
    museum,
    sources,
  );
}

function wrap(cursor: string | null | undefined, nodes: unknown[]) {
  return nodes.length && cursor ? studioCursor(cursor) : null;
}

async function pageFromStudio<T>(
  after: string | null,
  first: number,
  sources: ListingSources<T>,
): Promise<ListingConnection<T>> {
  const studio = await sources.studio({after, first});
  const nodes = [...studio.nodes];
  let startCursor = wrap(studio.pageInfo.startCursor, studio.nodes);
  let endCursor = wrap(studio.pageInfo.endCursor, studio.nodes);
  let hasNextPage = studio.pageInfo.hasNextPage;
  if (!hasNextPage) {
    const museum = await sources.museum();
    const fill = museum.slice(0, Math.max(0, first - nodes.length));
    nodes.push(...fill);
    if (fill.length) {
      startCursor ??= museumCursor(0);
      endCursor = museumCursor(fill.length - 1);
    }
    hasNextPage = museum.length > fill.length;
  }
  return {
    nodes,
    pageInfo: {
      endCursor,
      hasNextPage,
      // A cursor means a product came before this page.
      hasPreviousPage: Boolean(after) || studio.pageInfo.hasPreviousPage,
      startCursor,
    },
  };
}

async function pageAfterMuseum<T>(
  index: number,
  first: number,
  sources: ListingSources<T>,
): Promise<ListingConnection<T>> {
  const museum = await sources.museum();
  if (index >= museum.length)
    throw new ListingCursorError(`Museum cursor ${index} is past the end`);
  const nodes = museum.slice(index + 1, index + 1 + first);
  const last = index + nodes.length;
  return {
    nodes,
    pageInfo: {
      endCursor: nodes.length ? museumCursor(last) : null,
      hasNextPage: last + 1 < museum.length,
      hasPreviousPage: true,
      startCursor: nodes.length ? museumCursor(index + 1) : null,
    },
  };
}

async function pageBeforeMuseum<T>(
  index: number,
  last: number,
  museum: T[],
  sources: ListingSources<T>,
): Promise<ListingConnection<T>> {
  if (index > museum.length)
    throw new ListingCursorError(`Museum cursor ${index} is past the end`);
  const from = Math.max(0, index - last);
  const tail = museum.slice(from, index);
  const need = last - tail.length;
  let studio: ListingConnection<T> | null = null;
  let hasPreviousPage: boolean;
  if (need > 0) {
    studio = await sources.studio({before: null, last: need});
    hasPreviousPage = studio.pageInfo.hasPreviousPage;
  } else if (from > 0) {
    hasPreviousPage = true;
  } else {
    const probe = await sources.studio({before: null, last: 1});
    hasPreviousPage = probe.nodes.length > 0;
  }
  const studioNodes = studio?.nodes ?? [];
  return {
    nodes: [...studioNodes, ...tail],
    pageInfo: {
      endCursor: tail.length
        ? museumCursor(index - 1)
        : wrap(studio?.pageInfo.endCursor, studioNodes),
      hasNextPage: index < museum.length,
      hasPreviousPage,
      startCursor:
        wrap(studio?.pageInfo.startCursor, studioNodes) ??
        (tail.length ? museumCursor(from) : null),
    },
  };
}
