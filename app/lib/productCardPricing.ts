// Relative imports (and none at all here) keep this module loadable by the
// plain-Node test runner, which cannot resolve the Vite "~" alias.

type MoneyAmount = {
  amount: string;
  currencyCode: string;
};

type PricedVariant = {
  availableForSale?: boolean;
  price?: MoneyAmount | null;
};

export type CardPricing = {
  /** Lowest price a shopper can buy right now (null when unknown). */
  price: MoneyAmount | null;
  /** True when more than one distinct purchasable price exists. */
  hasRange: boolean;
};

/**
 * Derives the price a product card may advertise.
 *
 * Guard-safety: staged-but-unreleased size variants physically exist in
 * Shopify at their full launch price with availableForSale=false (tracked,
 * zero stock, DENY) for the whole stage→activate window and again after a
 * pause. priceRange.min/maxVariantPrice spans those unpurchasable prices,
 * so cards derive "From" pricing only from variants that are actually
 * availableForSale. Raw priceRange.minVariantPrice is used solely as a
 * fallback when no variant sample was fetched at all.
 */
export function deriveCardPricing(product: {
  priceRange?: {minVariantPrice?: MoneyAmount | null} | null;
  sizeVariants?: {nodes?: Array<PricedVariant | null> | null} | null;
  variants?: {nodes?: Array<PricedVariant | null> | null} | null;
}): CardPricing {
  const sample = product.sizeVariants?.nodes ?? product.variants?.nodes ?? [];
  const released: MoneyAmount[] = [];
  for (const variant of sample) {
    if (!variant || variant.availableForSale !== true) continue;
    const price = variant.price;
    if (!price || !Number.isFinite(Number(price.amount))) continue;
    released.push(price);
  }

  if (released.length === 0) {
    return {
      price: product.priceRange?.minVariantPrice ?? null,
      hasRange: false,
    };
  }

  let min = released[0];
  const distinct = new Set<string>();
  for (const price of released) {
    distinct.add(`${Number(price.amount)} ${price.currencyCode}`);
    if (Number(price.amount) < Number(min.amount)) min = price;
  }

  return {price: min, hasRange: distinct.size > 1};
}

/** Formats a price exactly like the product page (Intl currency, en-US). */
export function formatCardPrice(price?: MoneyAmount | null): string | null {
  if (!price) return null;
  const amount = Number(price.amount);
  if (!Number.isFinite(amount)) return null;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currencyCode,
  }).format(amount);
}

export type CardQuickAdd = 'add' | 'choose' | 'unavailable';

/**
 * What a card's quick-add control may do with its first variant.
 *
 * - `add`: one purchasable variant, or an art print, whose variants are
 *   sizes of the artwork on the card; the first is the "From" size and the
 *   cart names it.
 * - `choose`: the variants are different things (an artwork, a phone model)
 *   or the first one is sold out while others are not, so adding the first
 *   would put something the shopper never chose in the cart; the control
 *   opens the product page instead.
 * - `unavailable`: nothing on the card can be bought.
 */
export function cardQuickAddMode(
  product: {
    productType?: string | null;
    sizeVariants?: {nodes?: Array<PricedVariant | null> | null} | null;
    variants?: {nodes?: Array<PricedVariant | null> | null} | null;
  },
  firstVariant?: PricedVariant | null,
): CardQuickAdd {
  const sample = product.sizeVariants?.nodes ?? product.variants?.nodes ?? [];
  const purchasable = sample.filter(
    (variant) => variant?.availableForSale === true,
  ).length;
  const firstBuyable = Boolean(
    firstVariant && firstVariant.availableForSale !== false,
  );

  if (purchasable === 0)
    return firstBuyable && !sample.length ? 'add' : 'unavailable';
  if (!firstBuyable) return 'choose';
  if (purchasable === 1) return 'add';
  return product.productType?.trim().toLowerCase() === 'art prints'
    ? 'add'
    : 'choose';
}

/** Full card label: "From €29.99" when a purchasable range exists. */
export function formatCardPriceLabel(pricing: CardPricing): string | null {
  const formatted = formatCardPrice(pricing.price);
  if (!formatted) return null;
  return pricing.hasRange ? `From ${formatted}` : formatted;
}
