import type {ClaraCardProduct} from '~/components/ClaraProductCard';

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
  description: string;
  image?: string | null;
  priceRange?: {
    minVariantPrice?: MoneyAmount;
    maxVariantPrice?: MoneyAmount;
  };
  productType?: string | null;
  reviewSummary?: {
    count: number;
    averageRating: number | null;
  };
  title: string;
  url: string;
  vendor?: string | null;
};

type BreadcrumbInput = {
  items: Array<{
    name: string;
    url: string;
  }>;
};

export const SITE_NAME = 'Clara Mendes';
export const DEFAULT_META_DESCRIPTION =
  'Clara Mendes curates quiet home objects, soft lighting, tactile textiles, ceramics, storage, and table rituals for slower rooms.';
export const DEFAULT_SHARE_IMAGE =
  'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1600&auto=format&fit=crop';

export function getCanonicalUrl(request: Request, pathname: string) {
  return new URL(pathname, request.url).toString();
}

export function buildSeoMeta({
  description,
  image,
  noIndex = false,
  title,
  type = 'website',
  url,
}: SeoMetaInput) {
  const metaTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
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
  description,
  image,
  priceRange,
  productType,
  reviewSummary,
  title,
  url,
  vendor,
}: ProductSchemaInput) {
  const minPrice = priceRange?.minVariantPrice;
  const maxPrice = priceRange?.maxVariantPrice;
  const hasPriceRange =
    minPrice && maxPrice && Number(minPrice.amount) !== Number(maxPrice.amount);
  const hasRating =
    reviewSummary && reviewSummary.count >= 3 && reviewSummary.averageRating != null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    description: truncate(description, 500),
    image: image ? [image] : undefined,
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
            availability: 'https://schema.org/InStock',
            url,
          }
        : minPrice
          ? offerFromPrice({price: minPrice, url})
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

function offerFromPrice({price, url}: {price: MoneyAmount; url: string}) {
  return {
    '@type': 'Offer',
    price: normalizePrice(price.amount),
    priceCurrency: price.currencyCode,
    availability: 'https://schema.org/InStock',
    itemCondition: 'https://schema.org/NewCondition',
    url,
  };
}

function normalizePrice(value: string) {
  return Number(value).toFixed(2);
}

function truncate(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}
