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
  return (
    <div aria-label="Price" className="product-price" role="group">
      {!price ? (
        <span>&nbsp;</span>
      ) : compareAtPrice ? (
        <span className="product-price-on-sale">
          {formatMoney(price)} <s>{formatMoney(compareAtPrice)}</s>
        </span>
      ) : (
        formatMoney(price)
      )}
    </div>
  );
}
