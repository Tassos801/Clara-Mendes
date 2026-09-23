/**
 * computeSky(): parameters → a pure, unit-agnostic scene in points
 * (1/72 in) for the chosen sheet. Both renderers draw exactly this.
 */
import {skyPositions, type HorizontalPoint} from './astro.ts';
import type {SkyCatalog} from './catalog.ts';
import {placeLabels, type LabelBox, type SceneLabel} from './labels.ts';
import {skyPageLayout, type SkyPageLayout} from './layouts.ts';
import {formatCoordinates, type SkyParams} from './params.ts';
import {SKY_SIZES, type SkySizeKey} from './products.ts';
import {projectAltAz, type Disc} from './projection.ts';
import {
  GLOW_COUNT,
  LABEL_SIZE,
  LABEL_TRACKING,
  MOON_RADIUS,
  starStyle,
  TICK,
} from './style.ts';
import {localToUtc} from './time.ts';

export type SceneStar = {
  x: number;
  y: number;
  r: number;
  mag: number;
  /** 1 = full ink. */
  opacity: number;
};
export type SceneLine = {x1: number; y1: number; x2: number; y2: number};
export type SceneBody = {x: number; y: number; r: number; name: string};
export type SceneMoon = {
  x: number;
  y: number;
  r: number;
  phaseFraction: number;
  litRight: boolean;
};
/** A bright star's glow centre and the star's own radius. */
export type SceneGlow = {x: number; y: number; r: number};
/** One soft Milky Way disc. */
export type SceneGalaxy = {x: number; y: number; r: number; intensity: number};
export type SceneGrid = {circles: number[]; spokes: SceneLine[]};
export type SceneCompass = {
  ticks: SceneLine[];
  numerals: Array<{x: number; y: number; text: string}>;
};

export type SkyScene = SkyPageLayout & {
  stars: SceneStar[];
  glows: SceneGlow[];
  lines: SceneLine[];
  milkyWay: SceneGalaxy[];
  grid: SceneGrid | null;
  labels: SceneLabel[];
  compass: SceneCompass | null;
  moon: SceneMoon | null;
  planets: SceneBody[];
  title: string;
  subtitle: string;
  /** The subtitle split at its first separator, for two-line fitting. */
  subtitleParts: {place: string; rest: string};
  credit: string;
  cardinal: Array<{label: string; x: number; y: number}>;
};

const DEG = Math.PI / 180;

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
  const time = p.details.includes('time') ? ` · ${p.time}` : '';
  return {
    place: p.place.toUpperCase(),
    rest: `${d} ${MONTHS[m - 1]} ${y}${time} · ${formatCoordinates(p.lat, p.lon)}`,
  };
}

export function skySubtitle(p: SkyParams) {
  const parts = skySubtitleParts(p);
  return `${parts.place} · ${parts.rest}`;
}

function toVector({alt, az}: HorizontalPoint): [number, number, number] {
  const a = alt * DEG;
  const z = az * DEG;
  return [Math.cos(a) * Math.cos(z), Math.cos(a) * Math.sin(z), Math.sin(a)];
}

/**
 * Where the (short, great-circle) segment a→b crosses the horizon. Used to
 * clip constellation lines at the ring instead of dropping them.
 */
export function horizonCrossing(
  a: HorizontalPoint,
  b: HorizontalPoint,
): HorizontalPoint {
  const va = toVector(a);
  const vb = toVector(b);
  const t = va[2] / (va[2] - vb[2]);
  const x = va[0] + t * (vb[0] - va[0]);
  const y = va[1] + t * (vb[1] - va[1]);
  return {alt: 0, az: (((Math.atan2(y, x) / DEG) % 360) + 360) % 360};
}

/** Radius on the page of a small circle of angular radius `deg` at `alt`. */
function projectedRadius(altDeg: number, deg: number, disc: Disc) {
  const k = Math.tan(((90 - altDeg) * DEG) / 2);
  return (disc.r * deg * DEG * (1 + k * k)) / 2;
}

/** Point at `radius` from the disc centre toward azimuth `azDeg` (E left). */
function polar(disc: Disc, radius: number, azDeg: number) {
  const az = azDeg * DEG;
  return {
    x: disc.cx - radius * Math.sin(az),
    y: disc.cy - radius * Math.cos(az),
  };
}

function buildGrid(disc: Disc): SceneGrid {
  // Altitude 60° and 30° circles (zenith distance 30° and 60°).
  const circles = [60, 30].map((alt) => disc.r * Math.tan(((90 - alt) * DEG) / 2));
  const spokes = Array.from({length: 12}, (_, i) => {
    const end = polar(disc, disc.r, i * 30);
    return {x1: disc.cx, y1: disc.cy, x2: end.x, y2: end.y};
  });
  return {circles, spokes};
}

function buildCompass(disc: Disc, scale: number): SceneCompass {
  const inner = disc.r + TICK.gap * scale;
  const ticks: SceneLine[] = [];
  for (let deg = 0; deg < 360; deg += 2) {
    const length = (deg % 10 === 0 ? TICK.major : TICK.minor) * scale;
    const a = polar(disc, inner, deg);
    const b = polar(disc, inner + length, deg);
    ticks.push({x1: a.x, y1: a.y, x2: b.x, y2: b.y});
  }
  const numerals: SceneCompass['numerals'] = [];
  for (let deg = 30; deg < 360; deg += 30) {
    if (deg % 90 === 0) continue; // N, E, S, W carry the letters
    const p = polar(disc, disc.r + TICK.numeralOffset * scale, deg);
    numerals.push({
      x: p.x,
      y: p.y + TICK.numeralSize * 0.35 * scale,
      text: String(deg),
    });
  }
  return {ticks, numerals};
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
  const layout = skyPageLayout(params.layout, width, height);
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
    const style = starStyle(s.mag, scale);
    stars.push({x, y, r: style.r, opacity: style.opacity, mag: s.mag});
  }
  // The catalogue is sorted bright → faint, so these are the brightest
  // stars above the horizon.
  const glows: SceneGlow[] = stars
    .slice(0, GLOW_COUNT)
    .map(({x, y, r}) => ({x, y, r}));

  const lines: SceneLine[] = [];
  for (const [a, b] of sky.segments) {
    if (a.alt <= 0 && b.alt <= 0) continue;
    const from = a.alt > 0 ? a : horizonCrossing(a, b);
    const to = b.alt > 0 ? b : horizonCrossing(a, b);
    const p = projectAltAz(from.alt, from.az, disc);
    const q = projectAltAz(to.alt, to.az, disc);
    lines.push({x1: p.x, y1: p.y, x2: q.x, y2: q.y});
  }

  // Discs just below the horizon still soften the band's edge; the
  // renderers clip everything to the ring.
  const milkyWay: SceneGalaxy[] = [];
  for (const g of sky.galaxy) {
    if (g.alt < -20) continue;
    const {x, y} = projectAltAz(g.alt, g.az, disc);
    milkyWay.push({
      x,
      y,
      r: projectedRadius(g.alt, g.width, disc),
      intensity: g.intensity,
    });
  }

  const moon: SceneMoon | null =
    sky.moon.alt > 0
      ? {
          ...projectAltAz(sky.moon.alt, sky.moon.az, disc),
          r: MOON_RADIUS * scale,
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

  const avoid: LabelBox[] = moon
    ? [
        {
          x0: moon.x - moon.r * 2,
          x1: moon.x + moon.r * 2,
          y0: moon.y - moon.r * 2,
          y1: moon.y + moon.r * 2,
        },
      ]
    : [];
  const labels = params.details.includes('names')
    ? placeLabels(
        sky.labels
          .filter((l) => l.alt > 4)
          .map((l) => ({
            ...projectAltAz(l.alt, l.az, disc),
            text: l.name.toUpperCase(),
            rank: l.rank,
          })),
        {
          disc,
          size: LABEL_SIZE * scale,
          tracking: LABEL_TRACKING * scale,
          avoid,
        },
      )
    : [];

  const o = layout.cardinalOffset;
  const cardinal = [
    {label: 'N', x: disc.cx, y: disc.cy - disc.r - (o - 2 * scale)},
    {label: 'S', x: disc.cx, y: disc.cy + disc.r + o + 5 * scale},
    {
      label: 'E',
      x: disc.cx - disc.r - o - scale,
      y: disc.cy + layout.cardinalSize * 0.43,
    },
    {
      label: 'W',
      x: disc.cx + disc.r + o + scale,
      y: disc.cy + layout.cardinalSize * 0.43,
    },
  ];

  return {
    ...layout,
    stars,
    glows,
    lines,
    milkyWay,
    grid: params.details.includes('grid') ? buildGrid(disc) : null,
    labels,
    compass: layout.ring === 'compass' ? buildCompass(disc, scale) : null,
    moon,
    planets,
    cardinal,
    title: params.title,
    subtitle: skySubtitle(params),
    subtitleParts: skySubtitleParts(params),
    credit: SKY_CREDIT,
  };
}
