/** Star, constellation-line and label data in the compact built form. */
export type SkyNameRow = readonly [
  id: string,
  name: string,
  ra: number,
  dec: number,
  rank: number,
];

export type SkyCatalog = {
  /** Flat [ra°, dec°, mag, ...] sorted bright → faint. */
  stars: ArrayLike<number>;
  /** Flat [ra1, dec1, ra2, dec2, ...] great-circle segments. */
  lines: ArrayLike<number>;
  /** Constellation label points; absent → the names detail draws nothing. */
  names?: ReadonlyArray<SkyNameRow>;
};

/**
 * Lazy loader used by the browser preview and the print route. Vite turns
 * these JSON files into JS modules, so no import attribute here — the
 * browser would otherwise demand a JSON MIME type. Node tests use
 * scripts/lib/sky-catalog.mjs instead.
 */
export async function loadSkyCatalog(): Promise<SkyCatalog> {
  const [stars, lines, names] = await Promise.all([
    import('../../data/sky/stars.json'),
    import('../../data/sky/constellations.json'),
    // Optional at runtime: a missing chunk here must not break the preview
    // or a paid print, so it falls back to undefined and the names detail
    // simply draws nothing. Contrast scripts/lib/sky-catalog.mjs, whose
    // sync loader requires the committed file — repo corruption should
    // fail loudly there, in tests, rather than silently in production.
    import('../../data/sky/constellation-names.json').catch(
      (error: unknown) => {
        console.warn('sky: constellation names unavailable', error);
        return null;
      },
    ),
  ]);
  return {
    stars: stars.default.data,
    lines: lines.default.data,
    names: names
      ? (names.default.data as unknown as ReadonlyArray<SkyNameRow>)
      : undefined,
  };
}
