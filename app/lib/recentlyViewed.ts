export const RECENTLY_VIEWED_STORAGE_KEY = 'cm:recently-viewed:v2';
const MAX_ENTRIES = 12;

export type RecentlyViewedEntry = {
  amount?: string;
  currencyCode?: string;
  handle: string;
  id: string;
  imageAlt?: string;
  imageUrl?: string;
  productType?: string;
  title: string;
  viewedAt: number;
};

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
    .filter((entry) => !excluded.has(entry.handle))
    .slice(0, limit);
}
