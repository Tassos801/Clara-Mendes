import {useEffect, useState} from 'react';
import {Link} from 'react-router';
import {Image} from '@shopify/hydrogen';
import {useAside} from './Aside';
import {AddToCartButton} from './AddToCartButton';
import {getProductStory} from '~/lib/productCopy';
import {
  deriveCardPricing,
  formatCardPriceLabel,
  type CardPricing,
} from '~/lib/productCardPricing';
import {
  CLASSIC_FRAME_HANDLE,
  isAccurateClassicFrameImage,
  selectAccurateClassicFrameImage,
} from '~/lib/classicFrame';

const CARD_IMAGE_SIZES =
  '(min-width: 1100px) 25vw, (min-width: 781px) 33vw, 50vw';

type MoneyAmount = {
  amount: string;
  currencyCode: string;
};

type ProductImage = {
  id?: string;
  altText?: string | null;
  height?: number | null;
  url: string;
  width?: number | null;
};

type ProductVariant = {
  id: string;
  availableForSale?: boolean;
  barcode?: string | null;
  compareAtPrice?: MoneyAmount | null;
  image?: ProductImage | null;
  price: MoneyAmount;
  product: {
    handle: string;
    title: string;
  };
  selectedOptions: Array<{
    name: string;
    value: string;
  }>;
  sku?: string | null;
  title: string;
};

export type ClaraCardProduct = {
  id: string;
  handle: string;
  title: string;
  vendor?: string | null;
  productType?: string | null;
  tags?: string[];
  featuredImage?: ProductImage | null;
  images?: {
    nodes: ProductImage[];
  };
  priceRange?: {
    minVariantPrice?: MoneyAmount;
    maxVariantPrice?: MoneyAmount;
  };
  cardVariant?: {
    nodes: ProductVariant[];
  };
  sizeVariants?: {
    nodes: Array<{
      availableForSale?: boolean;
      price?: MoneyAmount | null;
    }>;
  };
  variants?: {
    nodes: ProductVariant[];
  };
};

export function ClaraProductCard({
  product,
  loading = 'lazy',
  showStory = false,
  pricing,
}: {
  product: ClaraCardProduct;
  loading?: 'eager' | 'lazy';
  showStory?: boolean;
  /** Precomputed pricing for cards fed from snapshots (recently viewed). */
  pricing?: CardPricing;
}) {
  const images = product.images?.nodes ?? [];
  const candidateVariant =
    product.cardVariant?.nodes?.[0] ?? product.variants?.nodes?.[0];
  const isClassicFrame = product.handle === CLASSIC_FRAME_HANDLE;
  const firstVariant = candidateVariant;
  const baseImage = isClassicFrame
    ? selectAccurateClassicFrameImage([
        firstVariant?.image,
        ...images,
        product.featuredImage,
      ])
    : (product.featuredImage ?? images[0]);
  const hoverImage = isClassicFrame
    ? images.find(
        (image) =>
          image.url !== baseImage?.url && isAccurateClassicFrameImage(image),
      )
    : images.find((image) => image.url !== baseImage?.url);
  // The hover crossfade can only ever show on hover-capable devices, so
  // touch devices skip the second image's download and decode entirely.
  // SSR renders without it; hover-capable browsers mount it after hydration
  // (it sits at opacity 0 until :hover, so the late mount is invisible).
  const [hoverCapable, setHoverCapable] = useState(false);
  useEffect(() => {
    setHoverCapable(
      window.matchMedia('(hover: hover) and (pointer: fine)').matches,
    );
  }, []);
  const cardPricing = isClassicFrame
    ? firstVariant
      ? deriveCardPricing({variants: {nodes: [firstVariant]}})
      : {price: null, hasRange: false}
    : (pricing ?? deriveCardPricing(product));
  const priceLabel = formatCardPriceLabel(cardPricing);
  const chip = product.productType || 'Curated object';
  const story = showStory ? getProductStory(product) : null;

  return (
    <article className="product-card cm-card">
      <div className="cm-card-media-wrap">
        <Link
          to={`/products/${product.handle}`}
          prefetch="intent"
          className="cm-card-media-link"
          aria-label={product.title}
        >
          <div className="product-card-media cm-card-media">
            {baseImage ? (
              <>
                <Image
                  className="cm-card-img cm-card-img--base"
                  data={baseImage}
                  alt={baseImage.altText || product.title}
                  aspectRatio="4/5"
                  sizes={CARD_IMAGE_SIZES}
                  loading={loading}
                />
                {hoverCapable ? (
                  <Image
                    className="cm-card-img cm-card-img--hover"
                    data={hoverImage ?? baseImage}
                    alt=""
                    aria-hidden
                    aspectRatio="4/5"
                    sizes={CARD_IMAGE_SIZES}
                    loading="lazy"
                  />
                ) : null}
              </>
            ) : (
              <div className="cm-card-img cm-card-img--empty" aria-hidden />
            )}
            <div className="cm-card-veil" aria-hidden />
            <span className="cm-card-chip">{chip}</span>
          </div>
        </Link>
        {firstVariant ? (
          <QuickAddButton product={product} variant={firstVariant} />
        ) : null}
      </div>
      <Link
        to={`/products/${product.handle}`}
        prefetch="intent"
        className="cm-card-copy-link"
      >
        <div className="product-card-copy cm-card-copy">
          <div className="cm-card-heading">
            <h3 className="cm-card-title">
              <i>{product.title.split(' ')[0]}</i>
              {product.title.split(' ').slice(1).length
                ? ' ' + product.title.split(' ').slice(1).join(' ')
                : ''}
            </h3>
            {priceLabel ? (
              <strong className="cm-card-price">{priceLabel}</strong>
            ) : null}
          </div>
          {story ? <p className="cm-card-story">{story}</p> : null}
        </div>
      </Link>

      <style suppressHydrationWarning>{cardCss}</style>
    </article>
  );
}

function QuickAddButton({
  product,
  variant,
}: {
  product: ClaraCardProduct;
  variant: ProductVariant;
}) {
  const {open} = useAside();
  const available = variant.availableForSale !== false;

  if (!available) {
    return (
      <button
        type="button"
        className="cm-quick-add cm-quick-add--unavailable"
        disabled
        aria-label="Sold out"
      >
        <svg
          width="14"
          height="2"
          viewBox="0 0 14 2"
          fill="none"
          aria-hidden="true"
        >
          <line
            x1="0"
            y1="1"
            x2="14"
            y2="1"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </svg>
      </button>
    );
  }

  return (
    <AddToCartButton
      ariaLabel="Quick add to cart"
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
      className="cm-quick-add"
      lines={[
        {
          merchandiseId: variant.id,
          quantity: 1,
          selectedVariant: variant,
        },
      ]}
      onSuccess={() => open('cart')}
      showErrors={false}
    >
      +
    </AddToCartButton>
  );
}

const cardCss = `
.cm-card {
  min-width: 0;
  --cm-ease: cubic-bezier(0.25, 1, 0.5, 1);
}

.cm-card-media-wrap {
  position: relative;
}

.cm-card-media-link,
.cm-card-copy-link {
  display: block;
  color: inherit;
}

.cm-card-media {
  position: relative;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  background: #efeae0;
  isolation: isolate;
}

.cm-card-img {
  position: absolute;
  inset: 0;
  /* !important beats the Hydrogen Image component's inline width/height */
  width: 100% !important;
  height: 100% !important;
  object-fit: cover;
  transition: transform 900ms var(--cm-ease), opacity 700ms var(--cm-ease);
  filter: saturate(0.92);
}

.cm-card-img--base { opacity: 1; z-index: 1; }
.cm-card-img--hover { opacity: 0; z-index: 2; }
.cm-card-img--empty {
  background:
    linear-gradient(135deg, rgba(38,35,31,0.08), rgba(38,35,31,0)),
    var(--color-soft);
}

.cm-card:hover .cm-card-img--base,
.cm-card:focus-within .cm-card-img--base {
  transform: scale(1.04);
  opacity: 0;
}

.cm-card:hover .cm-card-img--hover,
.cm-card:focus-within .cm-card-img--hover {
  opacity: 1;
  transform: scale(1.04);
}

.cm-card-veil {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(30,28,24,0) 55%, rgba(30,28,24,0.35) 100%);
  opacity: 0;
  transition: opacity 600ms var(--cm-ease);
}

.cm-card:hover .cm-card-veil,
.cm-card:focus-within .cm-card-veil { opacity: 1; }

.cm-card-chip {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 4;
  font-family: var(--sans);
  font-size: 0.62rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #fff;
  padding: 6px 10px;
  border: 1px solid rgba(255,255,255,0.42);
  border-radius: 999px;
  backdrop-filter: blur(12px) saturate(1.25);
  -webkit-backdrop-filter: blur(12px) saturate(1.25);
  background:
    linear-gradient(135deg, rgba(255,255,255,0.16), transparent 58%),
    rgba(30,28,24,0.28);
  box-shadow:
    0 8px 20px rgba(10,9,7,0.14),
    inset 0 1px 0 rgba(255,255,255,0.28);
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 500ms var(--cm-ease), transform 500ms var(--cm-ease);
}

.cm-card:hover .cm-card-chip,
.cm-card:focus-within .cm-card-chip {
  opacity: 1;
  transform: translateY(0);
}

.cm-card-copy {
  padding-top: 14px;
}

.cm-card-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.cm-card-story {
  color: var(--color-muted, #6f685e);
  font-family: var(--sans);
  font-size: 0.78rem;
  line-height: 1.5;
  margin: 8px 0 0;
}

.cm-card-title {
  font-family: var(--serif);
  font-size: 1.35rem;
  font-weight: 400;
  letter-spacing: -0.015em;
  line-height: 1.15;
  margin: 0;
  color: var(--color-ink);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
  min-width: 0;
}

.cm-card-title i { font-style: italic; }

.cm-card-price {
  font-family: var(--sans);
  font-weight: 600;
  font-size: 0.88rem;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink);
  white-space: nowrap;
  flex-shrink: 0;
}

/* Quick-add button (positioned over bottom-right of image) */
.cm-quick-add {
  position: absolute;
  bottom: 12px;
  right: 12px;
  z-index: 5;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  backdrop-filter: blur(14px) saturate(1.28);
  -webkit-backdrop-filter: blur(14px) saturate(1.28);
  border: 1px solid rgba(255,255,255,0.36);
  background:
    linear-gradient(135deg, rgba(255,255,255,0.14), transparent 52%),
    rgba(30,28,24,0.58);
  color: #fff;
  font-size: 1.25rem;
  font-weight: 300;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 400ms var(--cm-ease), transform 400ms var(--cm-ease), background 220ms var(--cm-ease), box-shadow 220ms var(--cm-ease);
  box-shadow:
    0 10px 24px rgba(0,0,0,0.22),
    inset 0 1px 0 rgba(255,255,255,0.24);
  will-change: opacity, transform;
}

.cm-card-media-wrap:hover .cm-quick-add,
.cm-card-media-wrap:focus-within .cm-quick-add {
  opacity: 1;
  transform: translateY(0);
}

.cm-quick-add:hover:not(:disabled) {
  background:
    linear-gradient(135deg, rgba(255,255,255,0.2), transparent 52%),
    rgba(30,28,24,0.76);
}
.cm-quick-add[aria-busy="true"] {
  background: var(--color-clay, #9c6f5d);
  color: transparent;
  cursor: progress;
  transform: translateY(0) scale(0.98);
}
.cm-quick-add[aria-busy="true"]::after {
  animation: cmQuickAddSpin 720ms linear infinite;
  border: 1px solid rgba(255, 255, 255, 0.44);
  border-radius: 999px;
  border-top-color: #fff;
  content: "";
  height: 14px;
  position: absolute;
  width: 14px;
}
.cm-quick-add--unavailable {
  background: rgba(38,35,31,0.35) !important;
  cursor: not-allowed;
}

@keyframes cmQuickAddSpin {
  to { transform: rotate(360deg); }
}

/* ── Mobile compact layout ── */
@media (max-width: 720px) {
  .cm-card-chip {
    opacity: 1;
    transform: translateY(0);
    font-size: 0.56rem;
    padding: 4px 8px;
    top: 10px;
    left: 10px;
  }

  .cm-card-title {
    font-size: 1rem;
    line-height: 1.2;
  }

  .cm-card-price {
    font-size: 0.8rem;
  }

  .cm-card-copy {
    padding-top: 10px;
  }

  .cm-card-heading {
    gap: 6px;
  }

  .cm-card-story {
    font-size: 0.72rem;
    line-height: 1.45;
    margin-top: 6px;
  }

  .cm-quick-add {
    opacity: 1;
    transform: translateY(0);
    width: 34px;
    height: 34px;
    font-size: 1.15rem;
    bottom: 8px;
    right: 8px;
  }
}
`;
