/**
 * The Milky Way as soft overlapping discs along the galactic plane,
 * brighter and wider toward the galactic centre in Sagittarius. Computed
 * rather than catalogued: nothing to clip at the horizon, and it stays
 * soft in both the SVG preview and the vector PDF.
 */
const DEG = Math.PI / 180;
// North galactic pole and the galactic longitude of the north celestial
// pole, J2000 (IAU 1958 system transformed to J2000).
const NGP_RA = 192.85948 * DEG;
const NGP_DEC = 27.12825 * DEG;
const L_NCP = 122.93192 * DEG;

export type GalaxySample = {
  ra: number;
  dec: number;
  /** Angular radius of the soft disc, degrees. */
  width: number;
  /** 0..1 brightness. */
  intensity: number;
};

/** J2000 equatorial coordinates (degrees) of galactic l, b (degrees). */
export function galacticToEquatorial(lDeg: number, bDeg: number) {
  const l = lDeg * DEG;
  const b = bDeg * DEG;
  const sinDec =
    Math.sin(NGP_DEC) * Math.sin(b) +
    Math.cos(NGP_DEC) * Math.cos(b) * Math.cos(L_NCP - l);
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));
  const y = Math.cos(b) * Math.sin(L_NCP - l);
  const x =
    Math.cos(NGP_DEC) * Math.sin(b) -
    Math.sin(NGP_DEC) * Math.cos(b) * Math.cos(L_NCP - l);
  const ra = (NGP_RA + Math.atan2(y, x)) / DEG;
  return {ra: ((ra % 360) + 360) % 360, dec: dec / DEG};
}

/** Galactic longitude folded to −180..180 (0 = the centre). */
const fold = (l: number) => ((((l + 180) % 360) + 360) % 360) - 180;

export const GALAXY_SAMPLES: GalaxySample[] = Array.from(
  {length: 180},
  (_, i) => {
    const l = i * 2;
    const core = Math.exp(-((fold(l) / 55) ** 2));
    return {
      ...galacticToEquatorial(l, 0),
      width: 6 + 6 * core,
      intensity: 0.45 + 0.55 * core,
    };
  },
);
