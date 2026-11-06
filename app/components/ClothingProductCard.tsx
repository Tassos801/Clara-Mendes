import {useState, type CSSProperties} from 'react';
import {Image} from '@shopify/hydrogen';
import {Link} from 'react-router';
import type {ClothingProduct} from '~/lib/clothing.server';
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
 * Swatches a card shows before "+N": five fit a phone card (44 px targets)
 * on two rows at most; the product page offers every colour.
 */
export const CARD_SWATCH_LIMIT = 5;

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
  const sizes = clothingSizeRange([product]);
  // One-size pieces (caps, beanies, totes) have no size to choose.
  const choosesSize =
    (product.options.find((option) => /^size$/i.test(option.name))?.optionValues
      .length ?? 0) > 1;
  const cta = choosesSize ? 'Choose size' : 'View piece';
  const titleId = `clothing-card-${product.handle}`;
  return (
    <article className="clothing-card" aria-labelledby={titleId}>
      {/* The title and "Choose size" links carry the name for keyboard and
          screen-reader users; the image link is a larger pointer target. */}
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
            sizes="(min-width: 1100px) 24vw, (min-width: 600px) 31vw, 46vw"
            loading={eager ? 'eager' : 'lazy'}
          />
        ) : (
          <span className="clothing-image-pending">Image coming soon</span>
        )}
      </Link>
      <div className="clothing-card-heading">
        <h3 id={titleId}>
          <Link to={href} prefetch="intent">
            {title}
          </Link>
        </h3>
        {price ? (
          <p className="clothing-card-price">
            {new Intl.NumberFormat('en-IE', {
              style: 'currency',
              currency: price.currencyCode,
            }).format(Number(price.amount))}
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
      <div className="clothing-card-footer">
        {sizes ? <span>Sizes {sizes}</span> : <span />}
        <Link
          to={href}
          prefetch="intent"
          className="clothing-card-cta"
          aria-label={`${cta}: ${title}${color ? `, ${color.name}` : ''}`}
        >
          {cta} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
