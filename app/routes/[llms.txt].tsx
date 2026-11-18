import type {Route} from './+types/[llms.txt]';
import {blackFridayNow} from '~/lib/blackFriday';
import {isOffThemeCollectionHandle} from '~/lib/catalogFilters';
import {loadClothingProducts} from '~/lib/clothing.server';
import {buildLlmsTxt, clothingSummary} from '~/lib/llmsTxt';

/**
 * /llms.txt, built per request from the released catalogs (app/lib/llmsTxt.ts)
 * so it cannot go stale. Clothing comes from the listed Shopify products; a
 * failed read falls back to a generic clothing line rather than an error.
 * The seasonal section follows the request time (or a `?today=` preview).
 */
export async function loader({context, request}: Route.LoaderArgs) {
  const clothing = await loadClothingProducts(context.storefront)
    .then((products) => clothingSummary(products, isOffThemeCollectionHandle))
    .catch(() => null);

  const now = blackFridayNow(request);
  return new Response(buildLlmsTxt({clothing, now}), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': `public, max-age=${60 * 60}`,
    },
  });
}
