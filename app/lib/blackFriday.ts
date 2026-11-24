/**
 * Black Friday week 2026: Tuesday 17 November 00:00 to the end of Monday
 * 30 November, shop time (Asia/Nicosia, UTC+2 in that period).
 *
 * The price reduction itself is three Shopify automatic discounts,
 * scheduled in Shopify admin for exactly this window. They act in the cart
 * and at checkout only: product prices, JSON-LD and the feeds never change.
 * This module only decides what the storefront *says*: the sitewide line,
 * the /black-friday page and the product-page line. All of it switches on
 * and off by the request time, so nothing needs turning off afterwards.
 *
 * The rules below mirror the discounts' product selection (by product type,
 * plus two variant rules). If a discount in admin changes, change this too.
 */

/** First moment of the sale: Tuesday 17 November 2026, 00:00 in Nicosia. */
export const BLACK_FRIDAY_START = new Date('2026-11-17T00:00:00+02:00');
/** First moment after the sale: Tuesday 1 December 2026, 00:00 in Nicosia. */
export const BLACK_FRIDAY_END = new Date('2026-12-01T00:00:00+02:00');

export const BLACK_FRIDAY_PATH = '/black-friday';

/** The sitewide announcement line. */
export const BLACK_FRIDAY_ANNOUNCEMENT =
  'Black Friday week: 20% off blankets, cushions, mugs and prints, 10% off clothing. Taken off in your cart. Ends Monday 30 November.';

/** The same line for phones, short enough for one line at 360 px. */
export const BLACK_FRIDAY_ANNOUNCEMENT_SHORT =
  'Black Friday: up to 20% off, ends 30 Nov';

export type BlackFridayPercent = 20 | 10;
export type BlackFridayStatus = 'before' | 'open' | 'ended';

/** Whether `now` falls inside the sale window (end exclusive). */
export function isBlackFridayWeek(now: Date): boolean {
  const time = now.getTime();
  return (
    time >= BLACK_FRIDAY_START.getTime() && time < BLACK_FRIDAY_END.getTime()
  );
}

export function blackFridayStatus(now: Date): BlackFridayStatus {
  if (now.getTime() < BLACK_FRIDAY_START.getTime()) return 'before';
  return isBlackFridayWeek(now) ? 'open' : 'ended';
}

/**
 * The moment a request is judged at: the real time, or noon in Nicosia on
 * the day a `?today=YYYY-MM-DD` override names (the same preview parameter
 * the Christmas dates and hero pictures read). The override changes only
 * what the page says; the discounts in the cart follow their own schedule.
 */
export function blackFridayNow(request: Request, now: Date = new Date()) {
  const override = new URL(request.url).searchParams.get('today');
  if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) {
    const noon = new Date(`${override}T12:00:00+02:00`);
    if (
      !Number.isNaN(noon.getTime()) &&
      noon.toISOString().slice(0, 10) === override
    )
      return noon;
  }
  return now;
}

/** 20% on every variant of these product types. */
const TWENTY_TYPES = new Set(
  [
    'Blankets',
    'Cushions',
    'Mugs',
    'Phone Cases',
    'Plant Pots',
    'Hanger Prints',
  ].map((type) => type.toLowerCase()),
);

/** 10% on every variant of these product types. */
const TEN_TYPES = new Set(
  [
    'Hoodies',
    'T-Shirts',
    'Sweatshirts',
    'Long Sleeve Shirts',
    'Tote Bags',
    'Yoga Leggings',
    'Sports Bra',
    'Biker Shorts',
    'Studio Top',
    'Canvas Art',
    'Framed Art',
  ].map((type) => type.toLowerCase()),
);

/**
 * Products left out of the offer although their type is in it: the premium
 * hoodies (the other hoodies stay in).
 */
export function isBlackFridayExcludedHandle(handle: string | null | undefined) {
  return /-premium-hoodie$/.test(handle?.trim().toLowerCase() ?? '');
}

const ART_PRINTS = 'art prints';
const PERSONALISED_ART = 'personalised art';

/** "8 × 10 in / Unframed": the art print variants that get 20%. */
function isUnframed(variantTitle: string) {
  return /\bunframed\b/i.test(variantTitle);
}

/** "20 × 24 in / Black frame": the Your Sky variants left out. */
function isFramed20x24(variantTitle: string) {
  return /\b20\s*[×x]\s*24\b/i.test(variantTitle) && !isUnframed(variantTitle);
}

/**
 * The Black Friday discount on one variant, by its product's Shopify
 * `productType` and the variant's title: 20, 10 or null (no discount).
 * - 20%: blankets, cushions, mugs, phone cases, plant pots, hanger prints;
 *   art prints, unframed variants only; personalised art, every variant
 *   except the framed 20 × 24 in ones.
 * - 10%: the clothing and activewear types (not the premium hoodies), tote
 *   bags, canvas and framed art.
 * - Nothing: hats, premium hoodies, cards, postcards, book nooks, acrylic
 *   and metal prints, and anything else.
 * A variant-dependent type with no variant title gets null: the line must
 * never promise a discount the selected variant does not have.
 */
export function blackFridayDiscountPercent(
  productType: string | null | undefined,
  variantTitle?: string | null,
  handle?: string | null,
): BlackFridayPercent | null {
  if (isBlackFridayExcludedHandle(handle)) return null;
  const type = productType?.trim().toLowerCase() ?? '';
  if (TWENTY_TYPES.has(type)) return 20;
  if (TEN_TYPES.has(type)) return 10;
  const title = variantTitle?.trim() ?? '';
  if (type === ART_PRINTS) return title && isUnframed(title) ? 20 : null;
  if (type === PERSONALISED_ART)
    return title && !isFramed20x24(title) ? 20 : null;
  return null;
}

/** The product-page line for a discounted variant. */
export function blackFridayProductLine(percent: BlackFridayPercent) {
  return `Black Friday week: ${percent}% off, taken off in your cart.`;
}

export type BlackFridayGroup = {
  key: string;
  heading: string;
  percent: BlackFridayPercent;
  productTypes: readonly string[];
  /** A short qualifier under the heading, when only some variants count. */
  note?: string;
  /** A page of its own that lists the whole group, when there is one. */
  allPath?: string;
};

export type BlackFridayGroupLink = {label: string; url: string};

/**
 * The /black-friday page's product grids, in order: blankets lead. Your Sky
 * (personalised art) has its own page and is named in the offer copy.
 */
export const BLACK_FRIDAY_GROUPS: readonly BlackFridayGroup[] = [
  {
    key: 'blankets',
    heading: 'Blankets',
    percent: 20,
    productTypes: ['Blankets'],
  },
  {
    key: 'cushions',
    heading: 'Cushions',
    percent: 20,
    productTypes: ['Cushions'],
  },
  {key: 'mugs', heading: 'Mugs', percent: 20, productTypes: ['Mugs']},
  {
    key: 'prints',
    heading: 'Prints',
    percent: 20,
    productTypes: ['Art Prints', 'Hanger Prints'],
    note: 'Art prints: unframed only.',
  },
  {
    key: 'phone-cases',
    heading: 'Phone cases',
    percent: 20,
    productTypes: ['Phone Cases'],
  },
  {
    key: 'plant-pots',
    heading: 'Plant pots',
    percent: 20,
    productTypes: ['Plant Pots'],
  },
  {
    key: 'clothing',
    heading: 'Clothing and activewear',
    percent: 10,
    productTypes: [
      'Hoodies',
      'T-Shirts',
      'Sweatshirts',
      'Long Sleeve Shirts',
      'Tote Bags',
      'Yoga Leggings',
      'Sports Bra',
      'Biker Shorts',
      'Studio Top',
    ],
    allPath: '/clothing',
  },
  {
    key: 'wall-art',
    heading: 'Canvas and framed art',
    percent: 10,
    productTypes: ['Canvas Art', 'Framed Art'],
  },
];

/**
 * Where a group's "See all" goes. The shop lists one product type at a time
 * and clears a request for several (`normalizeSingleProductTypeSearch` in
 * catalogFacets.ts), so a link never carries more than one `type`: a group
 * with a page of its own links there, a group of one type links to that
 * type's listing, and a group of several types gets one link per type.
 * `listedTypes` are the types with something to show; the others get no link.
 */
export function blackFridayGroupLinks(
  group: BlackFridayGroup,
  shopPath: string,
  listedTypes: readonly string[] = group.productTypes,
): BlackFridayGroupLink[] {
  if (group.allPath) return [{label: 'See all', url: group.allPath}];
  const single = group.productTypes.length === 1;
  return group.productTypes
    .filter((type) => listedTypes.includes(type))
    .map((type) => ({
      label: single ? 'See all' : `All ${type.toLowerCase()}`,
      url: `${shopPath}?${new URLSearchParams({type}).toString()}`,
    }));
}

/** Storefront `products(query:)` search for one product type. */
export function productTypeQuery(productType: string) {
  return `product_type:"${productType.replace(/"/g, '\\"')}"`;
}

/**
 * Takes from each list in turn (each already best-selling first), so a
 * group of several types shows some of each rather than only the type
 * that happens to sell most; stops at `limit`.
 */
export function interleave<T>(lists: readonly (readonly T[])[], limit: number) {
  const result: T[] = [];
  for (let index = 0; result.length < limit; index++) {
    const round = lists.flatMap((list) =>
      index < list.length ? [list[index]] : [],
    );
    if (!round.length) break;
    result.push(...round.slice(0, limit - result.length));
  }
  return result;
}

/** The offer in plain words, for the /black-friday page. */
export const BLACK_FRIDAY_COPY = {
  title: 'Black Friday week',
  seoTitle: 'Black Friday Week: 20% and 10% Off',
  metaDescription:
    'Black Friday week at Clara Mendes, until 30 November: 20% off blankets, cushions, mugs, phone cases, plant pots and prints, 10% off clothing, canvas and framed art.',
  dates: 'Until Monday 30 November',
  twenty:
    'Blankets, cushions, mugs, phone cases, plant pots, hanger prints, unframed art prints and Your Sky star maps (except framed 20 × 24 in).',
  ten: 'Clothing and activewear (except premium hoodies), tote bags, canvas and framed art.',
  excluded:
    'Not included: premium hoodies, caps and beanies, cards, postcards, book nooks, and acrylic and metal prints.',
  cart: 'The discount is taken off in your cart.',
  before:
    'Black Friday week has not started yet. Until then, everything is at its usual price.',
  ended:
    'Black Friday week has ended. Thank you for shopping with us; everything is back at its usual price.',
} as const;
