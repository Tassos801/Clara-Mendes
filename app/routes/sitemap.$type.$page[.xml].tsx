import type {Route} from './+types/sitemap.$type.$page[.xml]';
import {getSitemap} from '@shopify/hydrogen';
import {
  isOffThemeCollectionHandle,
  isOffThemeProductHandle,
} from '~/lib/catalogFilters';

export async function loader({
  request,
  params,
  context: {storefront},
}: Route.LoaderArgs) {
  let response = await getSitemap({
    storefront,
    request,
    params,
    locales: ['EN-US', 'EN-CA', 'FR-CA'],
    getLink: ({type, baseUrl, handle, locale}) => {
      if (!locale) return `${baseUrl}/${type}/${handle}`;
      return `${baseUrl}/${locale}/${type}/${handle}`;
    },
  });

  if (params.type === 'products' || params.type === 'collections') {
    const xml = await response.text();
    response = new Response(removeOffThemeSitemapEntries(xml), {
      headers: response.headers,
    });
  }

  response.headers.set('Cache-Control', `max-age=${60 * 60 * 24}`);

  return response;
}

function removeOffThemeSitemapEntries(xml: string) {
  return xml.replace(/<url>[\s\S]*?<\/url>/g, (entry) => {
    const loc = entry.match(/<loc>(.*?)<\/loc>/)?.[1] ?? '';
    const match = loc.match(/\/(products|collections)\/([^/<]+)$/);
    if (!match) return entry;

    const [, type, handle] = match;
    if (type === 'products' && isOffThemeProductHandle(handle)) return '';
    if (type === 'collections' && isOffThemeCollectionHandle(handle)) return '';

    return entry;
  });
}
