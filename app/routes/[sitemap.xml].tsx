import type {Route} from './+types/[sitemap.xml]';
import {getSitemapIndex} from '@shopify/hydrogen';
import {injectCustomSitemapEntry} from '~/lib/sitemap';

export async function loader({
  request,
  context: {storefront},
}: Route.LoaderArgs) {
  const shopifyIndex = await getSitemapIndex({
    storefront,
    request,
  });

  const xml = injectCustomSitemapEntry(
    await shopifyIndex.text(),
    new URL(request.url).origin,
  );

  const response = new Response(xml, {headers: shopifyIndex.headers});
  response.headers.set('Cache-Control', `max-age=${60 * 60 * 24}`);

  return response;
}
