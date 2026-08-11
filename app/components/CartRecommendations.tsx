import type {OptimisticCart} from '@shopify/hydrogen';
import {useEffect, useMemo, useRef} from 'react';
import {Link, useFetcher} from 'react-router';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {AddToCartButton} from '~/components/AddToCartButton';
import {useAside} from '~/components/Aside';
import type {ClaraCardProduct} from '~/components/ClaraProductCard';
import type {CartLayout} from '~/components/CartMain';
import {
  deriveCardPricing,
  formatCardPriceLabel,
} from '~/lib/productCardPricing';

const VISIBLE_RECOMMENDATIONS = 3;

type CartRecommendationsResponse = {
  products: ClaraCardProduct[];
};

/**
 * "Complete the room" cross-sell row shown inside the cart. Loads
 * related products for the items currently in the cart and lets the
 * customer add one without leaving the drawer.
 */
export function CartRecommendations({
  cart,
  layout,
}: {
  cart: OptimisticCart<CartApiQueryFragment | null>;
  layout: CartLayout;
}) {
  const fetcher = useFetcher<CartRecommendationsResponse>();
  const {close} = useAside();
  const lastLoadedIds = useRef<string | null>(null);

  const cartProductIds = useMemo(() => {
    const ids = new Set<string>();
    for (const line of cart?.lines?.nodes ?? []) {
      const productId = line.merchandise?.product?.id;
      if (productId) ids.add(productId);
    }
    return [...ids].sort();
  }, [cart?.lines?.nodes]);

  const serializedIds = cartProductIds.join(',');

  useEffect(() => {
    if (!serializedIds || lastLoadedIds.current === serializedIds) return;
    lastLoadedIds.current = serializedIds;
    void fetcher.load(
      `/api/cart-recommendations?productIds=${encodeURIComponent(serializedIds)}`,
    );
  }, [fetcher, serializedIds]);

  const inCart = new Set(cartProductIds);
  const products = (fetcher.data?.products ?? [])
    .filter((product) => !inCart.has(product.id))
    .slice(0, VISIBLE_RECOMMENDATIONS);

  if (products.length === 0) return null;

  return (
    <section
      className={`cart-recs cart-recs--${layout}`}
      aria-label="Recommended additions"
    >
      <p className="cart-recs-heading">Complete the room</p>
      <ul className="cart-recs-list">
        {products.map((product) => (
          <CartRecommendationRow
            key={product.id}
            onNavigate={layout === 'aside' ? close : undefined}
            product={product}
          />
        ))}
      </ul>
      <style suppressHydrationWarning>{recsCss}</style>
    </section>
  );
}

function CartRecommendationRow({
  onNavigate,
  product,
}: {
  onNavigate?: () => void;
  product: ClaraCardProduct;
}) {
  const variant = product.cardVariant?.nodes?.[0];
  const image = product.featuredImage ?? product.images?.nodes?.[0];
  // "From <min released price>" — the Add button adds the first variant,
  // which is that min-price 8 × 10, so the label stays truthful.
  const priceLabel = formatCardPriceLabel(deriveCardPricing(product));

  if (!variant) return null;

  return (
    <li className="cart-recs-row">
      <Link
        className="cart-recs-media"
        onClick={onNavigate}
        prefetch="intent"
        to={`/products/${product.handle}`}
        tabIndex={-1}
        aria-hidden="true"
      >
        {image ? (
          <img src={image.url} alt="" loading="lazy" />
        ) : (
          <span className="cart-recs-media-empty" aria-hidden />
        )}
      </Link>
      <div className="cart-recs-copy">
        <Link
          className="cart-recs-title"
          onClick={onNavigate}
          prefetch="intent"
          to={`/products/${product.handle}`}
        >
          {product.title}
        </Link>
        {priceLabel ? (
          <span className="cart-recs-price">{priceLabel}</span>
        ) : null}
      </div>
      <AddToCartButton
        analytics={{
          products: [
            {
              productGid: product.id,
              variantGid: variant.id,
              name: product.title,
              variantName: variant.title,
              brand: product.vendor || 'Clara Mendes',
              price: variant.price.amount,
              currency: variant.price.currencyCode,
              quantity: 1,
              category: product.productType || undefined,
              sku: variant.sku || undefined,
            },
          ],
        }}
        ariaLabel={`Add ${product.title} to cart`}
        className="cart-recs-add"
        lines={[
          {
            merchandiseId: variant.id,
            quantity: 1,
            selectedVariant: variant,
          },
        ]}
        showErrors={false}
      >
        Add
      </AddToCartButton>
    </li>
  );
}

const recsCss = `
.cart-recs {
  border-top: 1px solid rgba(38, 35, 31, 0.14);
  display: grid;
  gap: 14px;
  padding-top: 18px;
}

.cart-recs-heading {
  font-family: var(--sans);
  font-size: 0.66rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  margin: 0;
  text-transform: uppercase;
  color: rgba(38, 35, 31, 0.62);
}

.cart-recs-list {
  display: grid;
  gap: 12px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.cart-recs-row {
  align-items: center;
  display: flex;
  gap: 12px;
}

.cart-recs-media {
  background: #efeae0;
  border-radius: 50%;
  display: block;
  flex-shrink: 0;
  height: 56px;
  overflow: hidden;
  width: 56px;
}

.cart-recs-media img {
  display: block;
  filter: saturate(0.92);
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.cart-recs-media-empty {
  display: block;
  height: 100%;
  width: 100%;
}

.cart-recs-copy {
  display: grid;
  flex: 1;
  gap: 2px;
  min-width: 0;
}

.cart-recs-title {
  color: var(--color-ink);
  display: -webkit-box;
  font-family: var(--serif);
  font-size: 1.02rem;
  letter-spacing: -0.01em;
  line-height: 1.2;
  overflow: hidden;
  text-decoration: none;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.cart-recs-title:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.cart-recs-price {
  color: rgba(38, 35, 31, 0.66);
  font-family: var(--sans);
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.cart-recs-add {
  background: transparent;
  border: 1px solid rgba(38, 35, 31, 0.32);
  border-radius: 999px;
  color: var(--color-ink);
  cursor: pointer;
  flex-shrink: 0;
  font-family: var(--sans);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  min-height: 32px;
  padding: 0 16px;
  text-transform: uppercase;
  transition: background 220ms ease, color 220ms ease;
}

.cart-recs-add:hover:not(:disabled) {
  background: var(--color-ink, #26231f);
  color: #fff;
}

.cart-recs-add[aria-busy='true'] {
  background: var(--color-ink, #26231f);
  color: rgba(255, 255, 255, 0.7);
  cursor: progress;
}
`;
