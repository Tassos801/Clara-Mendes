/**
 * Presentation rules for cart lines and the checkout action, kept free of
 * React so the node tests can pin them. Nothing here changes what is sent to
 * Shopify: line ids, merchandise ids, quantities and attributes are untouched.
 */

type CartImage = {
  altText?: string | null;
  height?: number | null;
  id?: string | null;
  url: string;
  width?: number | null;
};

type SelectedOption = {name: string; value: string};

/**
 * Art print variants carry a room scene for their size, where an 8 × 10 is a
 * few pixels wide on the wall; the flat artwork is what a shopper recognises
 * in a thumbnail. Every other product keeps its variant image (a phone case
 * or canvas variant image shows the chosen artwork).
 */
export function cartLineThumbnail({
  curatedImage,
  featuredImage,
  productType,
  variantImage,
}: {
  curatedImage?: CartImage | null;
  featuredImage?: CartImage | null;
  productType?: string | null;
  variantImage?: CartImage | null;
}): CartImage | null {
  if (curatedImage) return curatedImage;
  if (productType?.trim().toLowerCase() === 'art prints' && featuredImage) {
    return featuredImage;
  }
  return variantImage ?? featuredImage ?? null;
}

/**
 * A thumbnail-sized URL. Shopify's image CDN resizes on `width`; files the
 * storefront serves itself (`/images/...`) have no resizer and pass through.
 */
export function sizedImageUrl(url: string, width: number) {
  if (!url.startsWith('https://cdn.shopify.com/')) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('width', String(Math.round(width)));
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Options worth showing under a line; Shopify's "Default Title" is noise. */
export function visibleCartOptions(
  options: readonly SelectedOption[] | null | undefined,
): SelectedOption[] {
  return (options ?? []).filter(
    (option) =>
      option.value &&
      !(option.name === 'Title' && option.value === 'Default Title'),
  );
}

export function cartItemCountLabel(count: number) {
  return `${count} ${count === 1 ? 'item' : 'items'}`;
}

/**
 * A line Shopify still holds but can no longer sell (sold out or removed
 * since it was added). Optimistic lines are never flagged: they have not
 * been confirmed yet.
 */
export function isCartLineUnavailable(line: {
  isOptimistic?: boolean;
  merchandise?: {availableForSale?: boolean | null} | null;
}) {
  return !line.isOptimistic && line.merchandise?.availableForSale === false;
}

/** Quantity steps stay inside Shopify's accepted range. */
export function cartQuantitySteps(quantity: number) {
  const current = Math.max(0, Math.round(quantity));
  return {
    canDecrease: current > 1,
    decrease: Math.max(1, current - 1),
    increase: Math.min(CART_LINE_MAX_QUANTITY, current + 1),
    canIncrease: current < CART_LINE_MAX_QUANTITY,
  };
}

export const CART_LINE_MAX_QUANTITY = 99;

/**
 * How long the checkout action stays busy before re-enabling itself if the
 * browser never leaves (a blocked navigation, a stalled network).
 */
export const CHECKOUT_PENDING_TIMEOUT_MS = 8000;
