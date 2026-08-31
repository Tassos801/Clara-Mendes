/**
 * The First Light birth poster: one Shopify product, six variants
 * (Size × Finish), each mapped to the same Prodigi SKUs as Your Sky — the
 * sheet and frame are identical; only the artwork differs per order.
 */
import {SKY_SIZES, type SkySizeKey, type SkyVariant} from '../sky/products.ts';

export const NATAL_PRODUCT_HANDLE = 'first-light-birth-poster';
export const NATAL_PRODUCT_TYPE = 'Personalised Art';

/** Same two sheets as the sky product. */
export const NATAL_SIZES = SKY_SIZES;
export type NatalSizeKey = SkySizeKey;

/** Variant SKU (set on the Shopify variant) → Prodigi SKU + attributes. */
export const NATAL_VARIANTS: Record<string, SkyVariant> = {
  'CM-NATAL-8X10-UNF': {
    size: '8x10',
    finish: 'unframed',
    prodigiSku: 'GLOBAL-FAP-8X10',
    attributes: {},
  },
  'CM-NATAL-8X10-NAT': {
    size: '8x10',
    finish: 'natural',
    prodigiSku: 'GLOBAL-CFP-8X10',
    attributes: {color: 'natural'},
  },
  'CM-NATAL-8X10-BLK': {
    size: '8x10',
    finish: 'black',
    prodigiSku: 'GLOBAL-CFP-8X10',
    attributes: {color: 'black'},
  },
  'CM-NATAL-20X24-UNF': {
    size: '20x24',
    finish: 'unframed',
    prodigiSku: 'GLOBAL-FAP-20X24',
    attributes: {},
  },
  'CM-NATAL-20X24-NAT': {
    size: '20x24',
    finish: 'natural',
    prodigiSku: 'GLOBAL-CFP-20X24',
    attributes: {color: 'natural'},
  },
  'CM-NATAL-20X24-BLK': {
    size: '20x24',
    finish: 'black',
    prodigiSku: 'GLOBAL-CFP-20X24',
    attributes: {color: 'black'},
  },
};

export function natalVariantForSku(
  sku: string | null | undefined,
): SkyVariant | null {
  if (!sku) return null;
  return NATAL_VARIANTS[sku.trim().toUpperCase()] ?? null;
}
