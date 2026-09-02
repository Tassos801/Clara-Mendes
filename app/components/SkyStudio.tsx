import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AddToCartButton} from '~/components/AddToCartButton';
import {useAside} from '~/components/Aside';
import {ProductPrice} from '~/components/ProductPrice';
import {SkyConfigurator} from '~/components/SkyConfigurator';
import {
  VariantOptions,
  type VariantOptionsProduct,
} from '~/components/VariantOptions';
import {formatMoney, type MoneyAmount} from '~/lib/money';
import {
  toCartAttributes,
  type SkyParams,
  type SkyThemeId,
} from '~/lib/sky/params';
import {SKY_SIZES, skySizeFromOptions} from '~/lib/sky/products';

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

/**
 * The buying half of the Your Sky page: the live configurator on one side,
 * size/finish, price and add-to-cart on the other. Owns the validated
 * personalisation exactly as the product page did; the cart line carries
 * the same signed attributes, so nothing downstream (cart action, webhook,
 * PDF, Prodigi) can tell the two pages apart.
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
  const [skyParams, setSkyParams] = useState<SkyParams | null>(null);
  const atcRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);

  const skySize = skySizeFromOptions(selectedVariant?.selectedOptions);
  const attributes = useMemo(
    () => (skyParams ? toCartAttributes(skyParams) : undefined),
    [skyParams],
  );
  const purchaseBlocked = !selectedVariant?.availableForSale || !skyParams;
  const price = selectedVariant ? formatMoney(selectedVariant.price) : null;
  const buttonLabel = !skyParams
    ? 'Add your place and date'
    : selectedVariant?.availableForSale && price
      ? `Add to cart · ${price}`
      : 'Unavailable';
  const stickyLabel = !skyParams
    ? 'Add your place and date'
    : selectedVariant?.availableForSale && price
      ? `Add · ${price}`
      : 'Unavailable';

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
    const target = atcRef.current;
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
      <div className="your-sky-studio-map">
        <SkyConfigurator size={skySize} theme={theme} onChange={setSkyParams} />
      </div>
      <div className="your-sky-studio-panel">
        <p className="eyebrow">{eyebrow}</p>
        <h2 id="your-sky-studio-heading">{heading}</h2>
        <p className="your-sky-studio-note">{note}</p>
        <VariantOptions
          basePath={basePath}
          product={product}
          selectedVariant={selectedVariant}
        />
        <p className="your-sky-studio-size">
          {SKY_SIZES[skySize].label} · giclée on 200gsm Enhanced Matte Art paper
        </p>
        {selectedVariant ? (
          <ProductPrice
            price={selectedVariant.price}
            compareAtPrice={selectedVariant.compareAtPrice}
          />
        ) : null}
        <div ref={atcRef} className="your-sky-studio-buy">
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
        </div>
        <ul className="product-assurance-list" aria-label="Order reassurance">
          <li>
            <span aria-hidden />
            Printed to order; tracking details are emailed after dispatch.
          </li>
          <li>
            <span aria-hidden />
            Your place, date and title travel with the order and are checked
            before printing.
          </li>
        </ul>
      </div>

      <div className={`sticky-atc-bar ${showSticky ? 'is-visible' : ''}`}>
        <div className="sticky-atc-info">
          <div>
            <p className="sticky-atc-title">{product.title}</p>
            {price ? <p className="sticky-atc-price">{price}</p> : null}
          </div>
        </div>
        <AddToCartButton
          analytics={analytics}
          className="primary-button sticky-atc-button"
          disabled={purchaseBlocked}
          lines={lines}
          onSuccess={openCart}
        >
          {stickyLabel}
        </AddToCartButton>
      </div>
    </section>
  );
}
