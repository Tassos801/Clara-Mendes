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
      {colors.length > 0 ? (
        <div
          className="clothing-colors"
          role="group"
          aria-label={`Colour for ${title}`}
        >
          {colors.map((item, index) => {
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
          aria-label={`Choose size: ${title}${color ? `, ${color.name}` : ''}`}
        >
          Choose size <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
