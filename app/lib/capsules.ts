// Relative imports keep this module loadable by the plain-Node test runner,
// which cannot resolve the Vite "~" alias.
import artCatalog from '../../data/original-art-catalog.json' with {type: 'json'};
import {ORIGINAL_ART_COLLECTIONS} from './catalogFilters.ts';
import {
  releasedSciFiArtHandles,
  SCIFI_ART_CAPSULE,
  SCIFI_ART_RELEASE_FLAGS,
} from './scifiArt.ts';

export type Capsule = {
  /** Product handles belonging to this capsule, from the catalog source. */
  handles: string[];
  note: string;
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

/** Shop filters include a new capsule only after at least one member releases. */
export function listShopCapsules(
  sciFiFlags: Record<string, boolean> = SCIFI_ART_RELEASE_FLAGS,
): Capsule[] {
  const handles = releasedSciFiArtHandles(sciFiFlags);
  return handles.length
    ? [...CAPSULES, {...SCIFI_ART_CAPSULE, handles}]
    : [...CAPSULES];
}

export function getShopCapsuleBySlug(
  slug?: string | null,
  sciFiFlags: Record<string, boolean> = SCIFI_ART_RELEASE_FLAGS,
): Capsule | null {
  const normalized = slug?.trim().toLowerCase();
  return (
    listShopCapsules(sciFiFlags).find(
      (capsule) => capsule.slug === normalized,
    ) ?? null
  );
}

/** Sci-fi currently uses the shop filter; there is no separate landing page. */
export function shopCapsulePath(slug: string) {
  return slug === SCIFI_ART_CAPSULE.slug
    ? '/collections/all?capsule=scifi-cinema'
    : `/collections/${slug}`;
}

export function shopCapsuleDescription(capsule: Capsule) {
  const count = capsule.handles.length;
  if (capsule.slug === SCIFI_ART_CAPSULE.slug) {
    return `${capsule.title} — ${capsule.note}. ${count} original Clara Mendes ${count === 1 ? 'print' : 'prints'}, available unframed in 8 × 10 in.`;
  }
  return `The ${capsule.title} capsule — ${capsule.note}. Three coordinated original Clara Mendes prints.`;
}
