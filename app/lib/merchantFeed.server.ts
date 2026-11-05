import type {Storefront} from '@shopify/hydrogen';
import type {
  FeedMarketCurrencyQuery,
  MerchantFeedProductsQuery,
} from 'storefrontapi.generated';
import {
  FEED_CURRENCY,
  merchantFeedRows,
  merchantFeedTsv,
  metaCountryFeedTsv,
  type FeedMarket,
  type FeedProduct,
  type FeedRow,
  type Quotes,
} from './merchantFeed.ts';

export type MerchantFeed = 'fixed' | 'printful' | 'meta-country';

// Merchant Center and Meta fetch each feed once a day; any other request gets
// the cached copy, so the catalogue reads and the cart quotes run at most
// once per window.
const CACHE_SECONDS = 6 * 60 * 60;
const MAX_PAGES = 20;

type QuoteCountry = 'CY' | 'DE' | 'US';

// Public landmarks, used only to price delivery (no checkout, no order).
const QUOTE_ADDRESSES: Record<QuoteCountry, Record<string, string>> = {
  CY: {
    address1: 'Plateia Eleftherias 1',
    city: 'Nicosia',
    zip: '1011',
    countryCode: 'CY',
  },
  DE: {
    address1: 'Pariser Platz 1',
    city: 'Berlin',
    zip: '10117',
    countryCode: 'DE',
  },
  US: {
    address1: '350 5th Ave',
    city: 'New York',
    provinceCode: 'NY',
    zip: '10118',
    countryCode: 'US',
  },
};

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

type QuoteCart = {
  id: string;
  lines: {nodes: Array<{id: string}>};
  deliveryGroups: {
    nodes: Array<{
      deliveryOptions: Array<{
        estimatedCost: {amount: string; currencyCode: string};
      }>;
    }>;
  };
};

/**
 * Checkout's delivery rate for each quote key in one country: one cart with
 * a single line, swapped to the next key's variant each time (Shopify
 * throttles a burst of new carts, not line updates). A key whose product
 * Shopify can't deliver there gets no quote. No checkout, no order.
 */
async function quoteRates(
  storefront: Storefront,
  country: QuoteCountry,
  rows: FeedRow[],
): Promise<Quotes> {
  const currency = country === 'US' ? 'USD' : 'EUR';
  const variants = new Map<string, string>();
  for (const row of rows)
    if (!variants.has(row.quoteKey)) variants.set(row.quoteKey, row.variantId);

  const quotes: Quotes = {};
  let cart: QuoteCart | null = null;
  for (const [key, variantId] of variants) {
    const result:
      | {cart?: QuoteCart | null; userErrors: Array<{message: string}>}
      | null
      | undefined = cart
      ? (
          await storefront.mutate(FEED_QUOTE_SWAP_MUTATION, {
            variables: {
              country,
              language: 'EN',
              cartId: cart.id,
              lines: [
                {
                  id: cart.lines.nodes[0].id,
                  merchandiseId: variantId,
                  quantity: 1,
                },
              ],
            },
          })
        ).cartLinesUpdate
      : (
          await storefront.mutate(FEED_QUOTE_CREATE_MUTATION, {
            variables: {
              country,
              language: 'EN',
              input: {
                buyerIdentity: {countryCode: country},
                delivery: {
                  addresses: [
                    {
                      address: {deliveryAddress: QUOTE_ADDRESSES[country]},
                      selected: true,
                    },
                  ],
                },
                lines: [{merchandiseId: variantId, quantity: 1}],
              },
            },
          })
        ).cartCreate;
    if (!result?.cart || result.userErrors.length)
      throw new Error(
        `Quote cart (${country}) failed: ${result?.userErrors.map((e) => e.message).join('; ') || 'no cart'}`,
      );
    cart = result.cart;
    const amounts = cart.deliveryGroups.nodes
      .flatMap((group) => group.deliveryOptions)
      .filter((option) => option.estimatedCost.currencyCode === currency)
      .map((option) => Number(option.estimatedCost.amount));
    if (amounts.length) quotes[key] = Math.min(...amounts).toFixed(2);
  }
  return quotes;
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

  if (market === 'US') {
    // Every US rate comes from a US cart, so it follows Shopify's USD
    // conversion. A row Shopify can't deliver to the US is left out.
    const quotes = await quoteRates(storefront, 'US', rows);
    const shipping = rows.filter((row) => quotes[row.quoteKey]);
    if (!shipping.length) throw new Error('No US delivery quotes');
    return merchantFeedTsv(shipping, {market: 'US', quotes});
  }

  // The EUR feeds keep listing the US until the US market sells in USD; from
  // then on the USD feeds list it.
  const includeUs = (await marketCurrency(storefront, 'US')) === 'EUR';
  if (feed === 'fixed') return merchantFeedTsv(rows, {market: 'CY', includeUs});
  const [eu, cyprus] = await Promise.all([
    quoteRates(storefront, 'DE', rows),
    quoteRates(storefront, 'CY', rows),
  ]);
  return merchantFeedTsv(rows, {market: 'CY', includeUs, quotes: {eu, cyprus}});
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

const FEED_QUOTE_CART_FRAGMENT = `#graphql
  fragment FeedQuoteCart on Cart {
    id
    lines(first: 1) {
      nodes {
        id
      }
    }
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
` as const;

const FEED_QUOTE_CREATE_MUTATION = `#graphql
  mutation FeedQuoteCreate(
    $input: CartInput!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartCreate(input: $input) {
      cart {
        ...FeedQuoteCart
      }
      userErrors {
        message
      }
    }
  }
  ${FEED_QUOTE_CART_FRAGMENT}
` as const;

const FEED_QUOTE_SWAP_MUTATION = `#graphql
  mutation FeedQuoteSwap(
    $cartId: ID!
    $lines: [CartLineUpdateInput!]!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...FeedQuoteCart
      }
      userErrors {
        message
      }
    }
  }
  ${FEED_QUOTE_CART_FRAGMENT}
` as const;
