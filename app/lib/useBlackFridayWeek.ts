import {useSyncExternalStore} from 'react';
import {useRouteLoaderData} from 'react-router';
import type {loader as rootLoader} from '~/root';
import {BLACK_FRIDAY_END, blackFridayStatus} from '~/lib/blackFriday';

/** The longest delay `setTimeout` takes (a signed 32-bit count of ms). */
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/** The browser's own clock says the sale is over. */
const hasEnded = () => blackFridayStatus(new Date()) === 'ended';

/** Server render and hydration: the root loader's answer stands. */
const notEnded = () => false;

/** Reads the clock again at the first moment after the sale. */
function atTheEnd(readAgain: () => void) {
  const wait = BLACK_FRIDAY_END.getTime() - Date.now();
  if (wait <= 0) return () => {};
  const timer = window.setTimeout(readAgain, Math.min(wait, MAX_TIMEOUT_MS));
  return () => window.clearTimeout(timer);
}

/**
 * Whether the storefront speaks of Black Friday week: the sitewide line, the
 * cards' "20% off in your cart" and the product-page line all read this.
 *
 * The root loader decides from the request time, but React Router keeps the
 * root's answer across client-side navigations (it runs the root loader
 * again only after a form submission or when the query string changes). A
 * tab opened before the end would go on promising a discount the cart no
 * longer gives. So the browser's clock is read as well: on every render and,
 * through the timer, at the end itself. The clock can only switch the lines
 * off, never on; the server alone starts the week, and a `?today=` preview
 * of a sale day stops showing them once the real end has passed.
 */
export function useBlackFridayWeek(): boolean {
  const root = useRouteLoaderData<typeof rootLoader>('root');
  const ended = useSyncExternalStore(atTheEnd, hasEnded, notEnded);
  return Boolean(root?.blackFridayWeek) && !ended;
}
