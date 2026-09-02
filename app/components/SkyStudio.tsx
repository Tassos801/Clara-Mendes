import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AddToCartButton} from '~/components/AddToCartButton';
import {useAside} from '~/components/Aside';
import {ProductPrice} from '~/components/ProductPrice';
import {
  SkyConfigurator,
  type SkyConfiguratorStatus,
} from '~/components/SkyConfigurator';
import {
  VariantOptions,
  type VariantOptionsProduct,
} from '~/components/VariantOptions';
import {formatMoney, type MoneyAmount} from '~/lib/money';
import {
  formatSkyDate,
  SKY_THEME_LABELS,
  toCartAttributes,
  type SkyThemeId,
} from '~/lib/sky/params';
import {
  SKY_FINISH_LABELS,
  SKY_SIZES,
  skyFinishFromOptions,
  skySizeFromOptions,
} from '~/lib/sky/products';
import {
  PRODUCTION_WINDOW_BUSINESS_DAYS,
  RETURN_WINDOW_DAYS,
} from '~/lib/storefrontBasics';

export type StudioVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  price: MoneyAmount;
  compareAtPrice?: MoneyAmount | null;
  selectedOptions: Array<{name: string; value: string}>;
  sku?: string | null;
  barcode?: string | null;
  image?: {url: string; altText?: string | null} | null;
  product?: {handle: string; title: string};
};

export type StudioProduct = VariantOptionsProduct & {
  id: string;
  title: string;
  vendor?: string | null;
  featuredImage?: {url: string; altText?: string | null} | null;
  variants: {nodes: StudioVariant[]};
};

const EMPTY_SKY_STATUS: SkyConfiguratorStatus = {
  nextRequired: 'place',
  params: null,
  preview: 'example',
};

/**
 * The buying half of the Your Sky page: the guided configurator (preview,
 * personalise, style) and the purchase panel (size and finish, review, buy)
 * in the same composition the product page uses, on the page's own stage.
 * Personalisation is released exactly as on the product page — only once
 * the rendered preview matches the input — and the cart line carries the
 * same signed attributes, so nothing downstream (cart action, webhook, PDF,
 * Prodigi) can tell the two pages apart.
 */
export function SkyStudio({
  basePath,
  eyebrow,
  heading,
  note,
  product,
  selectedVariant,
  theme,
}: {
  basePath: string;
  eyebrow: string;
  heading: string;
  note: string;
  product: StudioProduct;
  selectedVariant: StudioVariant | null;
  theme: SkyThemeId;
}) {
  const {open} = useAside();
  const openCart = useCallback(() => open('cart'), [open]);
  const [skyStatus, setSkyStatus] =
    useState<SkyConfiguratorStatus>(EMPTY_SKY_STATUS);
  const skyParams = skyStatus.params;
  const introRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);

  const skySize = skySizeFromOptions(selectedVariant?.selectedOptions);
  const skyFinish = skyFinishFromOptions(selectedVariant?.selectedOptions);
  const attributes = useMemo(
    () => (skyParams ? toCartAttributes(skyParams) : undefined),
    [skyParams],
  );
  const purchaseBlocked = !selectedVariant?.availableForSale || !skyParams;
  const price = selectedVariant ? formatMoney(selectedVariant.price) : null;
  const available = Boolean(selectedVariant?.availableForSale && price);
  const buttonLabel = available ? `Add to cart · ${price}` : 'Unavailable';
  const stickyLabel = available ? `Add · ${price}` : 'Unavailable';
  // Until the preview is ready the primary action walks the customer to the
  // next required field instead of offering a disabled button.
  const pendingAction =
    skyStatus.nextRequired === 'place'
      ? {href: '#sky-place', label: 'Choose a place'}
      : skyStatus.nextRequired === 'date'
        ? {href: '#sky-date', label: 'Choose a date'}
        : {href: '#sky-preview', label: 'Check your preview'};

  const lines = useMemo(
    () =>
      selectedVariant
        ? [
            {
              merchandiseId: selectedVariant.id,
              quantity: 1,
              selectedVariant,
              ...(attributes ? {attributes} : {}),
            },
          ]
        : [],
    [attributes, selectedVariant],
  );
  const analytics = useMemo(
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
              quantity: 1,
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
      selectedVariant,
    ],
  );

  useEffect(() => {
    const target = introRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) =>
        setShowSticky(
          !entry.isIntersecting && entry.boundingClientRect.top < 0,
        ),
      {threshold: 0},
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      className="your-sky-studio"
      id="design"
      aria-labelledby="your-sky-studio-heading"
    >
      <div className="your-sky-studio-stage product-detail-layout product-detail-layout--sky">
        <SkyConfigurator
          finish={skyFinish}
          initialTheme={theme}
          onStatus={setSkyStatus}
          size={skySize}
        />
        <div className="product-purchase-panel">
          <div className="product-purchase-intro" ref={introRef}>
            <p className="eyebrow">{eyebrow}</p>
            <h2 id="your-sky-studio-heading">{heading}</h2>
            <p className="product-lede">{note}</p>
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
              <span>
                Processes in {PRODUCTION_WINDOW_BUSINESS_DAYS} business days
              </span>
              <span>{RETURN_WINDOW_DAYS}-day returns</span>
            </div>
          </div>

          <section
            aria-labelledby="your-sky-options-heading"
            className="sky-product-options-stage"
          >
            <p className="sky-stage-heading" id="your-sky-options-heading">
              <span>2</span> Size and finish
            </p>
            <VariantOptions
              basePath={basePath}
              product={product}
              selectedVariant={selectedVariant}
            />
          </section>

          {skyParams ? (
            <section
              className="sky-review"
              aria-labelledby="your-sky-review-heading"
            >
              <p className="sky-stage-heading" id="your-sky-review-heading">
                <span>3</span> Review and buy
              </p>
              <dl>
                <div>
                  <dt>Style</dt>
                  <dd>{SKY_THEME_LABELS[skyParams.theme]}</dd>
                </div>
                {skyParams.title ? (
                  <div>
                    <dt>Title</dt>
                    <dd>{skyParams.title}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Place</dt>
                  <dd>{skyParams.place}</dd>
                </div>
                <div>
                  <dt>Date</dt>
                  <dd>{formatSkyDate(skyParams)}</dd>
                </div>
                <div>
                  <dt>Size</dt>
                  <dd>{SKY_SIZES[skySize].label}</dd>
                </div>
                <div>
                  <dt>Finish</dt>
                  <dd>{SKY_FINISH_LABELS[skyFinish]}</dd>
                </div>
                {price ? (
                  <div>
                    <dt>Price</dt>
                    <dd>{price}</dd>
                  </div>
                ) : null}
              </dl>
              <p>
                We print exactly this artwork. Screen colour and natural wood
                grain can vary slightly.
              </p>
            </section>
          ) : null}

          <div className="product-buy-box">
            {!skyParams ? (
              <a
                className="primary-button full-width"
                href={pendingAction.href}
              >
                {pendingAction.label}
              </a>
            ) : (
              <AddToCartButton
                analytics={analytics}
                className="primary-button full-width"
                disabled={purchaseBlocked}
                lines={lines}
                onSuccess={openCart}
                pendingChildren="Adding..."
              >
                {buttonLabel}
              </AddToCartButton>
            )}
          </div>

          <ul className="product-assurance-list" aria-label="Order reassurance">
            <li>
              <span aria-hidden />
              Printed to order; tracking details are emailed after dispatch.
            </li>
            <li>
              <span aria-hidden />
              Your place, date, style and title travel with the order and are
              checked before printing.
            </li>
          </ul>
        </div>
      </div>

      <div className={`sticky-atc-bar ${showSticky ? 'is-visible' : ''}`}>
        <div className="sticky-atc-info">
          <div>
            <p className="sticky-atc-title">{product.title}</p>
            {price ? <p className="sticky-atc-price">{price}</p> : null}
          </div>
        </div>
        {!skyParams ? (
          <a
            className="primary-button sticky-atc-button"
            href={pendingAction.href}
          >
            {pendingAction.label}
          </a>
        ) : (
          <AddToCartButton
            analytics={analytics}
            className="primary-button sticky-atc-button"
            disabled={purchaseBlocked}
            lines={lines}
            onSuccess={openCart}
          >
            {stickyLabel}
          </AddToCartButton>
        )}
      </div>
    </section>
  );
}
