import type {Route} from './+types/sitemap.$type.$page[.xml]';
import {getSitemap} from '@shopify/hydrogen';
import {
  buildCustomRoutesSitemapXml,
  isValidSitemapRequest,
  removeExcludedSitemapEntries,
  sitemapLink,
} from '~/lib/sitemap';

export async function loader({
  request,
  params,
  context: {storefront},
}: Route.LoaderArgs) {
  if (params.type === 'custom') {
    return new Response(buildCustomRoutesSitemapXml(), {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': `max-age=${60 * 60 * 24}`,
      },
    });
  }

  if (!isValidSitemapRequest(params.type, params.page)) {
    throw new Response('Not found', {status: 404});
  }

  let response = await getSitemap({
    storefront,
    request,
    params,
    // No locale-prefixed routes exist in this storefront, so no hreflang
    // alternates may be emitted — they would point at 404s.
    locales: [],
    getLink: sitemapLink,
  });

  const xml = await response.text();
  response = new Response(removeExcludedSitemapEntries(xml), {
    headers: response.headers,
  });

  response.headers.set('Cache-Control', `max-age=${60 * 60 * 24}`);

  return response;
}
