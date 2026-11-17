/**
 * Line-level discounts in the cart (Storefront API `CartLine.discountAllocations`).
 *
 * Automatic product discounts (the Black Friday ones, say) are allocated to
 * the lines, not to the cart: each allocation carries the discount's title
 * and the amount it took off. A line's `cost.subtotalAmount` is its price
 * before line-level discounts and `cost.totalAmount` after them, and the
 * cart's `cost.subtotalAmount` already has them taken off (only cart-level
 * discounts sit outside it; CartSummary shows those as their own row).
 */

type Money = {amount: string; currencyCode: string};

export type LineDiscountAllocationLike = {
  discountedAmount?: Money | null;
  /** CartAutomaticDiscountAllocation and CartCustomDiscountAllocation. */
  title?: string | null;
  /** CartCodeDiscountAllocation. */
  code?: string | null;
};

export type CartLineDiscountLike = {
  discountAllocations?: ReadonlyArray<LineDiscountAllocationLike | null> | null;
  cost?: {
    subtotalAmount?: Money | null;
    totalAmount?: Money | null;
  } | null;
};

export type LineDiscount = {label: string; amount: Money};

/**
 * One entry per discount on the line (same label summed), largest first.
 * Zero and malformed amounts are dropped, so an empty list means "no
 * discount to show".
 */
export function cartLineDiscounts(line: CartLineDiscountLike): LineDiscount[] {
  const byLabel = new Map<string, LineDiscount>();
  for (const allocation of line.discountAllocations ?? []) {
    const amount = allocation?.discountedAmount;
    const value = Number(amount?.amount);
    if (!amount || !Number.isFinite(value) || value <= 0) continue;
    const label =
      allocation?.title?.trim() ||
      (allocation?.code?.trim() ? `Code ${allocation.code.trim()}` : '') ||
      'Discount';
    const existing = byLabel.get(label);
    if (existing && existing.amount.currencyCode === amount.currencyCode) {
      existing.amount = {
        ...existing.amount,
        amount: (Number(existing.amount.amount) + value).toFixed(2),
      };
    } else if (!existing) {
      byLabel.set(label, {
        label,
        amount: {...amount, amount: value.toFixed(2)},
      });
    }
  }
  return [...byLabel.values()].sort(
    (a, b) => Number(b.amount.amount) - Number(a.amount.amount),
  );
}

/**
 * The line's price before its discounts, when it differs from the total:
 * what the cart shows struck through beside the reduced price.
 */
export function cartLineOriginalTotal(
  line: CartLineDiscountLike,
): Money | null {
  const subtotal = line.cost?.subtotalAmount;
  const total = line.cost?.totalAmount;
  if (!subtotal || !total) return null;
  if (subtotal.currencyCode !== total.currencyCode) return null;
  return Number(subtotal.amount) > Number(total.amount) ? subtotal : null;
}

/** Everything the lines' discounts took off, or null when nothing. */
export function cartLineSavings(
  lines: ReadonlyArray<CartLineDiscountLike | null | undefined>,
): Money | null {
  let currencyCode: string | null = null;
  let sum = 0;
  for (const line of lines) {
    if (!line) continue;
    for (const discount of cartLineDiscounts(line)) {
      currencyCode ??= discount.amount.currencyCode;
      if (discount.amount.currencyCode !== currencyCode) continue;
      sum += Number(discount.amount.amount);
    }
  }
  return currencyCode && sum > 0
    ? {amount: sum.toFixed(2), currencyCode}
    : null;
}
