import assert from 'node:assert/strict';
import test from 'node:test';
import {localToUtc, tzOffsetMinutes} from '../app/lib/sky/time.ts';
import {Astronomy} from '../app/lib/sky/astronomyEngine.ts';
import {
  altitudeAt,
  phaseAt,
  phaseForAltitude,
  skyTimeline,
  TIMELINE_STEP,
} from '../app/lib/sky/twilight.ts';

test('local wall-clock times convert to UTC across DST and zones', () => {
  assert.equal(localToUtc('2019-06-14', '22:00', 'Europe/Paris').toISOString(), '2019-06-14T20:00:00.000Z');
  assert.equal(localToUtc('2019-01-14', '22:00', 'Europe/Paris').toISOString(), '2019-01-14T21:00:00.000Z');
  assert.equal(localToUtc('2024-01-10', '06:00', 'Australia/Sydney').toISOString(), '2024-01-09T19:00:00.000Z');
  assert.equal(tzOffsetMinutes(Date.UTC(2023, 2, 26, 1, 30), 'Europe/Lisbon'), 60);
  assert.equal(tzOffsetMinutes(Date.UTC(2023, 2, 26, 0, 30), 'Europe/Lisbon'), 0);
});

test('an unknown zone still throws', () => {
  assert.throws(() => tzOffsetMinutes(0, 'Mars/Olympus'), RangeError);
});

const PARIS = {date: '2019-06-14', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris'};
const LISBON = {date: '2023-03-02', lat: 38.7223, lon: -9.1393, tz: 'Europe/Lisbon'};
const SYDNEY = {date: '2024-01-10', lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney'};
const TROMSO_SUMMER = {date: '2023-06-21', lat: 69.6492, lon: 18.9553, tz: 'Europe/Oslo'};
const TROMSO_WINTER = {date: '2023-12-21', lat: 69.6492, lon: 18.9553, tz: 'Europe/Oslo'};

/** astronomy-engine's own search, as local minutes after midnight. */
function searched(place, kind) {
  const observer = new Astronomy.Observer(place.lat, place.lon, 0);
  const midnight = localToUtc(place.date, '00:00', place.tz);
  const start = Astronomy.MakeTime(midnight);
  const found =
    kind === 'rise' ? Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, start, 1)
    : kind === 'set' ? Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, start, 1)
    : Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, -1, start, 1, -12);
  return found ? (found.date.getTime() - midnight.getTime()) / 60000 : null;
}

test('phases follow the standard Sun altitude limits', () => {
  assert.equal(phaseForAltitude(10), 'day');
  assert.equal(phaseForAltitude(-0.5), 'day');
  assert.equal(phaseForAltitude(-3), 'civil');
  assert.equal(phaseForAltitude(-9), 'nautical');
  assert.equal(phaseForAltitude(-15), 'astronomical');
  assert.equal(phaseForAltitude(-30), 'night');
});

test('sunrise, sunset and dark-from match astronomy-engine within two minutes', () => {
  for (const place of [PARIS, LISBON, SYDNEY]) {
    const t = skyTimeline(place);
    assert.equal(t.altitudes.length, 1440 / TIMELINE_STEP + 1);
    assert.ok(Math.abs(t.sunrise - searched(place, 'rise')) < 2, `${place.tz} sunrise`);
    assert.ok(Math.abs(t.sunset - searched(place, 'set')) < 2, `${place.tz} sunset`);
    assert.ok(Math.abs(t.darkFrom - searched(place, 'dark')) < 2, `${place.tz} dark`);
  }
  const paris = skyTimeline(PARIS);
  assert.equal(Math.round(paris.sunrise), 5 * 60 + 47);
  assert.equal(Math.round(paris.sunset), 21 * 60 + 55);
  assert.equal(Math.round(paris.darkFrom), 23 * 60 + 38);
  assert.equal(Math.round(paris.darkUntil), 4 * 60 + 4);
});

test('segments cover the whole day in order with merged phases', () => {
  const t = skyTimeline(PARIS);
  assert.equal(t.segments[0].from, 0);
  assert.equal(t.segments.at(-1).to, 1440);
  for (let i = 1; i < t.segments.length; i++) {
    assert.equal(t.segments[i].from, t.segments[i - 1].to);
    assert.notEqual(t.segments[i].phase, t.segments[i - 1].phase);
  }
  // Paris in June never reaches astronomical night.
  assert.ok(!t.segments.some((s) => s.phase === 'night'));
  assert.equal(phaseAt(t, 13 * 60), 'day');
  assert.equal(phaseAt(t, 22 * 60), 'civil');
  assert.equal(phaseAt(t, 1 * 60), 'astronomical');
});

test('polar days and nights have no sunrise or sunset', () => {
  const summer = skyTimeline(TROMSO_SUMMER);
  assert.equal(summer.sunrise, null);
  assert.equal(summer.sunset, null);
  assert.deepEqual(summer.segments.map((s) => s.phase), ['day']);
  const winter = skyTimeline(TROMSO_WINTER);
  assert.equal(winter.sunrise, null);
  assert.equal(winter.sunset, null);
  assert.ok(Math.abs(winter.darkFrom - searched(TROMSO_WINTER, 'dark')) < 2);
});

test('altitude interpolates between samples', () => {
  const t = skyTimeline(PARIS);
  const mid = altitudeAt(t.altitudes, 7.5);
  assert.ok(mid < Math.max(t.altitudes[0], t.altitudes[1]));
  assert.ok(mid > Math.min(t.altitudes[0], t.altitudes[1]));
  assert.equal(altitudeAt(t.altitudes, 1440), t.altitudes.at(-1));
});
