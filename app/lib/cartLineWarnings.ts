/**
 * Shopify never refuses a line for stock. `cartLinesAdd` keeps the line,
 * clamps its quantity to what is available (down to zero) and reports a
 * `MERCHANDISE_OUT_OF_STOCK` or `MERCHANDISE_NOT_ENOUGH_STOCK` warning whose
 * `target` is the affected line, while `userErrors` stays empty. Without this
 * the storefront reads a sold-out add as a success and the drawer opens on a
 * €0.00 line at quantity zero.
 *
 * The cart handler's mutation results carry Hydrogen's minimal cart fragment
 * (id, totalQuantity, checkoutUrl — no lines), so the warning's `target` is
 * the only handle on the empty line. When a result does include lines, the
 * zero quantity is checked as well.
 *
 * Framework-free (relative imports only) so the Node test runner can cover it.
 */
export type CartWarningLike = {
  code?: string | null;
  message?: string | null;
  target?: string | null;
};

export type CartLineLike = {id: string; quantity: number};

export type CartLinesResultLike = {
  cart?: {
    id?: string | null;
    lines?: {nodes?: CartLineLike[] | null} | null;
  } | null;
  warnings?: CartWarningLike[] | null;
};

/** The one stock warning that leaves the line at quantity zero. */
export const OUT_OF_STOCK_WARNING_CODE = 'MERCHANDISE_OUT_OF_STOCK';

/**
 * Lines Shopify flagged as out of stock. Ids are compared without their
 * `?cart=` query so a differently keyed `target` still matches a line.
 */
export function findEmptyWarnedLineIds(
  result: CartLinesResultLike | null | undefined,
): string[] {
  const targets = (result?.warnings ?? [])
    .filter(
      (warning) =>
        warning?.code === OUT_OF_STOCK_WARNING_CODE &&
        typeof warning.target === 'string' &&
        warning.target.length > 0,
    )
    .map((warning) => warning.target as string);
  if (targets.length === 0) return [];

  const lines = result?.cart?.lines?.nodes;
  if (!Array.isArray(lines)) return Array.from(new Set(targets));

  const keys = new Set(targets.map(lineKey));
  return lines
    .filter((line) => line.quantity === 0 && keys.has(lineKey(line.id)))
    .map((line) => line.id);
}

/**
 * Removes the zero-quantity lines a mutation left behind and returns the
 * result with the corrected cart. The warnings stay on the result so the
 * form that submitted can still tell the customer what happened. Any failure
 * to remove is logged and the original result returned; the customer then
 * sees the message beside a line they can remove by hand.
 */
export async function removeUnfulfilledLines<
  Result extends CartLinesResultLike,
>({
  result,
  removeLines,
  onError = logRemoveError,
}: {
  result: Result;
  removeLines: (lineIds: string[]) => Promise<
    | {cart?: unknown; errors?: unknown[] | null; userErrors?: unknown[] | null}
    | null
    | undefined
  >;
  onError?: (error: unknown) => void;
}): Promise<Result> {
  const lineIds = findEmptyWarnedLineIds(result);
  if (lineIds.length === 0) return result;

  try {
    const removed = await removeLines(lineIds);
    if (
      !removed?.cart ||
      removed.errors?.length ||
      removed.userErrors?.length
    ) {
      onError(
        new Error(
          `Cart line removal was refused: ${JSON.stringify({
            errors: removed?.errors,
            userErrors: removed?.userErrors,
          })}`,
        ),
      );
      return result;
    }

    return {...result, cart: removed.cart as Result['cart']};
  } catch (error) {
    onError(error);
    return result;
  }
}

function lineKey(id: string) {
  return id.split('?')[0];
}

function logRemoveError(error: unknown) {
  console.warn('Unable to remove out-of-stock cart lines.', error);
}

export type CartWarnedLine = CartLineLike & {
  merchandise?: {id?: string | null} | null;
};

export type CartWarningRelevance = {
  /** The submitted `CartForm` action, e.g. `LinesAdd`. */
  action: string;
  warnings: CartWarningLike[] | null | undefined;
  /** Lines the customer submitted (`LinesUpdate`, `LinesRemove`). */
  lineIds?: string[];
  /** Variants the customer submitted (`LinesAdd`). */
  merchandiseIds?: string[];
  /** The cart's lines as the mutation returned them, when known. */
  lines?: CartWarnedLine[] | null;
};

/**
 * Which warning codes concern a given action. Shopify attaches cart-level
 * warnings to every mutation for as long as the condition holds: a discount
 * code kept with `applicable: false` yields `DISCOUNT_NOT_FOUND` on each
 * later add, quantity change or gift-card change. Forwarding those to the
 * form that submitted would make a successful add look refused, so only
 * warnings about the submitted change pass. The discount form reads the
 * cart's own `discountCodes[].applicable` instead, and attribute updates
 * never surface warnings.
 */
const RELEVANT_WARNING_PREFIXES: Record<string, string[]> = {
  LinesAdd: ['MERCHANDISE_'],
  LinesUpdate: ['MERCHANDISE_'],
  LinesRemove: ['MERCHANDISE_'],
  GiftCardCodesAdd: ['PAYMENTS_GIFT_CARDS_'],
  GiftCardCodesRemove: ['PAYMENTS_GIFT_CARDS_'],
  BuyerIdentityUpdate: ['DUPLICATE_DELIVERY_ADDRESS'],
};

/**
 * The warnings a form may show for the change it submitted. Stock warnings
 * name a line: with the submitted line ids (update, remove) or the submitted
 * variants and the returned lines (add), only those about the customer's
 * own lines pass; a targeted line that is no longer in the cart (already
 * removed as empty) still counts. Without line information, every stock
 * warning passes.
 */
export function relevantCartWarnings({
  action,
  warnings,
  lineIds,
  merchandiseIds,
  lines,
}: CartWarningRelevance): CartWarningLike[] {
  const prefixes = RELEVANT_WARNING_PREFIXES[action] ?? [];
  if (!warnings?.length || prefixes.length === 0) return [];

  const submittedLines = new Set((lineIds ?? []).map(lineKey));
  const submittedVariants = new Set(merchandiseIds ?? []);
  const variantByLine = new Map(
    (lines ?? []).map((line) => [lineKey(line.id), line.merchandise?.id ?? null]),
  );

  return warnings.filter((warning) => {
    const code = warning?.code ?? '';
    if (!prefixes.some((prefix) => code.startsWith(prefix))) return false;
    if (!code.startsWith('MERCHANDISE_')) return true;

    const target =
      typeof warning.target === 'string' ? lineKey(warning.target) : null;
    if (!target) return true;
    if (submittedLines.size > 0) return submittedLines.has(target);
    if (submittedVariants.size > 0 && variantByLine.size > 0) {
      const variant = variantByLine.get(target);
      return variant ? submittedVariants.has(variant) : true;
    }
    return true;
  });
}
