import {Link} from 'react-router';

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
  const descriptor =
    product.productType ||
    getVendorLabel(product.vendor) ||
    product.tags?.slice(0, 2).map(formatTag).join(' / ') ||
    'Home edit';
  const price = product.priceRange?.minVariantPrice;

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
          <span className="cm-card-chip">
            {product.productType || 'Curated object'}
          </span>
        </div>
        <div className="product-card-copy cm-card-copy">
          <h3 className="cm-card-title">
            <i>{product.title.split(' ')[0]}</i>
            {product.title.split(' ').slice(1).length
              ? ' ' + product.title.split(' ').slice(1).join(' ')
              : ''}
          </h3>
          <p className="cm-card-descriptor">{descriptor}</p>
          <div className="cm-card-meta">
            <span className="cm-card-rule" aria-hidden />
            {price ? (
              <strong className="cm-card-price">{formatMoney(price)}</strong>
            ) : null}
          </div>
        </div>
      </Link>

      <style suppressHydrationWarning>{cardCss}</style>
    </article>
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

function formatTag(tag: string) {
  return tag
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const cardCss = `
.cm-card {
  min-width: 0;
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
  display: grid;
  gap: 10px;
  padding-top: 18px;
}

.cm-card-title {
  font-family: var(--serif);
  font-size: 1.35rem;
  font-weight: 400;
  letter-spacing: -0.015em;
  line-height: 1.15;
  margin: 0;
  color: var(--color-ink);
}

.cm-card-title i { font-style: italic; }

.cm-card-descriptor {
  color: var(--color-muted);
  font-size: 0.88rem;
  line-height: 1.5;
  margin: 0;
  max-width: 34ch;
}

.cm-card-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 4px;
}

.cm-card-rule {
  flex: 1;
  height: 1px;
  background: rgba(38,35,31,0.14);
  transform-origin: left;
  transform: scaleX(0.3);
  transition: transform 600ms var(--cm-ease);
}

.cm-card:hover .cm-card-rule,
.cm-card:focus-within .cm-card-rule { transform: scaleX(1); }

.cm-card-price {
  font-family: var(--sans);
  font-weight: 600;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink);
  white-space: nowrap;
}
`;
