import type {Route} from './+types/sitemap.$type.$page[.xml]';
import {getSitemap} from '@shopify/hydrogen';
import {
  buildCustomRoutesSitemapXml,
  filterSitemapProductEntries,
  filterSitemapCollectionEntries,
  isValidSitemapRequest,
  removeExcludedSitemapEntries,
  sitemapLink,
  sitemapProductEligibilityQuery,
  SITEMAP_COLLECTION_ELIGIBILITY_QUERY,
} from '~/lib/sitemap';
import type {CatalogProductLike} from '~/lib/catalogFilters';
import type {SitemapCollectionEligibilityQuery} from 'storefrontapi.generated';

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
  const filteredXml =
    params.type === 'products'
      ? await filterSitemapProductEntries(xml, async (handles) => {
          const {query, variables} = sitemapProductEligibilityQuery(handles);
          const products = await storefront.query(query, {
            variables,
            cache: storefront.CacheNone(),
          });
          return Object.values(products) as Array<CatalogProductLike | null>;
        })
      : params.type === 'collections'
        ? await filterSitemapCollectionEntries(xml, async (handle) => {
            const nodes: CatalogProductLike[] = [];
            const seen = new Set<string>();
            let after: string | null = null;
            do {
              const data: SitemapCollectionEligibilityQuery = await storefront.query(
                SITEMAP_COLLECTION_ELIGIBILITY_QUERY,
                {
                  variables: {handle, after},
                  cache: storefront.CacheNone(),
                },
              );
              if (!data.collection) return null;
              nodes.push(...data.collection.products.nodes);
              if (!data.collection.products.pageInfo.hasNextPage) break;
              const cursor: string | null | undefined =
                data.collection.products.pageInfo.endCursor;
              if (!cursor || seen.has(cursor))
                throw new Error('Sitemap collection pagination did not advance');
              seen.add(cursor);
              after = cursor;
            } while (after);
            return {handle, products: {nodes}};
          })
        : removeExcludedSitemapEntries(xml);
  response = new Response(filteredXml, {
    headers: response.headers,
  });

  response.headers.set(
    'Cache-Control',
    ['products', 'collections'].includes(params.type) ? 'no-store' : `max-age=${60 * 60 * 24}`,
  );

  return response;
}
