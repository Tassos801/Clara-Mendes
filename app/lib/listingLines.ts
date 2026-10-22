// Relative imports keep this module loadable by the plain-Node test runner.
import {isClothingProductType} from './clothing.ts';
import {isPersonalisedProductType} from './storefrontBasics.ts';

/**
 * Product lines of the studio's own products, in the order the shop's
 * "Featured" listing rotates through them: one print, one case, one
 * garment, one nook, one pot, one card, one star map, one of anything
 * else, then round again. The mix is the brand, so the first screen of
 * the shop shows it instead of whatever line was released last.
 */
export const LINE_ORDER = [
  'prints',
  'cases',
  'clothing',
  'nooks',
  'pots',
  'cards',
  'sky',
  'other',
] as const;

export type Line = (typeof LINE_ORDER)[number];

const TYPE_LINES: Record<string, Line> = {
  'Art Prints': 'prints',
  'Phone Cases': 'cases',
  'Book Nooks': 'nooks',
  'Plant Pots': 'pots',
  Cards: 'cards',
  Postcards: 'cards',
};

export function productLine(product: {productType?: string | null}): Line {
  const type = product.productType?.trim();
  if (!type) return 'other';
  if (Object.hasOwn(TYPE_LINES, type)) return TYPE_LINES[type];
  if (isClothingProductType(type)) return 'clothing';
  if (isPersonalisedProductType(type)) return 'sky';
  return 'other';
}

/**
 * Round-robin over the lines: the first product of each line in
 * LINE_ORDER, then the second of each, and so on. Within a line the
 * input order is kept. Returns a new array; the input is not changed.
 */
export function rotateByLine<T extends {productType?: string | null}>(
  products: readonly T[],
): T[] {
  const buckets = new Map<Line, T[]>(LINE_ORDER.map((line) => [line, []]));
  for (const product of products) buckets.get(productLine(product))!.push(product);
  const out: T[] = [];
  let took = true;
  while (took) {
    took = false;
    for (const line of LINE_ORDER) {
      const next = buckets.get(line)!.shift();
      if (next !== undefined) {
        out.push(next);
        took = true;
      }
    }
  }
  return out;
}
