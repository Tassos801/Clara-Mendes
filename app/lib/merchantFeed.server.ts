import type {Storefront} from '@shopify/hydrogen';
import type {
  FeedMarketCurrencyQuery,
  MerchantFeedProductsQuery,
} from 'storefrontapi.generated';
import {
  FEED_CURRENCY,
  hasFeedShipping,
  merchantFeedRows,
  merchantFeedTsv,
  metaCountryFeedTsv,
  type FeedMarket,
  type FeedProduct,
  type FeedShipping,
} from './merchantFeed.ts';

export type MerchantFeed = 'fixed' | 'printful' | 'meta-country';

// Merchant Center and Meta fetch each feed once a day; any other request gets
// the cached copy, so the catalogue is read at most once per window. A feed
// only reads: delivery rates come from the checked-in tables, never from a
// cart (Shopify counts every cart as a visit that added to cart).
const CACHE_SECONDS = 6 * 60 * 60;
const MAX_PAGES = 20;

async function loadProducts(storefront: Storefront, market: FeedMarket) {
  const products: FeedProduct[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const data: MerchantFeedProductsQuery = await storefront.query(
      MERCHANT_FEED_PRODUCTS_QUERY,
      {
        variables: {country: market, language: 'EN', cursor},
        cache: storefront.CacheShort(),
      },
    );
    products.push(...data.products.nodes);
    if (!data.products.pageInfo.hasNextPage) return products;
    cursor = data.products.pageInfo.endCursor ?? null;
  }
  throw new Error('Catalogue has more pages than the feed reads');
}

/** The currency Shopify sells in for a country (EUR until a market changes it). */
async function marketCurrency(storefront: Storefront, country: FeedMarket) {
  const data: FeedMarketCurrencyQuery = await storefront.query(
    FEED_MARKET_CURRENCY_QUERY,
    {variables: {country}, cache: storefront.CacheShort()},
  );
  return data.localization.country.currency.isoCode;
}

async function buildFeed(
  storefront: Storefront,
  feed: MerchantFeed,
  market: FeedMarket,
) {
  const products = await loadProducts(storefront, market);

  if (feed === 'meta-country') {
    // Prices, links and availability only; Meta ignores shipping.
    const options = {withUnavailable: true};
    const rows = [
      ...merchantFeedRows(products, 'fixed', market, options),
      ...merchantFeedRows(products, 'printful', market, options),
    ];
    if (!rows.length) throw new Error('The Meta country feed has no items');
    return metaCountryFeedTsv(rows, 'US');
  }

  const rows = merchantFeedRows(products, feed, market);
  if (!rows.length) throw new Error(`The ${market} ${feed} feed has no items`);

  // The EUR feeds keep listing the US until the US market sells in USD; from
  // then on the USD feeds list it.
  const shipping: FeedShipping =
    market === 'US'
      ? {market}
      : {market, includeUs: (await marketCurrency(storefront, 'US')) === 'EUR'};

  // A row the tables have no rate for is left out, not listed without one.
  const listed = rows.filter((row) => hasFeedShipping(row, shipping));
  if (!listed.length) throw new Error(`No ${market} ${feed} delivery rates`);
  if (listed.length < rows.length) {
    const left = rows.filter((row) => !listed.includes(row));
    console.warn(
      `Merchant feed (${feed}, ${FEED_CURRENCY[market]}): ${left.length} items have no delivery rate and are left out:`,
      [...new Set(left.map((row) => row.item_group_id))].join(', '),
    );
  }
  return merchantFeedTsv(listed, shipping);
}

/**
 * The feed as a text response. A failed build answers 503, never an empty
 * feed: Merchant Center and Meta keep the last good fetch on an error, while
 * an empty file would remove every product. The USD feeds answer 503 until
 * the United States market sells in USD.
 */
export async function merchantFeedResponse(
  request: Request,
  storefront: Storefront,
  feed: MerchantFeed,
  market: FeedMarket = 'CY',
) {
  const key = new URL(request.url);
  key.search = '';
  const cache = await caches.open('merchant-feeds').catch(() => null);
  const cached = await cache?.match(key.href);
  // A cached response's headers are immutable; Hydrogen adds its own.
  if (cached) return new Response(cached.body, cached);

  try {
    const response = new Response(await buildFeed(storefront, feed, market), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
        'X-Robots-Tag': 'noindex',
      },
    });
    await cache?.put(key.href, response.clone()).catch(() => undefined);
    return response;
  } catch (error) {
    console.error(
      `Merchant feed (${feed}, ${FEED_CURRENCY[market]}) failed.`,
      error,
    );
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
        vendor
        description
        storefrontApproved: metafield(
          namespace: "custom"
          key: "storefront_approved"
        ) {
          type
          value
        }
        fulfillmentVerified: metafield(
          namespace: "custom"
          key: "fulfillment_verified"
        ) {
          type
          value
        }
        featuredImage {
          url
        }
        collections(first: 20) {
          nodes {
            handle
            title
            clothingKind: metafield(
              namespace: "custom"
              key: "collection_kind"
            ) {
              type
              value
            }
          }
        }
        variants(first: 100) {
          nodes {
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

const FEED_MARKET_CURRENCY_QUERY = `#graphql
  query FeedMarketCurrency($country: CountryCode)
  @inContext(country: $country) {
    localization {
      country {
        currency {
          isoCode
        }
      }
    }
  }
` as const;
