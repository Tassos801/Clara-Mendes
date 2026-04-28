type ProductCopyInput = {
  description?: string | null;
  handle?: string | null;
  productType?: string | null;
  title?: string | null;
};

const CURATED_PRODUCT_DESCRIPTIONS: Record<string, string> = {
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

function cleanProductDescription(description?: string | null) {
  if (!description) return '';

  return description
    .replace(/\s*Supplier reference:\s*\S+/gi, '')
    .replace(/\s*Shipping and returns details to be added before launch\.?/gi, '')
    .replace(/\s*Materials, dimensions, and care details to be confirmed with the supplier\.?/gi, '')
    .replace(/\s*Materials and care details to be confirmed with the supplier\.?/gi, '')
    .replace(/\s*Wax, wick, fragrance, allergens, and care details to be confirmed with the supplier\.?/gi, '')
    .replace(/\s*Includes one candle with scent notes and burn guidance to be finalized before publishing\.?/gi, '')
    .replace(/\s*Includes one candle warmer lamp; bulb, plug, voltage, and certification details to be confirmed before publishing\.?/gi, '')
    .replace(/\s*Includes organizer pieces and suggested use cases to be finalized before publishing\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}
