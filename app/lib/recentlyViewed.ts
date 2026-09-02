import {isFeaturePageHandle} from './catalogFilters.ts';
// v3: `amount` is the lowest RELEASED price (the "From" floor), no longer
// the variant the shopper happened to have selected, and `hasPriceRange`
// records whether more than one released price exists. Bumping the key
// orphans v2 snapshots (which may hold a 16 × 20/20 × 24 selected price)
// exactly as the v1→v2 bump did for the 29.00→29.99 repricing.
export const RECENTLY_VIEWED_STORAGE_KEY = 'cm:recently-viewed:v3';
const MAX_ENTRIES = 12;

export type RecentlyViewedEntry = {
  amount?: string;
  currencyCode?: string;
  handle: string;
  hasPriceRange?: boolean;
  id: string;
  imageAlt?: string;
  imageUrl?: string;
  productType?: string;
  title: string;
  viewedAt: number;
};

/**
 * How long a snapshot's `hasPriceRange` flag stays trustworthy. The rail
 * renders from localStorage without live data, so if a larger size is
 * paused after the visit the stored flag would keep claiming a "From"
 * range; bounding its age caps that window. The floor amount itself stays
 * shown — it is always a genuinely released price.
 */
export const PRICE_RANGE_FLAG_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export function isPriceRangeFlagFresh(
  entry: Pick<RecentlyViewedEntry, 'hasPriceRange' | 'viewedAt'>,
  now: number = Date.now(),
): boolean {
  return (
    entry.hasPriceRange === true &&
    now - entry.viewedAt <= PRICE_RANGE_FLAG_TTL_MS
  );
}

function readEntries(): RecentlyViewedEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is RecentlyViewedEntry =>
        Boolean(entry) &&
        typeof (entry as RecentlyViewedEntry).handle === 'string' &&
        typeof (entry as RecentlyViewedEntry).id === 'string' &&
        typeof (entry as RecentlyViewedEntry).title === 'string',
    );
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(
  entry: Omit<RecentlyViewedEntry, 'viewedAt'>,
) {
  if (typeof window === 'undefined') return;
  try {
    const entries = [
      {...entry, viewedAt: Date.now()},
      ...readEntries().filter((existing) => existing.handle !== entry.handle),
    ].slice(0, MAX_ENTRIES);
    window.localStorage.setItem(
      RECENTLY_VIEWED_STORAGE_KEY,
      JSON.stringify(entries),
    );
  } catch {
    // Storage may be unavailable (private mode, quota); viewing history
    // is a progressive enhancement, so fail silently.
  }
}

export function getRecentlyViewed({
  excludeHandles = [],
  limit = 4,
}: {
  excludeHandles?: string[];
  limit?: number;
} = {}) {
  const excluded = new Set(excludeHandles);
  return readEntries()
    .filter(
      (entry) =>
        !excluded.has(entry.handle) && !isFeaturePageHandle(entry.handle),
    )
    .slice(0, limit);
}
