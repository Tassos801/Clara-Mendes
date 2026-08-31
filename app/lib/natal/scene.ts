/**
 * computeNatal(): parameters → a pure scene in points for the chosen
 * sheet. The birth poster is a star-chart medallion (the sky over the
 * birthplace at the moment of birth) above the child's name and the birth
 * details. Both renderers draw exactly this scene.
 */
import {skyPositions} from '../sky/astro.ts';
import type {SkyCatalog} from '../sky/catalog.ts';
import {maxTextWidth} from '../sky/fit.ts';
import {formatCoordinates} from '../sky/params.ts';
import {projectAltAz, starRadius, type Disc} from '../sky/projection.ts';
import {localToUtc} from '../sky/time.ts';
import type {
  SceneBody,
  SceneLine,
  SceneMoon,
  SceneStar,
} from '../sky/scene.ts';
import {NATAL_DEFAULT_ASTRO_TIME, type NatalParams} from './params.ts';
import {NATAL_SIZES, type NatalSizeKey} from './products.ts';

export type NatalLayout = {
  width: number;
  height: number;
  /** width / 576 — everything scales with the sheet. */
  scale: number;
  maxTextWidth: number;
  disc: Disc;
  nameY: number;
  nameSize: number;
  bornY: number;
  bornSize: number;
  placeY: number;
  placeSize: number;
  detailsY: number;
  detailsSize: number;
  creditY: number;
  creditSize: number;
};

/** Shared proportions for both print sizes. */
export function natalLayoutFor(width: number, height: number): NatalLayout {
  const scale = width / 576;
  const r = Math.min(width * 0.24, height * 0.19);
  return {
    width,
    height,
    scale,
    maxTextWidth: maxTextWidth(width),
    disc: {cx: width / 2, cy: height * 0.3, r},
    nameY: height * 0.605,
    nameSize: 34 * scale,
    bornY: height * 0.665,
    bornSize: 10.5 * scale,
    placeY: height * 0.7,
    placeSize: 9 * scale,
    detailsY: height * 0.75,
    detailsSize: 10.5 * scale,
    creditY: height * 0.95,
    creditSize: 7 * scale,
  };
}

export const NATAL_CREDIT = 'CLARA MENDES · FIRST LIGHT';

export type NatalScene = NatalLayout & {
  stars: SceneStar[];
  lines: SceneLine[];
  moon: SceneMoon | null;
  planets: SceneBody[];
  /** The child's name, printed as given. */
  name: string;
  /** "BORN 14 MAY 2026 AT 07:32", or without the time when not given. */
  born: string;
  /** "BERLIN, GERMANY · 52.5200° N, 13.4050° E" */
  place: string;
  /** The customer's optional details line, printed as given. */
  details: string;
  credit: string;
};

const MONTHS = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
];

export function natalBornLine(p: Pick<NatalParams, 'date' | 'time'>) {
  const [y, m, d] = p.date.split('-').map(Number);
  const dateText = `BORN ${d} ${MONTHS[m - 1]} ${y}`;
  return p.time ? `${dateText} AT ${p.time}` : dateText;
}

export function natalPlaceLine(
  p: Pick<NatalParams, 'place' | 'lat' | 'lon'>,
) {
  return `${p.place.toUpperCase()} · ${formatCoordinates(p.lat, p.lon)}`;
}

export function computeNatal({
  params,
  size,
  catalog,
}: {
  params: NatalParams;
  size: NatalSizeKey;
  catalog: SkyCatalog;
}): NatalScene {
  const [width, height] = NATAL_SIZES[size].points;
  const layout = natalLayoutFor(width, height);
  const {disc, scale} = layout;
  // The chart stays astronomically truthful with or without a given time:
  // no time means local noon, and the typography then omits the time.
  const when = localToUtc(
    params.date,
    params.time || NATAL_DEFAULT_ASTRO_TIME,
    params.tz,
  );
  const sky = skyPositions({
    date: when,
    lat: params.lat,
    lon: params.lon,
    catalog,
  });

  const stars: SceneStar[] = [];
  for (const s of sky.stars) {
    if (s.alt <= 0) continue;
    const {x, y} = projectAltAz(s.alt, s.az, disc);
    stars.push({x, y, r: starRadius(s.mag, scale), mag: s.mag});
  }

  const lines: SceneLine[] = [];
  for (const [a, b] of sky.segments) {
    if (a.alt <= 0 || b.alt <= 0) continue;
    const p = projectAltAz(a.alt, a.az, disc);
    const q = projectAltAz(b.alt, b.az, disc);
    lines.push({x1: p.x, y1: p.y, x2: q.x, y2: q.y});
  }

  const moon: SceneMoon | null =
    sky.moon.alt > 0
      ? {
          ...projectAltAz(sky.moon.alt, sky.moon.az, disc),
          r: 7 * scale * (disc.r / (width * 0.4)),
          phaseFraction: sky.moon.phaseFraction,
          litRight: params.lat >= 0 ? sky.moon.waxing : !sky.moon.waxing,
        }
      : null;

  const planets: SceneBody[] = sky.planets
    .filter((p) => p.alt > 0)
    .map((p) => ({
      ...projectAltAz(p.alt, p.az, disc),
      r: 2.2 * scale * (disc.r / (width * 0.4)),
      name: p.name,
    }));

  return {
    ...layout,
    stars,
    lines,
    moon,
    planets,
    name: params.name,
    born: natalBornLine(params),
    place: natalPlaceLine(params),
    details: params.details,
    credit: NATAL_CREDIT,
  };
}
