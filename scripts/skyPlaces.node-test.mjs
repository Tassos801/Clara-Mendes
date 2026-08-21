import assert from 'node:assert/strict';
import test from 'node:test';
import {normalizePlaceQuery, searchPlaces} from '../app/lib/sky/places.server.ts';

test('normalises diacritics and case', () => {
  assert.equal(normalizePlaceQuery('  Zürich '), 'zurich');
  assert.equal(normalizePlaceQuery('São Paulo'), 'sao paulo');
  assert.equal(normalizePlaceQuery('ATHÍNA'), 'athina');
});

test('finds cities by prefix, ranked by population, with country names and zones', () => {
  const results = searchPlaces('par');
  assert.equal(results[0].name, 'Paris');
  assert.equal(results[0].country, 'France');
  assert.equal(results[0].countryCode, 'FR');
  assert.equal(results[0].tz, 'Europe/Paris');
  assert.equal(results[0].label, 'Paris, France');
  assert.ok(Math.abs(results[0].lat - 48.8534) < 0.05);
  assert.ok(results.length <= 8);
  assert.equal(searchPlaces('athen')[0].tz, 'Europe/Athens');
  assert.equal(searchPlaces('zurich')[0].country, 'Switzerland');
  assert.equal(searchPlaces('Zürich')[0].country, 'Switzerland');
  assert.equal(searchPlaces('new yo')[0].name, 'New York City');
  assert.deepEqual(searchPlaces('x'), []);
  assert.deepEqual(searchPlaces('zzzzqqq'), []);
});

test('matches later words and respects the limit', () => {
  assert.ok(searchPlaces('angeles').some((r) => r.name === 'Los Angeles'));
  assert.equal(searchPlaces('san', 3).length, 3);
});
