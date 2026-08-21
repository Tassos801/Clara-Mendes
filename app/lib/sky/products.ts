/**
 * The star-map product: one Shopify product, six variants (Size × Finish),
 * each mapped to a Prodigi SKU. The mapping lives here (not in Prodigi's
 * Shopify app) because the artwork is per order.
 */
export const SKY_PRODUCT_HANDLE = 'your-sky-star-map';
export const SKY_PRODUCT_TYPE = 'Personalised Art';

export type SkySizeKey = '8x10' | '20x24';
export type SkyFinish = 'unframed' | 'natural' | 'black';

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

/** Variant SKU (set on the Shopify variant) → Prodigi SKU + attributes. */
export const SKY_VARIANTS: Record<string, SkyVariant> = {
  'CM-SKY-8X10-UNF': {
    size: '8x10',
    finish: 'unframed',
    prodigiSku: 'GLOBAL-FAP-8X10',
    attributes: {},
  },
  'CM-SKY-8X10-NAT': {
    size: '8x10',
    finish: 'natural',
    prodigiSku: 'GLOBAL-CFP-8X10',
    attributes: {color: 'natural'},
  },
  'CM-SKY-8X10-BLK': {
    size: '8x10',
    finish: 'black',
    prodigiSku: 'GLOBAL-CFP-8X10',
    attributes: {color: 'black'},
  },
  'CM-SKY-20X24-UNF': {
    size: '20x24',
    finish: 'unframed',
    prodigiSku: 'GLOBAL-FAP-20X24',
    attributes: {},
  },
  'CM-SKY-20X24-NAT': {
    size: '20x24',
    finish: 'natural',
    prodigiSku: 'GLOBAL-CFP-20X24',
    attributes: {color: 'natural'},
  },
  'CM-SKY-20X24-BLK': {
    size: '20x24',
    finish: 'black',
    prodigiSku: 'GLOBAL-CFP-20X24',
    attributes: {color: 'black'},
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
