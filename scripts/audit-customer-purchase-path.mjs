import {
  envWithLocalDefaults,
  getRequiredEnv,
  normalizeShopDomain,
} from './lib/env.mjs';

const handle =
  process.argv
    .find((argument) => argument.startsWith('--handle='))
    ?.split('=', 2)[1] ?? 'quiet-form-i-art-print';
const destinationCode =
  process.argv
    .find((argument) => argument.startsWith('--country-code='))
    ?.split('=', 2)[1]
    ?.toUpperCase() ?? 'CY';
const destinationCountry =
  process.argv
    .find((argument) => argument.startsWith('--country='))
    ?.split('=', 2)[1] ?? 'Cyprus';
const destinationCity =
  process.argv
    .find((argument) => argument.startsWith('--city='))
    ?.split('=', 2)[1] ?? 'Nicosia';
const destinationPostalCode =
  process.argv
    .find((argument) => argument.startsWith('--postal-code='))
    ?.split('=', 2)[1] ?? '1010';

const env = envWithLocalDefaults();
const domain = normalizeShopDomain(getRequiredEnv(env, 'PUBLIC_STORE_DOMAIN'));
const token = getRequiredEnv(env, 'PUBLIC_STOREFRONT_API_TOKEN');
const apiVersion = env.SHOPIFY_STOREFRONT_API_VERSION || '2026-04';
const endpoint = `https://${domain}/api/${apiVersion}/graphql.json`;

const productData = await storefrontRequest(
  `#graphql
    query PurchasePathProduct($handle: String!) {
      shop {
        paymentSettings {
          acceptedCardBrands
          countryCode
          currencyCode
          enabledPresentmentCurrencies
          supportedDigitalWallets
        }
      }
      product(handle: $handle) {
        title
        availableForSale
        variants(first: 1) {
          nodes {
            id
            availableForSale
            price {
              amount
              currencyCode
            }
          }
        }
      }
    }
  `,
  {handle},
);

if (!productData.product) {
  throw new Error(`Storefront product not found: ${handle}`);
}

const variant = productData.product.variants.nodes[0];
if (!variant) {
  throw new Error(`Storefront product has no purchasable variant: ${handle}`);
}

const cartData = await storefrontRequest(
  `#graphql
    mutation PurchasePathCart(
      $variantId: ID!
      $countryCode: CountryCode!
      $country: String!
      $city: String!
      $postalCode: String!
    ) {
      cartCreate(
        input: {
          lines: [{quantity: 1, merchandiseId: $variantId}]
          buyerIdentity: {
            countryCode: $countryCode
            deliveryAddressPreferences: [
              {
                deliveryAddress: {
                  country: $country
                  city: $city
                  zip: $postalCode
                }
                deliveryAddressValidationStrategy: COUNTRY_CODE_ONLY
                oneTimeUse: true
              }
            ]
          }
        }
      ) {
        cart {
          checkoutUrl
          totalQuantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
          }
          deliveryGroups(first: 10) {
            nodes {
              deliveryOptions {
                title
                estimatedCost {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `,
  {
    variantId: variant.id,
    countryCode: destinationCode,
    country: destinationCountry,
    city: destinationCity,
    postalCode: destinationPostalCode,
  },
);

const cartResult = cartData.cartCreate;
if (cartResult.userErrors.length > 0) {
  throw new Error(
    `Shopify rejected the test cart: ${JSON.stringify(cartResult.userErrors)}`,
  );
}

const checkoutUrl = new URL(cartResult.cart.checkoutUrl);
const checkoutResponse = await fetch(checkoutUrl, {
  redirect: 'follow',
  headers: {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  },
});
const checkoutHtml = await checkoutResponse.text();
const checkoutTitle =
  checkoutHtml
    .match(/<title>(.*?)<\/title>/is)?.[1]
    ?.replace(/\s+/g, ' ')
    .trim() ?? '';
const checkoutBodySignal = checkoutHtml
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 240);

const result = {
  product: productData.product.title,
  productAvailable: productData.product.availableForSale,
  variantAvailable: variant.availableForSale,
  unitPrice: variant.price,
  paymentSettings: productData.shop.paymentSettings,
  destination: {
    countryCode: destinationCode,
    country: destinationCountry,
    city: destinationCity,
    postalCode: destinationPostalCode,
  },
  cartQuantity: cartResult.cart.totalQuantity,
  cartTotal: cartResult.cart.cost.totalAmount,
  deliveryOptions: cartResult.cart.deliveryGroups.nodes.flatMap(
    (group) => group.deliveryOptions,
  ),
  checkoutHost: checkoutUrl.host,
  checkoutStatus: checkoutResponse.status,
  checkoutFinalHost: new URL(checkoutResponse.url).host,
  checkoutTitle,
  checkoutBodySignal,
};

console.log(JSON.stringify(result, null, 2));

if (
  !result.productAvailable ||
  !result.variantAvailable ||
  result.cartQuantity !== 1 ||
  !checkoutResponse.ok
) {
  process.exitCode = 1;
}

async function storefrontRequest(query, variables) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token,
    },
    body: JSON.stringify({query, variables}),
  });
  const payload = await response.json();

  if (!response.ok || payload.errors) {
    throw new Error(
      `Shopify Storefront API request failed: ${JSON.stringify({
        status: response.status,
        errors: payload.errors,
      })}`,
    );
  }

  return payload.data;
}
