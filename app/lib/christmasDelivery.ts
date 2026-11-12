// Relative imports keep this module loadable by the plain-Node test runner,
// which cannot resolve the Vite "~" alias.
import {BOOK_NOOK_PRODUCT_TYPE} from './bookNooks.ts';
import {isClothingProduct} from './clothing.ts';
import {
  counterDiagonalTechnique,
  DELIVERY_EU_BUSINESS_DAYS,
  DELIVERY_INTERNATIONAL_BUSINESS_DAYS,
  DELIVERY_US_BUSINESS_DAYS,
  fulfilmentWindows,
  isArtistActivewear,
  SHIPPING_COUNTRY_CODES,
  type PrintfulTechnique,
} from './storefrontBasics.ts';

/**
 * Order-by dates for Christmas delivery, per fulfilment line and region.
 *
 * Each date is the earlier of two:
 * - computed: the line's longest dispatch window plus its longest delivery
 *   window (the same windows the product pages print), plus a safety margin,
 *   counted back in business days from 24 December;
 * - the partner's own published deadline for that year, when one exists for
 *   the line's products and our shipping method (Standard).
 * The margin is 2 business days when the partner's published deadline covers
 * the line, and 4 when it does not (no date, or a date for only some of the
 * line's products). Book nooks count calendar days, as their supplier quotes
 * them, with a 7-day margin: no published deadline exists for them.
 *
 * Every date is an estimate built from estimates, so the copy says "order by",
 * never "guaranteed". Nothing shows outside the season (1 November to
 * 25 December), and a line disappears the day after its date.
 */

export type ChristmasRegion = 'eu' | 'us';

export type ChristmasLine =
  | 'prodigi-art'
  | 'prodigi-cases'
  | 'printful-home'
  | 'printful-cushions'
  | 'printful-apparel'
  | 'printful-slow-apparel'
  | 'book-nooks';

/** An ISO calendar date, YYYY-MM-DD. */
export type IsoDate = string;

type PartnerDeadline = {
  date: IsoDate;
  url: string;
  /** What the partner's table says, for the record. */
  note: string;
  /** True when the date covers every product of the line (margin 2, not 4). */
  coversLine: boolean;
};

const PRODIGI_URL = 'https://www.prodigi.com/christmas-delivery-dates/';
const PRINTFUL_URL = 'https://www.printful.com/holiday-order-deadlines';

/** Longest value of a window like "5–10" or "3–6". */
function maxDays(window: string) {
  return Math.max(...window.split(/[–-]/).map(Number));
}

const EU_TRANSIT = maxDays(DELIVERY_EU_BUSINESS_DAYS);
const US_TRANSIT = maxDays(DELIVERY_US_BUSINESS_DAYS);
const INTERNATIONAL_TRANSIT = maxDays(DELIVERY_INTERNATIONAL_BUSINESS_DAYS);

/** Dispatch windows come from the product pages' own source. */
const PRODIGI_DISPATCH = maxDays(fulfilmentWindows('Art Prints')!.dispatch);
const PRINTFUL_SUBLIMATION_DISPATCH = maxDays(
  fulfilmentWindows('Blankets', null, null, 'sublimation')!.dispatch,
);
const PRINTFUL_CUT_SEW_DISPATCH = maxDays(
  fulfilmentWindows('Cushions', null, null, 'cut-sew')!.dispatch,
);
const PRINTFUL_PRINTED_DISPATCH = maxDays(
  fulfilmentWindows('Hoodies', 'counter-diagonal-hoodie')!.dispatch,
);
const PRINTFUL_EMBROIDERED_DISPATCH = maxDays(
  fulfilmentWindows('Hats', 'counter-diagonal-cap')!.dispatch,
);

// Book nooks (data/curated-products.json `shipping`): processing 1–3 days,
// then 8–18 days to Germany, 8–21 to Cyprus (some 24 or longer) and most
// other countries 10–25 days. Calendar days, the supplier's own unit.
const BOOK_NOOK_PROCESSING_DAYS = 3;
const BOOK_NOOK_TRANSIT_DAYS = 25;
const BOOK_NOOK_MARGIN_DAYS = 7;

type LineSpec = {
  /** What the line covers, in the gift page's words. */
  label: string;
  /** The label for US buyers, when some of the line doesn't ship there. */
  usLabel?: string;
  unit: 'business' | 'calendar';
  dispatch: number;
  /** Longest delivery after dispatch per region; null: no Christmas date. */
  transit: Record<ChristmasRegion, number | null>;
};

export const CHRISTMAS_LINES: Record<ChristmasLine, LineSpec> = {
  // Prints, framed, canvas, hanger, acrylic and metal prints, cards,
  // postcards and Your Sky: Prodigi Standard, EU 5–10, US 7–15.
  'prodigi-art': {
    label: 'Prints, framed and wall art, cards and Your Sky',
    // Framed prints, cards and postcards don't ship to the US.
    usLabel: 'Prints, wall art and Your Sky',
    unit: 'business',
    dispatch: PRODIGI_DISPATCH,
    transit: {eu: EU_TRANSIT, us: US_TRANSIT},
  },
  'prodigi-cases': {
    label: 'Phone cases',
    unit: 'business',
    dispatch: PRODIGI_DISPATCH,
    transit: {eu: EU_TRANSIT, us: US_TRANSIT},
  },
  // The museum blankets and mugs. Their US transit is not verified, so a US
  // buyer reads the generic non-EU window (readsUsDelivery excludes them).
  'printful-home': {
    label: 'Blankets and mugs',
    unit: 'business',
    dispatch: PRINTFUL_SUBLIMATION_DISPATCH,
    transit: {eu: EU_TRANSIT, us: INTERNATIONAL_TRANSIT},
  },
  'printful-cushions': {
    label: 'Cushions',
    unit: 'business',
    dispatch: PRINTFUL_CUT_SEW_DISPATCH,
    transit: {eu: EU_TRANSIT, us: INTERNATIONAL_TRANSIT},
  },
  // Counter-Diagonal printed garments and totes: printed in the US for US
  // buyers (storefrontBasics US_DOMESTIC_PRODUCT_TYPES).
  'printful-apparel': {
    label: 'Printed clothing and totes',
    unit: 'business',
    dispatch: PRINTFUL_PRINTED_DISPATCH,
    transit: {eu: EU_TRANSIT, us: US_TRANSIT},
  },
  // Embroidered hats and the all-over-print activewear: 2–7 production.
  'printful-slow-apparel': {
    label: 'Activewear and embroidered hats',
    unit: 'business',
    dispatch: PRINTFUL_EMBROIDERED_DISPATCH,
    transit: {eu: EU_TRANSIT, us: US_TRANSIT},
  },
  'book-nooks': {
    label: 'Book nook kits',
    unit: 'calendar',
    dispatch: BOOK_NOOK_PROCESSING_DAYS,
    transit: {eu: BOOK_NOOK_TRANSIT_DAYS, us: BOOK_NOOK_TRANSIT_DAYS},
  },
};

/** Gift-page order of the lines. */
export const CHRISTMAS_LINE_ORDER: readonly ChristmasLine[] = [
  'printful-home',
  'printful-cushions',
  'prodigi-art',
  'prodigi-cases',
  'book-nooks',
  'printful-apparel',
  'printful-slow-apparel',
];

/**
 * Partners' published Christmas deadlines, by year, for our method
 * (Standard shipping). Read 2026-11-12:
 * - Printful, holiday-order-deadlines (Christmas 2026), Cyprus and Germany:
 *   "Products fulfilled in Europe": Apparel and Home & Living Dec 06.
 *   United States: fulfilled in the US Apparel Dec 09, Home & Living Dec 10;
 *   fulfilled outside the US Nov 26.
 * - Prodigi, christmas-delivery-dates ("Christmas 2026 delivery dates",
 *   still being filled in): Standard dates exist only for some categories.
 *   Phone cases: UK lab to Cyprus Thu 3 Dec, EU lab to DE/FR/IT Mon 14 Dec,
 *   US lab to the US Tue 8 Dec. US lab Standard: aluminium Wed 9 Dec,
 *   hangers, cards, postcards, acrylic, Dibond Sun 13 Dec, canvas Mon 14,
 *   framed Tue 15. To DE: canvas, acrylic UK lab Sat 12 Dec. No Standard
 *   date yet for fine-art prints (EU or US), framed (EU) or cards (EU).
 */
export type PartnerDeadlines = Readonly<
  Record<
    number,
    Partial<
      Record<ChristmasLine, Partial<Record<ChristmasRegion, PartnerDeadline>>>
    >
  >
>;

export const PARTNER_DEADLINES: PartnerDeadlines = {
  2026: {
    'prodigi-art': {
      eu: {
        date: '2026-12-12',
        url: PRODIGI_URL,
        note: 'Canvas and acrylic, UK lab Standard to Germany, Sat 12 Dec; no Standard date for prints, framed or cards',
        coversLine: false,
      },
      us: {
        date: '2026-12-09',
        url: PRODIGI_URL,
        note: 'Aluminium, US lab Standard, Wed 9 Dec (earliest of the line); no Standard date for prints',
        coversLine: false,
      },
    },
    'prodigi-cases': {
      eu: {
        date: '2026-12-03',
        url: PRODIGI_URL,
        note: 'Phone cases, UK lab Standard to Cyprus, Thu 3 Dec (EU lab to Germany: Mon 14 Dec)',
        coversLine: true,
      },
      us: {
        date: '2026-12-08',
        url: PRODIGI_URL,
        note: 'Phone cases, US lab Standard, Tue 8 Dec',
        coversLine: true,
      },
    },
    'printful-home': {
      eu: {
        date: '2026-12-06',
        url: PRINTFUL_URL,
        note: 'Home & Living fulfilled in Europe, to Cyprus and Germany, Dec 06',
        coversLine: true,
      },
      us: {
        date: '2026-11-26',
        url: PRINTFUL_URL,
        note: 'Fulfilled outside the US, to the US, Nov 26 (US origin unverified)',
        coversLine: true,
      },
    },
    'printful-cushions': {
      eu: {
        date: '2026-12-06',
        url: PRINTFUL_URL,
        note: 'Home & Living fulfilled in Europe, to Cyprus and Germany, Dec 06',
        coversLine: true,
      },
      us: {
        date: '2026-11-26',
        url: PRINTFUL_URL,
        note: 'Fulfilled outside the US, to the US, Nov 26 (US origin unverified)',
        coversLine: true,
      },
    },
    'printful-apparel': {
      eu: {
        date: '2026-12-06',
        url: PRINTFUL_URL,
        note: 'Apparel fulfilled in Europe, to Cyprus and Germany, Dec 06',
        coversLine: true,
      },
      us: {
        date: '2026-12-09',
        url: PRINTFUL_URL,
        note: 'Apparel fulfilled in the US, Dec 09',
        coversLine: true,
      },
    },
    'printful-slow-apparel': {
      eu: {
        date: '2026-12-06',
        url: PRINTFUL_URL,
        note: 'Apparel fulfilled in Europe, to Cyprus and Germany, Dec 06',
        coversLine: true,
      },
      us: {
        date: '2026-12-09',
        url: PRINTFUL_URL,
        note: 'Apparel fulfilled in the US, Dec 09',
        coversLine: true,
      },
    },
  },
};

const MARGIN_COVERED = 2;
const MARGIN_UNCOVERED = 4;

/** Season: from 1 November until Christmas Day, inclusive. */
const SEASON_START = '11-01';
const CHRISTMAS_DAY = '12-25';
/** Gifts should be in hand on Christmas Eve. */
const DELIVER_BY = '12-24';

// --- ISO date arithmetic in UTC (no time zones, no DST) ---

function parseIso(date: IsoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`Not an ISO date: ${date}`);
  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
}

function toIso(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

function isWeekend(date: Date) {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/** The business day `count` business days before `date`. */
export function subtractBusinessDays(date: IsoDate, count: number): IsoDate {
  const cursor = parseIso(date);
  let left = count;
  while (left > 0) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!isWeekend(cursor)) left--;
  }
  return toIso(cursor);
}

function subtractCalendarDays(date: IsoDate, count: number): IsoDate {
  const cursor = parseIso(date);
  cursor.setUTCDate(cursor.getUTCDate() - count);
  return toIso(cursor);
}

export type OrderBy = {
  line: ChristmasLine;
  region: ChristmasRegion;
  /** The date shown: the earlier of computed and partner. */
  date: IsoDate;
  computed: IsoDate;
  partner: PartnerDeadline | null;
  source: 'computed' | 'partner';
  /** Days counted back from 24 December (dispatch + transit + margin). */
  daysBack: number;
  unit: 'business' | 'calendar';
};

/** The order-by date for a line and region, or null if it has none. */
export function christmasOrderBy(
  line: ChristmasLine,
  region: ChristmasRegion,
  year: number,
  deadlines: PartnerDeadlines = PARTNER_DEADLINES,
): OrderBy | null {
  const spec = CHRISTMAS_LINES[line];
  const transit = spec.transit[region];
  if (transit == null) return null;
  const partner = deadlines[year]?.[line]?.[region] ?? null;
  const deliverBy = `${year}-${DELIVER_BY}`;
  let computed: IsoDate;
  let daysBack: number;
  if (spec.unit === 'calendar') {
    daysBack = spec.dispatch + transit + BOOK_NOOK_MARGIN_DAYS;
    computed = subtractCalendarDays(deliverBy, daysBack);
  } else {
    const margin = partner?.coversLine ? MARGIN_COVERED : MARGIN_UNCOVERED;
    daysBack = spec.dispatch + transit + margin;
    computed = subtractBusinessDays(deliverBy, daysBack);
  }
  const usePartner = partner !== null && partner.date < computed;
  return {
    line,
    region,
    date: usePartner ? partner.date : computed,
    computed,
    partner,
    source: usePartner ? 'partner' : 'computed',
    daysBack,
    unit: spec.unit,
  };
}

export type ChristmasSeason = 'off' | 'open';

/** "open" from 1 November to 25 December inclusive; "off" otherwise. */
export function christmasSeason(today: IsoDate): ChristmasSeason {
  const monthDay = today.slice(5);
  return monthDay >= SEASON_START && monthDay <= CHRISTMAS_DAY ? 'open' : 'off';
}

/**
 * What a product page or the gift page may say today: the order-by date
 * while it is still ahead (or today), otherwise nothing.
 */
export function christmasNotice(
  line: ChristmasLine | null,
  region: ChristmasRegion | null,
  today: IsoDate,
): OrderBy | null {
  if (!line || !region || christmasSeason(today) === 'off') return null;
  const orderBy = christmasOrderBy(line, region, Number(today.slice(0, 4)));
  return orderBy && today <= orderBy.date ? orderBy : null;
}

/** Every line's notice for a region today, in gift-page order. */
export function christmasNotices(
  region: ChristmasRegion | null,
  today: IsoDate,
): OrderBy[] {
  return CHRISTMAS_LINE_ORDER.flatMap((line) => {
    const notice = christmasNotice(line, region, today);
    return notice ? [notice] : [];
  });
}

const EU_COUNTRIES: ReadonlySet<string> = new Set(SHIPPING_COUNTRY_CODES);

/** EU-27 buyers read the EU dates, US buyers the US ones; others none. */
export function christmasRegionFor(
  country?: string | null,
): ChristmasRegion | null {
  const code = country?.trim().toUpperCase() ?? '';
  if (EU_COUNTRIES.has(code)) return 'eu';
  if (code === 'US') return 'us';
  return null;
}

const PRODIGI_TYPES = new Set(
  [
    'Art Prints',
    'Personalised Art',
    'Framed Art',
    'Canvas Art',
    'Hanger Prints',
    'Acrylic Prints',
    'Metal Prints',
    'Cards',
    'Postcards',
  ].map((type) => type.toLowerCase()),
);

/** The fulfilment line a product ships on, or null for no Christmas date. */
export function christmasLineFor(product: {
  productType?: string | null;
  handle?: string | null;
  tags?: string[] | null;
  printfulTechnique?: PrintfulTechnique | null;
}): ChristmasLine | null {
  const type = product.productType?.trim().toLowerCase() ?? '';
  if (product.printfulTechnique === 'sublimation') return 'printful-home';
  if (product.printfulTechnique === 'cut-sew') return 'printful-cushions';
  const technique = counterDiagonalTechnique(
    product.productType,
    product.handle,
  );
  if (technique === 'printed') return 'printful-apparel';
  if (technique === 'embroidered') return 'printful-slow-apparel';
  if (isArtistActivewear(product.productType, product.handle))
    return 'printful-slow-apparel';
  // Other garments have no verified supplier windows yet.
  if (isClothingProduct(product)) return null;
  if (type === BOOK_NOOK_PRODUCT_TYPE.toLowerCase()) return 'book-nooks';
  if (type === 'phone cases') return 'prodigi-cases';
  if (PRODIGI_TYPES.has(type)) return 'prodigi-art';
  return null;
}

/** Today's date where the store is (Nicosia), as YYYY-MM-DD. */
export function storeToday(now: Date = new Date()): IsoDate {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Nicosia',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * "Today" for a request: the store's date, or a `?today=YYYY-MM-DD`
 * override (it changes only which dates are shown, so tests and previews
 * can look at any day).
 */
export function requestToday(request: Request, now: Date = new Date()) {
  const override = new URL(request.url).searchParams.get('today');
  if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) {
    const parsed = parseIso(override);
    if (!Number.isNaN(parsed.getTime()) && toIso(parsed) === override)
      return override;
  }
  return storeToday(now);
}

/** "Monday 30 November". */
export function formatOrderByDate(date: IsoDate) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(parseIso(date));
}

/** The line's label as this region's buyer reads it. */
export function christmasLineLabel(
  line: ChristmasLine,
  region: ChristmasRegion,
) {
  const spec = CHRISTMAS_LINES[line];
  return region === 'us' && spec.usLabel ? spec.usLabel : spec.label;
}

export function christmasRegionName(region: ChristmasRegion) {
  return region === 'eu' ? 'the EU' : 'the US';
}
