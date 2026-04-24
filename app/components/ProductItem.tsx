import {Link} from 'react-router';

type StorefrontProductListItem = {
  id: string;
  handle: string;
  title: string;
  featuredImage?: {
    altText?: string | null;
    url: string;
  } | null;
  priceRange?: {
    minVariantPrice?: {
      amount: string;
      currencyCode: string;
    };
  };
};

export function ProductItem({
  product,
  loading,
}: {
  product: StorefrontProductListItem;
  loading?: 'eager' | 'lazy';
}) {
  const image = product.featuredImage;
  const price = product.priceRange?.minVariantPrice;

  return (
    <Link
      className="product-item"
      key={product.id}
      prefetch="intent"
      to={`/products/${product.handle}`}
    >
      {image ? (
        <img
          alt={image.altText || product.title}
          loading={loading}
          src={image.url}
        />
      ) : null}
      <h4>{product.title}</h4>
      {price ? (
        <small>
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: price.currencyCode,
          }).format(Number(price.amount))}
        </small>
      ) : null}
    </Link>
  );
}
