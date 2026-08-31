import {Money} from '@shopify/hydrogen';
import type {CurrencyCode} from '@shopify/hydrogen/storefront-api-types';
import {useMemo, useState} from 'react';
import {Link} from 'react-router';
import {AddToCartButton} from '~/components/AddToCartButton';
import {
  PRINT_SIZE_SPECS,
  type PrintSizeKey,
} from '~/lib/productSizePresentation';
import {STOREFRONT_ORIGIN} from '~/lib/storefrontBasics';
import {
  WALL_GUIDE_SIZES,
  wallGuideFileName,
  wallSetLinesForSize,
  wallSetVariantForSize,
  type WallSet,
  type WallSetVariant,
} from '~/lib/wallSets';

export type WallSetPurchaseProduct = {
  id: string;
  handle: string;
  title: string;
  vendor: string;
  productType: string;
  featuredImage: {url: string; altText?: string | null} | null;
  variants: WallSetVariant[];
};

/**
 * "Buy the complete wall": one size for all three prints, added as three
 * ordinary cart lines in a single submit, plus the free hanging guide.
 * Renders only sizes every member print has released — the invariant lives
 * in `wallSetLinesForSize`.
 */
export function WallSetPurchase({
  set,
  products,
}: {
  set: WallSet;
  products: WallSetPurchaseProduct[];
}) {
  const bySize = useMemo(
    () =>
      Object.fromEntries(
        WALL_GUIDE_SIZES.map((size) => [
          size,
          wallSetLinesForSize(products, size),
        ]),
      ) as Record<PrintSizeKey, ReturnType<typeof wallSetLinesForSize>>,
    [products],
  );
  const firstAvailable = WALL_GUIDE_SIZES.find((size) => bySize[size]);
  const [size, setSize] = useState<PrintSizeKey>(
    bySize['16x20'] ? '16x20' : (firstAvailable ?? '16x20'),
  );

  const built = bySize[size];
  const analytics = useMemo(() => {
    if (!built) return undefined;
    return {
      products: products.flatMap((product) => {
        const variant = wallSetVariantForSize(product, size);
        if (!variant) return [];
        return [
          {
            productGid: product.id,
            variantGid: variant.id,
            name: product.title,
            variantName: PRINT_SIZE_SPECS[size].label,
            brand: product.vendor || 'Clara Mendes',
            price: variant.price.amount,
            currency: variant.price.currencyCode,
            quantity: 1,
            category: product.productType || undefined,
          },
        ];
      }),
    };
  }, [built, products, size]);

  if (!firstAvailable || products.length !== 3) return null;

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: set.name,
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: product.title,
      url: `${STOREFRONT_ORIGIN}/products/${product.handle}`,
    })),
  };

  return (
    <section className="wall-set" aria-label={`Buy ${set.name}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: JSON.stringify(itemList)}}
      />
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Buy the complete wall</p>
          <h2>{set.name}</h2>
          <p className="wall-set-story">{set.story}</p>
        </div>
      </div>

      <div className="wall-set-row" role="list">
        {products.map((product, index) => (
          <Link
            className="wall-set-print"
            key={product.id}
            role="listitem"
            to={`/products/${product.handle}`}
            prefetch="intent"
          >
            {product.featuredImage ? (
              <img
                alt={product.featuredImage.altText ?? product.title}
                loading="lazy"
                src={product.featuredImage.url}
                width="640"
                height="800"
              />
            ) : null}
            <span className="wall-set-print-name">
              {index + 1} · {product.title.replace(/\s+Art Print$/i, '')}
            </span>
          </Link>
        ))}
      </div>

      <div className="wall-set-controls">
        <fieldset className="wall-set-sizes">
          <legend className="eyebrow">One size for the whole wall</legend>
          <div className="wall-set-size-options">
            {WALL_GUIDE_SIZES.map((option) => {
              const available = Boolean(bySize[option]);
              return (
                <button
                  aria-pressed={size === option}
                  className={`wall-set-size${size === option ? ' is-active' : ''}`}
                  disabled={!available}
                  key={option}
                  onClick={() => setSize(option)}
                  type="button"
                >
                  <span>{PRINT_SIZE_SPECS[option].label}</span>
                  <span className="wall-set-size-cm">
                    {PRINT_SIZE_SPECS[option].centimeters}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="wall-set-action">
          {built ? (
            <p className="wall-set-total">
              <Money
                as="span"
                data={{
                  amount: built.total.amount,
                  currencyCode: built.total.currencyCode as CurrencyCode,
                }}
              />{' '}
              · three prints
            </p>
          ) : null}
          <AddToCartButton
            analytics={analytics}
            className="primary-button wall-set-add"
            disabled={!built}
            lines={built?.lines ?? []}
            pendingChildren="Adding the wall…"
          >
            Add the wall to cart — 3 prints
          </AddToCartButton>
          <a
            className="text-link wall-set-guide"
            href={`/api/hanging-guide/${wallGuideFileName(set.slug, size)}`}
            rel="noreferrer"
            target="_blank"
          >
            Download the free hanging guide (PDF)
          </a>
        </div>
      </div>

      <style suppressHydrationWarning>{wallSetCss}</style>
    </section>
  );
}

const wallSetCss = `
.wall-set {
  margin-top: clamp(34px, 5vw, 64px);
  padding: clamp(22px, 3vw, 34px);
  border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
  border-radius: 4px;
}

.wall-set-story {
  margin-top: 6px;
  max-width: 56ch;
  opacity: 0.82;
}

.wall-set-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: clamp(10px, 2vw, 22px);
  margin-top: clamp(16px, 2.5vw, 26px);
}

.wall-set-print {
  display: block;
  text-decoration: none;
  color: inherit;
}

.wall-set-print img {
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 5;
  object-fit: cover;
  display: block;
}

.wall-set-print-name {
  display: block;
  margin-top: 8px;
  font-size: 0.82rem;
  letter-spacing: 0.02em;
}

.wall-set-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 22px;
  margin-top: clamp(18px, 2.5vw, 28px);
}

.wall-set-sizes {
  border: 0;
  margin: 0;
  padding: 0;
}

.wall-set-size-options {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.wall-set-size {
  font: inherit;
  color: inherit;
  background: transparent;
  border: 1px solid color-mix(in srgb, currentColor 32%, transparent);
  border-radius: 3px;
  padding: 8px 14px;
  cursor: pointer;
  display: grid;
  gap: 2px;
  text-align: left;
}

.wall-set-size.is-active {
  border-color: currentColor;
}

.wall-set-size:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.wall-set-size-cm {
  font-size: 0.72rem;
  opacity: 0.7;
}

.wall-set-action {
  display: grid;
  gap: 10px;
  justify-items: start;
  min-width: min(320px, 100%);
}

.wall-set-total {
  margin: 0;
  font-size: 1.05rem;
}

.wall-set-add {
  width: 100%;
}

.wall-set-guide {
  font-size: 0.85rem;
}

@media (max-width: 720px) {
  .wall-set-controls {
    align-items: stretch;
  }

  .wall-set-action {
    width: 100%;
  }
}
`;
