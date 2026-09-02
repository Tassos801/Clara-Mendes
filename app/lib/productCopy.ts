import artCatalog from '../../data/original-art-catalog.json' with {type: 'json'};

type ProductCopyInput = {
  description?: string | null;
  handle?: string | null;
  productType?: string | null;
  title?: string | null;
};

const ORIGINAL_ART_STORIES = new Map(
  artCatalog.map((product) => [product.handle, product.story]),
);

export function getProductStory(product: Pick<ProductCopyInput, 'handle'>) {
  const handle = product.handle?.trim().toLowerCase();
  return handle ? (ORIGINAL_ART_STORIES.get(handle) ?? null) : null;
}

const CURATED_PRODUCT_DESCRIPTIONS: Record<string, string> = {
  // Device list must stay in sync with data/art-product-extensions.json
  // deviceVariants — enforced by scripts/productCopy.node-test.mjs.
  'art-premium-fleece-blanket-30x40':
    'The full capsule composition printed across a premium fleece blanket, 30 × 40 in. Soft-touch fleece with an all-over print of the original Clara Mendes artwork, made to order for sofas, reading chairs, and slow evenings.',
  'art-snap-phone-case':
    'Original Clara Mendes artwork wrapped edge to edge around a slim snap phone case. Impact-resistant polycarbonate with an all-over matte print, made to order for iPhone 15, iPhone 15 Pro, iPhone 15 Plus and iPhone 15 Pro Max.',
  'classic-framed-art-print-16x20':
    'A Natural classic picture frame sold without artwork, available in 8 × 10, 16 × 20, and 20 × 24 inch sizes. Satin-laminated solid wood, a 20 mm face, shatterproof clear Perspex, removable backing, and a wall hanger are included; print and decorative mat are not included.',
  'fine-art-greeting-card':
    'Original Clara Mendes artwork on a blank 5 × 7 inch greeting card, printed to order. Heavyweight 324gsm Mohawk fine-art card with a kraft envelope, left blank inside for your own words; choose the art capsule that suits the occasion. Sent by letter post.',
  'fine-art-postcard':
    'Original Clara Mendes artwork as a 7 × 5 inch postcard, printed to order. Premium 324gsm Mohawk card with a smooth white surface; choose the art capsule that suits your space, send it, or pin it where you will see it every day. Sent by letter post.',
  'alba-cotton-linen-cushion':
    'A thick cotton-linen cushion for everyday comfort, sofa layering, and quiet bedroom styling. Choose the cover for an existing insert or the full cushion when building a room from scratch.',
  'ayla-cotton-bath-towel':
    'A soft cotton bath towel with a calm tonal finish for everyday bathrooms and guest spaces. The generous size works for daily use while keeping the room light, warm, and uncluttered.',
  'clara-waffle-cotton-throw':
    'A quietly textured cotton throw for sofas, reading chairs, and slow evening rituals. The waffle weave adds depth without visual noise, making it easy to layer across calm interiors.',
  'drawer-reset-bundle':
    'A compact organization set for bathroom drawers, vanity corners, and daily essentials. Use it to gather small pieces into clear zones while keeping counters and cabinets calmer.',
  'luma-tassel-cotton-throw':
    'A light cotton throw finished with understated tassels. Drape it over a sofa arm, fold it at the end of a bed, or keep it close for soft everyday layering.',
  'mara-linen-dining-placemat':
    'A linen-look dining placemat for simple table settings, breakfast trays, and layered entertaining. The flat woven texture grounds each place setting without adding visual clutter.',
  'nora-round-cotton-trivet':
    'A round woven cotton trivet for mugs, bowls, candles, and warm serving dishes. It adds a small natural texture to the table and works easily in multiples.',
  'sera-woven-table-runner':
    'A woven table runner for quiet dining tables, consoles, and low shelves. Its cotton-linen texture adds a collected layer without making the room feel formal.',
  'soft-reset-candle':
    'A simple scented candle for winding down, resetting the room, and gifting without overthinking it. Place it on a heat-safe surface and let it add a softer rhythm to the evening.',
  'sol-linen-cushion-cover':
    'A plain linen-look cushion cover for easy sofa and bed refreshes. The simple surface keeps the room quiet while adding a tactile layer to everyday seating.',
  'tali-tassel-table-mat':
    'A tassel-edged table mat for warm serving pieces, teapots, candles, and layered dining settings. The natural woven look brings a quiet handmade note to the table.',
  'the-home-ritual-warmer':
    'A soft-glow candle warmer for slow evenings, tidy desks, and no-flame home rituals. Pair it with a compatible candle to bring warmth and atmosphere into the room.',
  'vale-walnut-storage-tray':
    'A walnut-tone wooden tray for keys, bedside objects, candles, or dining-table fruit. Its low profile gathers everyday pieces without feeling overdesigned.',
};

/**
 * Product types whose descriptions carry a full spec sheet (paper, inks,
 * size, device fit) for SEO and other channels; the on-page lede only needs
 * the opening line.
 */
const SPEC_SHEET_PRODUCT_TYPES = new Set([
  'art prints',
  'blankets',
  'cards',
  'framed art',
  'frames',
  'phone cases',
  'postcards',
]);

export function getProductLede(product: ProductCopyInput) {
  const description = getProductDescription(product);
  const productType = product.productType?.toLowerCase() ?? '';
  if (!SPEC_SHEET_PRODUCT_TYPES.has(productType)) return description;

  const sentenceEnd = description.indexOf('. ');
  return sentenceEnd === -1
    ? description
    : description.slice(0, sentenceEnd + 1);
}

export function getProductDescription(product: ProductCopyInput) {
  const handle = product.handle?.toLowerCase();
  if (handle && CURATED_PRODUCT_DESCRIPTIONS[handle]) {
    return CURATED_PRODUCT_DESCRIPTIONS[handle];
  }

  const cleanedDescription = cleanProductDescription(product.description);
  if (cleanedDescription) return cleanedDescription;

  const descriptor = product.productType?.toLowerCase() || 'piece';
  return `A considered ${descriptor} selected for calm rooms, useful rituals, and everyday living.`;
}

/**
 * Repairs sentence boundaries that lost their separating space when Shopify
 * flattened adjacent HTML paragraphs into the plain-text description
 * (e.g. "balance.An original" -> "balance. An original").
 *
 * The match is deliberately narrow — a lowercase letter, terminal
 * punctuation, then a capitalized word — so decimals (34.00), initials
 * (U.S.), dimensions (8 × 10 in), URLs, and filenames are left untouched.
 */
export function normalizeSentenceSpacing(text: string) {
  return text.replace(/([a-z][.!?])([A-Z][a-z])/g, '$1 $2');
}

function cleanProductDescription(description?: string | null) {
  if (!description) return '';

  return normalizeSentenceSpacing(description)
    .replace(/\s*Supplier reference:\s*\S+/gi, '')
    .replace(
      /\s*Shipping and returns details to be added before launch\.?/gi,
      '',
    )
    .replace(
      /\s*Materials, dimensions, and care details to be confirmed with the supplier\.?/gi,
      '',
    )
    .replace(
      /\s*Materials and care details to be confirmed with the supplier\.?/gi,
      '',
    )
    .replace(
      /\s*Wax, wick, fragrance, allergens, and care details to be confirmed with the supplier\.?/gi,
      '',
    )
    .replace(
      /\s*Includes one candle with scent notes and burn guidance to be finalized before publishing\.?/gi,
      '',
    )
    .replace(
      /\s*Includes one candle warmer lamp; bulb, plug, voltage, and certification details to be confirmed before publishing\.?/gi,
      '',
    )
    .replace(
      /\s*Includes organizer pieces and suggested use cases to be finalized before publishing\.?/gi,
      '',
    )
    .replace(/\s+/g, ' ')
    .trim();
}
