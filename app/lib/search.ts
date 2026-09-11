import type {
  PredictiveSearchQuery,
  RegularSearchQuery,
} from 'storefrontapi.generated';

type ResultWithItems<Type extends 'predictive' | 'regular', Items> = {
  type: Type;
  term: string;
  error?: string;
  result: {total: number; items: Items};
};

export type RegularSearchReturn = ResultWithItems<
  'regular',
  RegularSearchQuery
>;
export type PredictiveSearchReturn = ResultWithItems<
  'predictive',
  NonNullable<PredictiveSearchQuery['predictiveSearch']>
>;

type SearchType = RegularSearchReturn['type'] | PredictiveSearchReturn['type'];
type SearchReturnFor<Type extends SearchType> = Type extends 'predictive'
  ? PredictiveSearchReturn
  : RegularSearchReturn;

/** Shown when the Storefront API request itself failed. */
export const SEARCH_UNAVAILABLE_MESSAGE =
  'Search is taking a moment. Please try again shortly.';

/** Shown when Shopify answered with errors beside partial results. */
export const SEARCH_PARTIAL_MESSAGE =
  'Some results could not be loaded. Please try again shortly.';

/**
 * The `q` parameter as the customer typed it, without surrounding whitespace.
 * Regular and predictive search read it the same way so the term echoed back
 * into the input and the empty state matches what was searched.
 */
export function getSearchTerm(url: URL): string {
  return (url.searchParams.get('q') ?? '').trim();
}

/**
 * Returns the empty state of a predictive search result to reset the search state.
 */
export function getEmptyPredictiveSearchResult(): PredictiveSearchReturn['result'] {
  return {
    total: 0,
    items: {
      articles: [],
      collections: [],
      products: [],
      pages: [],
      queries: [],
    },
  };
}

/**
 * The empty state of a regular search result. `<Pagination>` reads the
 * products connection, so it carries a complete `pageInfo`.
 */
export function getEmptyRegularSearchResult(): RegularSearchReturn['result'] {
  return {
    total: 0,
    items: {
      articles: {nodes: []},
      pages: {nodes: []},
      products: {
        nodes: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
      },
    },
  };
}

/**
 * Runs a search fetcher and turns any failure into a renderable result. The
 * loader must never throw for a Storefront API problem: that would replace
 * the whole page with the route error boundary. Instead the page shows the
 * form again with a short message, and the real error goes to the server log.
 */
export async function runSearch<Type extends SearchType>({
  type,
  term,
  search,
  onError = logSearchError,
}: {
  type: Type;
  term: string;
  search: () => Promise<SearchReturnFor<Type>>;
  onError?: (error: unknown) => void;
}): Promise<SearchReturnFor<Type>> {
  try {
    return await search();
  } catch (error) {
    onError(error);

    const result =
      type === 'predictive'
        ? getEmptyPredictiveSearchResult()
        : getEmptyRegularSearchResult();

    return {
      type,
      term,
      error: SEARCH_UNAVAILABLE_MESSAGE,
      result,
    } as SearchReturnFor<Type>;
  }
}

function logSearchError(error: unknown) {
  console.error('Search failed; rendering an empty result instead.', error);
}

interface UrlWithTrackingParams {
  /** The base URL to which the tracking parameters will be appended. */
  baseUrl: string;
  /** The trackingParams returned by the Storefront API. */
  trackingParams?: string | null;
  /** Any additional query parameters to be appended to the URL. */
  params?: Record<string, string>;
  /** The search term to be appended to the URL. */
  term: string;
}

/**
 * A utility function that appends tracking parameters to a URL. Tracking parameters are
 * used internally by Shopify to enhance search results and admin dashboards.
 * @example
 * ```ts
 * const baseUrl = 'www.example.com';
 * const trackingParams = 'utm_source=shopify&utm_medium=shopify_app&utm_campaign=storefront';
 * const params = { foo: 'bar' };
 * const term = 'search term';
 * const url = urlWithTrackingParams({ baseUrl, trackingParams, params, term });
 * console.log(url);
 * // Output: 'https://www.example.com?foo=bar&q=search%20term&utm_source=shopify&utm_medium=shopify_app&utm_campaign=storefront'
 * ```
 */
export function urlWithTrackingParams({
  baseUrl,
  trackingParams,
  params: extraParams,
  term,
}: UrlWithTrackingParams) {
  // URLSearchParams encodes values itself; pre-encoding the term here would
  // double-encode it (e.g. "quiet form" -> "quiet%2520form").
  let search = new URLSearchParams({
    ...extraParams,
    q: term,
  }).toString();

  if (trackingParams) {
    search = `${search}&${trackingParams}`;
  }

  return `${baseUrl}?${search}`;
}
