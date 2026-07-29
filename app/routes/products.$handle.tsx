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
import {RecentlyViewed} from '~/components/RecentlyViewed';
import {
  buildPhoneCaseUrl,
  formatPhoneCaseDeviceList,
} from '~/lib/artExtensions';
import {buildCapsuleTagQuery, CAPSULES} from '~/lib/capsules';
import {
  filterDemoProducts,
  isDemoProduct,
  isReleasedExtensionHandle,
  PHONE_CASE_HANDLE,
} from '~/lib/catalogFilters';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/productCardFragment';
import {recordRecentlyViewed} from '~/lib/recentlyViewed';
import {getProductDescription, getProductLede} from '~/lib/productCopy';
import {
  breadcrumbSchema,
  buildSeoMeta,
  getCanonicalUrl,
  productSchema,
} from '~/lib/seo';
import {RETURN_WINDOW_DAYS, STOREFRONT_ORIGIN} from '~/lib/storefrontBasics';
import {ReviewsSection} from '~/components/reviews/ReviewsSection';
import {
  parseReviewsMetafield,
  type ReviewsMetafieldResponse,
} from '~/lib/reviews';
import {summarizeReviews, type ProductReviewsData} from '~/lib/reviewTypes';

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

type PhoneCaseVariantNode = {
  availableForSale: boolean;
  image?: ProductImage | null;
  price?: MoneyAmount | null;
  selectedOptions: SelectedOption[];
};

type PhoneCaseCrossSell = {
  capsuleTitle: string;
  image: ProductImage | null;
  price: MoneyAmount | null;
  url: string;
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
    url: data?.seoUrl ?? `${STOREFRONT_ORIGIN}/products`,
  });
};

export async function loader({context, params, request}: Route.LoaderArgs) {
  const selectedOptions = getSelectedProductOptions(request);
  const handle = params.handle;

  if (!handle) {
    throw new Response('Product handle is required', {status: 400});
  }

  // "Pair with" prefers the two companion prints from the same capsule;
  // best sellers only fill any remaining slots.
  const capsule = CAPSULES.find((entry) => entry.handles.includes(handle));
  // Cross-sell stays dormant until the phone case's release flag flips —
  // the sentinel handle matches no product, so the query returns null.
  const phoneCaseEligible =
    Boolean(capsule) && isReleasedExtensionHandle(PHONE_CASE_HANDLE);

  const data = await context.storefront.query(PRODUCT_QUERY, {
    variables: {
      // The fallback is a tag no product carries, so non-capsule products
      // get zero capsule siblings (tag is a supported search field; an
      // unsupported field would be silently ignored and match everything).
      capsuleQuery: capsule
        ? buildCapsuleTagQuery(capsule)
        : 'tag:"__no-capsule__"',
      first: 4,
      handle,
      phoneCaseHandle: phoneCaseEligible
        ? PHONE_CASE_HANDLE
        : '__phone-case-staged__',
      selectedOptions,
    },
  });

  if (!data.product) {
    throw new Response('Product not found', {status: 404});
  }

  if (isDemoProduct(data.product)) {
    throw redirect('/collections/all');
  }

  const parsedReviews = parseReviewsMetafield(
    (data.product as {reviewsMetafield?: ReviewsMetafieldResponse})
      .reviewsMetafield ?? null,
  );
  const reviews: ProductReviewsData = {
    reviews: parsedReviews,
    summary: summarizeReviews(parsedReviews),
  };

  const capsuleSiblings = filterDemoProducts(
    (data.capsuleProducts?.nodes ?? []) as ClaraCardProduct[],
  ).filter((product) => product.handle !== handle);
  const bestSellingFill = filterDemoProducts(
    data.relatedProducts.nodes as ClaraCardProduct[],
  ).filter(
    (product) =>
      product.handle !== handle &&
      !capsuleSiblings.some((sibling) => sibling.handle === product.handle),
  );

  const phoneCaseProduct = data.phoneCase as
    | (ClaraCardProduct & {caseVariants?: {nodes?: PhoneCaseVariantNode[]}})
    | null;
  let phoneCaseCrossSell: PhoneCaseCrossSell | null = null;
  if (capsule && phoneCaseProduct && !isDemoProduct(phoneCaseProduct)) {
    // The case variant carrying this capsule's artwork supplies the image
    // and price, so the cross-sell shows the artwork the buyer is viewing.
    const artworkVariant = (phoneCaseProduct.caseVariants?.nodes ?? []).find(
      (variant) =>
        variant.availableForSale &&
        variant.selectedOptions.some(
          (option) =>
            option.name === 'Artwork' && option.value === capsule.title,
        ),
    );
    if (artworkVariant) {
      phoneCaseCrossSell = {
        capsuleTitle: capsule.title,
        image: artworkVariant.image ?? phoneCaseProduct.featuredImage ?? null,
        price:
          artworkVariant.price ??
          phoneCaseProduct.priceRange?.minVariantPrice ??
          null,
        url: buildPhoneCaseUrl(capsule.title),
      };
    }
  }

  return {
    phoneCaseCrossSell,
    product: data.product as ProductDetail,
    relatedProducts: [...capsuleSiblings, ...bestSellingFill],
    reviews,
    seoUrl: getCanonicalUrl(request, `/products/${data.product.handle}`),
    storeDomain: context.env.PUBLIC_STORE_DOMAIN,
  };
}

export default function Product() {
  const {
    phoneCaseCrossSell,
    product,
    relatedProducts,
    reviews,
    seoUrl,
    storeDomain,
  } = useLoaderData<typeof loader>();
  const {open} = useAside();
  const [quantity, setQuantity] = useState(1);
  const [zoomOpen, setZoomOpen] = useState(false);
  const zoomCloseRef = useRef<HTMLButtonElement>(null);
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
  const productLede = getProductLede(product);
  const isArtPrint = (product.productType || '').toLowerCase() === 'art prints';
  const isPhoneCase =
    (product.productType || '').toLowerCase() === 'phone cases';
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

  useEffect(() => {
    if (!zoomOpen) return;
    zoomCloseRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoomOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [zoomOpen]);

  useEffect(() => {
    recordRecentlyViewed({
      amount:
        selectedVariant?.price.amount ??
        product.priceRange?.minVariantPrice?.amount,
      currencyCode:
        selectedVariant?.price.currencyCode ??
        product.priceRange?.minVariantPrice?.currencyCode,
      handle: product.handle,
      id: product.id,
      imageAlt: primaryImage?.altText ?? undefined,
      imageUrl: primaryImage?.url,
      productType: product.productType ?? undefined,
      title: product.title,
    });
  }, [
    primaryImage?.altText,
    primaryImage?.url,
    product.handle,
    product.id,
    product.priceRange?.minVariantPrice?.amount,
    product.priceRange?.minVariantPrice?.currencyCode,
    product.productType,
    product.title,
    selectedVariant?.price.amount,
    selectedVariant?.price.currencyCode,
  ]);

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
            reviewSummary:
              reviews.summary.total > 0
                ? {
                    averageRating: reviews.summary.average,
                    count: reviews.summary.total,
                  }
                : undefined,
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
        <Analytics.ProductView data={productViewAnalytics} />
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
            <button
              className="product-zoom-trigger"
              type="button"
              aria-haspopup="dialog"
              onClick={() => setZoomOpen(true)}
            >
              <img
                src={leadGalleryImage.url}
                alt={leadGalleryImage.altText || product.title}
                loading="eager"
              />
              <span className="product-zoom-hint">Tap to zoom</span>
            </button>
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
          <p className="product-lede">{productLede}</p>
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
              {selectedVariant?.availableForSale
                ? 'Made to order'
                : 'Unavailable'}
            </span>
            <span>Processes in 1–3 business days</span>
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
            {isArtPrint ? (
              <div>
                <dt>Print</dt>
                <dd>
                  Giclée print in archival pigment inks on 200gsm Enhanced Matte
                  Art paper. Unframed 8 × 10 in portrait, printed to order.
                  Frame not included; screen and print colours can vary
                  slightly.
                </dd>
              </div>
            ) : null}
            {isPhoneCase ? (
              <>
                <div>
                  <dt>Case</dt>
                  <dd>
                    Slim snap case in impact-resistant polycarbonate with an
                    all-over matte print of the original artwork. Printed to
                    order; screen and print colours can vary slightly.
                  </dd>
                </div>
                <div>
                  <dt>Fit</dt>
                  <dd>
                    Made for {formatPhoneCaseDeviceList()} only. Cases are cut
                    per device and printed to order, so check your exact model
                    before ordering.
                  </dd>
                </div>
              </>
            ) : null}
            <div>
              <dt>Shipping</dt>
              <dd>
                Printed to order within 1–3 business days. Standard US delivery
                is estimated at 7–15 business days after dispatch. Delivery
                updates are emailed when available.
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

          {phoneCaseCrossSell ? (
            <aside
              className="product-cross-sell"
              aria-label="Also available as a phone case"
            >
              {phoneCaseCrossSell.image ? (
                <img
                  src={phoneCaseCrossSell.image.url}
                  alt={
                    phoneCaseCrossSell.image.altText ||
                    `${phoneCaseCrossSell.capsuleTitle} snap phone case`
                  }
                  loading="lazy"
                />
              ) : null}
              <div className="product-cross-sell-copy">
                <p className="eyebrow">Also available</p>
                <p className="product-cross-sell-title">
                  {phoneCaseCrossSell.capsuleTitle} artwork on a slim snap
                  phone case
                  {phoneCaseCrossSell.price
                    ? ` — ${formatMoney(phoneCaseCrossSell.price)}`
                    : ''}
                </p>
                <Link
                  className="text-link"
                  to={phoneCaseCrossSell.url}
                  prefetch="intent"
                >
                  View the case
                </Link>
              </div>
            </aside>
          ) : null}
        </div>

        {supportingGalleryImages.length > 0 || isArtPrint ? (
          <div className="product-gallery product-gallery--supporting">
            {supportingGalleryImages.map((image, index) => (
              <img
                key={image.url}
                src={image.url}
                alt={image.altText || `${product.title} ${index + 2}`}
                loading="lazy"
              />
            ))}
            {isArtPrint ? <PrintScaleDiagram /> : null}
          </div>
        ) : null}
      </section>

      {zoomOpen && leadGalleryImage ? (
        <div
          className="product-zoom-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`${product.title} enlarged view`}
        >
          <button
            className="product-zoom-backdrop"
            type="button"
            aria-label="Close enlarged view"
            onClick={() => setZoomOpen(false)}
          />
          <img
            src={leadGalleryImage.url}
            alt={leadGalleryImage.altText || product.title}
          />
          <button
            className="product-zoom-close"
            type="button"
            ref={zoomCloseRef}
            onClick={() => setZoomOpen(false)}
          >
            Close
          </button>
        </div>
      ) : null}

      <ReviewsSection
        productGid={product.id}
        productTitle={product.title}
        data={reviews}
      />

      {relatedProducts.length > 0 ? (
        <section className="related-section" aria-labelledby="related">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">
                {CAPSULES.some(
                  (capsule) =>
                    capsule.handles.includes(product.handle) &&
                    relatedProducts.some((related) =>
                      capsule.handles.includes(related.handle),
                    ),
                )
                  ? 'From the same capsule'
                  : 'Also in the catalog'}
              </p>
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

      <RecentlyViewed excludeHandles={[product.handle]} />

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

/**
 * Line-art scale diagram: the 8 × 10 in print drawn at true proportion above
 * a standard 84 in (three-seat) sofa, so buyers can judge the real size
 * before ordering. Rendered as SVG — deliberately a diagram, not a staged
 * photograph.
 */
function PrintScaleDiagram() {
  // 3.5 SVG units per inch: sofa 84 in -> 294, print 8 × 10 in -> 28 × 35
  return (
    <figure className="product-scale">
      <svg
        viewBox="0 0 560 300"
        role="img"
        aria-label="Scale diagram: an unframed 8 by 10 inch portrait print shown at true proportion on a wall above a standard 84 inch sofa."
      >
        <g stroke="currentColor" strokeWidth="1.4" fill="none">
          {/* floor */}
          <line x1="40" y1="262" x2="520" y2="262" strokeOpacity="0.55" />
          {/* sofa: back, seat, arms, legs (84 in wide, ~30 in tall) */}
          <g strokeOpacity="0.55">
            <rect x="133" y="157" width="294" height="60" rx="10" />
            <rect x="121" y="187" width="318" height="44" rx="12" />
            <line x1="133" y1="231" x2="133" y2="262" />
            <line x1="427" y1="231" x2="427" y2="262" />
          </g>
          {/* print: 8 × 10 in portrait, hung above the sofa */}
          <rect
            x="266"
            y="72"
            width="28"
            height="35"
            fill="var(--color-paper, #fbfaf6)"
          />
          {/* dimension guides */}
          <g strokeOpacity="0.4" strokeDasharray="3 4">
            <line x1="266" y1="58" x2="294" y2="58" />
            <line x1="308" y1="72" x2="308" y2="107" />
          </g>
        </g>
        <g
          fill="currentColor"
          fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
          fontSize="11"
        >
          <text x="280" y="50" textAnchor="middle">
            8 in
          </text>
          <text x="316" y="93">
            10 in
          </text>
          <text x="280" y="284" textAnchor="middle" fillOpacity="0.6">
            84 in sofa, for scale
          </text>
        </g>
      </svg>
      <figcaption>
        True to size: an unframed 8 × 10 in (20.3 × 25.4 cm) portrait print,
        shown to scale above a standard 84 in sofa. Hang it solo, or pair it
        with its capsule companions.
      </figcaption>
    </figure>
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
    $capsuleQuery: String!
    $country: CountryCode
    $first: Int!
    $handle: String!
    $language: LanguageCode
    $phoneCaseHandle: String!
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
      reviewsMetafield: metafield(namespace: "custom", key: "reviews") {
        references(first: 50) {
          nodes {
            ... on Metaobject {
              id
              fields {
                key
                value
                references(first: 3) {
                  nodes {
                    ... on MediaImage {
                      image {
                        url
                        altText
                        width
                        height
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    relatedProducts: products(first: $first, sortKey: BEST_SELLING) {
      nodes {
        ...ClaraProductCard
      }
    }
    capsuleProducts: products(first: 3, query: $capsuleQuery) {
      nodes {
        ...ClaraProductCard
      }
    }
    phoneCase: product(handle: $phoneCaseHandle) {
      ...ClaraProductCard
      caseVariants: variants(first: 24) {
        nodes {
          availableForSale
          image {
            id
            url
            altText
            width
            height
          }
          price {
            amount
            currencyCode
          }
          selectedOptions {
            name
            value
          }
        }
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;
