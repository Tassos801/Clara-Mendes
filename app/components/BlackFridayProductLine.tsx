import {useRouteLoaderData} from 'react-router';
import type {loader as rootLoader} from '~/root';
import {
  blackFridayDiscountPercent,
  blackFridayProductLine,
} from '~/lib/blackFriday';

/**
 * One line near a product page's price during Black Friday week, for a
 * selected variant the automatic discounts cover. The price shown stays the
 * product's own: the discount is taken off in the cart (app/lib/blackFriday.ts).
 * The window comes from the root loader's request-time check.
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
  const root = useRouteLoaderData<typeof rootLoader>('root');
  if (!root?.blackFridayWeek) return null;
  const percent = blackFridayDiscountPercent(productType, variantTitle, handle);
  if (!percent) return null;
  return (
    <p className="product-black-friday-line">
      {blackFridayProductLine(percent)}
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
`;
