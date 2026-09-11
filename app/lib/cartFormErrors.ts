const DEFAULT_CART_ERROR = 'We could not update the cart. Please try again.';

type DiscountCodeLike = {code: string; applicable: boolean};

/**
 * Customer-facing messages from a cart action response.
 *
 * Hydrogen's cart handler reports problems on three channels: `errors` (the
 * GraphQL request itself failed), `userErrors` (Shopify refused the change:
 * unknown merchandise, invalid input) and `warnings` (Shopify changed less
 * than asked: a sold-out line kept at quantity zero, a quantity clamped to
 * stock, gift cards unavailable). Each one means the cart did not end up the
 * way the customer asked, so all three are surfaced.
 */
export function getCartFormErrorMessages(data: unknown): string[] {
  if (!data || typeof data !== 'object') return [];

  const {errors, userErrors, warnings} = data as {
    errors?: unknown;
    userErrors?: unknown;
    warnings?: unknown;
  };
  const messages = [
    ...(Array.isArray(errors) ? errors : []),
    ...(Array.isArray(userErrors) ? userErrors : []),
    ...(Array.isArray(warnings) ? warnings : []),
  ].map(formatCartFormError);

  return Array.from(new Set(messages));
}

/**
 * Discount codes Shopify kept on the cart without applying them. An unknown
 * code, or one whose conditions the cart does not meet, is not a `userError`;
 * the only signal is `applicable: false` on the returned cart.
 */
export function getInapplicableDiscountMessages(
  discountCodes: DiscountCodeLike[] | null | undefined,
): string[] {
  if (!Array.isArray(discountCodes)) return [];

  return discountCodes
    .filter((discount) => discount?.code && discount.applicable === false)
    .map(
      (discount) =>
        `“${discount.code.toUpperCase()}” can’t be applied to this cart.`,
    );
}

function formatCartFormError(error: unknown) {
  if (typeof error === 'string' && error.trim()) return error;

  if (error && typeof error === 'object') {
    const message = (error as {message?: unknown}).message;
    if (typeof message === 'string' && message.trim()) return message;
  }

  return DEFAULT_CART_ERROR;
}
