import type {Route} from './+types/sitemap.$type.$page[.xml]';
import {getSitemap} from '@shopify/hydrogen';
import {
  buildCustomRoutesSitemapXml,
  removeExcludedSitemapEntries,
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

  let response = await getSitemap({
    storefront,
    request,
    params,
    // No locale-prefixed routes exist in this storefront, so no hreflang
    // alternates may be emitted — they would point at 404s.
    locales: [],
    getLink: ({type, baseUrl, handle}) => `${baseUrl}/${type}/${handle}`,
  });

  const xml = await response.text();
  response = new Response(removeExcludedSitemapEntries(xml), {
    headers: response.headers,
  });

  response.headers.set('Cache-Control', `max-age=${60 * 60 * 24}`);

  return response;
}
