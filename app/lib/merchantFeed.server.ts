import type {Storefront} from '@shopify/hydrogen';
import type {MerchantFeedProductsQuery} from 'storefrontapi.generated';
import {
  merchantFeedRows,
  merchantFeedTsv,
  type FeedProduct,
  type FeedRow,
  type PrintfulLine,
  type PrintfulRates,
} from './merchantFeed.ts';

export type MerchantFeed = 'fixed' | 'printful';

// Merchant Center fetches each feed once a day; any other request gets the
// cached copy, so the catalogue reads and the Printful cart quotes run at
// most once per window.
const CACHE_SECONDS = 6 * 60 * 60;
const MAX_PAGES = 20;

async function loadProducts(storefront: Storefront) {
  const products: FeedProduct[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const data: MerchantFeedProductsQuery = await storefront.query(
      MERCHANT_FEED_PRODUCTS_QUERY,
      {
        variables: {country: 'CY', language: 'EN', cursor},
        cache: storefront.CacheShort(),
      },
    );
    products.push(...data.products.nodes);
    if (!data.products.pageInfo.hasNextPage) return products;
    cursor = data.products.pageInfo.endCursor ?? null;
  }
  throw new Error('Catalogue has more pages than the feed reads');
}

/**
 * Checkout's EU delivery rate for each Printful line: a one-item cart with a
 * German address per line (no checkout, no order). Printful's Shopify
 * profiles charge one rate across the EU, in USD converted daily.
 */
async function quotePrintfulRates(storefront: Storefront, rows: FeedRow[]) {
  const rates: Partial<PrintfulRates> = {};
  for (const line of [
    'mug',
    'cushion-cover',
    'cushion-insert',
    'blanket',
  ] as PrintfulLine[]) {
    const row = rows.find((r) => r.line === line);
    if (!row) continue;
    const data = await storefront.mutate(MERCHANT_FEED_QUOTE_MUTATION, {
      variables: {
        country: 'DE',
        language: 'EN',
        input: {
          buyerIdentity: {countryCode: 'DE'},
          delivery: {
            addresses: [
              {
                // A public landmark, used only to price delivery.
                address: {
                  deliveryAddress: {
                    address1: 'Pariser Platz 1',
                    city: 'Berlin',
                    zip: '10117',
                    countryCode: 'DE',
                  },
                },
                selected: true,
              },
            ],
          },
          lines: [{merchandiseId: row.variantId, quantity: 1}],
        },
      },
    });
    const amounts = (data.cartCreate?.cart?.deliveryGroups.nodes ?? [])
      .flatMap((group) => group.deliveryOptions)
      .filter((option) => option.estimatedCost.currencyCode === 'EUR')
      .map((option) => Number(option.estimatedCost.amount));
    if (!amounts.length) throw new Error(`No EU delivery quote for ${line}`);
    rates[line] = Math.min(...amounts).toFixed(2);
  }
  return rates as PrintfulRates;
}

async function buildFeed(storefront: Storefront, feed: MerchantFeed) {
  const rows = merchantFeedRows(await loadProducts(storefront), feed);
  if (!rows.length) throw new Error(`The ${feed} feed has no items`);
  const rates =
    feed === 'printful'
      ? await quotePrintfulRates(storefront, rows)
      : undefined;
  return merchantFeedTsv(rows, rates);
}

/**
 * The feed as a text response. A failed build answers 503, never an empty
 * feed: Merchant Center keeps the last good fetch on an error, while an empty
 * file would remove every product.
 */
export async function merchantFeedResponse(
  request: Request,
  storefront: Storefront,
  feed: MerchantFeed,
) {
  const key = new URL(request.url);
  key.search = '';
  const cache = await caches.open('merchant-feeds').catch(() => null);
  const cached = await cache?.match(key.href);
  // A cached response's headers are immutable; Hydrogen adds its own.
  if (cached) return new Response(cached.body, cached);

  try {
    const response = new Response(await buildFeed(storefront, feed), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
        'X-Robots-Tag': 'noindex',
      },
    });
    await cache?.put(key.href, response.clone()).catch(() => undefined);
    return response;
  } catch (error) {
    console.error(`Merchant feed (${feed}) failed.`, error);
    return new Response('Feed temporarily unavailable', {
      status: 503,
      headers: {'Retry-After': '3600', 'Cache-Control': 'no-store'},
    });
  }
}

const MERCHANT_FEED_PRODUCTS_QUERY = `#graphql
  query MerchantFeedProducts(
    $country: CountryCode
    $language: LanguageCode
    $cursor: String
  ) @inContext(country: $country, language: $language) {
    products(first: 50, after: $cursor, query: "status:active") {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        handle
        title
        productType
        tags
        description
        featuredImage {
          url
        }
        variants(first: 100) {
          nodes {
            id
            sku
            availableForSale
            price {
              amount
              currencyCode
            }
            selectedOptions {
              name
              value
            }
            image {
              url
            }
          }
        }
      }
    }
  }
` as const;

const MERCHANT_FEED_QUOTE_MUTATION = `#graphql
  mutation MerchantFeedQuote(
    $input: CartInput!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartCreate(input: $input) {
      cart {
        deliveryGroups(first: 5) {
          nodes {
            deliveryOptions {
              estimatedCost {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  }
` as const;
