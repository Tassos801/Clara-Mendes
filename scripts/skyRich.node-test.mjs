import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GLOW_COUNT,
  GLOW_RINGS,
  MOON_RADIUS,
  milkyWayOpacity,
  starStyle,
} from '../app/lib/sky/style.ts';
import {GALAXY_SAMPLES, galacticToEquatorial} from '../app/lib/sky/galaxy.ts';
import {SKY_THEMES} from '../app/lib/sky/themes.ts';
import {placeLabels} from '../app/lib/sky/labels.ts';
import {computeSky, horizonCrossing} from '../app/lib/sky/scene.ts';
import {validateSkyParams} from '../app/lib/sky/params.ts';
import {loadSkyCatalogSync} from './lib/sky-catalog.mjs';

test('star tone: bright stars full ink, the faintest ~35 % and smaller', () => {
  assert.equal(starStyle(0.5, 1).opacity, 1);
  assert.equal(starStyle(2.9, 1).opacity, 1);
  assert.ok(starStyle(6.4, 1).opacity < 0.4);
  const mags = [-1, 0.5, 1.5, 2.5, 3.5, 4.5, 5.2, 6.4];
  for (let i = 1; i < mags.length; i++) {
    assert.ok(starStyle(mags[i], 1).r <= starStyle(mags[i - 1], 1).r, `r at ${mags[i]}`);
    assert.ok(starStyle(mags[i], 1).opacity <= starStyle(mags[i - 1], 1).opacity, `opacity at ${mags[i]}`);
  }
  assert.equal(starStyle(1, 2.5).r, starStyle(1, 1).r * 2.5);
});

test('glow rings fade outward', () => {
  for (let i = 1; i < GLOW_RINGS.length; i++) {
    assert.ok(GLOW_RINGS[i].radius > GLOW_RINGS[i - 1].radius);
    assert.ok(GLOW_RINGS[i].opacity < GLOW_RINGS[i - 1].opacity);
  }
});

test('galactic centre lands in Sagittarius (J2000)', () => {
  const {ra, dec} = galacticToEquatorial(0, 0);
  assert.ok(Math.abs(ra - 266.405) < 0.01, `ra ${ra}`);
  assert.ok(Math.abs(dec - -28.936) < 0.01, `dec ${dec}`);
  const pole = galacticToEquatorial(0, 90);
  assert.ok(Math.abs(pole.ra - 192.8595) < 0.01 && Math.abs(pole.dec - 27.1283) < 0.01);
});

test('galaxy samples: every 2°, brightest and widest at the centre', () => {
  assert.equal(GALAXY_SAMPLES.length, 180);
  const centre = GALAXY_SAMPLES[0];
  const anticentre = GALAXY_SAMPLES[90];
  assert.ok(centre.intensity > anticentre.intensity);
  assert.ok(centre.width > anticentre.width);
  assert.ok(GALAXY_SAMPLES.every((s) => s.intensity > 0 && s.intensity <= 1));
});

test('milky way opacity is quantised to limit PDF graphics states', () => {
  assert.equal(milkyWayOpacity(0.035, 0.73333, 0.45), 0.012);
});

test('every theme defines the richer-sky tokens', () => {
  // `labelColor` (not `label`): the plan's `label` would collide with the
  // pre-existing SkyTheme.label display-name field (e.g. "Linen").
  const colours = ['milkyWay', 'glow', 'moonFace', 'moonShade', 'moonEdge', 'grid', 'labelColor'];
  const opacities = ['milkyWayOpacity', 'moonShadeOpacity', 'gridOpacity', 'labelColorOpacity'];
  for (const theme of Object.values(SKY_THEMES)) {
    for (const key of colours) assert.match(theme[key], /^#[0-9a-f]{6}$/, `${theme.id}.${key}`);
    for (const key of opacities) assert.ok(theme[key] > 0 && theme[key] <= 1, `${theme.id}.${key}`);
    assert.ok(theme.moonLit && theme.moonDark, `${theme.id} keeps First Light's tokens`);
  }
});

test('labels skip collisions, the avoided Moon box and the disc edge', () => {
  const disc = {cx: 100, cy: 100, r: 90};
  const placed = placeLabels(
    [
      {x: 100, y: 100, text: 'ORION', rank: 1},
      {x: 102, y: 101, text: 'LEPUS', rank: 2}, // overlaps Orion
      {x: 100, y: 60, text: 'TAURUS', rank: 1},
      {x: 100, y: 140, text: 'CANIS MAJOR', rank: 1}, // inside the Moon box
      {x: 185, y: 100, text: 'ERIDANUS', rank: 1}, // spills over the edge
    ],
    {disc, size: 5, tracking: 1, avoid: [{x0: 80, x1: 120, y0: 130, y1: 150}]},
  );
  assert.deepEqual(placed.map((l) => l.text).sort(), ['ORION', 'TAURUS']);
});

const catalog = loadSkyCatalogSync();
const sky = (extra = {}) =>
  validateSkyParams({
    date: '2019-06-14',
    time: '22:00',
    lat: 48.8566,
    lon: 2.3522,
    tz: 'Europe/Paris',
    place: 'Paris, France',
    title: 'The night we met',
    theme: 'linen',
    ...extra,
  }).params;
const inDisc = (scene, x, y, slack = 1e-6) =>
  Math.hypot(x - scene.disc.cx, y - scene.disc.cy) <= scene.disc.r + slack;

test('horizon crossing lies on the horizon between its endpoints', () => {
  const p = horizonCrossing({alt: 10, az: 40}, {alt: -10, az: 50});
  assert.ok(Math.abs(p.alt) < 1e-9);
  assert.ok(p.az > 40 && p.az < 50, `az ${p.az}`);
});

test('richer sky: tone, glows, clipped lines, Milky Way, Moon', () => {
  const scene = computeSky({params: sky(), size: '8x10', catalog});
  assert.ok(scene.stars.some((s) => s.opacity < 0.4), 'faint stars toned down');
  assert.ok(scene.glows.length > 0 && scene.glows.length <= GLOW_COUNT);
  assert.ok(scene.glows.every((g) => inDisc(scene, g.x, g.y)));
  assert.ok(scene.lines.every((l) => inDisc(scene, l.x1, l.y1) && inDisc(scene, l.x2, l.y2)));
  const onRing = (x, y) => Math.abs(Math.hypot(x - scene.disc.cx, y - scene.disc.cy) - scene.disc.r) < 1e-6;
  assert.ok(scene.lines.some((l) => onRing(l.x1, l.y1) || onRing(l.x2, l.y2)), 'some lines clipped at the ring');
  assert.ok(scene.milkyWay.length > 20, `${scene.milkyWay.length} galaxy discs`);
  assert.ok(scene.milkyWay.every((m) => m.r > 0 && m.intensity > 0));
  if (scene.moon) assert.equal(scene.moon.r, MOON_RADIUS * scene.scale);
  // Spec budget: the SVG stays under ~6,000 drawn elements.
  const nodes =
    scene.stars.length + scene.lines.length + scene.milkyWay.length * 2 + scene.glows.length * 3;
  assert.ok(nodes < 6000, `${nodes} SVG elements`);
  assert.equal(scene.grid, null);
  assert.deepEqual(scene.labels, []);
  assert.equal(scene.compass, null);
  assert.equal(scene.subtitle, 'PARIS, FRANCE · 14 JUNE 2019 · 48.8566° N, 2.3522° E');
});

test('details: grid circles and spokes, names, time in the subtitle', () => {
  const scene = computeSky({params: sky({details: 'names,grid,time'}), size: '8x10', catalog});
  const {r} = scene.disc;
  assert.deepEqual(
    scene.grid.circles.map((c) => Math.round(c * 1000) / 1000),
    [r * Math.tan(Math.PI / 12), r * Math.tan(Math.PI / 6)].map((c) => Math.round(c * 1000) / 1000),
  );
  assert.equal(scene.grid.spokes.length, 12);
  assert.ok(scene.labels.length >= 6, `${scene.labels.length} labels`);
  assert.ok(scene.labels.every((l) => inDisc(scene, l.x, l.y)));
  assert.equal(new Set(scene.labels.map((l) => l.text)).size, scene.labels.length);
  assert.equal(scene.subtitle, 'PARIS, FRANCE · 14 JUNE 2019 · 22:00 · 48.8566° N, 2.3522° E');
});

test('layouts: compass ring and per-layout disc sizes', () => {
  const compass = computeSky({params: sky({layout: 'compass'}), size: '20x24', catalog});
  assert.equal(compass.compass.ticks.length, 180);
  assert.deepEqual(
    compass.compass.numerals.map((n) => n.text),
    ['30', '60', '120', '150', '210', '240', '300', '330'],
  );
  const r = (layout) => computeSky({params: sky({layout}), size: '8x10', catalog}).disc.r;
  assert.ok(r('full') > r('classic') && r('classic') > r('compass') && r('compass') > r('minimal'));
  const minimal = computeSky({params: sky({layout: 'minimal'}), size: '8x10', catalog});
  assert.ok(minimal.stars.every((s) => inDisc(minimal, s.x, s.y)));
});
