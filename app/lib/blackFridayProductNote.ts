import {
  blackFridayDiscountPercent,
  isBlackFridayExcludedHandle,
} from './blackFriday.ts';

/**
 * The product-page note for a selected variant the Black Friday discounts
 * leave out, where the sitewide line ("20% off … prints, 10% off clothing")
 * would lead a buyer to expect one: a framed art print, a framed 20 × 24 in
 * Your Sky map, an acrylic or metal print, a hat or a premium hoodie. Null
 * for a discounted variant, while no variant is chosen, and for products
 * the sitewide line never names (cards, book nooks, …). The rules stay
 * app/lib/blackFriday.ts's; this only words them.
 */
export function blackFridayExclusionNote(
  productType: string | null | undefined,
  variantTitle: string | null | undefined,
  handle?: string | null,
): string | null {
  if (!variantTitle?.trim()) return null;
  if (blackFridayDiscountPercent(productType, variantTitle, handle))
    return null;
  const type = productType?.trim().toLowerCase() ?? '';
  if (type === 'art prints')
    return 'Not in the Black Friday offer: the 20% covers unframed prints.';
  if (type === 'personalised art')
    return 'Not in the Black Friday offer: the 20% covers every map except the framed 20 × 24 in.';
  if (
    isBlackFridayExcludedHandle(handle) ||
    ['acrylic prints', 'metal prints', 'hats'].includes(type)
  )
    return 'Not in the Black Friday offer.';
  return null;
}
