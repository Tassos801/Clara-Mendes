import {productArtistFullName, titleWithArtist} from './artistShops.ts';
import {isListedProduct} from './catalogFilters.ts';
import {
  clothingCapsules,
  isClothingProduct,
  type ApprovalMetafield,
} from './clothing.ts';
import {imagesForColour, isColourOptionName} from './garmentColours.ts';
import {MARKET_URL_PARAM} from './markets.ts';
import {
  FIXED_RATES,
  HANDLING,
  SHIPPING_COLUMN,
  feedAmount,
  shippingCells,
  usFixedRate,
  usShippingCell,
  type FixedRateLine,
} from './merchantFeedShipping.ts';
import {
  isPrintfulArtProduct,
  printfulShippingFee,
  type ShippingFee,
} from './printfulShipping.ts';
import {getProductDescription} from './productCopy.ts';
import {
  filterGalleryImagesForSize,
  selectedPrintSize,
} from './productSizePresentation.ts';
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
// new products follow the store without file uploads. A feed only reads the
// catalogue: every delivery rate comes from a checked-in table (the fixed EUR
// rates in merchantFeedShipping.ts, checkout quotes in
// printfulShippingFees.ts), never from a cart.
//
// Item ids are SKUs and titles follow the manual uploads (2026-08-12 to
// 2026-10-29), so switching to the fetched feeds kept every offer. An item
// has the same id in the EUR and USD feeds (two feed labels in Merchant
// Center; Meta's country feed overrides it by id). Links pin the market with
// `?country=` (app/lib/markets.ts): Googlebot crawls as a US buyer, and the
// landing page must show the feed's currency.
//
// A reduced price reaches a feed only from the product itself: a variant
// with a compare-at price above its price lists the compare-at price as
// `price` and what the buyer pays as `sale_price`, the same two prices the
// product page shows. A discount that acts in the cart (Black Friday 2026)
// is not in the feeds: the page still shows the full price, and a feed
// price the page does not show gets the item disapproved.

// prettier-ignore
export const FEED_COLUMNS = [
  'id', 'item_group_id', 'title', 'description', 'link', 'image_link',
  'additional_image_link', 'price', 'sale_price', 'availability', 'condition',
  'brand', 'google_product_category', 'product_type', 'size', 'material',
  'color', 'identifier_exists', 'gender', 'age_group', 'custom_label_0',
] as const;

/** The market a feed lists, and the currency its prices must be in. */
export type FeedMarket = 'CY' | 'US';
export const FEED_CURRENCY: Record<FeedMarket, string> = {CY: 'EUR', US: 'USD'};

// `custom_label_0` names the clothing capsule, so Meta and Google Ads can
// group a line into a product set (custom_label_0 = Counter-Diagonal): the
// title of the product's capsule collection (the same rule as /clothing, so
// a new artist capsule carries its name), else a capsule tag from the
// shared product contract.
export const CAPSULE_TAGS = ['Counter-Diagonal'] as const;

export type FeedVariant = {
  sku?: string | null;
  availableForSale: boolean;
  price: {amount: string; currencyCode: string};
  /** The price before a reduction, when the variant has one (sale_price). */
  compareAtPrice?: {amount: string; currencyCode: string} | null;
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
  /** The description's HTML: its list items are the product facts. */
  descriptionHtml?: string | null;
  featuredImage?: {url: string} | null;
  /** Every product image in the merchant's order (additional_image_link). */
  images?: {nodes: Array<{url: string; altText?: string | null}>} | null;
  options?: Array<{name: string; optionValues: Array<{name: string}>}> | null;
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
/** The market a feed's `shipping` values are for. */
export type FeedShipping =
  | {
      market: 'CY';
      /** False once the US market sells in USD: the USD feeds list the US. */
      includeUs: boolean;
    }
  | {market: 'US'};

export type FeedRow = Record<(typeof FEED_COLUMNS)[number], string> & {
  line: FeedLine;
  /**
   * Printful lines: checkout's fee to the row's market (the EU for the EUR
   * feeds) from the fee table, or null when the table has none for the piece.
   */
  printfulFee: ShippingFee | null;
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
// Museum product types (Floating World, Line and Colour): shipping table,
// Google category and material. 'printful' lines resolve per variant, and
// only for products Printful makes (isPrintfulArtProduct); a Prodigi mug,
// blanket or cushion has no table yet and stays out of the feeds. Their
// materials are the Printful pieces': a polyester throw, a polyester cushion
// cover (and insert), a ceramic mug, as each product page states.
const MUSEUM: Record<string, [FixedRateLine | 'printful', string, string]> = {
  'Art Prints': ['print', ART, PAPER],
  'Hanger Prints': ['print', ART, `${PAPER} with wooden hanger`],
  'Acrylic Prints': ['mounted', ART, '10 mm high-gloss acrylic'],
  'Metal Prints': ['mounted', ART, 'Matte aluminium (Dibond)'],
  'Canvas Art': ['canvas', ART, 'Stretched canvas'],
  'Framed Art': ['framed', ART, `Natural wood frame, ${PAPER.toLowerCase()}`],
  Cards: ['card', CARD, 'Fine-art card with envelope'],
  Postcards: ['card', CARD, 'Fine-art card'],
  Mugs: [
    'printful',
    'Home & Garden > Kitchen & Dining > Tableware > Drinkware > Mugs',
    'Ceramic',
  ],
  Cushions: ['printful', 'Home & Garden > Decor > Throw Pillows', 'Polyester'],
  Blankets: [
    'printful',
    'Home & Garden > Linens & Bedding > Bedding > Blankets',
    'Polyester',
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

// The Printful home lines (blankets, cushions, mugs) lead with the product,
// not the work. A search engine weighs a title's first words most, and with
// the work first ("The Milkmaid Throw Blanket by Vermeer") Google showed
// these for searches for the painting: in the first week of Shopping ads
// (November 2026) most clicks came from terms with no product word. The artist's
// whole name is there because people type it ("william morris cushion"),
// and the metric size because the EUR feeds' buyers use it.
const HOME_TITLES: Record<
  string,
  {suffix: string; lead: (o: Record<string, string>) => string}
> = {
  Blankets: {suffix: 'Throw Blanket', lead: () => 'Throw Blanket'},
  Cushions: {
    suffix: 'Cushion',
    lead: (o) =>
      o.Filling === 'With insert' ? 'Cushion with Insert' : 'Cushion Cover',
  },
  Mugs: {suffix: 'Mug', lead: () => 'Ceramic Mug'},
};
const METRIC_SIZES: Record<string, string> = {
  '50 × 60 in': '127 × 152 cm',
  '18 × 18 in': '46 × 46 cm',
  '22 × 22 in': '56 × 56 cm',
  '11 oz': '325 ml',
};

type HomeProduct = Pick<
  FeedProduct,
  'handle' | 'productType' | 'tags' | 'title'
>;

/**
 * What a home line's feed title and description are built from: the product
 * words, the work with its artist (and an edition name, ", Art & Words",
 * after the artist) and the size in both units. Null when the title does
 * not end the way its family's titles do.
 */
function homeParts(p: HomeProduct, o: Record<string, string>) {
  const spec = HOME_TITLES[p.productType];
  if (!spec) return null;
  const at = p.title.lastIndexOf(` ${spec.suffix}`);
  if (at <= 0) return null;
  const work = p.title.slice(0, at);
  const edition = p.title.slice(at + 1 + spec.suffix.length);
  if (edition && !edition.startsWith(',')) return null;
  const artist = productArtistFullName(p.handle, p.tags);
  const by = artist && !work.includes(artist) ? ` by ${artist}` : '';
  const metric = METRIC_SIZES[o.Size ?? ''];
  return {
    lead: spec.lead(o),
    work: `${work}${by}${edition}`,
    size: o.Size ? `${o.Size}${metric ? ` (${metric})` : ''}` : '',
  };
}

/**
 * "Throw Blanket, The Milkmaid by Johannes Vermeer — 50 × 60 in (127 × 152
 * cm)" from the Shopify title "The Milkmaid Throw Blanket". An edition name
 * after the product words (", Art & Words") follows the artist. Null when
 * the title does not end the way its family's titles do, so an unusual
 * title keeps the plain form.
 */
export function homeFeedTitle(
  p: HomeProduct,
  o: Record<string, string>,
): string | null {
  const parts = homeParts(p, o);
  if (!parts) return null;
  return `${parts.lead}, ${parts.work}${parts.size ? ` — ${parts.size}` : ''}`;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** The text of each list item in a description's HTML, as plain text. */
function listItems(html: string | null | undefined) {
  return [...(html ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) =>
      match[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, name: string) => {
          if (name[0] !== '#') return ENTITIES[name.toLowerCase()] ?? entity;
          const hex = name[1].toLowerCase() === 'x';
          const code = parseInt(name.slice(hex ? 2 : 1), hex ? 16 : 10);
          return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
        })
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean);
}

/**
 * A home line's feed description: what the item is, then the page's copy.
 * The page opens with the work's story (right for a reader who has already
 * chosen the blanket), and the product facts follow some 400 characters in.
 * A search engine reads a description's opening as what the item is, so
 * with the story first these were matched to searches for the painting, as
 * their titles once were (HOME_TITLES above). The feed therefore opens with
 * one sentence naming the product, the work and the size, moves the page's
 * own product facts (the description's list items) up behind it, and keeps
 * the rest of the page's copy in its order. Nothing but that first sentence
 * is added, and a fact the page's copy does not hold is not brought in.
 * Null for other lines and unusual titles, which keep the page's copy.
 */
export function homeFeedDescription(
  p: HomeProduct & Pick<FeedProduct, 'descriptionHtml'>,
  o: Record<string, string>,
  page: string,
): string | null {
  const parts = homeParts(p, o);
  if (!parts) return null;
  const product = parts.lead.charAt(0) + parts.lead.slice(1).toLowerCase();
  const size = parts.size ? `, ${parts.size}` : '';
  const facts: string[] = [];
  let rest = page.replace(/\s+/g, ' ').trim();
  for (const fact of listItems(p.descriptionHtml)) {
    const at = rest.indexOf(fact);
    if (at < 0) continue;
    facts.push(/[.!?]$/.test(fact) ? fact : `${fact}.`);
    rest = `${rest.slice(0, at)} ${rest.slice(at + fact.length)}`;
  }
  return [`${product} printed with ${parts.work}${size}.`, ...facts, rest]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function museumItem(p: FeedProduct, o: Record<string, string>): Item | null {
  const spec = MUSEUM[p.productType];
  if (!spec) return null;
  const [table, category, material] = spec;
  if (table === 'printful' && !isPrintfulArtProduct(p.handle)) return null;
  const name = titleWithArtist(p.title, p.handle, p.tags);
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
    title:
      (table === 'printful' ? homeFeedTitle(p, o) : null) ??
      (o.Size ? `${name} — ${o.Size}${extra}` : name),
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

const SECTIONS: Record<FeedLine, string> = {
  print: 'Wall Art',
  mounted: 'Wall Art',
  canvas: 'Wall Art',
  framed: 'Wall Art',
  card: 'Stationery',
  pot: 'Home',
  mug: 'Home',
  'cushion-cover': 'Home',
  'cushion-insert': 'Home',
  blanket: 'Home',
  apparel: 'Clothing',
};

/**
 * `product_type`: the shop's own path to an item, "Home > Blankets >
 * Johannes Vermeer" or "Clothing > Hoodies > Counter-Diagonal". The section,
 * then the Shopify product type (the shop's own type filter), then the
 * artist of a museum work or a garment's capsule. Google reads it beside
 * its own category to place an item, and Google Ads can split a campaign's
 * products by any level of it.
 */
export function feedProductType(
  p: Pick<FeedProduct, 'handle' | 'productType' | 'tags'>,
  item: Pick<FeedRow, 'line'> & {custom_label_0?: string},
) {
  const name =
    item.line === 'apparel'
      ? item.custom_label_0
      : productArtistFullName(p.handle, p.tags);
  return [SECTIONS[item.line], p.productType, name].filter(Boolean).join(' > ');
}

const money = (amount: number, currencyCode: string) =>
  `${amount.toFixed(2)} ${currencyCode}`;

function itemFor(p: FeedProduct, o: Record<string, string>) {
  if (p.handle === 'your-sky-star-map') return skyItem(o);
  const art = p.tags.includes('Clara Mendes Original')
    ? studioItem(p, o)
    : p.tags.includes('Museum Reproduction')
      ? museumItem(p, o)
      : null;
  return art ?? clothingItem(p, o);
}

/**
 * The fixed-rate shipping table (FIXED_RATES) one variant ships on, as its
 * feed row would: null for Printful lines (their fees come from the Printful
 * fee table) and for anything the feeds don't list. Product JSON-LD uses it,
 * so the page and the feed advertise the same rate.
 */
export function fixedRateLineFor(
  product: Pick<FeedProduct, 'handle' | 'productType' | 'tags'>,
  selectedOptions: ReadonlyArray<{name: string; value: string}>,
): FixedRateLine | null {
  const options = Object.fromEntries(
    selectedOptions.map((option) => [option.name, option.value]),
  );
  const line = itemFor(
    {...product, title: '', description: '', variants: {nodes: []}},
    options,
  )?.line;
  return line && !isPrintfulLine(line) ? line : null;
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
      // The description the product page shows: supplier placeholder
      // phrases stripped (productCopy.ts), curated copy where it exists.
      const page = getProductDescription(p).replace(/\s+/g, ' ').trim();
      // A reduced price: the compare-at price is the item's price and the
      // variant's price its sale price, as on the product page.
      const now = Number(v.price.amount);
      const before =
        v.compareAtPrice?.currencyCode === currency
          ? Number(v.compareAtPrice.amount)
          : NaN;
      const reduced = before > now;
      rows.push({
        gender: '',
        age_group: '',
        custom_label_0: '',
        ...item,
        id: v.sku,
        printfulFee: isPrintfulLine(item.line)
          ? printfulShippingFee(p, v, market)
          : null,
        productTitle: p.title.replace(/\s+/g, ' ').trim().slice(0, 150),
        item_group_id: p.handle,
        title: item.title.slice(0, 150),
        // The Printful home lines say what the item is first (see
        // homeFeedDescription); every other line states the page's copy.
        description: (
          (isPrintfulLine(item.line) && item.line !== 'apparel'
            ? homeFeedDescription(p, options, page)
            : null) ?? page
        ).slice(0, 4900),
        link: `https://shopclaramendes.com/products/${p.handle}?${params}`,
        image_link: feedImageUrl(image),
        additional_image_link: additionalFeedImages(p, v, image).join(','),
        price: money(reduced ? before : now, currency),
        sale_price: reduced ? money(now, currency) : '',
        product_type: feedProductType(p, item),
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

/** One row's `shipping` values; none when no table has a rate for it. */
function rowShipping(row: FeedRow, shipping: FeedShipping) {
  const handling = handlingFor(row.line);
  if (shipping.market === 'US') {
    const rate = isPrintfulLine(row.line)
      ? row.printfulFee && feedAmount(row.printfulFee)
      : usFixedRate(row.line);
    // Printful's US transit for the museum home goods isn't verified, so
    // they keep the international window; clothing reads the US one.
    const transit =
      isPrintfulLine(row.line) && row.line !== 'apparel'
        ? 'international'
        : 'us';
    return rate ? [usShippingCell(rate, handling, transit)] : [];
  }
  const omit = shipping.includeUs ? [] : ['US'];
  if (!isPrintfulLine(row.line))
    return shippingCells(FIXED_RATES[row.line], handling, omit);
  // Printful charges one fee across the EU, Cyprus included (the fee table's
  // rebuild quotes Cyprus, Germany and Slovakia and stops if they differ).
  if (!row.printfulFee) return [];
  const eu = feedAmount(row.printfulFee);
  return shippingCells({cyprus: eu, eu}, handling, omit);
}

/**
 * False for a row no table prices in the feed's market: a line that does not
 * ship to the US, or a Printful piece the fee table has no group or fee for
 * (printfulShipping.ts). The feed leaves such a row out: listed without its
 * own `shipping`, Merchant Center would price it from the account settings.
 */
export function hasFeedShipping(row: FeedRow, shipping: FeedShipping) {
  return rowShipping(row, shipping).length > 0;
}

/**
 * Header row, then one row per item; shipping columns repeat per country.
 * Throws on a row without a rate rather than guess one (see hasFeedShipping).
 */
export function merchantFeedTsv(
  rows: FeedRow[],
  shipping: FeedShipping = {market: 'CY', includeUs: true},
) {
  const cells = rows.map((row) => {
    const values = rowShipping(row, shipping);
    if (!values.length)
      throw new Error(`No ${shipping.market} delivery rate for ${row.id}`);
    return values;
  });
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
  'sale_price',
  'link',
  'availability',
] as const;

/**
 * A Meta catalog country feed: the US price, landing page and availability
 * of each item, by id, and the product-level title, so ad cards read
 * "Counter-Diagonal Tee" rather than the variant's "— M, Ivory". A reduced
 * price is overridden with it, so a US card never pairs the USD price with
 * the EUR feed's sale price. Build it
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
        row.sale_price,
        row.link,
        row.availability,
      ].join('\t'),
    );
  return `${lines.join('\n')}\n`;
}

// Google reads at most ten more images per item (Meta twenty).
const MAX_ADDITIONAL_IMAGES = 10;

/**
 * The other images of one variant (`additional_image_link`), picked the way
 * the product page's gallery picks them: a garment's images for the
 * variant's colour, an art print's room views at the variant's size. An
 * image another variant has as its own (another artwork, a framed finish)
 * shows that variant, so it stays out. Shoppers see more of the item, and
 * Merchant Center's store quality score counts images per offer.
 */
export function additionalFeedImages(
  p: FeedProduct,
  v: FeedVariant,
  main: string,
): string[] {
  const option = (p.options ?? []).find((o) => isColourOptionName(o.name));
  const colours = option?.optionValues.map((value) => value.name) ?? [];
  const colour = v.selectedOptions.find((o) => isColourOptionName(o.name));
  const variantImages = new Set(p.variants.nodes.map((o) => o.image?.url));
  const gallery = filterGalleryImagesForSize(
    imagesForColour(p.images?.nodes ?? [], colours, colour?.value),
    selectedPrintSize(v.selectedOptions).key,
    p.productType === 'Art Prints',
  );
  const urls = gallery
    .map((image) => image.url)
    .filter((url) => url !== main && !variantImages.has(url));
  return [...new Set(urls)]
    .slice(0, MAX_ADDITIONAL_IMAGES)
    .map((url) => feedImageUrl(url).replace(/,/g, '%2C'));
}

/**
 * The image link a feed states. Shopify's CDN picks the format from the
 * client's Accept header, so a fetcher that accepts WebP gets WebP from a
 * plain file link; Meta's catalogue takes JPEG or PNG only and marks such
 * an item "missing or invalid images". `format=pjpg` makes the CDN serve a
 * JPEG to every client. Other hosts and links that already name a format
 * are left alone.
 */
export function feedImageUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.hostname !== 'cdn.shopify.com') return url;
  if (parsed.searchParams.has('format')) return url;
  parsed.searchParams.set('format', 'pjpg');
  return parsed.toString();
}
