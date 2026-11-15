import {formatMoney, type MoneyAmount} from '~/lib/money';

// Cart lines added optimistically have no cost yet, so the price is optional
// and the box keeps its height until the real line arrives.
export function ProductPrice({
  compareAtPrice,
  price,
}: {
  compareAtPrice?: MoneyAmount | null;
  price?: MoneyAmount | null;
}) {
  // Only a compare-at price above the current one is a saving; Shopify keeps
  // stale or equal compare-at values that would otherwise read as a sale.
  const onSale =
    price &&
    compareAtPrice &&
    compareAtPrice.currencyCode === price.currencyCode &&
    Number(compareAtPrice.amount) > Number(price.amount);

  return (
    <div aria-label="Price" className="product-price" role="group">
      {!price ? (
        <span>&nbsp;</span>
      ) : onSale ? (
        <span className="product-price-on-sale">
          <span className="sr-only">Sale price </span>
          {formatMoney(price)}{' '}
          <s>
            <span className="sr-only">Regular price </span>
            {formatMoney(compareAtPrice)}
          </s>
        </span>
      ) : (
        formatMoney(price)
      )}
    </div>
  );
}
