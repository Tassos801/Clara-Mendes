import scifiCatalog from '../../data/scifi-cinema-catalog.json' with {type: 'json'};

/**
 * Each print needs its own verified Prodigi mapping and Shopify publication
 * before its flag flips. All four released 2026-09-18 (mapped to
 * ART-FAP-EMA-8X10; see docs/scifi-cinema-prints.md).
 */
export const SCIFI_ART_RELEASE_FLAGS: Record<string, boolean> = {
  'orbital-silence-art-print': true,
  'neon-after-rain-art-print': true,
  'desert-signal-art-print': true,
  'the-fold-art-print': true,
};

export const SCIFI_ART_CAPSULE = {
  slug: 'scifi-cinema',
  title: 'Sci-fi & Cinema',
  note: 'Imagined worlds, cinematic light, and a sense of scale',
} as const;

export function releasedSciFiArtHandles(
  flags: Record<string, boolean> = SCIFI_ART_RELEASE_FLAGS,
): string[] {
  return scifiCatalog
    .filter((item) => flags[item.handle] === true)
    .map((item) => item.handle);
}

/** Staged handles stay out of generated sitemaps after accidental publication. */
export function isUnreleasedSciFiArtHandle(
  handle?: string | null,
  flags: Record<string, boolean> = SCIFI_ART_RELEASE_FLAGS,
) {
  const key = handle?.toLowerCase();
  return Boolean(
    key && scifiCatalog.some((item) => item.handle === key) && !flags[key],
  );
}
