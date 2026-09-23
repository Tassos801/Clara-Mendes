/**
 * Drawing constants shared by the SVG preview and the PDF print so both
 * draw identical marks. Lengths are in points at scale 1 (an 8×10 sheet);
 * multiply by the scene's `scale`.
 */

/** Constellation stick-figure stroke. */
export const LINE_WIDTH = 0.3;

/** The brightest stars above the horizon that get a soft glow. */
export const GLOW_COUNT = 25;
/** Glow = three faint concentric discs, radius as a multiple of the star's. */
export const GLOW_RINGS = [
  {radius: 2.2, opacity: 0.1},
  {radius: 3.4, opacity: 0.055},
  {radius: 5, opacity: 0.03},
] as const;

/**
 * Milky Way passes. Each pass is ONE filled path — the union of its discs
 * under the nonzero rule — composited once, so overlaps never stack and
 * 8-bit rounding can't tint the band. Inner passes only take the brighter
 * samples, which brightens the core toward Sagittarius and lets the band
 * fade toward the horizon (sample intensity already includes that fade).
 * `radius` scales each sample's disc; `weight` scales the theme opacity.
 */
export const MILKY_WAY_PASSES = [
  {radius: 1, weight: 1, minIntensity: 0.2},
  {radius: 0.72, weight: 1, minIntensity: 0.35},
  {radius: 0.48, weight: 1, minIntensity: 0.6},
  {radius: 0.28, weight: 1, minIntensity: 0.82},
] as const;

export const MOON_RADIUS = 9.5;
export const MOON_GLOW = [
  {radius: 1.6, opacity: 0.12},
  {radius: 2.3, opacity: 0.05},
] as const;
export const MOON_EDGE_WIDTH = 0.35;
export const MOON_EDGE_OPACITY = 0.35;

/**
 * Planets: a ring of the scene's `SceneBody.r` (already scaled) with a dot
 * at its centre sized PLANET_DOT × that same r.
 */
export const PLANET_STROKE = 0.45;
export const PLANET_DOT = 0.45;

/** Horizon: an outer ring and a hairline `gap` inside it. */
export const RING = {outer: 0.6, inner: 0.25, gap: 2.4} as const;

export const GRID_WIDTH = 0.25;

export const LABEL_SIZE = 5;
export const LABEL_TRACKING = 1.1;

/**
 * Compass ring: ticks every 2°, long every 10°, numerals every 30°. `gap`
 * is the radial gap between the disc edge and the first tick — unrelated
 * to `RING.gap`, which is the horizon ring's own inner hairline offset.
 */
export const TICK = {
  gap: 2.5,
  minor: 3,
  major: 6.5,
  width: 0.35,
  numeralSize: 5.5,
  numeralOffset: 15,
} as const;

/**
 * Size and ink for a star of the given magnitude: the brightest stars full
 * ink, stepping down to ~35 % and a smaller dot for the faintest, so the
 * field reads as depth rather than speckle.
 */
export function starStyle(mag: number, scale: number) {
  const base =
    mag <= 0 ? 2.5
    : mag <= 1 ? 2.05
    : mag <= 2 ? 1.65
    : mag <= 3 ? 1.25
    : mag <= 4 ? 0.9
    : mag <= 5 ? 0.62
    : mag <= 5.5 ? 0.46
    : 0.38;
  const opacity =
    mag <= 3 ? 1
    : mag <= 4 ? 0.9
    : mag <= 5 ? 0.72
    : mag <= 5.5 ? 0.5
    : 0.36;
  return {r: base * scale, opacity};
}
