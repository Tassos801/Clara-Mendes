import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Form, Link, redirect, useLoaderData, useNavigate} from 'react-router';
import {Analytics, getSelectedProductOptions, ShopPayButton} from '@shopify/hydrogen';
import type {Route} from './+types/products.art-tough-phone-case';
import {AddToCartButton} from '~/components/AddToCartButton';
import {ProductDetail} from '~/components/ProductDetail';
import {sizedImageUrl} from '~/lib/cartPresentation';
import {useAside} from '~/components/Aside';
import {ProductPrice} from '~/components/ProductPrice';
import {RecentlyViewed} from '~/components/RecentlyViewed';
import {StructuredData} from '~/components/StructuredData';
import {isDemoProduct} from '~/lib/catalogFilters';
import {formatMoney} from '~/lib/money';
import {getProductDescription} from '~/lib/productCopy';
import {PRODUCT_VARIANT_FRAGMENT} from '~/lib/productVariantFragment';
import {recordRecentlyViewed} from '~/lib/recentlyViewed';
import {breadcrumbSchema, buildSeoMeta, getCanonicalUrl, productSchema} from '~/lib/seo';
import {
  DELIVERY_EU_BUSINESS_DAYS,
  DELIVERY_INTERNATIONAL_BUSINESS_DAYS,
  DISPATCH_WINDOW_BUSINESS_DAYS,
  RETURN_WINDOW_DAYS,
} from '~/lib/storefrontBasics';
import {
  TOUGH_CASE_ARTWORK_OPTION,
  TOUGH_CASE_HANDLE,
  TOUGH_CASE_PHONE_OPTION,
  TOUGH_CASE_PHONES,
} from '~/lib/toughCase';

type CaseImage = {
  altText?: string | null;
  height?: number | null;
  url: string;
  width?: number | null;
};

type CaseVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  barcode?: string | null;
  sku?: string | null;
  price: {amount: string; currencyCode: string};
  compareAtPrice?: {amount: string; currencyCode: string} | null;
  selectedOptions: Array<{name: string; value: string}>;
  image?: CaseImage | null;
};

type CaseOption = {
  name: string;
  optionValues: Array<{
    name: string;
    firstSelectableVariant?: {image?: CaseImage | null} | null;
  }>;
};

const PHONE_BRANDS = ['Apple', 'Samsung', 'Google'] as const;
const BRAND_LABELS: Record<(typeof PHONE_BRANDS)[number], string> = {
  Apple: 'iPhone',
  Samsung: 'Samsung Galaxy',
  Google: 'Google Pixel',
};

export const meta: Route.MetaFunction = ({data}) =>
  buildSeoMeta({
    description: data?.product
      ? getProductDescription(data.product)
      : 'A Clara Mendes artwork on a matte, dual-layer tough phone case for iPhone, Samsung Galaxy and Google Pixel.',
    image: data?.artworkImage?.url,
    title: data?.product.title ?? 'Art Tough Phone Case',
    type: 'product',
    url: data?.seoUrl ?? '',
  });

export async function loader({context, request}: Route.LoaderArgs) {
  const requested = getSelectedProductOptions(request);
  const data = await context.storefront.query(TOUGH_CASE_QUERY, {
    variables: {handle: TOUGH_CASE_HANDLE, selectedOptions: requested},
  });
  const product = data.product;
  if (!product) throw new Response('Product not found', {status: 404});

  const previewUnlocked = context.env.CASE_PREVIEW_UNLOCK === 'true';
  if (isDemoProduct(product) && !previewUnlocked) {
    throw redirect('/collections/all');
  }

  const options = product.options as CaseOption[];
  const artworkValues =
    options.find((option) => option.name === TOUGH_CASE_ARTWORK_OPTION)
      ?.optionValues ?? [];
  const phoneValues = new Set(
    options
      .find((option) => option.name === TOUGH_CASE_PHONE_OPTION)
      ?.optionValues.map((value) => value.name) ?? [],
  );
  const requestedArtwork = requested.find(
    (option) => option.name === TOUGH_CASE_ARTWORK_OPTION,
  )?.value;
  const requestedPhone = requested.find(
    (option) => option.name === TOUGH_CASE_PHONE_OPTION,
  )?.value;
  const artwork =
    artworkValues.find((value) => value.name === requestedArtwork) ??
    artworkValues[0];
  // Cases are cut per device, so the model is never defaulted: Shopify's
  // "first variant" fallback would otherwise put an iPhone 13 in the cart.
  const phone =
    requestedPhone && phoneValues.has(requestedPhone) ? requestedPhone : null;

  const candidate = product.selectedOrFirstAvailableVariant as CaseVariant | null;
  const variant =
    phone &&
    candidate?.selectedOptions.some(
      (o) => o.name === TOUGH_CASE_ARTWORK_OPTION && o.value === artwork?.name,
    ) &&
    candidate.selectedOptions.some(
      (o) => o.name === TOUGH_CASE_PHONE_OPTION && o.value === phone,
    )
      ? candidate
      : null;

  const artworks = artworkValues.map((value) => ({
    name: value.name,
    image: value.firstSelectableVariant?.image ?? null,
  }));

  return {
    artwork: artwork?.name ?? null,
    artworkImage:
      artwork?.firstSelectableVariant?.image ?? product.featuredImage ?? null,
    artworks,
    phone,
    product,
    seoUrl: getCanonicalUrl(request, `/products/${TOUGH_CASE_HANDLE}`),
    storeDomain: context.env.PUBLIC_STORE_DOMAIN,
    variant,
  };
}

function caseUrl(artwork: string | null, phone: string | null) {
  const params = new URLSearchParams();
  if (artwork) params.set(TOUGH_CASE_ARTWORK_OPTION, artwork);
  if (phone) params.set(TOUGH_CASE_PHONE_OPTION, phone);
  const query = params.toString();
  return `/products/${TOUGH_CASE_HANDLE}${query ? `?${query}` : ''}`;
}

export default function ToughCasePage() {
  const {artwork, artworkImage, artworks, phone, product, seoUrl, storeDomain, variant} =
    useLoaderData<typeof loader>();
  const {open} = useAside();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [showStickyATC, setShowStickyATC] = useState(false);
  const atcRef = useRef<HTMLDivElement>(null);
  const price = variant?.price ?? product.priceRange.minVariantPrice;
  const canBuy = Boolean(variant?.availableForSale);
  const buttonLabel = !phone
    ? 'Choose your phone'
    : canBuy
      ? `Add to cart - ${formatMoney(price)}`
      : 'Unavailable';
  const stickyLabel = !phone
    ? 'Choose your model'
    : canBuy
      ? `Add - ${formatMoney(price)}`
      : 'Unavailable';
  const lines = variant
    ? [{merchandiseId: variant.id, quantity, selectedVariant: variant}]
    : [];

  useEffect(() => {
    const target = atcRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) =>
        setShowStickyATC(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      {threshold: 0},
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    recordRecentlyViewed({
      amount: product.priceRange.minVariantPrice.amount,
      currencyCode: product.priceRange.minVariantPrice.currencyCode,
      handle: product.handle,
      hasPriceRange: false,
      id: product.id,
      imageAlt: artworkImage?.altText ?? undefined,
      imageUrl: artworkImage?.url,
      productType: product.productType ?? undefined,
      title: product.title,
    });
  }, [artworkImage?.altText, artworkImage?.url, product]);

  const openCart = useCallback(() => open('cart'), [open]);
  // A <label> only focuses the select; on a phone the customer still has to
  // find and tap it. Bring it into view, focus it and, where the browser
  // allows, open the native picker straight away.
  const choosePhone = useCallback(() => {
    const select = document.getElementById(
      'tough-case-phone',
    ) as HTMLSelectElement | null;
    if (!select) return;
    select.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'center',
    });
    select.focus({preventScroll: true});
    try {
      select.showPicker?.();
    } catch {
      // Not supported for selects in this browser; focus is enough.
    }
  }, []);
  const analyticsProduct = useMemo(
    () =>
      variant
        ? {
            productGid: product.id,
            variantGid: variant.id,
            name: product.title,
            variantName: variant.title,
            brand: product.vendor || 'Clara Mendes',
            price: variant.price.amount,
            currency: variant.price.currencyCode,
            category: product.productType || undefined,
            sku: variant.sku || undefined,
          }
        : null,
    [product, variant],
  );

  const phonesByBrand = PHONE_BRANDS.map((brand) => ({
    brand,
    phones: TOUGH_CASE_PHONES.filter((p) => p.brand === brand),
  }));

  return (
    <div className="product-page tough-case-page">
      <StructuredData
        data={[
          productSchema({
            availableForSale: canBuy,
            description: getProductDescription(product),
            image: artworkImage?.url,
            priceRange: product.priceRange,
            productId: product.id,
            productType: product.productType,
            sku: variant?.sku,
            title: product.title,
            url: seoUrl,
            vendor: product.vendor,
            variants: variant ? [variant] : [],
          }),
          breadcrumbSchema({
            items: [
              {name: 'Shop', url: new URL('/collections/all', seoUrl).toString()},
              {name: product.title, url: seoUrl},
            ],
          }),
        ]}
      />
      {analyticsProduct ? (
        <Analytics.ProductView
          data={{
            products: [
              {
                ...analyticsProduct,
                id: product.id,
                title: product.title,
                variantId: analyticsProduct.variantGid,
                variantTitle: analyticsProduct.variantName,
                vendor: analyticsProduct.brand,
                quantity: 1,
                productType: analyticsProduct.category,
              },
            ],
          }}
        />
      ) : null}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/collections/all">Shop</Link>
        <span aria-hidden="true">›</span>
        <span>{product.title}</span>
      </nav>

      <section className="product-detail-layout">
        <figure className="product-gallery tough-case-gallery">
          <div className="product-gallery-frame">
            {artworkImage ? (
              <img
                src={artworkImage.url}
                alt={
                  artworkImage.altText ||
                  `${artwork ?? 'Clara Mendes'} artwork on a matte tough phone case`
                }
                width={artworkImage.width ?? undefined}
                height={artworkImage.height ?? undefined}
              />
            ) : null}
          </div>
          <figcaption>
            Shown on iPhone 16 Pro. The artwork is centred on every model; the
            crop and camera opening follow the phone you choose.
          </figcaption>
        </figure>

        <div className="product-purchase-panel">
          <div className="product-purchase-intro">
            <p className="eyebrow">Phone case</p>
            <h1>{product.title}</h1>
            <p className="product-lede">
              {artwork ? `${artwork} — ` : ''}a Clara Mendes artwork printed
              edge to edge on a matte, dual-layer tough case.
            </p>
            <ProductPrice
              price={price}
              compareAtPrice={variant?.compareAtPrice}
            />
            <div className="product-availability-row" aria-label="Purchase status">
              <span className="product-availability-chip is-available">
                Made to order
              </span>
              <span>Printed for your exact model</span>
              <span>{RETURN_WINDOW_DAYS}-day returns</span>
            </div>
          </div>

          <div className="product-options">
            <fieldset className="variant-fieldset">
              <legend>
                Artwork{artwork ? <span> · {artwork}</span> : null}
              </legend>
              <div className="tough-case-artworks">
                {artworks.map((entry) => (
                  <Link
                    key={entry.name}
                    aria-current={entry.name === artwork ? 'true' : undefined}
                    aria-label={entry.name}
                    className={entry.name === artwork ? 'is-selected' : undefined}
                    preventScrollReset
                    replace
                    title={entry.name}
                    to={caseUrl(entry.name, phone)}
                  >
                    {entry.image ? (
                      <img
                        src={`${entry.image.url}${entry.image.url.includes('?') ? '&' : '?'}width=160`}
                        alt=""
                        loading="lazy"
                        width={80}
                        height={100}
                      />
                    ) : (
                      <span>{entry.name}</span>
                    )}
                  </Link>
                ))}
              </div>
            </fieldset>

            <Form
              className="variant-fieldset tough-case-phone"
              method="get"
              preventScrollReset
              replace
            >
              <label htmlFor="tough-case-phone">Phone model</label>
              {artwork ? (
                <input type="hidden" name={TOUGH_CASE_ARTWORK_OPTION} value={artwork} />
              ) : null}
              <select
                id="tough-case-phone"
                name={TOUGH_CASE_PHONE_OPTION}
                value={phone ?? ''}
                onChange={(event) =>
                  void navigate(caseUrl(artwork, event.target.value || null), {
                    preventScrollReset: true,
                    replace: true,
                  })
                }
                required
              >
                <option value="" disabled>
                  Select your phone
                </option>
                {phonesByBrand.map(({brand, phones}) => (
                  <optgroup key={brand} label={BRAND_LABELS[brand]}>
                    {phones.map((p) => (
                      <option key={p.code} value={p.label}>
                        {p.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <noscript>
                <button className="secondary-button" type="submit">
                  Choose
                </button>
              </noscript>
              <p className="tough-case-phone-help">
                Not sure? iPhone: Settings › General › About. Android: Settings
                › About phone.
              </p>
            </Form>
          </div>

          <div className="product-buy-box">
            <div className="quantity-row">
              <span>Quantity</span>
              <div className="quantity-control" aria-label="Product quantity">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                >
                  <span aria-hidden>&#8722;</span>
                </button>
                <output aria-live="polite" aria-label={`Quantity ${quantity}`}>
                  {quantity}
                </output>
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.min(99, value + 1))}
                  aria-label="Increase quantity"
                  disabled={quantity >= 99}
                >
                  <span aria-hidden>&#43;</span>
                </button>
              </div>
            </div>
            <div ref={atcRef}>
              {phone ? (
                <AddToCartButton
                  analytics={
                    analyticsProduct
                      ? {products: [{...analyticsProduct, quantity}]}
                      : undefined
                  }
                  className="primary-button full-width"
                  disabled={!canBuy}
                  lines={lines}
                  onSuccess={openCart}
                  pendingChildren="Adding…"
                >
                  {buttonLabel}
                </AddToCartButton>
              ) : (
                <button
                  className="primary-button full-width"
                  onClick={choosePhone}
                  type="button"
                >
                  {buttonLabel}
                </button>
              )}
            </div>
            {canBuy && variant && storeDomain ? (
              <div className="shop-pay-accelerator" aria-label="Express checkout with Shop Pay">
                <ShopPayButton
                  storeDomain={
                    /^https?:\/\//i.test(storeDomain)
                      ? storeDomain
                      : `https://${storeDomain}`
                  }
                  variantIdsAndQuantities={[{id: variant.id, quantity}]}
                  width="100%"
                />
              </div>
            ) : null}
          </div>

          <ul className="product-assurance-list" aria-label="Order reassurance">
            <li>
              <span aria-hidden />
              Tracking details are emailed after dispatch.
            </li>
            <li>
              <span aria-hidden />
              Support responds within one business day.
            </li>
          </ul>

          <div className="product-details-list">
            <ProductDetail label="Case" defaultOpen>
                Dual-layer tough case: an impact-resistant polycarbonate shell
                over a shock-absorbing black silicone liner, with a matte
                finish. The print wraps the back, sides and edges. Buttons and
                ports stay open; wireless charging works through the case.
              </ProductDetail>
            <ProductDetail label="Fit" defaultOpen>
                Made to order for the model you choose: iPhone 13 to iPhone 18
                Pro Max, Samsung Galaxy S23 to S26 and Google Pixel 8 to 9 Pro
                XL. Similar model names are not interchangeable, so check your
                phone before ordering.
              </ProductDetail>
            <ProductDetail label="Print">
                Dye-sublimation print of the original artwork. Screen and print
                colours can vary slightly.
              </ProductDetail>
            <ProductDetail label="Shipping">
                Printed to order and dispatched within{' '}
                {DISPATCH_WINDOW_BUSINESS_DAYS} business days. After dispatch,
                delivery is estimated at {DELIVERY_EU_BUSINESS_DAYS} business
                days across the EU and{' '}
                {DELIVERY_INTERNATIONAL_BUSINESS_DAYS} business days
                elsewhere. Outside the EU, import taxes, duties and carrier
                fees may be payable on delivery and are not included.
              </ProductDetail>
            <ProductDetail label="Returns">
                {RETURN_WINDOW_DAYS}-day return window from delivery. Items must
                be unused and in original packaging.{' '}
                <Link to="/policies/refund-policy" className="text-link">
                  Full policy
                </Link>
              </ProductDetail>
          </div>
        </div>
      </section>

      <RecentlyViewed excludeHandles={[product.handle]} />

      <div
        aria-hidden={showStickyATC ? undefined : true}
        aria-label="Quick purchase"
        className={`sticky-atc-bar ${showStickyATC ? 'is-visible' : ''}`}
        role="region"
        {...(showStickyATC ? {} : {inert: ''})}
      >
        <div className="sticky-atc-info">
          {artworkImage ? (
            <img
              className="sticky-atc-thumb"
              src={sizedImageUrl(artworkImage.url, 96)}
              alt=""
              aria-hidden="true"
              decoding="async"
              height={88}
              width={88}
            />
          ) : null}
          <div>
            <p className="sticky-atc-title">{product.title}</p>
            <p className="sticky-atc-price">
              <span className="sticky-atc-options">
                {[artwork, phone ?? 'No phone chosen yet']
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              {formatMoney(price)}
            </p>
          </div>
        </div>
        {phone ? (
          <AddToCartButton
            className="primary-button sticky-atc-button"
            disabled={!canBuy}
            lines={lines}
            onSuccess={openCart}
            pendingChildren="Adding…"
          >
            {stickyLabel}
          </AddToCartButton>
        ) : (
          <button
            className="primary-button sticky-atc-button"
            onClick={choosePhone}
            type="button"
          >
            {stickyLabel}
          </button>
        )}
      </div>
    </div>
  );
}

const TOUGH_CASE_QUERY = `#graphql
  query ToughCase(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      handle
      title
      vendor
      productType
      tags
      description
      featuredImage {
        url
        altText
        width
        height
      }
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
        maxVariantPrice {
          amount
          currencyCode
        }
      }
      options {
        name
        optionValues {
          name
          firstSelectableVariant {
            image {
              url
              altText
              width
              height
            }
          }
        }
      }
      selectedOrFirstAvailableVariant(
        selectedOptions: $selectedOptions
        ignoreUnknownOptions: true
        caseInsensitiveMatch: true
      ) {
        ...ClaraProductVariant
      }
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;
