import {redirect} from 'react-router';

/**
 * Paginated loaders read `cursor` and `direction` from the URL and hand them
 * to the Storefront API, which answers a malformed or expired cursor with a
 * GraphQL error and no data (Hydrogen returns `{errors}` beside the data
 * rather than throwing). A stale "load more" link, a crawler or a hand-edited
 * URL would otherwise reach a `TypeError` and the error page.
 *
 * The right answer is the first page, so the pagination parameters are
 * stripped and the request redirected. Without such parameters there is
 * nothing to strip, so the failure surfaces as a 502 instead of a redirect
 * loop.
 */
export function ensurePaginatedData(request: Request, result: unknown): void {
  const errors = (result as {errors?: unknown} | null | undefined)?.errors;
  if (!Array.isArray(errors) || errors.length === 0) return;

  const url = new URL(request.url);
  if (url.searchParams.has('cursor') || url.searchParams.has('direction')) {
    url.searchParams.delete('cursor');
    url.searchParams.delete('direction');
    throw redirect(`${url.pathname}${url.search}`);
  }

  console.error('Paginated query returned errors.', errors);
  throw new Response('The catalogue is temporarily unavailable.', {
    status: 502,
  });
}
