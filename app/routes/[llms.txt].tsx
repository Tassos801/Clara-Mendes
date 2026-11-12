import type {Route} from './+types/[llms.txt]';
import {isOffThemeCollectionHandle} from '~/lib/catalogFilters';
import {loadClothingProducts} from '~/lib/clothing.server';
import {buildLlmsTxt, clothingSummary} from '~/lib/llmsTxt';

/**
 * /llms.txt, built per request from the released catalogs (app/lib/llmsTxt.ts)
 * so it cannot go stale. Clothing comes from the listed Shopify products; a
 * failed read falls back to a generic clothing line rather than an error.
 */
export async function loader({context}: Route.LoaderArgs) {
  const clothing = await loadClothingProducts(context.storefront)
    .then((products) => clothingSummary(products, isOffThemeCollectionHandle))
    .catch(() => null);

  return new Response(buildLlmsTxt({clothing}), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': `public, max-age=${60 * 60}`,
    },
  });
}
