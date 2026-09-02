import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSkyShareUrl,
  parseSkySearch,
} from '../app/lib/sky/configuratorState.ts';
import {canonicalSkyParams, validateSkyParams} from '../app/lib/sky/params.ts';

const params = validateSkyParams({
  date: '2019-06-14',
  time: '22:00',
  lat: 48.8566,
  lon: 2.3522,
  tz: 'Europe/Paris',
  place: 'Paris, France',
  title: 'The night we met',
  theme: 'midnight-garden',
}).params;

test('a share link carries the sky and keeps the chosen size and finish', () => {
  const url = buildSkyShareUrl(
    'https://shopclaramendes.com',
    '/your-sky',
    params,
    '?Size=8+%C3%97+10+in&Finish=Natural+frame',
  );
  const parsed = new URL(url);
  assert.equal(parsed.origin + parsed.pathname, 'https://shopclaramendes.com/your-sky');
  assert.equal(parsed.searchParams.get('Size'), '8 × 10 in');
  assert.equal(parsed.searchParams.get('Finish'), 'Natural frame');
  assert.equal(parsed.searchParams.get('place'), 'Paris, France');
  assert.equal(parsed.searchParams.get('theme'), 'midnight-garden');
  assert.equal(parsed.searchParams.get('title'), 'The night we met');
});

test('a share link round-trips to the same canonical sky', () => {
  const url = buildSkyShareUrl('https://x.test', '/your-sky', params, '');
  const restored = parseSkySearch(new URL(url).search);
  assert.ok(restored);
  assert.equal(canonicalSkyParams(restored), canonicalSkyParams(params));
});

test('searches without a complete sky give nothing back', () => {
  assert.equal(parseSkySearch(''), null);
  assert.equal(parseSkySearch('?Size=8+%C3%97+10+in'), null);
  assert.equal(parseSkySearch('?date=2019-06-14&place=Paris'), null);
});
