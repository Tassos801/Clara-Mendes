import assert from 'node:assert/strict';
import test from 'node:test';
import {localToUtc, tzOffsetMinutes} from '../app/lib/sky/time.ts';
import {altAzFromHourAngle, skyPositions} from '../app/lib/sky/astro.ts';
import {Astronomy} from '../app/lib/sky/astronomyEngine.ts';
import {layoutFor, projectAltAz} from '../app/lib/sky/projection.ts';
import {moonLitPath} from '../app/lib/sky/moon.ts';
import {computeSky} from '../app/lib/sky/scene.ts';
import {validateSkyParams} from '../app/lib/sky/params.ts';
import {loadSkyCatalogSync} from './lib/sky-catalog.mjs';

const catalog = loadSkyCatalogSync();
const paris = validateSkyParams({
  date: '2019-06-14',
  time: '22:00',
  lat: 48.8566,
  lon: 2.3522,
  tz: 'Europe/Paris',
  place: 'Paris, France',
  title: 'The night we met',
  theme: 'linen',
}).params;

test('local wall time converts through IANA zones incl. DST', () => {
  assert.equal(
    localToUtc('2019-06-14', '22:00', 'Europe/Paris').toISOString(),
    '2019-06-14T20:00:00.000Z',
  );
  assert.equal(
    localToUtc('1990-01-01', '00:00', 'Europe/Athens').toISOString(),
    '1989-12-31T22:00:00.000Z',
  );
  assert.equal(
    localToUtc('2024-12-31', '23:30', 'Europe/Lisbon').toISOString(),
    '2024-12-31T23:30:00.000Z',
  );
  assert.equal(
    localToUtc('2021-07-04', '12:00', 'America/New_York').toISOString(),
    '2021-07-04T16:00:00.000Z',
  );
  assert.equal(tzOffsetMinutes(Date.UTC(2019, 5, 14, 20), 'Europe/Paris'), 120);
  assert.equal(tzOffsetMinutes(Date.UTC(2019, 0, 14, 20), 'Europe/Paris'), 60);
});

// Meeus, Astronomical Algorithms (2nd ed.), example 13.b: Venus seen from
// the U.S. Naval Observatory (λ = 77°03′56″ W, φ = 38°55′17″ N) on
// 1987 April 10 at 19:21:00 UT. Apparent α = 23h09m16.641s,
// δ = −6°43′11.61″, apparent Greenwich sidereal time 8h34m57.0896s.
// Result: A = 68.0337° (west of south) → 248.0337° from north, h = 15.1249°.
test('alt/az from hour angle matches Meeus 13.b', () => {
  const lat = 38 + 55 / 60 + 17 / 3600;
  const lonWest = 77 + 3 / 60 + 56 / 3600;
  const raDeg = (23 + 9 / 60 + 16.641 / 3600) * 15;
  const decDeg = -(6 + 43 / 60 + 11.61 / 3600);
  const gastDeg = (8 + 34 / 60 + 57.0896 / 3600) * 15;
  const {alt, az} = altAzFromHourAngle(gastDeg - lonWest - raDeg, decDeg, lat);
  assert.ok(Math.abs(alt - 15.1249) < 0.001, `alt ${alt}`);
  assert.ok(Math.abs(az - 248.0337) < 0.001, `az ${az}`);
});

test('rotation path agrees with the hour-angle path for a bright star', () => {
  // Vega, J2000: α = 18h36m56.3s, δ = +38°47′01″. Compare our matrix route
  // against astronomy-engine's own Horizon() for the same instant.
  const when = localToUtc('2019-06-14', '22:00', 'Europe/Paris');
  const sky = skyPositions({date: when, lat: 48.8566, lon: 2.3522, catalog});
  const vegaRa = (18 + 36 / 60 + 56.3 / 3600) * 15;
  const vegaDec = 38 + 47 / 60 + 1 / 3600;
  const vega = sky.stars.reduce((best, s) =>
    Math.hypot(s.ra - vegaRa, s.dec - vegaDec) <
    Math.hypot(best.ra - vegaRa, best.dec - vegaDec)
      ? s
      : best,
  );
  const time = Astronomy.MakeTime(when);
  const observer = new Astronomy.Observer(48.8566, 2.3522, 0);
  // Horizon() wants of-date coordinates; convert J2000 → of-date first.
  const eqj = Astronomy.VectorFromSphere(
    new Astronomy.Spherical(vegaDec, vegaRa, 1),
    time,
  );
  const eqd = Astronomy.RotateVector(Astronomy.Rotation_EQJ_EQD(time), eqj);
  const sph = Astronomy.EquatorFromVector(eqd);
  const ref = Astronomy.Horizon(time, observer, sph.ra, sph.dec, null);
  assert.ok(Math.abs(vega.alt - ref.altitude) < 0.05, `alt ${vega.alt} vs ${ref.altitude}`);
  assert.ok(Math.abs(vega.az - ref.azimuth) < 0.05, `az ${vega.az} vs ${ref.azimuth}`);
  assert.ok(vega.alt > 30, `Vega is high in the June evening sky over Paris (${vega.alt})`);
});

test('Polaris sits near the pole and the Sun is down at 22:00 in June', () => {
  const when = localToUtc('2019-06-14', '22:00', 'Europe/Paris');
  const sky = skyPositions({date: when, lat: 48.8566, lon: 2.3522, catalog});
  const polaris = sky.stars.reduce((best, s) => (s.dec > best.dec ? s : best));
  assert.ok(Math.abs(polaris.alt - 48.8566) < 1, `polaris alt ${polaris.alt}`);
  assert.ok(Math.abs(polaris.az) < 1.5 || Math.abs(polaris.az - 360) < 1.5, `polaris az ${polaris.az}`);
  assert.ok(sky.sun.alt < 0, `sun alt ${sky.sun.alt}`);
  assert.ok(sky.stars.some((s) => s.alt > 0));
  assert.ok(sky.moon.phaseFraction >= 0 && sky.moon.phaseFraction <= 1);
  assert.equal(sky.planets.length, 5);
});

test('southern hemisphere keeps Polaris below the horizon', () => {
  const when = localToUtc('2019-06-14', '22:00', 'Australia/Sydney');
  const sky = skyPositions({date: when, lat: -33.8688, lon: 151.2093, catalog});
  const polaris = sky.stars.reduce((best, s) => (s.dec > best.dec ? s : best));
  assert.ok(polaris.alt < -30);
});

test('stereographic projection puts the zenith at centre and the horizon on the ring', () => {
  const disc = {cx: 100, cy: 100, r: 50};
  const zenith = projectAltAz(90, 0, disc);
  assert.ok(Math.abs(zenith.x - 100) < 1e-9 && Math.abs(zenith.y - 100) < 1e-9);
  const north = projectAltAz(0, 0, disc);
  assert.ok(Math.abs(north.x - 100) < 1e-9 && Math.abs(north.y - 50) < 1e-9, 'north is up');
  const east = projectAltAz(0, 90, disc);
  assert.ok(Math.abs(east.x - 50) < 1e-9 && Math.abs(east.y - 100) < 1e-9, 'east is on the left');
  const mid = projectAltAz(45, 180, disc);
  assert.ok(mid.y > 100 && mid.y < 150, 'south-ish, halfway out');
  const layout = layoutFor(576, 720);
  assert.equal(layout.scale, 1);
  assert.equal(layoutFor(1440, 1728).scale, 2.5);
});

test('moon path degenerates sensibly at new and full', () => {
  assert.equal(moonLitPath(0, 0, 10, 0, true), '');
  assert.match(moonLitPath(0, 0, 10, 1, true), /^M -10 0 A 10 10/);
  assert.match(moonLitPath(0, 0, 10, 0.25, true), /^M 0 -10 A 10 10 0 0 1 0 10 A 5 10 0 0 \d 0 -10 Z$/);
});

test('computeSky builds a scene in points for both sizes', () => {
  const small = computeSky({params: paris, size: '8x10', catalog});
  assert.equal(small.width, 576);
  assert.equal(small.height, 720);
  assert.ok(small.stars.length > 1500 && small.stars.length < 6000, `${small.stars.length} stars`);
  assert.ok(
    small.stars.every(
      (s) => Math.hypot(s.x - small.disc.cx, s.y - small.disc.cy) <= small.disc.r + 1e-6,
    ),
  );
  assert.ok(small.lines.length > 50, `${small.lines.length} lines`);
  assert.equal(small.title, 'The night we met');
  assert.equal(small.subtitle, 'PARIS, FRANCE · 14 JUNE 2019 · 48.8566° N, 2.3522° E');
  const large = computeSky({params: paris, size: '20x24', catalog});
  assert.equal(large.width, 1440);
  assert.equal(large.stars.length, small.stars.length);
  assert.ok(large.stars[0].r > small.stars[0].r);
});
