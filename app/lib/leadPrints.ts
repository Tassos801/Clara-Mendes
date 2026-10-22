// Relative imports keep this module loadable by the plain-Node test runner.
import artCatalog from '../../data/original-art-catalog.json' with {type: 'json'};
import {
  collectionKind,
  printHandle,
  printImagePath,
  releasedPrintCollections,
  PRINT_CATALOG,
  type PrintCatalog,
} from './printCatalog.ts';

export type LeadPrint = {
  alt: string;
  capsule: string;
  description: string;
  handle: string;
  image: string;
  /** Colour words; the founding catalog has them, the print catalog does not. */
  palette: string | null;
  shortTitle: string;
};

/**
 * The first work of every capsule of our own, for "The collection so
 * far" on the homepage: the five founding capsules from
 * data/original-art-catalog.json, then each released studio collection
 * of data/print-catalog.json in catalog order.
 */
export function leadPrints(printCatalog: PrintCatalog = PRINT_CATALOG): LeadPrint[] {
  const founding: LeadPrint[] = artCatalog
    .filter((item) => item.sequence === 1)
    .map((item) => ({
      alt: item.alt,
      capsule: item.capsule,
      description: item.description,
      handle: item.handle,
      image: item.image,
      palette: item.palette,
      shortTitle: item.shortTitle,
    }));
  const later: LeadPrint[] = releasedPrintCollections(printCatalog).flatMap(
    (released) => {
      const collection = printCatalog.collections.find(
        (entry) => entry.slug === released.slug,
      );
      if (!collection || collectionKind(collection) !== 'studio') return [];
      const lead = [...collection.prints]
        .filter((print) => print.released === true)
        .sort((a, b) => a.sequence - b.sequence)[0];
      if (!lead) return [];
      return [
        {
          alt: lead.alt ?? lead.title,
          capsule: collection.title,
          description: lead.description,
          handle: printHandle(lead),
          image: printImagePath(collection, lead),
          palette: null,
          shortTitle: lead.title,
        },
      ];
    },
  );
  return [...founding, ...later];
}

export const LEAD_PRINTS: LeadPrint[] = leadPrints();

/** Handles the homepage expects live state for. */
export const LEAD_PRINT_HANDLES = LEAD_PRINTS.map((print) => print.handle);

/**
 * Storefront `products(query:)` selecting the studio capsules' prints: the
 * capsule tags the catalog sync writes, narrowed to the print product
 * type. Handles are not searchable, so tags carry the selection.
 */
export function leadPrintsQuery(printCatalog: PrintCatalog = PRINT_CATALOG) {
  const titles = [
    ...new Set(leadPrints(printCatalog).map((print) => print.capsule)),
  ];
  const tags = titles.map((title) => `tag:"${title.replaceAll('"', '\\"')}"`);
  return `(${tags.join(' OR ')}) AND product_type:"Art Prints"`;
}

/** Enough for every print of every studio capsule, with headroom. */
export const LEAD_PRINTS_QUERY_FIRST = 60;
