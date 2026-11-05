export type MoneyAmount = {amount: string; currencyCode: string};

export function formatMoney(price: MoneyAmount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currencyCode,
  }).format(Number(price.amount));
}

/** The lowest price among the variants on sale, or null if none is. */
export function cheapestPrice(
  variants: ReadonlyArray<{availableForSale: boolean; price: MoneyAmount}>,
): MoneyAmount | null {
  const prices = variants
    .filter((variant) => variant.availableForSale)
    .map((variant) => variant.price)
    .filter((price) => Number.isFinite(Number(price.amount)));
  if (!prices.length) return null;
  return prices.reduce((low, price) =>
    Number(price.amount) < Number(low.amount) ? price : low,
  );
}
