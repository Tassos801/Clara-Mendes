/**
 * Sky positions for one observer and instant. Stars come from the J2000
 * catalogue and go through a single J2000-equatorial → horizontal rotation
 * (which folds in precession, nutation and sidereal time); the Sun, Moon
 * and planets are computed individually.
 */
import {Astronomy} from './astronomyEngine.ts';
import type {SkyCatalog} from './catalog.ts';

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export type HorizontalPoint = {alt: number; az: number};
export type StarPosition = HorizontalPoint & {
  mag: number;
  ra: number;
  dec: number;
};
export type SegmentPosition = [HorizontalPoint, HorizontalPoint];
export type BodyPosition = HorizontalPoint & {name: string};
export type MoonPosition = HorizontalPoint & {
  phaseFraction: number;
  waxing: boolean;
};

export type SkyPositions = {
  stars: StarPosition[];
  segments: SegmentPosition[];
  moon: MoonPosition;
  sun: HorizontalPoint;
  planets: BodyPosition[];
};

export const PLANET_NAMES = [
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
] as const;

function clamp1(n: number) {
  return Math.max(-1, Math.min(1, n));
}

/**
 * Textbook alt/az from local hour angle (all degrees). Azimuth is measured
 * from north through east. Used as an independent cross-check in tests.
 */
export function altAzFromHourAngle(
  hourAngleDeg: number,
  decDeg: number,
  latDeg: number,
): HorizontalPoint {
  const H = hourAngleDeg * DEG;
  const d = decDeg * DEG;
  const phi = latDeg * DEG;
  const sinAlt =
    Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.cos(H);
  const alt = Math.asin(clamp1(sinAlt));
  // Meeus 13.5/13.6 give azimuth west of south; convert to from-north.
  const azSouth = Math.atan2(
    Math.sin(H),
    Math.cos(H) * Math.sin(phi) - Math.tan(d) * Math.cos(phi),
  );
  const az = (((azSouth * RAD + 180) % 360) + 360) % 360;
  return {alt: alt * RAD, az};
}

/** astronomy-engine HOR frame: x north, y west, z zenith. */
function horizontalFromVector(x: number, y: number, z: number): HorizontalPoint {
  const alt = Math.asin(clamp1(z)) * RAD;
  const az = (((Math.atan2(-y, x) * RAD) % 360) + 360) % 360;
  return {alt, az};
}

export function skyPositions({
  date,
  lat,
  lon,
  catalog,
}: {
  date: Date;
  lat: number;
  lon: number;
  catalog: SkyCatalog;
}): SkyPositions {
  const time = Astronomy.MakeTime(date);
  const observer = new Astronomy.Observer(lat, lon, 0);
  const {rot} = Astronomy.Rotation_EQJ_HOR(time, observer);

  // Mirrors astronomy-engine's RotateVector: out[i] = Σ_j rot[j][i] · v[j].
  const toHorizontal = (raDeg: number, decDeg: number) => {
    const ra = raDeg * DEG;
    const dec = decDeg * DEG;
    const cd = Math.cos(dec);
    const vx = cd * Math.cos(ra);
    const vy = cd * Math.sin(ra);
    const vz = Math.sin(dec);
    const x = rot[0][0] * vx + rot[1][0] * vy + rot[2][0] * vz;
    const y = rot[0][1] * vx + rot[1][1] * vy + rot[2][1] * vz;
    const z = rot[0][2] * vx + rot[1][2] * vy + rot[2][2] * vz;
    return horizontalFromVector(x, y, z);
  };

  const stars: StarPosition[] = [];
  const s = catalog.stars;
  for (let i = 0; i + 2 < s.length; i += 3) {
    const ra = s[i];
    const dec = s[i + 1];
    const mag = s[i + 2];
    stars.push({...toHorizontal(ra, dec), mag, ra, dec});
  }

  const segments: SegmentPosition[] = [];
  const l = catalog.lines;
  for (let i = 0; i + 3 < l.length; i += 4) {
    segments.push([
      toHorizontal(l[i], l[i + 1]),
      toHorizontal(l[i + 2], l[i + 3]),
    ]);
  }

  const body = (name: keyof typeof Astronomy.Body): HorizontalPoint => {
    const eq = Astronomy.Equator(
      Astronomy.Body[name],
      time,
      observer,
      true,
      true,
    );
    const hor = Astronomy.Horizon(time, observer, eq.ra, eq.dec, 'normal');
    return {alt: hor.altitude, az: hor.azimuth};
  };

  const phaseAngle = Astronomy.MoonPhase(time); // 0 new … 180 full … 360
  const moon: MoonPosition = {
    ...body('Moon'),
    phaseFraction: Astronomy.Illumination(Astronomy.Body.Moon, time)
      .phase_fraction,
    waxing: phaseAngle < 180,
  };
  const planets = PLANET_NAMES.map((name) => ({name, ...body(name)}));

  return {stars, segments, moon, sun: body('Sun'), planets};
}
