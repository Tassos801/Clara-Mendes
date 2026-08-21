/** Star + constellation-line data in the compact built form. */
export type SkyCatalog = {
  /** Flat [ra°, dec°, mag, ...] sorted bright → faint. */
  stars: ArrayLike<number>;
  /** Flat [ra1, dec1, ra2, dec2, ...] great-circle segments. */
  lines: ArrayLike<number>;
};

/**
 * Lazy loader used by the browser preview and the print route. Vite turns
 * these JSON files into JS modules, so no import attribute here — the
 * browser would otherwise demand a JSON MIME type. Node tests use
 * scripts/lib/sky-catalog.mjs instead.
 */
export async function loadSkyCatalog(): Promise<SkyCatalog> {
  const [stars, lines] = await Promise.all([
    import('../../data/sky/stars.json'),
    import('../../data/sky/constellations.json'),
  ]);
  return {stars: stars.default.data, lines: lines.default.data};
}
