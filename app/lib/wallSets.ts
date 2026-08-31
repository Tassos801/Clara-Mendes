// Relative imports keep this module loadable by the plain-Node test runner,
// which cannot resolve the Vite "~" alias.
import {
  PRINT_SIZE_SPECS,
  type PrintSizeKey,
} from './productSizePresentation.ts';

/**
 * The seven purchasable gallery walls: each is three live prints in one
 * size, bought as three ordinary cart lines in a single submit. Pure data
 * and math — no Shopify products, no flags, no fetching. The purchase UI
 * (`WallSetPurchase`) mounts on the page named by `slug`: the capsule
 * landing page for capsule walls, a curated gallery page for the mixes.
 */
export type WallSet = {
  slug: string;
  kind: 'capsule' | 'mix';
  name: string;
  /** One line under the module heading. */
  story: string;
  /** Print handles in display order, left → right on the wall. */
  handles: [string, string, string];
};

const WALL_SETS: WallSet[] = [
  {
    slug: 'quiet-form',
    kind: 'capsule',
    name: 'The Quiet Form Wall',
    story:
      'Three warm architectural forms that organise a calm room in a single row.',
    handles: [
      'quiet-form-i-art-print',
      'quiet-form-ii-art-print',
      'quiet-form-iii-art-print',
    ],
  },
  {
    slug: 'patina-blue',
    kind: 'capsule',
    name: 'The Patina Blue Wall',
    story:
      'One sustained mineral tone across three layered indigo compositions.',
    handles: [
      'patina-blue-i-art-print',
      'patina-blue-ii-art-print',
      'patina-blue-iii-art-print',
    ],
  },
  {
    slug: 'neo-deco',
    kind: 'capsule',
    name: 'The Neo Deco Wall',
    story:
      'Black geometry hung with even spacing — a dining wall turned deliberate pattern.',
    handles: [
      'neo-deco-i-art-print',
      'neo-deco-ii-art-print',
      'neo-deco-iii-art-print',
    ],
  },
  {
    slug: 'midnight-garden',
    kind: 'capsule',
    name: 'The Midnight Garden Wall',
    story:
      'Three moonlit botanicals that turn a bedroom or stairwell into a slow reveal.',
    handles: [
      'midnight-garden-i-art-print',
      'midnight-garden-ii-art-print',
      'midnight-garden-iii-art-print',
    ],
  },
  {
    slug: 'sunlit-mosaic',
    kind: 'capsule',
    name: 'The Sunlit Mosaic Wall',
    story:
      'Warm collage rhythm in a loose cluster — the liveliest of the five capsules.',
    handles: [
      'sunlit-mosaic-i-art-print',
      'sunlit-mosaic-ii-art-print',
      'sunlit-mosaic-iii-art-print',
    ],
  },
  {
    slug: 'terracotta-gallery-wall',
    kind: 'mix',
    name: 'The Terracotta Thread',
    story: 'Sienna and clay warmth stitched together by small flashes of cobalt.',
    handles: [
      'quiet-form-iii-art-print',
      'sunlit-mosaic-ii-art-print',
      'patina-blue-ii-art-print',
    ],
  },
  {
    slug: 'ink-and-cream-gallery-wall',
    kind: 'mix',
    name: 'Ink & Cream',
    story: 'Charcoal, ink and oxblood carried on ivory — contrast that stays calm.',
    handles: [
      'quiet-form-i-art-print',
      'neo-deco-ii-art-print',
      'midnight-garden-ii-art-print',
    ],
  },
];

const WALL_SETS_BY_SLUG = new Map(WALL_SETS.map((set) => [set.slug, set]));

export function listWallSets(): WallSet[] {
  return WALL_SETS;
}

export function getWallSet(slug?: string | null): WallSet | null {
  if (!slug) return null;
  return WALL_SETS_BY_SLUG.get(slug.trim().toLowerCase()) ?? null;
}

/** Capsule wall first, then mixes — the order links render in on a PDP. */
export function wallSetsContainingHandle(handle?: string | null): WallSet[] {
  const normalized = handle?.trim().toLowerCase();
  if (!normalized) return [];
  return WALL_SETS.filter((set) =>
    set.handles.includes(normalized),
  ).sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'capsule' ? -1 : 1));
}

export const WALL_GUIDE_SIZES = ['8x10', '16x20', '20x24'] as const;

export function wallGuideFileName(slug: string, size: PrintSizeKey) {
  return `${slug}-${size}.pdf`;
}

const GUIDE_FILE_RE = /^(.+)-(8x10|16x20|20x24)\.pdf$/;

export function parseWallGuideFileName(
  file?: string | null,
): {set: WallSet; size: PrintSizeKey} | null {
  const match = file?.match(GUIDE_FILE_RE);
  if (!match) return null;
  const set = getWallSet(match[1]);
  if (!set) return null;
  return {set, size: match[2] as PrintSizeKey};
}

export const WALL_GUIDE_GAP_CM = 7;
export const WALL_GUIDE_CENTRE_CM = 145;

/**
 * Metric geometry for the hanging guide, derived from the storefront's
 * size source of truth so the guide can never disagree with the PDP.
 */
export function wallGuideGeometry(size: PrintSizeKey) {
  const [widthCm, heightCm] = PRINT_SIZE_SPECS[size].centimeters
    .split('×')
    .map((part) => Number.parseFloat(part));
  return {
    widthCm,
    heightCm,
    gapCm: WALL_GUIDE_GAP_CM,
    centreCm: WALL_GUIDE_CENTRE_CM,
    totalWidthCm: 3 * widthCm + 2 * WALL_GUIDE_GAP_CM,
  };
}

type WallSetVariant = {
  id: string;
  availableForSale: boolean;
  price: {amount: string; currencyCode: string};
  selectedOptions: Array<{name: string; value: string}>;
};

type WallSetProductLike = {
  handle: string;
  variants: WallSetVariant[];
};

// Explicit per-size matching — deliberately no default, unlike
// `selectedPrintSize`, so an unexpected option value can never fall back
// onto the 8 × 10 variant and quietly sell the wrong size.
const SIZE_VALUE_RES: Record<PrintSizeKey, RegExp> = {
  '8x10': /^\s*8\s*[×x]\s*10\b/i,
  '16x20': /^\s*16\s*[×x]\s*20\b/i,
  '20x24': /^\s*20\s*[×x]\s*24\b/i,
};

function sizeVariantFor(product: WallSetProductLike, size: PrintSizeKey) {
  return (
    product.variants.find((candidate) => {
      if (!candidate.availableForSale) return false;
      const options = new Map(
        candidate.selectedOptions.map((option) => [
          option.name.toLowerCase(),
          option.value,
        ]),
      );
      const sizeValue = options.get('size');
      if (!sizeValue || !SIZE_VALUE_RES[size].test(sizeValue)) return false;
      const presentation = options.get('presentation');
      return !presentation || presentation === 'Unframed';
    }) ?? null
  );
}

/**
 * The three cart lines (and their summed price) that buy a wall in one
 * size. Returns null unless every member print has a released, purchasable
 * Unframed variant in that size — the released-variants-only invariant.
 */
export function wallSetLinesForSize(
  products: WallSetProductLike[],
  size: PrintSizeKey,
): {
  lines: Array<{merchandiseId: string; quantity: 1}>;
  total: {amount: string; currencyCode: string};
} | null {
  if (products.length !== 3) return null;
  const variants: WallSetVariant[] = [];
  for (const product of products) {
    const found = sizeVariantFor(product, size);
    if (!found) return null;
    variants.push(found);
  }
  const currencyCode = variants[0].price.currencyCode;
  if (variants.some((entry) => entry.price.currencyCode !== currencyCode)) {
    return null;
  }
  const total = variants.reduce(
    (sum, entry) => sum + Number(entry.price.amount),
    0,
  );
  return {
    lines: variants.map((entry) => ({merchandiseId: entry.id, quantity: 1})),
    total: {amount: total.toFixed(2), currencyCode},
  };
}
