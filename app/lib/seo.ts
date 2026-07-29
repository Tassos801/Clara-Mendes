import type {ClaraCardProduct} from '~/components/ClaraProductCard';
import {STOREFRONT_ORIGIN} from '~/lib/storefrontBasics';

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

type ProductSchemaInput = {
  availableForSale?: boolean;
  gtin?: string | null;
  description: string;
  image?: string | null;
  priceRange?: {
    minVariantPrice?: MoneyAmount;
    maxVariantPrice?: MoneyAmount;
  };
  productId?: string | null;
  productType?: string | null;
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
export const DEFAULT_META_DESCRIPTION =
  'Clara Mendes presents original art and considered products for calm, collected spaces.';
// Owned 1200x630 crop of Quiet Form I — never a stock photo: the share
// card is often the first impression of the brand's actual work.
export const DEFAULT_SHARE_IMAGE = `${STOREFRONT_ORIGIN}/images/share/og-default.jpg`;

export function getCanonicalUrl(_request: Request, pathname: string) {
  return new URL(pathname, STOREFRONT_ORIGIN).toString();
}

export function buildSeoMeta({
  description,
  image,
  noIndex = false,
  title,
  type = 'website',
  url,
}: SeoMetaInput) {
  const metaTitle = title.includes(SITE_NAME)
    ? title
    : `${title} | ${SITE_NAME}`;
  const metaDescription = truncate(description, 155);
  const shareImage = image || DEFAULT_SHARE_IMAGE;

  return [
    {title: truncate(metaTitle, 62)},
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
    description: DEFAULT_META_DESCRIPTION,
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
            offers: product.priceRange?.minVariantPrice
              ? offerFromPrice({
                  price: product.priceRange.minVariantPrice,
                  url: new URL(`/products/${product.handle}`, url).toString(),
                })
              : undefined,
          },
        })),
      },
    ],
  };
}

export function productSchema({
  availableForSale = true,
  gtin,
  description,
  image,
  priceRange,
  productId,
  productType,
  reviewSummary,
  sku,
  title,
  url,
  vendor,
  variants,
}: ProductSchemaInput) {
  const minPrice = priceRange?.minVariantPrice;
  const maxPrice = priceRange?.maxVariantPrice;
  const hasPriceRange =
    minPrice && maxPrice && Number(minPrice.amount) !== Number(maxPrice.amount);
  const hasRating =
    reviewSummary &&
    reviewSummary.count >= 3 &&
    reviewSummary.averageRating != null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    description: truncate(description, 500),
    image: image ? [image] : undefined,
    productID: gidNumber(productId),
    sku: sku || undefined,
    gtin: gtin || undefined,
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
          ? offerFromPrice({availableForSale, price: minPrice, url})
          : undefined,
    hasVariant:
      variants && variants.length > 1
        ? variants.slice(0, 50).map((variant) =>
            productVariantSchema({
              parentTitle: title,
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

function offerFromPrice({
  availableForSale = true,
  price,
  url,
}: {
  availableForSale?: boolean;
  price: MoneyAmount;
  url: string;
}) {
  return {
    '@type': 'Offer',
    price: normalizePrice(price.amount),
    priceCurrency: price.currencyCode,
    availability: schemaAvailability(availableForSale),
    itemCondition: 'https://schema.org/NewCondition',
    url,
  };
}

function productVariantSchema({
  parentTitle,
  url,
  variant,
  vendor,
}: {
  parentTitle: string;
  url: string;
  variant: NonNullable<ProductSchemaInput['variants']>[number];
  vendor?: string | null;
}) {
  const optionLabel = variant.selectedOptions
    .map((option) => option.value)
    .filter(Boolean)
    .join(' / ');

  return {
    '@type': 'Product',
    name: optionLabel ? `${parentTitle} - ${optionLabel}` : variant.title,
    productID: gidNumber(variant.id),
    sku: variant.sku || undefined,
    gtin: variant.barcode || undefined,
    brand: {
      '@type': 'Brand',
      name: vendor || SITE_NAME,
    },
    offers: offerFromPrice({
      availableForSale: variant.availableForSale,
      price: variant.price,
      url,
    }),
  };
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

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}
