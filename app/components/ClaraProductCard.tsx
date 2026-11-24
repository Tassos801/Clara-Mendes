import {useEffect, useState} from 'react';
import {Link} from 'react-router';
import {Image} from '@shopify/hydrogen';
import {useAside} from './Aside';
import {AddToCartButton} from './AddToCartButton';
import {blackFridayCardTag} from '~/lib/blackFridayCard';
import {cardTitleParts} from '~/lib/cardTitle';
import {useBlackFridayWeek} from '~/lib/useBlackFridayWeek';
import {getProductStory} from '~/lib/productCopy';
import {
  cardQuickAddMode,
  deriveCardPricing,
  formatCardPriceLabel,
  type CardPricing,
} from '~/lib/productCardPricing';
import {
  CLASSIC_FRAME_HANDLE,
  isAccurateClassicFrameImage,
  selectAccurateClassicFrameImage,
} from '~/lib/classicFrame';
import {curatedDisplayTitle, withCuratedImages} from '~/lib/curatedProducts';
import {storefrontImageLoader} from '~/lib/imageLoader';
import type {ClothingProductLike} from '~/lib/clothing';

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

export type ClaraCardProduct = ClothingProductLike & {
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
  /** "the United States": on sale, but not shipped to the buyer's country
   * (lib/deliveryReach.ts). */
  notShippedTo?: string;
};

export function ClaraProductCard({
  product: storefrontProduct,
  byline,
  loading = 'lazy',
  showStory = false,
  pricing,
}: {
  product: ClaraCardProduct;
  /** The artist's name, shown as "By …" above the title (artist shops). */
  byline?: string;
  loading?: 'eager' | 'lazy';
  showStory?: boolean;
  /** Precomputed pricing for cards fed from snapshots (recently viewed). */
  pricing?: CardPricing;
}) {
  // Curated kits show their branded image set instead of supplier photos.
  const product = withCuratedImages(storefrontProduct);
  const title = curatedDisplayTitle(product);
  const titleParts = cardTitleParts(title);
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
  // The crossfade CSS is keyed to `cm-card--hoverable`: touch browsers still
  // apply a sticky :hover to the card under the finger, and without the
  // second image that fade would leave the card blank.
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
  // Black Friday week only; it also stops in a tab left open past the end.
  const saleTag = useBlackFridayWeek()
    ? blackFridayCardTag(product.productType, product.handle)
    : null;

  return (
    <article
      className={`product-card cm-card${hoverCapable ? ' cm-card--hoverable' : ''}`}
    >
      <div className="cm-card-media-wrap">
        <Link
          to={`/products/${product.handle}`}
          prefetch="intent"
          className="cm-card-media-link"
          aria-label={`${title} · ${chip}`}
        >
          <div className="product-card-media cm-card-media">
            {baseImage ? (
              <>
                <Image
                  className="cm-card-img cm-card-img--base"
                  data={baseImage}
                  alt={baseImage.altText || title}
                  aspectRatio="4/5"
                  loader={storefrontImageLoader}
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
                    loader={storefrontImageLoader}
                    sizes={CARD_IMAGE_SIZES}
                    loading="lazy"
                  />
                ) : null}
              </>
            ) : (
              <div className="cm-card-img cm-card-img--empty" aria-hidden />
            )}
            <div className="cm-card-veil" aria-hidden />
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
          {/* One label over the name, as on the clothing cards: the artist
              in an artist's shop (its rows are already split by type),
              the product type everywhere else. */}
          <p className="cm-card-eyebrow">{byline ? `By ${byline}` : chip}</p>
          <h3 className="cm-card-title">
            {titleParts.lead ? <i>{titleParts.lead}</i> : null}
            {titleParts.rest}
          </h3>
          {priceLabel || (saleTag && !product.notShippedTo) ? (
            <p className="cm-card-meta">
              {priceLabel ? (
                <strong className="cm-card-price">{priceLabel}</strong>
              ) : null}
              {saleTag && !product.notShippedTo ? (
                <span className="cm-card-tag" title={saleTag.label}>
                  <span aria-hidden="true">{saleTag.tag}</span>
                  <span className="sr-only">{saleTag.label}</span>
                </span>
              ) : null}
            </p>
          ) : null}
          {product.notShippedTo ? (
            <p className="cm-card-reach">
              Doesn&rsquo;t ship to {product.notShippedTo}
            </p>
          ) : null}
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
  const mode = cardQuickAddMode(product, variant);
  const title = curatedDisplayTitle(product);

  // A product with options to choose gets no button: the arrow it used to
  // show only repeated the card's own link, and two different icons on the
  // same grid read as two different actions.
  if (mode === 'choose') return null;

  if (mode === 'unavailable') {
    // Unbuyable here but on sale in the default market: not sold out.
    const label = product.notShippedTo
      ? `Doesn't ship to ${product.notShippedTo}`
      : 'Sold out';
    return (
      <button
        type="button"
        className="cm-quick-add cm-quick-add--unavailable"
        disabled
        aria-label={label}
        title={label}
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
      ariaLabel={`Add ${title} to cart`}
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
/* Positioned, so the screen-reader text in the sale tag (absolutely
   positioned) stays inside the card: in a sideways-scrolling row it would
   otherwise sit beyond the row's clip and widen the whole page. */
.cm-card {
  min-width: 0;
  position: relative;
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

/* One tile colour for every card, shared with the clothing cards. */
.cm-card-media {
  position: relative;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  background: var(--color-tile);
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

.cm-card--hoverable:hover .cm-card-img--base,
.cm-card--hoverable:focus-within .cm-card-img--base {
  transform: scale(1.04);
  opacity: 0;
}

.cm-card--hoverable:hover .cm-card-img--hover,
.cm-card--hoverable:focus-within .cm-card-img--hover {
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

.cm-card--hoverable:hover .cm-card-veil,
.cm-card--hoverable:focus-within .cm-card-veil { opacity: 1; }

/* Card copy: label, name, price. The clothing cards (clothing.css) use the
   same order and sizes. */
.cm-card .cm-card-copy {
  display: block;
  padding-top: 10px;
}

.cm-card .cm-card-eyebrow {
  color: var(--color-muted, #524d45);
  font-family: var(--sans);
  font-size: var(--text-xs);
  font-weight: 500;
  letter-spacing: 0.12em;
  line-height: 1.4;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.cm-card .cm-card-title {
  font-family: var(--serif);
  font-size: var(--text-xl);
  font-weight: 400;
  letter-spacing: -0.01em;
  line-height: 1.25;
  margin: 2px 0 0;
  color: var(--color-ink);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cm-card .cm-card-title i { font-style: italic; }

.cm-card .cm-card-meta {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  margin: 4px 0 0;
}

.cm-card .cm-card-price {
  font-family: var(--sans);
  font-weight: 500;
  font-size: var(--text-base);
  font-variant-numeric: tabular-nums;
  color: var(--color-ink);
  white-space: nowrap;
}

/* The sale as a tag beside the price; the full line is its tooltip and
   screen-reader text. */
.cm-card .cm-card-tag {
  background: var(--color-ink);
  border-radius: 999px;
  color: var(--color-paper);
  font-family: var(--sans);
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1;
  padding: 4px 7px;
  white-space: nowrap;
}

.cm-card .cm-card-tag span {
  color: inherit;
  font-size: inherit;
  letter-spacing: inherit;
  text-transform: none;
}

.cm-card .cm-card-reach {
  color: var(--color-muted, #524d45);
  font-family: var(--sans);
  font-size: var(--text-xs);
  letter-spacing: 0.04em;
  line-height: 1.4;
  margin: 6px 0 0;
}

.cm-card .cm-card-story {
  color: var(--color-muted, #6f685e);
  font-family: var(--sans);
  font-size: var(--text-sm);
  line-height: 1.5;
  margin: 8px 0 0;
}

/* Quick add (single-option products only), bottom-right of the image. */
.cm-quick-add {
  position: absolute;
  bottom: 10px;
  right: 10px;
  z-index: 5;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  backdrop-filter: blur(14px) saturate(1.28);
  -webkit-backdrop-filter: blur(14px) saturate(1.28);
  border: 1px solid rgba(255,255,255,0.36);
  background:
    linear-gradient(135deg, rgba(255,255,255,0.14), transparent 52%),
    rgba(30,28,24,0.58);
  color: #fff;
  font-size: var(--text-xl);
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
    0 8px 18px rgba(0,0,0,0.18),
    inset 0 1px 0 rgba(255,255,255,0.24);
  will-change: opacity, transform;
}

/* A 44 px touch target around the smaller visible circle. */
.cm-quick-add::before {
  content: "";
  inset: -4px;
  position: absolute;
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

@media (max-width: 1023px) {
  .cm-card .cm-card-title {
    font-size: var(--text-lg);
  }
}

/* Phones: two columns leave a card about 160 px wide; the quick add stays
   visible (no hover) and smaller, so it covers less of the picture. */
@media (max-width: 720px) {
  .cm-card .cm-card-copy {
    padding-top: 8px;
  }

  .cm-card .cm-card-title {
    font-size: var(--text-base);
  }

  .cm-card .cm-card-price {
    font-size: var(--text-sm);
  }

  .cm-card-copy-link {
    min-height: 44px;
  }

  .cm-card .cm-card-story {
    line-height: 1.45;
    margin-top: 6px;
  }

  .cm-quick-add {
    opacity: 1;
    transform: translateY(0);
    width: 32px;
    height: 32px;
    font-size: var(--text-lg);
    bottom: 8px;
    right: 8px;
  }

  .cm-quick-add::before {
    inset: -6px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cm-card-img,
  .cm-card-veil,
  .cm-quick-add {
    transition: none;
  }

  .cm-card--hoverable:hover .cm-card-img--base,
  .cm-card--hoverable:focus-within .cm-card-img--base,
  .cm-card--hoverable:hover .cm-card-img--hover,
  .cm-card--hoverable:focus-within .cm-card-img--hover {
    transform: none;
  }

  .cm-quick-add[aria-busy="true"]::after {
    animation-duration: 2s;
  }
}
`;
