// Relative imports keep this module loadable by the plain-Node test runner.
import {
  ListingCursorError,
  type ListingConnection,
  type ListingPaginationVariables,
} from './museumListingOrder.ts';

const PREFIX = 'i.';

/** Cursor for the product at `index` of an in-memory listing. */
export function indexCursor(index: number) {
  return `${PREFIX}${index}`;
}

function parseIndexCursor(cursor: string): number {
  const raw = cursor.startsWith(PREFIX) ? cursor.slice(PREFIX.length) : '';
  if (!/^\d{1,6}$/.test(raw))
    throw new ListingCursorError(`Unknown listing cursor: ${cursor}`);
  return Number(raw);
}

/**
 * One page of a listing held in memory, with the cursor semantics
 * @shopify/hydrogen's Pagination expects: `{first, endCursor}` pages
 * forward from after the cursor, `{last, startCursor}` pages backward
 * from before it, and no cursor means the first or the last page.
 * Cursors are positions, so forward and backward paging never repeat or
 * skip a product. A position past the end (the list shrank) is a
 * ListingCursorError, which the route turns into a redirect to page one.
 */
export function pageByIndex<T>(
  variables: ListingPaginationVariables,
  items: readonly T[],
): ListingConnection<T> {
  let start: number;
  let end: number; // exclusive
  if ('first' in variables) {
    const after =
      variables.endCursor ? parseIndexCursor(variables.endCursor) : -1;
    if (after >= items.length && items.length > 0)
      throw new ListingCursorError(`Cursor ${after} is past the end`);
    start = after + 1;
    end = Math.min(items.length, start + variables.first);
  } else {
    const before =
      variables.startCursor
        ? parseIndexCursor(variables.startCursor)
        : items.length;
    if (before > items.length)
      throw new ListingCursorError(`Cursor ${before} is past the end`);
    end = before;
    start = Math.max(0, end - variables.last);
  }
  const nodes = items.slice(start, end);
  return {
    nodes,
    pageInfo: {
      endCursor: nodes.length ? indexCursor(end - 1) : null,
      hasNextPage: end < items.length,
      hasPreviousPage: start > 0,
      startCursor: nodes.length ? indexCursor(start) : null,
    },
  };
}
