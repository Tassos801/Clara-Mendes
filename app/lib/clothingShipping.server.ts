import type {Storefront} from '@shopify/hydrogen';
import type {CountryCode} from '@shopify/hydrogen/storefront-api-types';
import {
  cheapestShippingQuote,
  QUOTE_ADDRESSES,
  type ClothingShippingQuote,
} from './clothingShipping.ts';

// One quote per piece and country, shared by every visitor for an hour:
// Printful converts its USD rates daily, and a market's currency can change
// (the US moves to USD), so an hour keeps the line close to checkout.
const CACHE_SECONDS = 60 * 60;
const FAILED_CACHE_SECONDS = 15 * 60;
const TIMEOUT_MS = 2500;

/**
 * Checkout's standard shipping fee for one of this variant to the buyer's
 * country, in that market's currency: a throwaway one-piece cart (no
 * checkout, no order). Null when the piece does not ship there, the quote
 * fails or it takes too long; the page then shows no fee line.
 *
 * Printful's carrier rates can be slow on a cold request. A quote that
 * misses the timeout keeps running through `waitUntil` and fills the cache,
 * so the next visitor gets the line; only a finished answer is cached.
 */
export async function quoteClothingShipping(
  storefront: Storefront,
  variantId: string | null | undefined,
  country: string | null | undefined,
  {
    waitUntil,
    timeoutMs = TIMEOUT_MS,
  }: {
    waitUntil?: (promise: Promise<unknown>) => void;
    timeoutMs?: number;
  } = {},
): Promise<ClothingShippingQuote | null> {
  if (!variantId || !country) return null;
  const key = `https://clothing-shipping.quote/${encodeURIComponent(variantId)}/${country}`;
  const cache =
    typeof caches === 'undefined'
      ? null
      : await caches.open('clothing-shipping').catch(() => null);
  const hit = await cache?.match(key).catch(() => undefined);
  if (hit) {
    return (await hit.json().catch(() => null)) as ClothingShippingQuote | null;
  }

  const store = (quote: ClothingShippingQuote | null) =>
    cache
      ?.put(
        key,
        new Response(JSON.stringify(quote), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `public, max-age=${quote ? CACHE_SECONDS : FAILED_CACHE_SECONDS}`,
          },
        }),
      )
      .catch(() => undefined);
  const pending = requestQuote(storefront, variantId, country).catch(
    () => null,
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  const result = await Promise.race([
    pending.then((quote) => ({quote, finished: true})),
    new Promise<{quote: null; finished: false}>((resolve) => {
      timer = setTimeout(
        () => resolve({quote: null, finished: false}),
        timeoutMs,
      );
    }),
  ]).finally(() => clearTimeout(timer));

  if (result.finished) {
    await store(result.quote);
    return result.quote;
  }
  waitUntil?.(pending.then(store));
  return null;
}

async function requestQuote(
  storefront: Storefront,
  variantId: string,
  country: string,
) {
  const countryCode = country.toUpperCase() as CountryCode;
  const data = await storefront.mutate(CLOTHING_SHIPPING_QUOTE_MUTATION, {
    variables: {
      country: countryCode,
      input: {
        buyerIdentity: {countryCode},
        delivery: {
          addresses: [
            {
              address: {
                deliveryAddress: {
                  countryCode,
                  ...QUOTE_ADDRESSES[country.toUpperCase()],
                },
              },
              selected: true,
              validationStrategy: 'COUNTRY_CODE_ONLY',
            },
          ],
        },
        lines: [{merchandiseId: variantId, quantity: 1}],
      },
    },
  });
  return cheapestShippingQuote(
    (data.cartCreate?.cart?.deliveryGroups.nodes ?? []).flatMap(
      (group) => group.deliveryOptions,
    ),
  );
}

const CLOTHING_SHIPPING_QUOTE_MUTATION = `#graphql
  mutation ClothingShippingQuote($input: CartInput!, $country: CountryCode)
  @inContext(country: $country) {
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
