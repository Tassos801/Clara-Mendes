import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Link, redirect, useLoaderData, useLocation} from 'react-router';
import {
  Analytics,
  getSelectedProductOptions,
  ShopPayButton,
} from '@shopify/hydrogen';
import type {Route} from './+types/products.$handle';
import {AddToCartButton} from '~/components/AddToCartButton';
import {
  ClaraProductCard,
  type ClaraCardProduct,
} from '~/components/ClaraProductCard';
import {AdPlatformProductView} from '~/components/AdPlatformAnalytics';
import {StructuredData} from '~/components/StructuredData';
import {useAside} from '~/components/Aside';
import {filterDemoProducts, isDemoProduct} from '~/lib/catalogFilters';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/productCardFragment';
import {getProductDescription} from '~/lib/productCopy';
import {
  breadcrumbSchema,
  buildSeoMeta,
  getCanonicalUrl,
  productSchema,
} from '~/lib/seo';
import {RETURN_WINDOW_DAYS} from '~/lib/storefrontBasics';

type MoneyAmount = {
  amount: string;
  currencyCode: string;
};

type ProductImage = {
  altText?: string | null;
  url: string;
};

type ProductOptionValue = {
  id: string;
  name: string;
};

type ProductOption = {
  id: string;
  name: string;
  optionValues: ProductOptionValue[];
};

type SelectedOption = {
  name: string;
  value: string;
};

type ProductVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  barcode?: string | null;
  price: MoneyAmount;
  compareAtPrice?: MoneyAmount | null;
  selectedOptions: SelectedOption[];
  sku?: string | null;
  image?: ProductImage | null;
  product: {
    handle: string;
    title: string;
  };
};

type ProductDetail = ClaraCardProduct & {
  description: string;
  descriptionHtml?: string;
  options: ProductOption[];
  selectedOrFirstAvailableVariant?: ProductVariant | null;
  variants: {
    nodes: ProductVariant[];
  };
};

export const meta: Route.MetaFunction = ({data}) => {
  const product = data?.product;
  const description = product ? getProductDescription(product) : null;

  return buildSeoMeta({
    description:
      description ||
      'Shop this Clara Mendes product through secure Shopify checkout.',
    image: product?.featuredImage?.url,
    title: product?.title ?? 'Product',
    type: 'product',
    url: data?.seoUrl ?? 'https://clara-mendes.com/products',
  });
};

export async function loader({context, params, request}: Route.LoaderArgs) {
  const selectedOptions = getSelectedProductOptions(request);
  const handle = params.handle;

  if (!handle) {
    throw new Response('Product handle is required', {status: 400});
  }

  const data = await context.storefront.query(PRODUCT_QUERY, {
    variables: {
      first: 4,
      handle,
      selectedOptions,
    },
  });

  if (!data.product) {
    throw new Response('Product not found', {status: 404});
  }

  if (isDemoProduct(data.product)) {
    throw redirect('/collections/all');
  }

  return {
    product: data.product as ProductDetail,
    relatedProducts: filterDemoProducts(
      data.relatedProducts.nodes as ClaraCardProduct[],
    ).filter((product) => product.handle !== handle),
    seoUrl: getCanonicalUrl(request, `/products/${data.product.handle}`),
    storeDomain: context.env.PUBLIC_STORE_DOMAIN,
  };
}

export default function Product() {
  const {product, relatedProducts, seoUrl, storeDomain} =
    useLoaderData<typeof loader>();
  const {open} = useAside();
  const [quantity, setQuantity] = useState(1);
  const atcRef = useRef<HTMLDivElement>(null);
  const [showStickyATC, setShowStickyATC] = useState(false);
  const selectedVariant =
    product.selectedOrFirstAvailableVariant ?? product.variants.nodes[0];
  const selectedVariantPrice = selectedVariant
    ? formatMoney(selectedVariant.price)
    : null;
  const purchaseButtonLabel =
    selectedVariant?.availableForSale && selectedVariantPrice
      ? `Add to cart - ${selectedVariantPrice}`
      : 'Sold out';
  const stickyButtonLabel =
    selectedVariant?.availableForSale && selectedVariantPrice
      ? `Add - ${selectedVariantPrice}`
      : 'Sold out';
  const primaryImage =
    selectedVariant?.image ?? product.featuredImage ?? product.images?.nodes[0];
  const productDescription = getProductDescription(product);
  const productAvailableForSale = product.variants.nodes.some(
    (variant) => variant.availableForSale,
  );
  const shopPayStoreUrl = storeDomain ? getStoreUrl(storeDomain) : null;
  const shopUrl = new URL('/collections/all', seoUrl).toString();
  const galleryImages = useMemo(() => {
    const images = [
      ...(primaryImage ? [primaryImage] : []),
      ...(product.images?.nodes ?? []),
    ];

    return images.filter(
      (image, index, list) =>
        image?.url &&
        list.findIndex((item) => item.url === image.url) === index,
    );
  }, [primaryImage, product.images?.nodes]);
  const leadGalleryImage = galleryImages[0];
  const supportingGalleryImages = galleryImages.slice(1);

  useEffect(() => {
    const target = atcRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyATC(!entry.isIntersecting),
      {threshold: 0},
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const openCart = useCallback(() => open('cart'), [open]);
  const productViewAnalytics = useMemo(
    () => ({
      products: selectedVariant
        ? [
            {
              id: product.id,
              productGid: product.id,
              title: product.title,
              name: product.title,
              price: selectedVariant.price.amount,
              currency: selectedVariant.price.currencyCode,
              vendor: product.vendor || 'Clara Mendes',
              brand: product.vendor || 'Clara Mendes',
              variantId: selectedVariant.id,
              variantGid: selectedVariant.id,
              variantTitle: selectedVariant.title,
              variantName: selectedVariant.title,
              quantity: 1,
              sku: selectedVariant.sku || undefined,
              productType: product.productType || undefined,
              category: product.productType || undefined,
            },
          ]
        : [],
    }),
    [
      product.id,
      product.productType,
      product.title,
      product.vendor,
      selectedVariant,
    ],
  );
  const addToCartAnalytics = useMemo(
    () => ({
      products: selectedVariant
        ? [
            {
              productGid: product.id,
              variantGid: selectedVariant.id,
              name: product.title,
              variantName: selectedVariant.title,
              brand: product.vendor || 'Clara Mendes',
              price: selectedVariant.price.amount,
              currency: selectedVariant.price.currencyCode,
              quantity,
              category: product.productType || undefined,
              sku: selectedVariant.sku || undefined,
            },
          ]
        : [],
    }),
    [
      product.id,
      product.productType,
      product.title,
      product.vendor,
      quantity,
      selectedVariant,
    ],
  );

  return (
    <div className="product-page">
      <StructuredData
        data={[
          productSchema({
            availableForSale: productAvailableForSale,
            description: productDescription,
            gtin: selectedVariant?.barcode,
            image: primaryImage?.url,
            priceRange: product.priceRange,
            productId: product.id,
            productType: product.productType,
            sku: selectedVariant?.sku,
            title: product.title,
            url: seoUrl,
            vendor: product.vendor,
            variants: product.variants.nodes,
          }),
          breadcrumbSchema({
            items: [
              {name: 'Shop', url: shopUrl},
              {name: product.title, url: seoUrl},
            ],
          }),
        ]}
      />
      {selectedVariant ? (
        <Analytics.ProductView
          data={productViewAnalytics}
        />
      ) : null}
      <AdPlatformProductView analytics={productViewAnalytics} />
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/collections/all">Shop</Link>
        <span aria-hidden="true">›</span>
        <span>{product.title}</span>
      </nav>

      <section className="product-detail-layout">
        <div className="product-gallery product-gallery--lead">
          {leadGalleryImage ? (
            <img
              src={leadGalleryImage.url}
              alt={leadGalleryImage.altText || product.title}
              loading="eager"
            />
          ) : (
            <div className="product-image-placeholder" aria-hidden />
          )}
        </div>

        <div className="product-purchase-panel">
          <p className="eyebrow">
            {product.productType ||
              getVendorLabel(product.vendor) ||
              'Curated object'}
          </p>
          <h1>{product.title}</h1>
          <p className="product-lede">{productDescription}</p>
          {selectedVariant ? (
            <ProductPrice
              price={selectedVariant.price}
              compareAtPrice={selectedVariant.compareAtPrice}
            />
          ) : null}

          <div
            className="product-availability-row"
            aria-label="Purchase status"
          >
            <span
              className={`product-availability-chip ${
                selectedVariant?.availableForSale
                  ? 'is-available'
                  : 'is-unavailable'
              }`}
            >
              {selectedVariant?.availableForSale ? 'In stock' : 'Sold out'}
            </span>
            <span>Ships in 3-7 business days</span>
            <span>{RETURN_WINDOW_DAYS}-day returns</span>
          </div>

          <VariantOptions product={product} selectedVariant={selectedVariant} />

          <div className="product-buy-box">
            <div className="quantity-row">
              <span>Quantity</span>
              <div className="quantity-control" aria-label="Product quantity">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span>{quantity}</span>
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((value) => Math.min(99, value + 1))
                  }
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            <div ref={atcRef}>
              <AddToCartButton
                analytics={addToCartAnalytics}
                className="primary-button full-width"
                disabled={!selectedVariant?.availableForSale}
                lines={
                  selectedVariant
                    ? [
                        {
                          merchandiseId: selectedVariant.id,
                          quantity,
                          selectedVariant,
                        },
                      ]
                    : []
                }
                onSuccess={openCart}
                pendingChildren="Adding..."
              >
                {purchaseButtonLabel}
              </AddToCartButton>
            </div>

            {selectedVariant?.availableForSale && shopPayStoreUrl ? (
              <div
                className="shop-pay-accelerator"
                aria-label="Express checkout with Shop Pay"
              >
                <ShopPayButton
                  storeDomain={shopPayStoreUrl}
                  variantIdsAndQuantities={[{id: selectedVariant.id, quantity}]}
                  width="100%"
                />
              </div>
            ) : null}

            <p className="product-buy-note">
              Taxes and shipping are confirmed before payment. Cart opens after
              adding so you can review the order before checkout.
            </p>
          </div>

          <ul className="product-assurance-list" aria-label="Order reassurance">
            <li>
              <span aria-hidden />
              Secure checkout powered by Shopify.
            </li>
            <li>
              <span aria-hidden />
              Tracking details are emailed after dispatch.
            </li>
            <li>
              <span aria-hidden />
              Support responds within one business day.
            </li>
          </ul>

          <dl className="product-details-list">
            <div>
              <dt>Shipping</dt>
              <dd>
                Ships within 3–7 business days. Tracking provided via email once
                dispatched. Delivery times vary by location.
              </dd>
            </div>
            <div>
              <dt>Returns</dt>
              <dd>
                {RETURN_WINDOW_DAYS}-day return window from delivery. Items must
                be unused and in original packaging.{' '}
                <Link to="/policies/refund-policy" className="text-link">
                  Full policy
                </Link>
              </dd>
            </div>
            <div>
              <dt>Support</dt>
              <dd>
                Questions before or after your purchase? We respond within one
                business day.{' '}
                <Link to="/contact" className="text-link">
                  Get in touch
                </Link>
              </dd>
            </div>
            <div>
              <dt>Checkout</dt>
              <dd>
                Secure checkout powered by Shopify with taxes and shipping
                confirmed before payment.
              </dd>
            </div>
          </dl>
        </div>

        {supportingGalleryImages.length > 0 ? (
          <div className="product-gallery product-gallery--supporting">
            {supportingGalleryImages.map((image, index) => (
              <img
                key={image.url}
                src={image.url}
                alt={image.altText || `${product.title} ${index + 2}`}
                loading="lazy"
              />
            ))}
          </div>
        ) : null}
      </section>

      {relatedProducts.length > 0 ? (
        <section className="related-section" aria-labelledby="related">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Also in the catalog</p>
              <h2 id="related">Pair with</h2>
            </div>
          </div>
          <div className="product-grid compact-grid">
            {relatedProducts.slice(0, 3).map((relatedProduct) => (
              <ClaraProductCard
                key={relatedProduct.id}
                product={relatedProduct}
              />
            ))}
          </div>
        </section>
      ) : null}

      <div className={`sticky-atc-bar ${showStickyATC ? 'is-visible' : ''}`}>
        <div className="sticky-atc-info">
          {primaryImage ? (
            <img
              className="sticky-atc-thumb"
              src={primaryImage.url}
              alt=""
              aria-hidden="true"
            />
          ) : null}
          <div>
            <p className="sticky-atc-title">{product.title}</p>
            {selectedVariant ? (
              <p className="sticky-atc-price">
                {formatMoney(selectedVariant.price)}
              </p>
            ) : null}
          </div>
        </div>
        <AddToCartButton
          analytics={addToCartAnalytics}
          className="primary-button sticky-atc-button"
          disabled={!selectedVariant?.availableForSale}
          lines={
            selectedVariant
              ? [
                  {
                    merchandiseId: selectedVariant.id,
                    quantity,
                    selectedVariant,
                  },
                ]
              : []
          }
          onSuccess={openCart}
        >
          {stickyButtonLabel}
        </AddToCartButton>
      </div>
    </div>
  );
}

function ProductPrice({
  compareAtPrice,
  price,
}: {
  compareAtPrice?: MoneyAmount | null;
  price: MoneyAmount;
}) {
  return (
    <div className="product-price">
      {compareAtPrice ? (
        <span className="product-price-on-sale">
          {formatMoney(price)} <s>{formatMoney(compareAtPrice)}</s>
        </span>
      ) : (
        formatMoney(price)
      )}
    </div>
  );
}

function VariantOptions({
  product,
  selectedVariant,
}: {
  product: ProductDetail;
  selectedVariant?: ProductVariant | null;
}) {
  const location = useLocation();
  const selectedMap = new Map(
    selectedVariant?.selectedOptions.map((option) => [
      option.name,
      option.value,
    ]) ?? [],
  );

  if (!product.options.length || product.variants.nodes.length <= 1) {
    return null;
  }

  return (
    <div className="product-options">
      {product.options.map((option) => (
        <fieldset className="variant-fieldset" key={option.id || option.name}>
          <legend>{option.name}</legend>
          <div className="variant-options">
            {option.optionValues.map((value) => {
              const variant = findVariantForOption({
                optionName: option.name,
                optionValue: value.name,
                selectedMap,
                variants: product.variants.nodes,
              });
              const params = new URLSearchParams(location.search);
              const selected = selectedMap.get(option.name) === value.name;

              if (variant) {
                variant.selectedOptions.forEach((selectedOption) => {
                  params.set(selectedOption.name, selectedOption.value);
                });
              } else {
                params.set(option.name, value.name);
              }

              return (
                <Link
                  aria-current={selected ? 'true' : undefined}
                  aria-disabled={
                    variant?.availableForSale === false ? 'true' : undefined
                  }
                  className={[
                    selected ? 'is-selected' : '',
                    variant?.availableForSale === false ? 'is-unavailable' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  key={value.id || value.name}
                  preventScrollReset
                  replace
                  to={`/products/${product.handle}?${params.toString()}`}
                >
                  {value.name}
                </Link>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function findVariantForOption({
  optionName,
  optionValue,
  selectedMap,
  variants,
}: {
  optionName: string;
  optionValue: string;
  selectedMap: Map<string, string>;
  variants: ProductVariant[];
}) {
  return (
    variants.find((variant) =>
      variant.selectedOptions.every((option) => {
        if (option.name === optionName) return option.value === optionValue;
        const selected = selectedMap.get(option.name);
        return selected ? option.value === selected : true;
      }),
    ) ??
    variants.find((variant) =>
      variant.selectedOptions.some(
        (option) => option.name === optionName && option.value === optionValue,
      ),
    )
  );
}

function formatMoney(price: MoneyAmount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currencyCode,
  }).format(Number(price.amount));
}

function getVendorLabel(vendor?: string | null) {
  if (!vendor) return null;
  if (vendor.toLowerCase().includes('mock')) return null;
  return vendor;
}

function getStoreUrl(storeDomain: string) {
  return /^https?:\/\//i.test(storeDomain)
    ? storeDomain
    : `https://${storeDomain}`;
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ClaraProductVariant on ProductVariant {
    id
    title
    availableForSale
    barcode
    price {
      amount
      currencyCode
    }
    compareAtPrice {
      amount
      currencyCode
    }
    selectedOptions {
      name
      value
    }
    image {
      id
      url
      altText
      width
      height
    }
    product {
      handle
      title
    }
    sku
  }
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $first: Int!
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...ClaraProductCard
      description
      descriptionHtml
      options {
        id
        name
        optionValues {
          id
          name
        }
      }
      selectedOrFirstAvailableVariant(
        selectedOptions: $selectedOptions
        ignoreUnknownOptions: true
        caseInsensitiveMatch: true
      ) {
        ...ClaraProductVariant
      }
      variants(first: 100) {
        nodes {
          ...ClaraProductVariant
        }
      }
    }
    relatedProducts: products(first: $first, sortKey: BEST_SELLING) {
      nodes {
        ...ClaraProductCard
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;
