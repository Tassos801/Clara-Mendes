// Relative imports keep this module loadable by the plain-Node test runner,
// which cannot resolve the Vite "~" alias.
import {
  christmasNotice,
  christmasRegionFor,
  christmasRegionName,
  formatOrderByDate,
  type ChristmasLine,
  type IsoDate,
} from './christmasDelivery.ts';
import {countryPhrase} from './deliveryReach.ts';
import {marketCountryName} from './markets.ts';

/**
 * What the cart says about delivery, in the words the product pages use.
 * It names no fee: the cart has no shipping quote, and a number the
 * checkout might not match to the cent is worse than none.
 */

/**
 * The shipping line under the subtotal. It names the cart's delivery
 * country (the one checkout opens with), so a buyer can see the country
 * carried over; without a known country it keeps the plain sentence.
 * "Calculated", not "added": some carts ship free (book nook kits
 * include delivery), so the line must not promise a charge.
 */
export function cartShippingNote(countryCode?: string | null) {
  const code = countryCode?.trim().toUpperCase() ?? '';
  return code && marketCountryName(code)
    ? `Shipping to ${countryPhrase(code)} is calculated at checkout.`
    : 'Shipping is calculated at checkout.';
}

/**
 * The product pages' Christmas order-by sentence for the whole cart: the
 * earliest date of its lines for the cart's region. It says nothing when
 * any line has no date (no verified windows, or its date has passed),
 * because a later date for the rest would not cover that line.
 */
export function cartChristmasOrderBy({
  countryCode,
  lines,
  today,
}: {
  countryCode?: string | null;
  lines: ReadonlyArray<ChristmasLine | null>;
  today: IsoDate;
}): string | null {
  const region = christmasRegionFor(countryCode);
  if (!region || lines.length === 0) return null;
  let earliest: IsoDate | null = null;
  for (const line of lines) {
    const notice = christmasNotice(line, region, today);
    if (!notice) return null;
    if (!earliest || notice.date < earliest) earliest = notice.date;
  }
  return earliest
    ? `For Christmas delivery in ${christmasRegionName(region)}, order by ${formatOrderByDate(earliest)}.`
    : null;
}
