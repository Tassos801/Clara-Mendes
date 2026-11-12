// Relative imports keep this module loadable by the plain-Node test runner,
// which cannot resolve the Vite "~" alias.
import type {MoneyAmount} from './money.ts';

export const GIFTS_PATH = '/gifts';

/**
 * The gift edit: famous public-domain works on things people give, then
 * wall art, cases, book nooks and Your Sky. Hand-picked handles, like the
 * gallery edits (app/lib/galleryPages.ts); the loader keeps only those that
 * are live and sellable to the buyer, so a handle that is unpublished, staged
 * or doesn't ship to the buyer simply drops out. Kept in code because the
 * store has no "gifts" collection (one could replace this list later).
 */
export const GIFT_SECTIONS = [
  {
    key: 'blankets',
    label: 'Throw blankets',
    handles: [
      'the-great-wave-off-kanagawa-blanket',
      'irises-blanket',
      'wheat-field-with-cypresses-blanket',
      'strawberry-thief-blanket',
      'fireworks-at-ryogoku-bridge-blanket',
      'sudden-shower-over-shin-ohashi-bridge-and-atake-blanket',
      'composition-with-red-yellow-and-blue-blanket',
      'improvisation-no-30-cannons-blanket',
      'houses-at-murnau-blanket',
    ],
  },
  {
    key: 'mugs',
    label: 'Mugs',
    handles: [
      'the-great-wave-off-kanagawa-mug',
      'irises-mug',
      'the-night-cafe-mug',
      'water-lilies-agapanthus-mug',
      'fireworks-at-ryogoku-bridge-mug',
      'sudden-shower-over-shin-ohashi-bridge-and-atake-mug',
      'tago-bay-near-ejiri-on-the-tokaido-mug',
    ],
  },
  {
    key: 'cushions',
    label: 'Cushions',
    handles: [
      'the-great-wave-off-kanagawa-cushion',
      'strawberry-thief-cushion',
      'irises-cushion',
      'roses-in-a-vase-cushion',
      'kinryusan-temple-at-asakusa-cushion',
      'composition-with-red-yellow-and-blue-cushion',
      'painting-with-troika-cushion',
    ],
  },
  {
    key: 'framed',
    label: 'Framed prints',
    handles: [
      'the-great-wave-off-kanagawa-framed-print',
      'sudden-shower-over-shin-ohashi-bridge-and-atake-framed-print',
      'fireworks-at-ryogoku-bridge-framed-print',
    ],
  },
  {
    key: 'cases',
    label: 'Phone cases',
    handles: [
      'the-great-wave-off-kanagawa-phone-case',
      'fireworks-at-ryogoku-bridge-phone-case',
      'art-tough-phone-case',
    ],
  },
  {
    key: 'book-nooks',
    label: 'Book nook kits',
    handles: [
      'christmas-fantasy-diy-book-nook-kit',
      'twilight-library-diy-book-nook-kit',
      'alley-after-rain-diy-book-nook-kit',
      'sea-breeze-diy-book-nook-kit',
    ],
  },
  {key: 'your-sky', label: 'Your Sky', handles: ['your-sky-star-map']},
  {
    key: 'wall-art',
    label: 'Wall art',
    handles: [
      'the-great-wave-off-kanagawa-hanger-print',
      'composition-with-red-yellow-and-blue-hanger-print',
      'the-great-wave-off-kanagawa-canvas',
      'the-great-wave-off-kanagawa-metal-print',
      'the-great-wave-off-kanagawa-art-print',
      'quiet-form-i-art-print',
    ],
  },
  {
    key: 'cards',
    label: 'Cards',
    handles: ['the-great-wave-off-kanagawa-greeting-card'],
  },
] as const;

/** Every curated handle, in display order. */
export const GIFT_HANDLES: readonly string[] = GIFT_SECTIONS.flatMap(
  (section) => [...section.handles],
);

/** Product types the curated handles span, for the Storefront query. */
export const GIFT_PRODUCT_TYPES = [
  'Blankets',
  'Mugs',
  'Cushions',
  'Framed Art',
  'Phone Cases',
  'Book Nooks',
  'Personalised Art',
  'Hanger Prints',
  'Canvas Art',
  'Metal Prints',
  'Art Prints',
  'Cards',
] as const;

export function giftProductQuery() {
  return GIFT_PRODUCT_TYPES.map((type) => `product_type:"${type}"`).join(
    ' OR ',
  );
}

/** Band limits in euros; other currencies convert them (see bandLimits). */
export const EUR_BAND_LIMITS = [30, 60] as const;

/** A converted limit rounded to a figure a price label can show. */
export function roundLimit(value: number) {
  if (!Number.isFinite(value) || value <= 0) return value;
  const step = value < 100 ? 5 : 10 ** (Math.floor(Math.log10(value)) - 1);
  return Math.round(value / step) * step;
}

/**
 * Band limits in the buyer's currency. EUR keeps 30 and 60; another
 * currency scales them by the median ratio of the buyer's price to the
 * euro price over the same products, then rounds (USD: 35 and 70).
 */
export function bandLimits(
  currencyCode: string,
  ratios: readonly number[],
): [number, number] {
  if (currencyCode === 'EUR' || !ratios.length) return [...EUR_BAND_LIMITS];
  const sorted = [...ratios].filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return [...EUR_BAND_LIMITS];
  const median = sorted[Math.floor(sorted.length / 2)];
  return [
    roundLimit(EUR_BAND_LIMITS[0] * median),
    roundLimit(EUR_BAND_LIMITS[1] * median),
  ];
}

export type GiftBandKey = 'under' | 'middle' | 'over';

export function bandFor(amount: number, limits: [number, number]): GiftBandKey {
  if (amount < limits[0]) return 'under';
  if (amount <= limits[1]) return 'middle';
  return 'over';
}

function formatLimit(amount: number, currencyCode: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** "Under €30", "€30 to €60", "Over €60" in the buyer's currency. */
export function bandHeading(
  band: GiftBandKey,
  limits: [number, number],
  currencyCode: string,
) {
  const low = formatLimit(limits[0], currencyCode);
  const high = formatLimit(limits[1], currencyCode);
  if (band === 'under') return `Under ${low}`;
  if (band === 'middle') return `${low} to ${high}`;
  return `Over ${high}`;
}

export type GiftCandidate = {
  handle: string;
  /** Lowest price the buyer can pay now (card pricing). */
  price: MoneyAmount | null;
  /** Lowest price in euros (default market), for converting the limits. */
  eurPrice?: MoneyAmount | null;
};

export type GiftBand<T> = {
  key: GiftBandKey;
  heading: string;
  products: T[];
};

/**
 * The curated products the buyer can buy, in curated order, grouped into
 * price bands (cheapest band first); empty bands are dropped.
 */
export function groupGifts<T extends GiftCandidate>(
  products: readonly T[],
): GiftBand<T>[] {
  const order = new Map(GIFT_HANDLES.map((handle, index) => [handle, index]));
  const priced = products
    .filter((product) => order.has(product.handle) && product.price)
    .sort((a, b) => order.get(a.handle)! - order.get(b.handle)!);
  if (!priced.length) return [];
  const currencyCode = priced[0].price!.currencyCode;
  const ratios = priced.flatMap((product) =>
    product.eurPrice && product.eurPrice.currencyCode === 'EUR'
      ? [Number(product.price!.amount) / Number(product.eurPrice.amount)]
      : [],
  );
  const limits = bandLimits(currencyCode, ratios);
  const keys: GiftBandKey[] = ['under', 'middle', 'over'];
  return keys.flatMap((key) => {
    const inBand = priced.filter(
      (product) => bandFor(Number(product.price!.amount), limits) === key,
    );
    return inBand.length
      ? [
          {
            key,
            heading: bandHeading(key, limits, currencyCode),
            products: inBand,
          },
        ]
      : [];
  });
}

export const GIFT_PAGE_COPY = {
  seoTitle: 'Art Gifts — Museum Art on Blankets, Mugs & More',
  metaDescription:
    'Art gifts made to order: Hokusai, Hiroshige, Kandinsky and Mondrian on throw blankets, mugs and cushions, plus framed prints, phone cases and book nooks.',
  eyebrow: 'Gifts',
  title: 'Art Gifts',
  subtitle:
    'Famous paintings on things people use every day, made to order for the person you have in mind.',
  lead: 'The Great Wave on a throw blanket, Hiroshige’s fireworks on a mug, Mondrian on a cushion. The paintings are public-domain works from museum collections, and each piece is printed when you order it. Below are the ones we would give, with wall art, phone cases, book nooks and a star map of a night that mattered, grouped by price.',
  heroAlt:
    'The Great Wave off Kanagawa by Katsushika Hokusai printed as a throw blanket',
  christmasHeading: 'Order by these dates for Christmas',
  christmasNote:
    'Our estimates for delivery by 24 December, from each maker’s production time and the delivery times on our product pages, with a few days’ margin. They are not guarantees, and carriers are slower in December.',
  christmasPassed:
    'The order-by dates for Christmas delivery have passed. Everything here still ships as usual.',
} as const;
