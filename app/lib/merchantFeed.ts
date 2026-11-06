import {isListedProduct} from './catalogFilters.ts';
import {
  clothingCapsules,
  isClothingProduct,
  type ApprovalMetafield,
} from './clothing.ts';
import {MARKET_URL_PARAM} from './markets.ts';
import {
  FIXED_RATES,
  HANDLING,
  SHIPPING_COLUMN,
  shippingCells,
  usShippingCell,
  type FixedRateLine,
} from './merchantFeedShipping.ts';
import {APPAREL_PRODUCT_TYPES} from './storefrontBasics.ts';

// Merchant Center product feeds as tab-separated text, two per market:
//   EUR (Cyprus market; listed in the EU and worldwide)
//     feeds.google-merchant[.txt].tsx           lines with a fixed EUR rate
//     feeds.google-merchant-printful[.txt].tsx  Printful lines (mugs, cushions,
//                                               blankets, clothing), EU only
//   USD (United States market; listed in the US only)
//     feeds.google-merchant-us[.txt].tsx
//     feeds.google-merchant-printful-us[.txt].tsx
// plus feeds.meta-country-us[.txt].tsx, the US country feed for the Meta
// catalog. Merchant Center and Meta fetch them daily, so prices, stock and
// new products follow the store without file uploads.
//
// Item ids are SKUs and titles follow the manual uploads (2026-08-12 to
// 2026-10-29), so switching to the fetched feeds kept every offer. An item
// has the same id in the EUR and USD feeds (two feed labels in Merchant
// Center; Meta's country feed overrides it by id). Links pin the market with
// `?country=` (app/lib/markets.ts): Googlebot crawls as a US buyer, and the
// landing page must show the feed's currency.

// prettier-ignore
export const FEED_COLUMNS = [
  'id', 'item_group_id', 'title', 'description', 'link', 'image_link', 'price',
  'availability', 'condition', 'brand', 'google_product_category', 'size',
  'material', 'color', 'identifier_exists', 'gender', 'age_group',
  'custom_label_0',
] as const;

/** The market a feed lists, and the currency its prices must be in. */
export type FeedMarket = 'CY' | 'US';
export const FEED_CURRENCY: Record<FeedMarket, string> = {CY: 'EUR', US: 'USD'};

// `custom_label_0` names the clothing capsule, so Meta and Google Ads can
// group a line into a product set (custom_label_0 = Counter-Diagonal): the
// title of the product's capsule collection (the same rule as /clothing, so
// a new artist capsule carries its name), else a capsule tag from the
// shared product contract.
export const CAPSULE_TAGS = ['Counter-Diagonal', 'Quiet Current'] as const;

export type FeedVariant = {
  id: string;
  sku?: string | null;
  availableForSale: boolean;
  price: {amount: string; currencyCode: string};
  selectedOptions: Array<{name: string; value: string}>;
  image?: {url: string} | null;
};

export type FeedProduct = {
  handle: string;
  title: string;
  productType: string;
  tags: string[];
  vendor?: string | null;
  storefrontApproved?: ApprovalMetafield | null;
  fulfillmentVerified?: ApprovalMetafield | null;
  description: string;
  featuredImage?: {url: string} | null;
  variants: {nodes: FeedVariant[]};
  collections?: {
    nodes: Array<{
      handle: string;
      title: string;
      clothingKind?: ApprovalMetafield | null;
    }>;
  } | null;
};

export type PrintfulLine =
  'mug' | 'cushion-cover' | 'cushion-insert' | 'blanket' | 'apparel';
/** The shipping table an item uses: a fixed one, or a Printful profile. */
export type FeedLine = FixedRateLine | PrintfulLine;
/** Checkout rate (in the feed's currency) per quote key, from cart quotes. */
export type Quotes = Record<string, string>;
/** Where a feed's `shipping` values come from. */
export type FeedShipping =
  | {
      market: 'CY';
      /** False once the US market sells in USD: the USD feeds list the US. */
      includeUs: boolean;
      /** Printful lines: the German (EU) and Cyprus checkout quotes. */
      quotes?: {eu: Quotes; cyprus: Quotes};
    }
  | {market: 'US'; quotes: Quotes};

export type FeedRow = Record<(typeof FEED_COLUMNS)[number], string> & {
  line: FeedLine;
  /** Rows with one key share a shipping profile, so one quote prices them. */
  quoteKey: string;
  variantId: string;
  /** The Shopify product title, without the size or colour (Meta cards). */
  productTitle: string;
};

type Item = Pick<
  FeedRow,
  'line' | 'title' | 'size' | 'material' | 'color' | 'google_product_category'
> &
  Partial<Pick<FeedRow, 'gender' | 'age_group' | 'custom_label_0'>>;

const ART =
  'Home & Garden > Decor > Artwork > Posters, Prints, & Visual Artwork';
const CARD =
  'Arts & Entertainment > Party & Celebration > Gift Giving > Greeting & Note Cards';
const PAPER = 'Archival matte paper';
const ARTISTS = [
  'Katsushika Hokusai',
  'Utagawa Hiroshige',
  'Vasily Kandinsky',
  'Piet Mondrian',
];

// Museum product types (Floating World, Line and Colour): shipping table,
// Google category and material. 'printful' lines resolve per variant.
const MUSEUM: Record<string, [FixedRateLine | 'printful', string, string]> = {
  'Art Prints': ['print', ART, PAPER],
  'Hanger Prints': ['print', ART, `${PAPER} with wooden hanger`],
  'Acrylic Prints': ['mounted', ART, '10 mm high-gloss acrylic'],
  'Metal Prints': ['mounted', ART, 'Matt aluminium (Dibond)'],
  'Canvas Art': ['canvas', ART, 'Stretched canvas'],
  'Framed Art': ['framed', ART, `Natural wood frame, ${PAPER.toLowerCase()}`],
  Cards: ['card', CARD, 'Fine-art card with envelope'],
  Postcards: ['card', CARD, 'Fine-art card'],
  Mugs: [
    'printful',
    'Home & Garden > Kitchen & Dining > Tableware > Drinkware > Mugs',
    '',
  ],
  Cushions: ['printful', 'Home & Garden > Decor > Throw Pillows', ''],
  Blankets: [
    'printful',
    'Home & Garden > Linens & Bedding > Bedding > Blankets',
    '',
  ],
};

export function isPrintfulLine(line: FeedLine): line is PrintfulLine {
  return !(line in FIXED_RATES);
}

function skyItem(o: Record<string, string>): Item {
  const framed = o.Finish !== 'Unframed';
  return {
    line: framed ? 'framed' : 'print',
    title: `Your Sky Personalised Star Map — ${o.Size}${framed ? `, ${o.Finish}` : ''}`,
    size: o.Size,
    material: framed ? `${o.Finish.replace(' frame', '')} wood frame` : PAPER,
    color: '',
    google_product_category: ART,
  };
}

function studioItem(p: FeedProduct, o: Record<string, string>): Item | null {
  const base = {color: '', google_product_category: ART};
  switch (p.productType) {
    case 'Art Prints':
      return {
        ...base,
        line: 'print',
        title: `${p.title} — ${o.Size}`,
        size: o.Size,
        material: PAPER,
      };
    case 'Canvas Art':
      return {
        ...base,
        line: 'canvas',
        title: `${o.Artwork} Stretched Canvas Art — 16 × 20 in`,
        size: '16 × 20 in',
        material: 'Stretched canvas',
      };
    case 'Cards':
    case 'Postcards': {
      const card = p.productType === 'Cards';
      return {
        ...base,
        line: 'card',
        title: `${p.title} — ${o.Artwork}`,
        size: card ? '5 × 7 in' : '7 × 5 in',
        material: card ? '324gsm Mohawk fine-art card' : '324gsm Mohawk card',
        google_product_category: CARD,
      };
    }
    case 'Plant Pots':
      return {
        ...base,
        line: 'pot',
        title: o.Size ? `${p.title} — ${o.Size}` : p.title,
        size: o.Size ?? '',
        material: 'Glossy ceramic',
        google_product_category: '',
      };
    default:
      return null;
  }
}

function museumItem(p: FeedProduct, o: Record<string, string>): Item | null {
  const spec = MUSEUM[p.productType];
  if (!spec) return null;
  const [table, category, material] = spec;
  const surname = ARTISTS.find((a) => p.tags.includes(a))
    ?.split(' ')
    .at(-1);
  const name =
    surname && !p.title.includes(surname)
      ? `${p.title} by ${surname}`
      : p.title;
  const hanger = o.Hanger?.toLowerCase();
  const extra = hanger
    ? `, ${hanger} hanger`
    : o.Filling
      ? `, ${o.Filling.toLowerCase()}`
      : '';
  const line: FeedLine =
    table !== 'printful'
      ? table
      : p.productType === 'Mugs'
        ? 'mug'
        : p.productType === 'Blankets'
          ? 'blanket'
          : o.Filling === 'With insert'
            ? 'cushion-insert'
            : 'cushion-cover';
  return {
    line,
    title: o.Size ? `${name} — ${o.Size}${extra}` : name,
    size: o.Size ?? '',
    material: hanger ? `${PAPER} with ${hanger} wooden hanger` : material,
    color: o.Hanger ?? '',
    google_product_category: category,
  };
}

const APPAREL_CATEGORY: Record<string, string> = {
  Hoodies: 'Apparel & Accessories > Clothing > Shirts & Tops',
  Sweatshirts: 'Apparel & Accessories > Clothing > Shirts & Tops',
  'T-Shirts': 'Apparel & Accessories > Clothing > Shirts & Tops',
  'Long Sleeve Shirts': 'Apparel & Accessories > Clothing > Shirts & Tops',
  Hats: 'Apparel & Accessories > Clothing Accessories > Hats',
  'Tote Bags': 'Apparel & Accessories > Handbags, Wallets & Cases > Handbags',
};
const ACTIVEWEAR = 'Apparel & Accessories > Clothing > Activewear';

/**
 * Printful clothing the storefront lists (Quiet Current, Counter-Diagonal).
 * Google needs colour, size, gender and age group for apparel in the US and
 * much of the EU.
 */
function clothingItem(p: FeedProduct, o: Record<string, string>): Item | null {
  if (!isClothingProduct(p) || !isListedProduct(p)) return null;
  const womens = (APPAREL_PRODUCT_TYPES as readonly string[]).includes(
    p.productType,
  );
  const color = o.Color ?? o.Colour ?? '';
  const detail = [o.Size, color].filter(Boolean).join(', ');
  return {
    line: 'apparel',
    title: detail ? `${p.title} — ${detail}` : p.title,
    size: o.Size ?? '',
    material: '',
    color,
    google_product_category: womens
      ? ACTIVEWEAR
      : (APPAREL_CATEGORY[p.productType] ?? 'Apparel & Accessories > Clothing'),
    gender: womens ? 'female' : 'unisex',
    age_group: 'adult',
    custom_label_0:
      clothingCapsules([p])[0]?.title ??
      CAPSULE_TAGS.find((tag) => p.tags.includes(tag)) ??
      '',
  };
}

function itemFor(p: FeedProduct, o: Record<string, string>) {
  if (p.handle === 'your-sky-star-map') return skyItem(o);
  const art = p.tags.includes('Clara Mendes Original')
    ? studioItem(p, o)
    : p.tags.includes('Museum Reproduction')
      ? museumItem(p, o)
      : null;
  return art ?? clothingItem(p, o);
}

// One quote prices every row with the same key: a fixed line per product
// type, a museum Printful line, or one clothing product (Printful files
// garments into different shipping profiles).
function quoteKeyFor(p: FeedProduct, line: FeedLine) {
  if (line === 'apparel') return `apparel:${p.handle}`;
  return isPrintfulLine(line) ? line : `${line}:${p.productType}`;
}

/**
 * Rows for one feed (`fixed` or `printful` lines) in one market: variants for
 * sale there (or all, `withUnavailable`) that have a SKU and an image. Throws when a price is not in the
 * market's currency (the US before it has its own USD market).
 */
export function merchantFeedRows(
  products: FeedProduct[],
  feed: 'fixed' | 'printful',
  market: FeedMarket = 'CY',
  {withUnavailable = false}: {withUnavailable?: boolean} = {},
) {
  const currency = FEED_CURRENCY[market];
  const rows: FeedRow[] = [];
  for (const p of products) {
    for (const v of p.variants.nodes) {
      const options = Object.fromEntries(
        v.selectedOptions.map((s) => [s.name, s.value]),
      );
      const item = itemFor(p, options);
      const image = v.image?.url ?? p.featuredImage?.url;
      if (!item || !v.sku || !image) continue;
      if (!v.availableForSale && !withUnavailable) continue;
      if (isPrintfulLine(item.line) !== (feed === 'printful')) continue;
      if (v.price.currencyCode !== currency)
        throw new Error(
          `${market} prices are in ${v.price.currencyCode}, not ${currency}`,
        );
      const params = new URLSearchParams([
        [MARKET_URL_PARAM, market],
        ...v.selectedOptions.map((s) => [s.name, s.value]),
      ]);
      rows.push({
        gender: '',
        age_group: '',
        custom_label_0: '',
        ...item,
        id: v.sku,
        variantId: v.id,
        productTitle: p.title.replace(/\s+/g, ' ').trim().slice(0, 150),
        quoteKey: quoteKeyFor(p, item.line),
        item_group_id: p.handle,
        title: item.title.slice(0, 150),
        description: p.description.replace(/\s+/g, ' ').trim().slice(0, 4900),
        link: `https://shopclaramendes.com/products/${p.handle}?${params}`,
        image_link: image,
        price: `${Number(v.price.amount).toFixed(2)} ${v.price.currencyCode}`,
        availability: v.availableForSale ? 'in stock' : 'out of stock',
        condition: 'new',
        brand: 'Clara Mendes',
        identifier_exists: 'no',
      });
    }
  }
  return rows;
}

function handlingFor(line: FeedLine) {
  if (!isPrintfulLine(line)) return HANDLING.prodigi;
  return line === 'mug' || line === 'blanket'
    ? HANDLING.sublimation
    : HANDLING.cutSew;
}

function rowShipping(row: FeedRow, shipping: FeedShipping) {
  const handling = handlingFor(row.line);
  if (shipping.market === 'US') {
    const rate = shipping.quotes[row.quoteKey];
    if (!rate) throw new Error(`No US checkout rate for ${row.quoteKey}`);
    return [usShippingCell(rate, handling)];
  }
  const omit = shipping.includeUs ? [] : ['US'];
  if (!isPrintfulLine(row.line))
    return shippingCells(FIXED_RATES[row.line], handling, omit);
  // Printful profiles charge one rate across Europe; Cyprus is quoted too,
  // because the Quiet Current profile prices it apart. No Cyprus quote: the
  // item doesn't list Cyprus.
  const eu = shipping.quotes?.eu[row.quoteKey];
  if (!eu) throw new Error(`No checkout rate for ${row.quoteKey}`);
  const cyprus = shipping.quotes?.cyprus[row.quoteKey];
  const cells = shippingCells({cyprus: cyprus ?? eu, eu}, handling, omit);
  return cyprus ? cells : cells.filter((cell) => !cell.startsWith('CY:'));
}

/** Header row, then one row per item; shipping columns repeat per country. */
export function merchantFeedTsv(
  rows: FeedRow[],
  shipping: FeedShipping = {market: 'CY', includeUs: true},
) {
  const cells = rows.map((row) => rowShipping(row, shipping));
  const width = Math.max(0, ...cells.map((c) => c.length));
  const pad = (values: string[]) => [
    ...values,
    ...Array(width - values.length).fill(''),
  ];
  const lines = [
    [...FEED_COLUMNS, ...Array(width).fill(SHIPPING_COLUMN)].join('\t'),
  ];
  rows.forEach((row, i) => {
    const values = FEED_COLUMNS.map((column) =>
      row[column].replace(/\s+/g, ' '),
    );
    lines.push([...values, ...pad(cells[i])].join('\t'));
  });
  return `${lines.join('\n')}\n`;
}

export const META_COUNTRY_COLUMNS = [
  'id',
  'override',
  'title',
  'price',
  'link',
  'availability',
] as const;

/**
 * A Meta catalog country feed: the US price, landing page and availability
 * of each item, by id, and the product-level title, so ad cards read
 * "Counter-Diagonal Tee" rather than the variant's "— M, Ivory". Build it
 * from rows `withUnavailable`: an item Shopify can't deliver to the US is not
 * for sale there, so it reads "out of stock" and US ads never show it.
 */
export function metaCountryFeedTsv(rows: FeedRow[], country: 'US') {
  const lines = [META_COUNTRY_COLUMNS.join('\t')];
  for (const row of rows)
    lines.push(
      [
        row.id,
        country,
        row.productTitle,
        row.price,
        row.link,
        row.availability,
      ].join('\t'),
    );
  return `${lines.join('\n')}\n`;
}
