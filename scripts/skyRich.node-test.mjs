import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GLOW_COUNT,
  GLOW_RINGS,
  LABEL_SIZE,
  LABEL_TRACKING,
  MOON_RADIUS,
  starStyle,
} from '../app/lib/sky/style.ts';
import {GALAXY_SAMPLES, galacticToEquatorial} from '../app/lib/sky/galaxy.ts';
import {SKY_THEMES} from '../app/lib/sky/themes.ts';
import {placeLabels} from '../app/lib/sky/labels.ts';
import {circlePath, computeSky, horizonCrossing} from '../app/lib/sky/scene.ts';
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

test('galaxy samples: every 3°, brightest and widest at the centre', () => {
  assert.equal(GALAXY_SAMPLES.length, 120);
  const centre = GALAXY_SAMPLES[0];
  const anticentre = GALAXY_SAMPLES[60];
  assert.ok(centre.intensity > anticentre.intensity);
  assert.ok(centre.width > anticentre.width);
  assert.ok(GALAXY_SAMPLES.every((s) => s.intensity > 0 && s.intensity <= 1));
});

test('circlePath draws a two-arc circle wound the same way both times', () => {
  assert.equal(circlePath(10, 20, 5), 'M 5 20 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0 Z');
});

test('every theme defines the richer-sky tokens', () => {
  // `labelColor` (not `label`): the plan's `label` would collide with the
  // pre-existing SkyTheme.label display-name field (e.g. "Linen").
  const colours = ['milkyWay', 'glow', 'moonGlow', 'moonFace', 'moonShade', 'moonEdge', 'grid', 'labelColor'];
  const opacities = ['milkyWayOpacity', 'moonShadeOpacity', 'gridOpacity', 'labelColorOpacity'];
  for (const theme of Object.values(SKY_THEMES)) {
    for (const key of colours) assert.match(theme[key], /^#[0-9a-f]{6}$/, `${theme.id}.${key}`);
    for (const key of opacities) assert.ok(theme[key] > 0 && theme[key] <= 1, `${theme.id}.${key}`);
    assert.ok(theme.moonGlowStrength > 0, `${theme.id}.moonGlowStrength`);
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
  assert.ok(scene.milkyWay.length >= 2 && scene.milkyWay.length <= 4, `${scene.milkyWay.length} Milky Way passes`);
  assert.ok(scene.milkyWay.every((p) => p.path.startsWith('M') && p.path.includes(' Z')));
  assert.ok(scene.milkyWay.every((p) => p.weight > 0));
  const subPathCount = (path) => (path.match(/M /g) ?? []).length;
  for (let i = 1; i < scene.milkyWay.length; i++) {
    // Inner passes (later in the array) only include the brighter samples,
    // so they can never have more sub-paths (discs) than the pass before.
    assert.ok(
      subPathCount(scene.milkyWay[i].path) <= subPathCount(scene.milkyWay[i - 1].path),
      `pass ${i} has more sub-paths than pass ${i - 1}`,
    );
  }
  assert.ok(scene.moon, 'the Moon is up over Paris at 22:00 on 2019-06-14');
  assert.equal(scene.moon.r, MOON_RADIUS * scene.scale);
  // Spec budget: the SVG stays under ~6,000 drawn elements. The Milky Way
  // now contributes one path element per pass.
  const nodes = scene.stars.length + scene.lines.length + scene.milkyWay.length + scene.glows.length * 3;
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
  const sixty = compass.compass.numerals.find((n) => n.text === '60');
  assert.ok(sixty.x < compass.disc.cx, 'east is on the left, so 60° sits left of centre');
  const r = (layout) => computeSky({params: sky({layout}), size: '8x10', catalog}).disc.r;
  assert.ok(r('full') > r('classic') && r('classic') > r('compass') && r('compass') > r('minimal'));
  const minimal = computeSky({params: sky({layout: 'minimal'}), size: '8x10', catalog});
  assert.ok(minimal.stars.every((s) => inDisc(minimal, s.x, s.y)));
});

test('glows are exactly the GLOW_COUNT lowest-magnitude visible stars', () => {
  const scene = computeSky({params: sky(), size: '8x10', catalog});
  const expected = [...scene.stars]
    .sort((a, b) => a.mag - b.mag)
    .slice(0, GLOW_COUNT)
    .map(({x, y, r}) => ({x, y, r}));
  assert.deepEqual(scene.glows, expected);
});

test('horizon crossing handles the 360° wrap and lies on the great circle', () => {
  const a = {alt: 5, az: 355};
  const b = {alt: -5, az: 5};
  const p = horizonCrossing(a, b);
  const wrapDistance = Math.min(p.az, 360 - p.az);
  assert.ok(wrapDistance < 0.5, `az ${p.az}`);

  const toVec = ({alt, az}) => {
    const A = (alt * Math.PI) / 180;
    const Z = (az * Math.PI) / 180;
    return [Math.cos(A) * Math.cos(Z), Math.cos(A) * Math.sin(Z), Math.sin(A)];
  };
  const [va, vb, vp] = [toVec(a), toVec(b), toVec(p)];
  const cross = [
    va[1] * vb[2] - va[2] * vb[1],
    va[2] * vb[0] - va[0] * vb[2],
    va[0] * vb[1] - va[1] * vb[0],
  ];
  const triple = cross[0] * vp[0] + cross[1] * vp[1] + cross[2] * vp[2];
  assert.ok(Math.abs(triple) < 1e-6, `triple product ${triple}`);
});

test('worst-case scene stays under the ~6,000 SVG element budget', () => {
  const params = sky({
    layout: 'compass',
    details: 'names,grid,time',
    lat: -30,
    lon: 0,
    tz: 'UTC',
    place: 'Test, Test',
    date: '2019-06-14',
    time: '11:20',
  });
  const scene = computeSky({params, size: '20x24', catalog});
  const nodes =
    scene.stars.length +
    scene.lines.length +
    scene.milkyWay.length +
    scene.glows.length * 3 +
    (scene.grid ? scene.grid.circles.length + scene.grid.spokes.length : 0) +
    scene.labels.length +
    (scene.compass ? scene.compass.ticks.length + scene.compass.numerals.length : 0) +
    scene.planets.length * 2 +
    (scene.moon ? 6 : 0) +
    12; // rings, cardinals, title/subtitle/credit text
  assert.ok(nodes < 6000, `${nodes} SVG elements`);
});

test('names detail with no catalog names does not throw and yields no labels', () => {
  const scene = computeSky({
    params: sky({details: 'names'}),
    size: '8x10',
    catalog: {...catalog, names: undefined},
  });
  assert.deepEqual(scene.labels, []);
});

test('labels never overlap a planet marker', () => {
  const scene = computeSky({params: sky({details: 'names,grid,time'}), size: '8x10', catalog});
  const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  const labelBox = (l) => {
    const size = LABEL_SIZE * scene.scale;
    const tracking = LABEL_TRACKING * scene.scale;
    const width = l.text.length * size * 0.66 + tracking * (l.text.length - 1);
    return {x0: l.x - width / 2, x1: l.x + width / 2, y0: l.y - size * 0.9, y1: l.y + size * 0.3};
  };
  for (const l of scene.labels) {
    const lb = labelBox(l);
    for (const p of scene.planets) {
      const pb = {x0: p.x - 2 * p.r, x1: p.x + 2 * p.r, y0: p.y - 2 * p.r, y1: p.y + 2 * p.r};
      assert.ok(!overlaps(lb, pb), `${l.text} overlaps a planet marker`);
    }
  }
});
