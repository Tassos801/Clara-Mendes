// Test fixtures: the shipped data with the Floating World launch undone, so
// "dormant until released" tests hold whatever the live data has released.
import {ART_PRODUCT_CATALOG} from '../../app/lib/artProductCatalog.ts';
import {PRINT_CATALOG} from '../../app/lib/printCatalog.ts';

export const MUSEUM_COLLECTION = 'floating-world';

/** A copy of the print catalog with every museum print staged. */
export function stagedPrintCatalog(catalog = PRINT_CATALOG) {
  const copy = structuredClone(catalog);
  const museum = copy.collections.find(
    (collection) => collection.slug === MUSEUM_COLLECTION,
  );
  for (const print of museum.prints) {
    print.released = false;
    delete print.releasedSizes;
  }
  return copy;
}

/** A copy of the family catalog with every product staged (tracked, DENY). */
export function stagedArtProducts(artProducts = ART_PRODUCT_CATALOG) {
  const copy = structuredClone(artProducts);
  for (const product of copy.products) {
    product.released = false;
    for (const variant of product.variants)
      variant.inventory = {...variant.inventory, tracked: true};
  }
  return copy;
}
