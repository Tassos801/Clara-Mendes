// Relative imports keep this module loadable by the plain-Node test runner
// and by scripts/product.mjs, which cannot resolve the Vite "~" alias.
import printCatalog from '../../data/print-catalog.json' with {type: 'json'};

/**
 * Print collections added through the product pipeline
 * (docs/add-products-runbook.md). `data/print-catalog.json` is the single
 * source: a new print is one JSON entry plus its WebP, and a release is
 * `released: true` — no per-collection module, flag registry, or route edit.
 *
 * Same dual gate as every other staged product: a print becomes
 * storefront-visible only when `released` is true AND the Shopify product is
 * Active and published, so neither an accidental publish nor an accidental
 * flip can release alone.
 */

export type PrintSizeKey = '8x10' | '16x20' | '20x24';

/** Print-file pixel sizes are 300 DPI at the nominal inch size. */
export const PRINT_SIZES: Record<
  PrintSizeKey,
  {height: number; label: string; skuSuffix: string; width: number}
> = {
  '8x10': {height: 3000, label: '8 × 10 in', skuSuffix: '8X10', width: 2400},
  '16x20': {height: 6000, label: '16 × 20 in', skuSuffix: '16X20', width: 4800},
  '20x24': {height: 7200, label: '20 × 24 in', skuSuffix: '20X24', width: 6000},
};

export type PrintCatalogVariant = {
  finish: string;
  priceEUR: string;
  /** Prodigi product SKU this variant maps to in the sales channel. */
  providerSku: string;
  size: string;
};

export type PrintCatalogPrint = {
  alt: string;
  description: string;
  palette?: string;
  /** Per size: the Prodigi channel product, recorded once mapping is verified. */
  prodigi?: Record<string, {channelProductId?: string; verified?: boolean}>;
  released: boolean;
  sequence: number;
  /** Written back by `product stage`. */
  shopify?: {productId?: string; variantIds?: Record<string, string>};
  slug: string;
  source?: Record<string, unknown>;
  title: string;
};

export type PrintCatalogCollection = {
  collectionCopy: string;
  note: string;
  prints: PrintCatalogPrint[];
  /** Sales channels `product release` publishes to, by publication name. */
  publications: string[];
  seoSuffix: string;
  /** Two-letter code inside the SKU: CM-<skuCode>-<sequence>-<size>. */
  skuCode: string;
  slug: string;
  title: string;
  variants: PrintCatalogVariant[];
};

export type PrintCatalog = {collections: PrintCatalogCollection[]};

export const PRINT_CATALOG = printCatalog as unknown as PrintCatalog;

export function printHandle(print: Pick<PrintCatalogPrint, 'slug'>) {
  return `${print.slug}-art-print`;
}

export function printProductTitle(print: Pick<PrintCatalogPrint, 'title'>) {
  return `${print.title} Art Print`;
}

export function printSku(
  collection: Pick<PrintCatalogCollection, 'skuCode'>,
  print: Pick<PrintCatalogPrint, 'sequence'>,
  size: string,
) {
  const suffix = PRINT_SIZES[size as PrintSizeKey]?.skuSuffix;
  if (!suffix) throw new Error(`Unknown print size: ${size}`);
  return `CM-${collection.skuCode}-${String(print.sequence).padStart(2, '0')}-${suffix}`;
}

export function printImagePath(
  collection: Pick<PrintCatalogCollection, 'slug'>,
  print: Pick<PrintCatalogPrint, 'slug'>,
) {
  return `/images/product-art/${collection.slug}/${print.slug}.webp`;
}

export function releasedPrintHandles(
  catalog: PrintCatalog = PRINT_CATALOG,
): string[] {
  return catalog.collections.flatMap((collection) =>
    collection.prints
      .filter((print) => print.released === true)
      .map(printHandle),
  );
}

/** Staged handles stay out of generated sitemaps after accidental publication. */
export function isUnreleasedPrintHandle(
  handle?: string | null,
  catalog: PrintCatalog = PRINT_CATALOG,
) {
  const key = handle?.toLowerCase();
  if (!key) return false;
  return catalog.collections.some((collection) =>
    collection.prints.some(
      (print) => printHandle(print) === key && print.released !== true,
    ),
  );
}

export type ReleasedPrintCollection = {
  handles: string[];
  note: string;
  sizeLabels: string[];
  slug: string;
  title: string;
};

/** Collections with at least one released print, carrying only those members. */
export function releasedPrintCollections(
  catalog: PrintCatalog = PRINT_CATALOG,
): ReleasedPrintCollection[] {
  return catalog.collections
    .map((collection) => ({
      handles: collection.prints
        .filter((print) => print.released === true)
        .map(printHandle),
      note: collection.note,
      sizeLabels: collection.variants.map(
        (variant) =>
          PRINT_SIZES[variant.size as PrintSizeKey]?.label ?? variant.size,
      ),
      slug: collection.slug,
      title: collection.title,
    }))
    .filter((collection) => collection.handles.length > 0);
}

/**
 * Everything that would make the catalog file unsafe to ship. Run by the
 * test suite and by every `product` step, so a bad entry fails before it
 * reaches Shopify or the storefront.
 */
export function validatePrintCatalog(
  catalog: PrintCatalog = PRINT_CATALOG,
): string[] {
  const problems: string[] = [];
  const seen = {handles: new Set<string>(), skus: new Set<string>()};
  const collectionKeys = new Set<string>();

  for (const collection of catalog.collections) {
    const where = `collection ${collection.slug || '(no slug)'}`;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(collection.slug ?? ''))
      problems.push(`${where}: slug must be kebab-case`);
    if (!/^[A-Z]{2}$/.test(collection.skuCode ?? ''))
      problems.push(`${where}: skuCode must be two capital letters`);
    for (const key of [collection.slug, collection.skuCode, collection.title]) {
      if (collectionKeys.has(key))
        problems.push(`${where}: duplicate slug, skuCode or title "${key}"`);
      collectionKeys.add(key);
    }
    for (const field of [
      'title',
      'note',
      'collectionCopy',
      'seoSuffix',
    ] as const)
      if (!collection[field]?.trim())
        problems.push(`${where}: missing ${field}`);
    if (!collection.publications?.length)
      problems.push(`${where}: publications must name at least one channel`);
    if (!collection.variants?.length)
      problems.push(`${where}: needs at least one variant`);

    const sizes = new Set<string>();
    for (const variant of collection.variants ?? []) {
      if (!(variant.size in PRINT_SIZES))
        problems.push(`${where}: unknown size "${variant.size}"`);
      if (sizes.has(variant.size))
        problems.push(`${where}: duplicate size "${variant.size}"`);
      sizes.add(variant.size);
      if (!/^\d+\.\d{2}$/.test(variant.priceEUR ?? ''))
        problems.push(
          `${where}: ${variant.size} priceEUR must look like "29.99"`,
        );
      if (!variant.providerSku?.trim())
        problems.push(`${where}: ${variant.size} missing providerSku`);
      if (!variant.finish?.trim())
        problems.push(`${where}: ${variant.size} missing finish`);
    }

    const sequences = new Set<number>();
    for (const print of collection.prints ?? []) {
      const at = `${collection.slug}/${print.slug || '(no slug)'}`;
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(print.slug ?? ''))
        problems.push(`${at}: slug must be kebab-case`);
      if (!Number.isInteger(print.sequence) || print.sequence < 1)
        problems.push(`${at}: sequence must be a positive integer`);
      if (sequences.has(print.sequence))
        problems.push(`${at}: duplicate sequence ${print.sequence}`);
      sequences.add(print.sequence);
      for (const field of ['title', 'description', 'alt'] as const)
        if (!print[field]?.trim()) problems.push(`${at}: missing ${field}`);
      if (typeof print.released !== 'boolean')
        problems.push(`${at}: released must be true or false`);

      const handle = printHandle(print);
      if (seen.handles.has(handle)) problems.push(`${at}: duplicate handle`);
      seen.handles.add(handle);

      for (const variant of collection.variants ?? []) {
        if (!(variant.size in PRINT_SIZES)) continue;
        const sku = printSku(collection, print, variant.size);
        if (seen.skus.has(sku)) problems.push(`${at}: duplicate SKU ${sku}`);
        seen.skus.add(sku);

        // A released print with an unmapped variant would sell orders no one
        // can fulfil, so release requires the full chain on every size.
        if (print.released === true) {
          if (
            !print.shopify?.productId ||
            !print.shopify.variantIds?.[variant.size]
          )
            problems.push(
              `${at}: released without Shopify ids for ${variant.size}`,
            );
          const mapping = print.prodigi?.[variant.size];
          if (!mapping?.verified || !mapping.channelProductId)
            problems.push(
              `${at}: released without a verified Prodigi mapping for ${variant.size}`,
            );
        }
      }
    }
  }

  return problems;
}
