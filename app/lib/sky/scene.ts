/**
 * computeSky(): parameters → a pure, unit-agnostic scene in points
 * (1/72 in) for the chosen sheet. Both renderers draw exactly this.
 */
import {skyPositions} from './astro.ts';
import type {SkyCatalog} from './catalog.ts';
import {formatCoordinates, type SkyParams} from './params.ts';
import {SKY_SIZES, type SkySizeKey} from './products.ts';
import {
  layoutFor,
  projectAltAz,
  starRadius,
  type SkyLayout,
} from './projection.ts';
import {localToUtc} from './time.ts';

export type SceneStar = {x: number; y: number; r: number; mag: number};
export type SceneLine = {x1: number; y1: number; x2: number; y2: number};
export type SceneBody = {x: number; y: number; r: number; name: string};
export type SceneMoon = {
  x: number;
  y: number;
  r: number;
  phaseFraction: number;
  litRight: boolean;
};

export type SkyScene = SkyLayout & {
  stars: SceneStar[];
  lines: SceneLine[];
  moon: SceneMoon | null;
  planets: SceneBody[];
  title: string;
  subtitle: string;
  /** The subtitle split at its first separator, for two-line fitting. */
  subtitleParts: {place: string; rest: string};
  credit: string;
  cardinal: Array<{label: string; x: number; y: number}>;
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

export const SKY_CREDIT = 'CLARA MENDES · YOUR SKY';

export function skySubtitleParts(p: SkyParams) {
  const [y, m, d] = p.date.split('-').map(Number);
  return {
    place: p.place.toUpperCase(),
    rest: `${d} ${MONTHS[m - 1]} ${y} · ${formatCoordinates(p.lat, p.lon)}`,
  };
}

export function skySubtitle(p: SkyParams) {
  const parts = skySubtitleParts(p);
  return `${parts.place} · ${parts.rest}`;
}

export function computeSky({
  params,
  size,
  catalog,
}: {
  params: SkyParams;
  size: SkySizeKey;
  catalog: SkyCatalog;
}): SkyScene {
  const [width, height] = SKY_SIZES[size].points;
  const layout = layoutFor(width, height);
  const {disc, scale} = layout;
  const when = localToUtc(params.date, params.time, params.tz);
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
          r: 7 * scale,
          phaseFraction: sky.moon.phaseFraction,
          // Northern hemisphere: a waxing Moon is lit on its right (west).
          litRight: params.lat >= 0 ? sky.moon.waxing : !sky.moon.waxing,
        }
      : null;

  const planets: SceneBody[] = sky.planets
    .filter((p) => p.alt > 0)
    .map((p) => ({
      ...projectAltAz(p.alt, p.az, disc),
      r: 2.2 * scale,
      name: p.name,
    }));

  const cardinal = [
    {label: 'N', x: disc.cx, y: disc.cy - disc.r - 9 * scale},
    {label: 'S', x: disc.cx, y: disc.cy + disc.r + 16 * scale},
    {label: 'E', x: disc.cx - disc.r - 12 * scale, y: disc.cy + 3 * scale},
    {label: 'W', x: disc.cx + disc.r + 12 * scale, y: disc.cy + 3 * scale},
  ];

  return {
    ...layout,
    stars,
    lines,
    moon,
    planets,
    cardinal,
    title: params.title,
    subtitle: skySubtitle(params),
    subtitleParts: skySubtitleParts(params),
    credit: SKY_CREDIT,
  };
}
