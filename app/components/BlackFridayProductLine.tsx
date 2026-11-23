import {
  blackFridayDiscountPercent,
  blackFridayProductLine,
} from '~/lib/blackFriday';
import {blackFridayExclusionNote} from '~/lib/blackFridayProductNote';
import {useBlackFridayWeek} from '~/lib/useBlackFridayWeek';

/**
 * One line near a product page's price during Black Friday week, for a
 * selected variant the automatic discounts cover. The price shown stays the
 * product's own: the discount is taken off in the cart (app/lib/blackFriday.ts).
 * The window comes from the root loader's request-time check, and the line
 * also stops in a tab left open past the end (useBlackFridayWeek). A variant
 * the sitewide line seems to cover but the discounts leave out (a framed
 * print, a premium hoodie) says so, so the cart holds no surprise.
 */
export function BlackFridayProductLine({
  handle,
  productType,
  variantTitle,
}: {
  /** The product's handle: a few products are left out by handle. */
  handle?: string | null;
  productType?: string | null;
  /** The selected variant's title; null while none is selected. */
  variantTitle?: string | null;
}) {
  if (!useBlackFridayWeek()) return null;
  const percent = blackFridayDiscountPercent(productType, variantTitle, handle);
  const line = percent
    ? blackFridayProductLine(percent)
    : blackFridayExclusionNote(productType, variantTitle, handle);
  if (!line) return null;
  return (
    <p
      className={`product-black-friday-line${
        percent ? '' : ' product-black-friday-line--excluded'
      }`}
    >
      {line}
      <style suppressHydrationWarning>{css}</style>
    </p>
  );
}

const css = `
.product-black-friday-line {
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.5;
  margin: 6px 0 0;
}
.product-black-friday-line--excluded {
  color: var(--color-muted);
  font-weight: 400;
}
`;
