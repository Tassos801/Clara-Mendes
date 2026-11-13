import type {ClaraCardProduct} from '../components/ClaraProductCard.tsx';
import {deriveCardPricing} from './productCardPricing.ts';
import {BRAND} from '../content/brand.ts';
import {fixedRateLineFor} from './merchantFeed.ts';
import {FIXED_RATES} from './merchantFeedShipping.ts';
import {
  DELIVERY_EU_BUSINESS_DAYS,
  DELIVERY_US_BUSINESS_DAYS,
  fulfilmentWindows,
  isPersonalisedProductType,
  RETURN_WINDOW_DAYS,
  SHIPPING_COUNTRY_CODES,
  STOREFRONT_ORIGIN,
  type PrintfulTechnique,
} from './storefrontBasics.ts';

type MoneyAmount = {
  amount: string;
  currencyCode: string;
};

type SeoMetaInput = {
  description: string;
  image?: string | null;
  noIndex?: boolean;
  title: string;
  type?: 'product' | 'website';
  url: string;
};

/**
 * The market an Offer describes: null for the default market (EU shipping
 * and returns), 'US' for a US buyer who can buy the item (US shipping and
 * returns). See structuredDataView in deliveryReach.ts.
 */
export type SchemaMarket = 'US' | null;

type ProductSchemaInput = {
  availableForSale?: boolean;
  market?: SchemaMarket;
  gtin?: string | null;
  description: string;
  image?: string | null;
  priceRange?: {
    minVariantPrice?: MoneyAmount;
    maxVariantPrice?: MoneyAmount;
  };
  productId?: string | null;
  productHandle?: string | null;
  productType?: string | null;
  /** A museum product Printful makes: its windows, not Prodigi's. */
  printfulTechnique?: PrintfulTechnique | null;
  tags?: string[] | null;
  reviewSummary?: {
    count: number;
    averageRating: number | null;
  };
  sku?: string | null;
  title: string;
  url: string;
  vendor?: string | null;
  variants?: Array<{
    availableForSale: boolean;
    barcode?: string | null;
    id: string;
    price: MoneyAmount;
    selectedOptions: Array<{
      name: string;
      value: string;
    }>;
    sku?: string | null;
    title: string;
  }>;
};

type BreadcrumbInput = {
  items: Array<{
    name: string;
    url: string;
  }>;
};

export const SITE_NAME = 'Clara Mendes';
export const DEFAULT_META_DESCRIPTION = BRAND.seo.defaultDescription;
// The logo on paper, 1200x630 (scripts/build-share-card.mjs): pages without
// their own image share the brand, and the platform prints the title below.
export const DEFAULT_SHARE_IMAGE = `${STOREFRONT_ORIGIN}/images/share/og-default.jpg`;

export function getCanonicalUrl(_request: Request, pathname: string) {
  return new URL(pathname, STOREFRONT_ORIGIN).toString();
}

const TITLE_MAX = 62;

export function buildSeoMeta({
  description,
  image,
  noIndex = false,
  title,
  type = 'website',
  url,
}: SeoMetaInput) {
  // The brand suffix goes only where it fits: a long product title keeps
  // its words ("... by Hokusai") rather than ending in "| Clara...".
  const branded = `${title} | ${SITE_NAME}`;
  const metaTitle =
    title.includes(SITE_NAME) || branded.length > TITLE_MAX ? title : branded;
  const metaDescription = truncate(description, 155);
  const shareImage = image || DEFAULT_SHARE_IMAGE;

  return [
    {title: truncate(metaTitle, TITLE_MAX)},
    {name: 'description', content: metaDescription},
    {
      name: 'robots',
      content: noIndex
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large',
    },
    {tagName: 'link', rel: 'canonical', href: url},
    {property: 'og:site_name', content: SITE_NAME},
    {property: 'og:type', content: type},
    {property: 'og:title', content: truncate(metaTitle, 70)},
    {property: 'og:description', content: metaDescription},
    {property: 'og:url', content: url},
    {property: 'og:image', content: shareImage},
    {name: 'twitter:card', content: 'summary_large_image'},
    {name: 'twitter:title', content: truncate(metaTitle, 70)},
    {name: 'twitter:description', content: metaDescription},
    {name: 'twitter:image', content: shareImage},
  ];
}

export function organizationSchema(url: string) {
  const origin = new URL(url).origin;

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: origin,
    logo: `${origin}/images/brand/clara-mendes-logo.png`,
    description: DEFAULT_META_DESCRIPTION,
    founder: {'@type': 'Person', name: BRAND.letter.founder.name},
  };
}

export function websiteSchema(url: string) {
  const origin = new URL(url).origin;

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: origin,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${origin}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function collectionSchema({
  description,
  products,
  title,
  url,
}: {
  description: string;
  products: ClaraCardProduct[];
  title: string;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: `${title} | ${SITE_NAME}`,
        description: truncate(description, 220),
        url,
      },
      {
        '@type': 'ItemList',
        name: `${title} products`,
        itemListElement: products.slice(0, 24).map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: new URL(`/products/${product.handle}`, url).toString(),
          item: {
            '@type': 'Product',
            name: product.title,
            image: product.featuredImage?.url,
            // Same released-floor rule as the visible cards: a staged size
            // must never set the advertised price.
            offers: (() => {
              const price = deriveCardPricing(product).price;
              return price
                ? offerFromPrice({
                    includeCommerceDetails: false,
                    price,
                    url: new URL(`/products/${product.handle}`, url).toString(),
                  })
                : undefined;
            })(),
          },
        })),
      },
    ],
  };
}

export function productSchema({
  availableForSale = true,
  market = null,
  gtin,
  description,
  image,
  priceRange,
  productId,
  productHandle,
  productType,
  printfulTechnique,
  tags,
  reviewSummary,
  sku,
  title,
  url,
  vendor,
  variants,
}: ProductSchemaInput) {
  // Offer bounds come from RELEASED (availableForSale) variants only —
  // staged-but-unreleased size variants exist in Shopify at full price with
  // availableForSale=false and would otherwise leak an unpurchasable price
  // into rich results. Raw priceRange remains the fallback only when no
  // purchasable variant exists (fully sold out, or no variant data).
  const releasedPrices = (variants ?? [])
    .filter((variant) => variant.availableForSale)
    .map((variant) => variant.price)
    .filter((price) => Number.isFinite(Number(price.amount)))
    .sort((a, b) => Number(a.amount) - Number(b.amount));
  const minPrice = releasedPrices[0] ?? priceRange?.minVariantPrice;
  const maxPrice = releasedPrices.length
    ? releasedPrices[releasedPrices.length - 1]
    : priceRange?.maxVariantPrice;
  const hasPriceRange =
    minPrice && maxPrice && Number(minPrice.amount) !== Number(maxPrice.amount);
  const hasRating =
    reviewSummary &&
    reviewSummary.count >= 3 &&
    reviewSummary.averageRating != null;

  // A product sold in several variants is a ProductGroup (schema.org and
  // Google's variant markup); hasVariant is not a Product property. Staged
  // sizes stay out, like the price bounds above.
  const offeredVariants = (variants ?? []).filter(
    (variant) => variant.availableForSale,
  );
  const listedVariants = (
    offeredVariants.length ? offeredVariants : (variants ?? [])
  ).slice(0, 50);
  const isGroup = listedVariants.length > 1;

  return {
    '@context': 'https://schema.org',
    '@type': isGroup ? 'ProductGroup' : 'Product',
    name: title,
    description: truncate(description, 500),
    image: image ? [image] : undefined,
    productID: gidNumber(productId),
    productGroupID: isGroup ? gidNumber(productId) : undefined,
    variesBy: isGroup ? variesBy(listedVariants) : undefined,
    url: isGroup ? url : undefined,
    // SKU and GTIN identify one variant; a group carries them per variant.
    sku: (!isGroup && sku) || undefined,
    gtin: (!isGroup && gtin) || undefined,
    category: productType || undefined,
    brand: {
      '@type': 'Brand',
      name: vendor || SITE_NAME,
    },
    aggregateRating: hasRating
      ? {
          '@type': 'AggregateRating',
          ratingValue: Number(reviewSummary.averageRating).toFixed(1),
          reviewCount: reviewSummary.count,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined,
    offers:
      minPrice && hasPriceRange
        ? {
            '@type': 'AggregateOffer',
            lowPrice: normalizePrice(minPrice.amount),
            highPrice: normalizePrice(maxPrice.amount),
            priceCurrency: minPrice.currencyCode,
            availability: schemaAvailability(availableForSale),
            url,
          }
        : minPrice
          ? offerFromPrice({
              availableForSale,
              market,
              price: minPrice,
              productType,
              productHandle,
              printfulTechnique,
              selectedOptions: listedVariants[0]?.selectedOptions,
              tags,
              url,
            })
          : undefined,
    hasVariant: isGroup
      ? listedVariants.map((variant) =>
          productVariantSchema({
            market,
            parentTitle: title,
            productType,
            productHandle,
            printfulTechnique,
            tags,
            url,
            variant,
            vendor,
          }),
        )
      : undefined,
  };
}

export function breadcrumbSchema({items}: BreadcrumbInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** `'2–4'` → `{minValue: 2, maxValue: 4}` for a schema.org QuantitativeValue. */
function dayRange(window: string) {
  const [minValue, maxValue] = window.split('–').map(Number);
  return {minValue, maxValue};
}

/**
 * The EUR shipping rate per EU country for one variant, from the same fixed
 * tables the Merchant Center feeds publish (app/lib/merchantFeedShipping.ts):
 * Cyprus pays `cyprus`, the rest of the EU `eu`. Null where no static rate
 * exists (Printful lines, whose fees follow the exchange rate, and any line
 * the feeds don't list) and outside the default (EUR) market: the US rate in
 * USD follows the exchange rate too.
 */
function staticEuRates({
  currency,
  market,
  productHandle,
  productType,
  selectedOptions,
  tags,
}: {
  currency: string;
  market: SchemaMarket;
  productHandle?: string | null;
  productType?: string | null;
  selectedOptions?: ReadonlyArray<{name: string; value: string}>;
  tags?: string[] | null;
}): Map<string, string> | null {
  if (market !== null || currency !== 'EUR' || !productHandle) return null;
  const line = fixedRateLineFor(
    {handle: productHandle, productType: productType ?? '', tags: tags ?? []},
    selectedOptions ?? [],
  );
  if (!line) return null;
  const rates = FIXED_RATES[line];
  return new Map(
    SHIPPING_COUNTRY_CODES.map((country) => [
      country,
      country === 'CY' ? rates.cyprus : rates.eu,
    ]),
  );
}

/**
 * Shipping and return enrichments for Offer nodes, mirroring the published
 * promises: the product type's dispatch window (prints 2–4 business days,
 * Printful activewear 3–8), delivery after dispatch (EU 5–10, or the US
 * 7–15 on a US buyer's page; storefrontBasics constants), the shipping
 * rate where a static one exists (one OfferShippingDetails per rate, see
 * staticEuRates), and the refund policy's returns (merchantReturnPolicy
 * below). Google reads these for shipping/returns annotations on product
 * results.
 */
function offerShippingDetails(
  productType?: string | null,
  productHandle?: string | null,
  tags?: string[] | null,
  printfulTechnique?: PrintfulTechnique | null,
  market: SchemaMarket = null,
  rates: Map<string, string> | null = null,
) {
  const windows = fulfilmentWindows(
    productType,
    productHandle,
    tags,
    printfulTechnique,
  );
  if (!windows) return undefined;
  const countries = schemaCountries(market);
  const details = (destinations: string[], rate?: string) => ({
    '@type': 'OfferShippingDetails',
    shippingRate: rate
      ? {'@type': 'MonetaryAmount', value: rate, currency: 'EUR'}
      : undefined,
    shippingDestination: destinations.map((country) => ({
      '@type': 'DefinedRegion',
      addressCountry: country,
    })),
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: {
        '@type': 'QuantitativeValue',
        ...dayRange(windows.dispatch),
        unitCode: 'DAY',
      },
      transitTime: {
        '@type': 'QuantitativeValue',
        ...dayRange(
          market === 'US'
            ? DELIVERY_US_BUSINESS_DAYS
            : DELIVERY_EU_BUSINESS_DAYS,
        ),
        unitCode: 'DAY',
      },
    },
  });
  if (!rates) return details(countries);
  // One block per rate, countries in their usual order.
  const byRate = new Map<string, string[]>();
  for (const country of countries) {
    const rate = rates.get(country);
    if (!rate) continue;
    byRate.set(rate, [...(byRate.get(rate) ?? []), country]);
  }
  const blocks = [...byRate].map(([rate, destinations]) =>
    details(destinations, rate),
  );
  return blocks.length === 1 ? blocks[0] : blocks;
}

/**
 * The refund policy's return terms: 30 days by mail at the buyer's cost, except
 * custom or personalised orders, which are non-returnable (Your Sky, First
 * Light). Google reads MerchantReturnNotPermitted with no window or fees.
 */
/** The countries an Offer's shipping and returns name. */
function schemaCountries(market: SchemaMarket): string[] {
  return market === 'US' ? ['US'] : [...SHIPPING_COUNTRY_CODES];
}

function merchantReturnPolicy(
  productType?: string | null,
  market: SchemaMarket = null,
) {
  if (isPersonalisedProductType(productType))
    return {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: schemaCountries(market),
      returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
    };
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: schemaCountries(market),
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: RETURN_WINDOW_DAYS,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: 'https://schema.org/ReturnShippingFees',
  };
}

function offerFromPrice({
  availableForSale = true,
  market = null,
  // Collection ItemLists skip the shipping/returns blocks — repeating them
  // per list item would triple the page's JSON-LD for data Google reads
  // from the product page anyway.
  includeCommerceDetails = true,
  price,
  productType,
  productHandle,
  printfulTechnique,
  selectedOptions,
  tags,
  url,
}: {
  availableForSale?: boolean;
  market?: SchemaMarket;
  includeCommerceDetails?: boolean;
  price: MoneyAmount;
  /** The variant's options: they pick its shipping table (Your Sky framing). */
  selectedOptions?: ReadonlyArray<{name: string; value: string}>;
  productType?: string | null;
  productHandle?: string | null;
  printfulTechnique?: PrintfulTechnique | null;
  tags?: string[] | null;
  url: string;
}) {
  return {
    '@type': 'Offer',
    price: normalizePrice(price.amount),
    priceCurrency: price.currencyCode,
    availability: schemaAvailability(availableForSale),
    itemCondition: 'https://schema.org/NewCondition',
    shippingDetails: includeCommerceDetails
      ? offerShippingDetails(
          productType,
          productHandle,
          tags,
          printfulTechnique,
          market,
          staticEuRates({
            currency: price.currencyCode,
            market,
            productHandle,
            productType,
            selectedOptions,
            tags,
          }),
        )
      : undefined,
    hasMerchantReturnPolicy: includeCommerceDetails
      ? merchantReturnPolicy(productType, market)
      : undefined,
    url,
  };
}

function productVariantSchema({
  market = null,
  parentTitle,
  productType,
  productHandle,
  printfulTechnique,
  tags,
  url,
  variant,
  vendor,
}: {
  market?: SchemaMarket;
  parentTitle: string;
  productType?: string | null;
  productHandle?: string | null;
  printfulTechnique?: PrintfulTechnique | null;
  tags?: string[] | null;
  url: string;
  variant: NonNullable<ProductSchemaInput['variants']>[number];
  vendor?: string | null;
}) {
  const optionLabel = variant.selectedOptions
    .map((option) => option.value)
    .filter(Boolean)
    .join(' / ');

  // Each variant offer links to its own selection, as the option pickers do.
  const variantUrl = new URL(url);
  for (const option of variant.selectedOptions)
    variantUrl.searchParams.set(option.name, option.value);
  const size = variant.selectedOptions.find(
    (option) => option.name.trim().toLowerCase() === 'size',
  )?.value;

  return {
    '@type': 'Product',
    name: optionLabel ? `${parentTitle} - ${optionLabel}` : variant.title,
    productID: gidNumber(variant.id),
    sku: variant.sku || undefined,
    gtin: variant.barcode || undefined,
    size: size || undefined,
    brand: {
      '@type': 'Brand',
      name: vendor || SITE_NAME,
    },
    offers: offerFromPrice({
      availableForSale: variant.availableForSale,
      market,
      price: variant.price,
      productType,
      productHandle,
      printfulTechnique,
      selectedOptions: variant.selectedOptions,
      tags,
      url: variantUrl.toString(),
    }),
  };
}

/** schema.org properties the variants differ in (only those schema.org names). */
function variesBy(
  variants: NonNullable<ProductSchemaInput['variants']>,
): string[] | undefined {
  const properties: Record<string, string> = {
    color: 'https://schema.org/color',
    colour: 'https://schema.org/color',
    material: 'https://schema.org/material',
    pattern: 'https://schema.org/pattern',
    size: 'https://schema.org/size',
  };
  const differing = new Set<string>();
  for (const [name, property] of Object.entries(properties)) {
    const values = new Set(
      variants.map(
        (variant) =>
          variant.selectedOptions.find(
            (option) => option.name.trim().toLowerCase() === name,
          )?.value,
      ),
    );
    if (values.size > 1) differing.add(property);
  }
  return differing.size ? [...differing] : undefined;
}

function schemaAvailability(availableForSale: boolean) {
  return availableForSale
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';
}

function normalizePrice(value: string) {
  return Number(value).toFixed(2);
}

function gidNumber(value?: string | null) {
  if (!value) return undefined;
  return value.split('/').pop();
}

function truncate(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;

  // Cut at the last word boundary that fits, never mid-word.
  const room = normalized.slice(0, maxLength - 2);
  const cut = room.lastIndexOf(' ');
  const head = cut > maxLength / 2 ? room.slice(0, cut) : room.slice(0, -1);
  return `${head.replace(/[\s,;:.–—-]+$/, '')}...`;
}
