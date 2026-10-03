import {Link} from 'react-router';
import {curatedImages, type CuratedProduct} from '~/lib/curatedProducts';
import {bookNookFactLine, buildLevel, getBookNookTheme} from '~/lib/bookNooks';
import {formatMoney, type MoneyAmount} from '~/lib/money';

export type BookNookStorefrontProduct = {
  handle: string;
  title: string;
  availableForSale: boolean;
  priceRange: {minVariantPrice: MoneyAmount};
};

/**
 * A kit on the book nook page: the linen studio shot at rest, the lamplit
 * scene on hover or focus ("lights on"), and the facts kits are compared on.
 */
export function BookNookCard({
  nook,
  number,
  product,
  loading = 'lazy',
}: {
  nook: CuratedProduct;
  /** Catalogue number in registry order: "No. 01". */
  number: number;
  product: BookNookStorefrontProduct;
  loading?: 'eager' | 'lazy';
}) {
  const images = curatedImages(nook.handle);
  const studio = images[0];
  const lit = images[1] ?? images[0];
  const theme = getBookNookTheme(nook.theme);
  const level = buildLevel(nook.specs);
  const name = nook.name ?? product.title;

  return (
    <article className="nook-card">
      <Link
        className="nook-card__link"
        prefetch="intent"
        to={`/products/${product.handle}`}
      >
        <div className="nook-card__media">
          {studio ? (
            <img
              alt={studio.altText ?? name}
              className="nook-card__img"
              decoding="async"
              height={studio.height ?? undefined}
              loading={loading}
              src={studio.url}
              width={studio.width ?? undefined}
            />
          ) : null}
          {lit && lit !== studio ? (
            <img
              alt=""
              aria-hidden
              className="nook-card__img nook-card__img--lit"
              decoding="async"
              height={lit.height ?? undefined}
              loading="lazy"
              src={lit.url}
              width={lit.width ?? undefined}
            />
          ) : null}
          <span className="nook-card__switch" aria-hidden>
            <span /> Lights on
          </span>
        </div>
        <div className="nook-card__copy">
          <p className="nook-card__eyebrow">
            No. {String(number).padStart(2, '0')}
            {theme ? ` · ${theme.title}` : ''}
          </p>
          <h3>{name}</h3>
          <p className="nook-card__facts">{bookNookFactLine(nook.specs)}</p>
          <p className="nook-card__foot">
            <span>
              {product.availableForSale
                ? (level?.label ?? 'DIY kit')
                : 'Sold out'}
            </span>
            <strong>{formatMoney(product.priceRange.minVariantPrice)}</strong>
          </p>
        </div>
      </Link>
    </article>
  );
}
