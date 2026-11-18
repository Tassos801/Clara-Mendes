// Relative imports keep this module loadable by the plain-Node test runner.
import {
  blackFridayDiscountPercent,
  isBlackFridayExcludedHandle,
} from './blackFriday.ts';

/**
 * The quiet line under a product card's price during Black Friday week, so a
 * shopper sees which pieces are in the offer before opening them. It follows
 * the same rule as the product page line (blackFridayDiscountPercent) and
 * names no price: the discount is taken off in the cart.
 * - A type the offer covers in full: "20% off in your cart" / "10% off …".
 * - Art prints, where only the unframed variants are in: "Unframed: 20% off
 *   in your cart".
 * - Anything else (cards, book nooks, premium hoodies, Your Sky, whose
 *   framed 20 × 24 in is left out): null.
 */
export function blackFridayCardLine(
  productType: string | null | undefined,
  handle: string | null | undefined,
): string | null {
  if (isBlackFridayExcludedHandle(handle)) return null;
  const percent = blackFridayDiscountPercent(productType, null, handle);
  if (percent) return `${percent}% off in your cart`;
  if (productType?.trim().toLowerCase() === 'art prints')
    return 'Unframed: 20% off in your cart';
  return null;
}
