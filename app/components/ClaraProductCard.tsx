import {Link} from 'react-router';
import {CartForm} from '@shopify/hydrogen';
import {useAside} from './Aside';

type MoneyAmount = {
  amount: string;
  currencyCode: string;
};

type ProductImage = {
  altText?: string | null;
  url: string;
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
  };
  variants?: {
    nodes: Array<{
      id: string;
      availableForSale?: boolean;
    }>;
  };
};

export function ClaraProductCard({
  product,
  loading = 'lazy',
}: {
  product: ClaraCardProduct;
  loading?: 'eager' | 'lazy';
}) {
  const images = product.images?.nodes ?? [];
  const baseImage = product.featuredImage ?? images[0];
  const hoverImage = images.find((image) => image.url !== baseImage?.url);
  const price = product.priceRange?.minVariantPrice;
  const chip = product.productType || 'Curated object';
  const firstVariant = product.variants?.nodes?.[0];

  return (
    <article className="product-card cm-card">
      <Link
        to={`/products/${product.handle}`}
        prefetch="intent"
        className="cm-card-link"
      >
        <div className="product-card-media cm-card-media">
          {baseImage ? (
            <>
              <img
                className="cm-card-img cm-card-img--base"
                src={baseImage.url}
                alt={baseImage.altText || product.title}
                loading={loading}
              />
              <img
                className="cm-card-img cm-card-img--hover"
                src={(hoverImage ?? baseImage).url}
                alt=""
                aria-hidden
                loading="lazy"
              />
            </>
          ) : (
            <div className="cm-card-img cm-card-img--empty" aria-hidden />
          )}
          <div className="cm-card-veil" aria-hidden />
          <span className="cm-card-chip">{chip}</span>
        </div>
        <div className="product-card-copy cm-card-copy">
          <h3 className="cm-card-title">
            <i>{product.title.split(' ')[0]}</i>
            {product.title.split(' ').slice(1).length
              ? ' ' + product.title.split(' ').slice(1).join(' ')
              : ''}
          </h3>
          {price ? (
            <strong className="cm-card-price">{formatMoney(price)}</strong>
          ) : null}
        </div>
      </Link>

      {firstVariant ? (
        <QuickAddButton variantId={firstVariant.id} available={firstVariant.availableForSale !== false} />
      ) : null}

      <style suppressHydrationWarning>{cardCss}</style>
    </article>
  );
}

function QuickAddButton({variantId, available}: {variantId: string; available: boolean}) {
  const {open} = useAside();

  return (
    <CartForm
      route="/cart"
      inputs={{lines: [{merchandiseId: variantId, quantity: 1}]}}
      action={CartForm.ACTIONS.LinesAdd}
    >
      {(fetcher) => (
        <button
          type="submit"
          className="cm-quick-add"
          disabled={!available || fetcher.state !== 'idle'}
          aria-label={available ? 'Quick add to cart' : 'Sold out'}
          onClick={() => {
            setTimeout(() => open('cart'), 300);
          }}
        >
          {available ? '+' : ''}
        </button>
      )}
    </CartForm>
  );
}

function formatMoney(price: MoneyAmount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currencyCode,
  }).format(Number(price.amount));
}

const cardCss = `
.cm-card {
  min-width: 0;
  position: relative;
  --cm-ease: cubic-bezier(0.25, 1, 0.5, 1);
}

.cm-card-link {
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
  width: 100%;
  height: 100%;
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
  border: 1px solid rgba(255,255,255,0.35);
  border-radius: 999px;
  backdrop-filter: blur(6px);
  background: rgba(30,28,24,0.18);
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
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding-top: 14px;
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

/* Quick-add button */
.cm-quick-add {
  position: absolute;
  bottom: 56px;
  right: 10px;
  z-index: 5;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--color-ink, #26231f);
  color: #fff;
  font-size: 1.2rem;
  font-weight: 300;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 400ms var(--cm-ease), transform 400ms var(--cm-ease), background 200ms;
  box-shadow: 0 2px 8px rgba(0,0,0,0.18);
}

.cm-card:hover .cm-quick-add,
.cm-card:focus-within .cm-quick-add {
  opacity: 1;
  transform: translateY(0);
}

.cm-quick-add:hover { background: #3d3832; }
.cm-quick-add:disabled { opacity: 0.3 !important; cursor: default; }

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
    gap: 6px;
  }

  .cm-quick-add {
    opacity: 1;
    transform: translateY(0);
    width: 32px;
    height: 32px;
    font-size: 1.1rem;
    bottom: 48px;
    right: 8px;
  }
}
`;
