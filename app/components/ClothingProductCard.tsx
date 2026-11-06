import {useState, type CSSProperties} from 'react';
import {Image} from '@shopify/hydrogen';
import {Link} from 'react-router';
import type {ClothingProduct} from '~/lib/clothing.server';
import {clothingLineTitle} from '~/lib/clothing';
import {
  clothingColorOptions,
  clothingDisplayImage,
  clothingDisplayPrice,
  clothingDisplayTitle,
  clothingProductUrl,
  clothingSizeRange,
  clothingSwatchBackground,
} from '~/lib/clothingPresentation';

/**
 * Swatches a card shows before "+N": four fit one row of a two-column
 * phone card (32 px targets); the product page offers every colour.
 */
export const CARD_SWATCH_LIMIT = 4;

/**
 * One garment: its line ("Free Abyss") over its name, so two lines' hoodies
 * never read the same; price and sizes on one line; colour swatches that
 * switch the image. The image and the title both open the product page.
 */
export function ClothingProductCard({
  product,
  eager = false,
}: {
  product: ClothingProduct;
  eager?: boolean;
}) {
  const [selected, setSelected] = useState(0);
  const colors = clothingColorOptions(product);
  const color = colors[selected];
  const image = clothingDisplayImage(product, selected);
  const price = clothingDisplayPrice(product, selected);
  const href = clothingProductUrl(product, selected);
  const title = clothingDisplayTitle(product);
  const line = clothingLineTitle(product);
  const sizes = clothingSizeRange([product]);
  const titleId = `clothing-card-${product.handle}`;
  return (
    <article className="clothing-card" aria-labelledby={titleId}>
      {/* The title link carries the name for keyboard and screen-reader
          users; the image link is a larger pointer target. */}
      <Link
        to={href}
        prefetch="intent"
        className="clothing-card-image"
        tabIndex={-1}
        aria-hidden="true"
      >
        {image ? (
          <Image
            data={image}
            alt=""
            aspectRatio="4/5"
            sizes="(min-width: 1024px) 23vw, (min-width: 600px) 31vw, 46vw"
            loading={eager ? 'eager' : 'lazy'}
          />
        ) : (
          <span className="clothing-image-pending">Image coming soon</span>
        )}
      </Link>
      <div className="clothing-card-heading">
        {line ? (
          <p className="clothing-card-line" aria-hidden="true">
            {line}
          </p>
        ) : null}
        <h3 id={titleId}>
          <Link to={href} prefetch="intent">
            {title}
            {line ? <span className="sr-only">, {line}</span> : null}
          </Link>
        </h3>
        {price || sizes ? (
          <p className="clothing-card-meta">
            {price ? (
              <span className="clothing-card-price">
                {new Intl.NumberFormat('en-IE', {
                  style: 'currency',
                  currency: price.currencyCode,
                }).format(Number(price.amount))}
              </span>
            ) : null}
            {sizes ? (
              <span className="clothing-card-sizes">
                <span className="sr-only">Sizes </span>
                {sizes}
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
      {colors.length === 1 ? (
        // One colour: name it, with no swatch button to choose.
        <p className="clothing-colors clothing-colors--single">
          {(() => {
            const tone = clothingSwatchBackground(
              colors[0].name,
              colors[0].swatch?.color,
              product.productType,
            );
            return tone ? (
              <span
                className="clothing-swatch-dot"
                style={{background: tone}}
                aria-hidden="true"
              />
            ) : null;
          })()}
          <span className="clothing-color-name">{colors[0].name}</span>
        </p>
      ) : colors.length > 1 ? (
        <div
          className="clothing-colors"
          role="group"
          aria-label={`Colour for ${title}`}
        >
          {colors.slice(0, CARD_SWATCH_LIMIT).map((item, index) => {
            const tone = clothingSwatchBackground(
              item.name,
              item.swatch?.color,
              product.productType,
            );
            return (
              <button
                key={item.name}
                type="button"
                aria-pressed={selected === index}
                aria-label={item.name}
                title={item.name}
                onClick={() => setSelected(index)}
                className={`clothing-swatch${tone ? '' : ' clothing-swatch--text'}`}
                style={tone ? ({'--swatch': tone} as CSSProperties) : undefined}
              >
                {tone ? <span aria-hidden="true" /> : item.name}
              </button>
            );
          })}
          {colors.length > CARD_SWATCH_LIMIT ? (
            <Link
              to={href}
              prefetch="intent"
              className="clothing-swatch-more"
              aria-label={`${colors.length} colours: see all on ${title}`}
            >
              +{colors.length - CARD_SWATCH_LIMIT}
            </Link>
          ) : null}
          <span className="clothing-color-name" aria-live="polite">
            {color?.name}
          </span>
        </div>
      ) : null}
    </article>
  );
}
