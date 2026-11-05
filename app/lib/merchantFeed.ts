import {
  FIXED_RATES,
  HANDLING,
  SHIPPING_COLUMN,
  shippingCells,
  type FixedRateLine,
} from './merchantFeedShipping.ts';

// Merchant Center product feeds as tab-separated text, served by
// app/routes/feeds.google-merchant[.txt].tsx (every line with a fixed EUR
// rate) and feeds.google-merchant-printful[.txt].tsx (Printful mugs, cushions
// and blankets, EU only). Merchant Center fetches both daily, so prices,
// stock and new products follow the store without file uploads.
//
// Item ids are SKUs and titles follow the manual uploads (2026-08-12 to
// 2026-10-29), so switching to the fetched feeds keeps every offer.

// prettier-ignore
export const FEED_COLUMNS = [
  'id', 'item_group_id', 'title', 'description', 'link', 'image_link', 'price',
  'availability', 'condition', 'brand', 'google_product_category', 'size',
  'material', 'color', 'identifier_exists',
] as const;

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
  description: string;
  featuredImage?: {url: string} | null;
  variants: {nodes: FeedVariant[]};
};

export type PrintfulLine =
  'mug' | 'cushion-cover' | 'cushion-insert' | 'blanket';
/** The shipping table an item uses: a fixed one, or a Printful profile. */
export type FeedLine = FixedRateLine | PrintfulLine;
/** EUR checkout rate per Printful line, quoted on each fetch. */
export type PrintfulRates = Record<PrintfulLine, string>;

export type FeedRow = Record<(typeof FEED_COLUMNS)[number], string> & {
  line: FeedLine;
  variantId: string;
};

type Item = Pick<
  FeedRow,
  'line' | 'title' | 'size' | 'material' | 'color' | 'google_product_category'
>;

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
  'Acrylic Prints': ['print', ART, '10 mm high-gloss acrylic'],
  'Metal Prints': ['print', ART, 'Matt aluminium (Dibond)'],
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

function itemFor(p: FeedProduct, o: Record<string, string>) {
  if (p.handle === 'your-sky-star-map') return skyItem(o);
  if (p.tags.includes('Clara Mendes Original')) return studioItem(p, o);
  if (p.tags.includes('Museum Reproduction')) return museumItem(p, o);
  return null;
}

/**
 * Rows for one feed: `fixed` lines or `printful` lines. Lists variants for
 * sale in Cyprus (the default market) that have a SKU and an image.
 */
export function merchantFeedRows(
  products: FeedProduct[],
  feed: 'fixed' | 'printful',
) {
  const rows: FeedRow[] = [];
  for (const p of products) {
    for (const v of p.variants.nodes) {
      const options = Object.fromEntries(
        v.selectedOptions.map((s) => [s.name, s.value]),
      );
      const item = itemFor(p, options);
      const image = v.image?.url ?? p.featuredImage?.url;
      if (!item || !v.availableForSale || !v.sku || !image) continue;
      if (isPrintfulLine(item.line) !== (feed === 'printful')) continue;
      const params = new URLSearchParams(
        v.selectedOptions.map((s) => [s.name, s.value]),
      );
      rows.push({
        ...item,
        id: v.sku,
        variantId: v.id,
        item_group_id: p.handle,
        title: item.title.slice(0, 150),
        description: p.description.replace(/\s+/g, ' ').trim().slice(0, 4900),
        link: `https://shopclaramendes.com/products/${p.handle}?${params}`,
        image_link: image,
        price: `${Number(v.price.amount).toFixed(2)} ${v.price.currencyCode}`,
        availability: 'in stock',
        condition: 'new',
        brand: 'Clara Mendes',
        identifier_exists: 'no',
      });
    }
  }
  return rows;
}

function rowShipping({line}: FeedRow, printful?: PrintfulRates) {
  if (!isPrintfulLine(line))
    return shippingCells(FIXED_RATES[line], HANDLING.prodigi);
  const rate = printful?.[line];
  if (!rate) throw new Error(`No checkout rate for ${line}`);
  const handling = line.startsWith('cushion')
    ? HANDLING.cutSew
    : HANDLING.sublimation;
  return shippingCells({cyprus: rate, eu: rate}, handling);
}

/** Header row, then one row per item; shipping columns repeat per country. */
export function merchantFeedTsv(rows: FeedRow[], printful?: PrintfulRates) {
  const cells = rows.map((row) => rowShipping(row, printful));
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
