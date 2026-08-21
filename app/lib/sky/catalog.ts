/** Star + constellation-line data in the compact built form. */
export type SkyCatalog = {
  /** Flat [ra°, dec°, mag, ...] sorted bright → faint. */
  stars: ArrayLike<number>;
  /** Flat [ra1, dec1, ra2, dec2, ...] great-circle segments. */
  lines: ArrayLike<number>;
};

/** Lazy loader used by the browser preview and the print route. */
export async function loadSkyCatalog(): Promise<SkyCatalog> {
  const [stars, lines] = await Promise.all([
    import('../../data/sky/stars.json', {with: {type: 'json'}}),
    import('../../data/sky/constellations.json', {with: {type: 'json'}}),
  ]);
  return {stars: stars.default.data, lines: lines.default.data};
}
