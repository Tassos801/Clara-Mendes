import scifiCatalog from '../../data/scifi-cinema-catalog.json' with {type: 'json'};

/**
 * New prints need their own verified Prodigi mapping and Shopify publication.
 * Keep every flag false until the release runbook is complete.
 */
export const SCIFI_ART_RELEASE_FLAGS: Record<string, boolean> = {
  'orbital-silence-art-print': false,
  'neon-after-rain-art-print': false,
  'desert-signal-art-print': false,
  'the-fold-art-print': false,
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
export function isUnreleasedSciFiArtHandle(handle?: string | null) {
  const key = handle?.toLowerCase();
  return Boolean(
    key &&
    scifiCatalog.some((item) => item.handle === key) &&
    !SCIFI_ART_RELEASE_FLAGS[key],
  );
}
