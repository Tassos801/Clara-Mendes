// Relative imports keep this module loadable by the plain-Node test runner,
// which cannot resolve the Vite "~" alias.
import artCatalog from '../../data/original-art-catalog.json' with {type: 'json'};
import {ORIGINAL_ART_COLLECTIONS} from './catalogFilters.ts';
import {
  PRINT_CATALOG,
  releasedPrintCollections,
  type PrintCatalog,
} from './printCatalog.ts';

export type Capsule = {
  /** Product handles belonging to this capsule, from the catalog source. */
  handles: string[];
  /** Site-relative artwork path used for the capsule's share card. */
  image: string;
  note: string;
  /** Offered sizes; set only for print-catalog collections. */
  sizeLabels?: string[];
  slug: string;
  title: string;
};

/**
 * The five art capsules with their member product handles, derived from the
 * authoritative catalog data so storefront filtering can work before (and
 * independently of) matching Shopify collections existing.
 */
export const CAPSULES: Capsule[] = ORIGINAL_ART_COLLECTIONS.map(
  (collection) => ({
    handles: artCatalog
      .filter((item) => item.capsule === collection.title)
      .map((item) => item.handle),
    image:
      artCatalog.find((item) => item.capsule === collection.title)?.image ?? '',
    note: collection.note,
    slug: collection.handle,
    title: collection.title,
  }),
);

export function getCapsuleBySlug(slug?: string | null): Capsule | null {
  if (!slug) return null;
  const normalized = slug.trim().toLowerCase();
  return CAPSULES.find((capsule) => capsule.slug === normalized) ?? null;
}

/**
 * Storefront `products(query:)` clause selecting the capsule's members.
 *
 * The catalog sync tags each print with its capsule title, and tag is a
 * supported product search field. (Handle is not — Shopify silently ignores
 * unsupported fields and would return the entire catalog.)
 */
export function buildCapsuleTagQuery(capsule: Capsule) {
  return `tag:"${capsule.title}"`;
}

/**
 * The five launch capsules plus every print-catalog collection with at least
 * one released print (data/print-catalog.json), carrying only its released
 * members.
 */
export function listShopCapsules(
  printCatalog: PrintCatalog = PRINT_CATALOG,
): Capsule[] {
  return [...CAPSULES, ...releasedPrintCollections(printCatalog)];
}

export function getShopCapsuleBySlug(
  slug?: string | null,
  printCatalog: PrintCatalog = PRINT_CATALOG,
): Capsule | null {
  const normalized = slug?.trim().toLowerCase();
  return (
    listShopCapsules(printCatalog).find(
      (capsule) => capsule.slug === normalized,
    ) ?? null
  );
}

/** The shop capsule a product belongs to, including print-catalog collections. */
export function findShopCapsuleForHandle(
  handle?: string | null,
  printCatalog: PrintCatalog = PRINT_CATALOG,
): Capsule | null {
  const key = handle?.toLowerCase();
  if (!key) return null;
  return (
    listShopCapsules(printCatalog).find((capsule) =>
      capsule.handles.includes(key),
    ) ?? null
  );
}

/** Only the launch capsules have landing pages; the rest use the shop filter. */
export function shopCapsulePath(slug: string) {
  return CAPSULES.some((capsule) => capsule.slug === slug)
    ? `/collections/${slug}`
    : `/collections/all?capsule=${slug}`;
}

export function shopCapsuleDescription(capsule: Capsule) {
  if (capsule.sizeLabels?.length) {
    const count = capsule.handles.length;
    return `${capsule.title} — ${capsule.note}. ${count} original Clara Mendes ${count === 1 ? 'print' : 'prints'}, available unframed in ${joinLabels(capsule.sizeLabels)}.`;
  }
  return `The ${capsule.title} capsule — ${capsule.note}. Three coordinated original Clara Mendes prints.`;
}

function joinLabels(labels: string[]) {
  return labels.length < 3
    ? labels.join(' and ')
    : `${labels.slice(0, -1).join(', ')}, and ${labels.at(-1)}`;
}
