import {formatMoney, type MoneyAmount} from '~/lib/money';

export function ProductPrice({
  compareAtPrice,
  price,
}: {
  compareAtPrice?: MoneyAmount | null;
  price: MoneyAmount;
}) {
  return (
    <div className="product-price">
      {compareAtPrice ? (
        <span className="product-price-on-sale">
          {formatMoney(price)} <s>{formatMoney(compareAtPrice)}</s>
        </span>
      ) : (
        formatMoney(price)
      )}
    </div>
  );
}
