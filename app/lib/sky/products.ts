/**
 * The star-map product: one Shopify product, six variants (Size × Finish),
 * each mapped to a Prodigi SKU. The mapping lives here (not in Prodigi's
 * Shopify app) because the artwork is per order.
 */
export const SKY_PRODUCT_HANDLE = 'your-sky-star-map';
export const SKY_PRODUCT_TYPE = 'Personalised Art';

export type SkySizeKey = '8x10' | '20x24';
export type SkyFinish = 'unframed' | 'natural' | 'black';

export const SKY_FINISH_LABELS: Record<SkyFinish, string> = {
  unframed: 'Unframed',
  natural: 'Natural frame',
  black: 'Black frame',
};

export type SkySize = {
  label: string;
  /** Exact Shopify option value for `Size`. */
  optionValue: string;
  inches: [number, number];
  /** PDF page size (inches × 72). */
  points: [number, number];
  /** Prodigi recommended pixels at 300 dpi. */
  pixels: [number, number];
};

export const SKY_SIZES: Record<SkySizeKey, SkySize> = {
  '8x10': {
    label: '8 × 10 in',
    optionValue: '8 × 10 in',
    inches: [8, 10],
    points: [576, 720],
    pixels: [2400, 3000],
  },
  '20x24': {
    label: '20 × 24 in (50 × 60 cm)',
    optionValue: '20 × 24 in',
    inches: [20, 24],
    points: [1440, 1728],
    pixels: [6000, 7200],
  },
};

export type SkyVariant = {
  size: SkySizeKey;
  finish: SkyFinish;
  prodigiSku: string;
  attributes: Record<string, string>;
};

/**
 * Prodigi rejects an order item unless every catalogue attribute is set,
 * even where only one option exists. Exact strings from
 * `GET /v4.0/products/<sku>` (sandbox readback 2026-09-01; asserted by
 * `scripts/sky-check-prodigi.mjs` before any go-live).
 */
export const PRODIGI_FAP_ATTRIBUTES: Record<string, string> = {
  paperType: 'EMA',
  substrateWeight: '200gsm',
};

export function prodigiCfpAttributes(
  color: 'natural' | 'black',
): Record<string, string> {
  return {
    color,
    frame: 'Classic',
    glaze: 'Acrylic / Perspex',
    mount: 'No mount / Mat',
    ...PRODIGI_FAP_ATTRIBUTES,
  };
}

/** Variant SKU (set on the Shopify variant) → Prodigi SKU + attributes. */
export const SKY_VARIANTS: Record<string, SkyVariant> = {
  'CM-SKY-8X10-UNF': {
    size: '8x10',
    finish: 'unframed',
    prodigiSku: 'GLOBAL-FAP-8X10',
    attributes: PRODIGI_FAP_ATTRIBUTES,
  },
  'CM-SKY-8X10-NAT': {
    size: '8x10',
    finish: 'natural',
    prodigiSku: 'GLOBAL-CFP-8X10',
    attributes: prodigiCfpAttributes('natural'),
  },
  'CM-SKY-8X10-BLK': {
    size: '8x10',
    finish: 'black',
    prodigiSku: 'GLOBAL-CFP-8X10',
    attributes: prodigiCfpAttributes('black'),
  },
  'CM-SKY-20X24-UNF': {
    size: '20x24',
    finish: 'unframed',
    prodigiSku: 'GLOBAL-FAP-20X24',
    attributes: PRODIGI_FAP_ATTRIBUTES,
  },
  'CM-SKY-20X24-NAT': {
    size: '20x24',
    finish: 'natural',
    prodigiSku: 'GLOBAL-CFP-20X24',
    attributes: prodigiCfpAttributes('natural'),
  },
  'CM-SKY-20X24-BLK': {
    size: '20x24',
    finish: 'black',
    prodigiSku: 'GLOBAL-CFP-20X24',
    attributes: prodigiCfpAttributes('black'),
  },
};

export function skyVariantForSku(
  sku: string | null | undefined,
): SkyVariant | null {
  if (!sku) return null;
  return SKY_VARIANTS[sku.trim().toUpperCase()] ?? null;
}

export function skySizeFromOptions(
  options: ReadonlyArray<{name: string; value: string}> | null | undefined,
): SkySizeKey {
  const value = (
    options?.find((o) => o.name.toLowerCase() === 'size')?.value ?? ''
  )
    .replace(/\s/g, '')
    .toLowerCase();
  return value.startsWith('20×24') || value.startsWith('20x24')
    ? '20x24'
    : '8x10';
}

export function skyFinishFromOptions(
  options: ReadonlyArray<{name: string; value: string}> | null | undefined,
): SkyFinish {
  const value =
    options
      ?.find((option) => option.name.trim().toLowerCase() === 'finish')
      ?.value.trim()
      .toLowerCase() ?? '';
  if (value === 'natural frame') return 'natural';
  if (value === 'black frame') return 'black';
  return 'unframed';
}
