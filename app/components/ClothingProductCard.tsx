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
  clothingSwatchBackground,
} from '~/lib/clothingPresentation';
import {clothingCategory} from '~/lib/clothing';

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
  return (
    <article className="clothing-card">
      <Link
        to={href}
        prefetch="intent"
        className="clothing-card-image"
        aria-label={`View ${title}${color ? ` in ${color.name}` : ''}`}
      >
        {image ? (
          <Image
            data={image}
            alt={image.altText || `${title}${color ? ` in ${color.name}` : ''}`}
            sizes="(min-width: 1100px) 25vw, (min-width: 600px) 33vw, 50vw"
            loading={eager ? 'eager' : 'lazy'}
          />
        ) : (
          <span className="clothing-image-pending">Image coming soon</span>
        )}
        <span className="clothing-card-view">
          View piece <span aria-hidden="true">↗</span>
        </span>
      </Link>
      <div className="clothing-card-meta">
        <span>{clothingCategory(product)?.label}</span>
        {price ? (
          <span>
            {new Intl.NumberFormat('en', {
              style: 'currency',
              currency: price.currencyCode,
            }).format(Number(price.amount))}
          </span>
        ) : null}
      </div>
      <h3>
        <Link to={href} prefetch="intent">
          {title}
        </Link>
      </h3>
      {colors.length > 0 ? (
        <div
          className="clothing-colors"
          role="group"
          aria-label={`${title} colour`}
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
                aria-label={`${item.name} — ${title}`}
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
    </article>
  );
}
