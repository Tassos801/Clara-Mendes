import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const json = JSON.parse(
  readFileSync('app/data/sky/constellation-names.json', 'utf8'),
);

test('constellation names: IAU Latin names with J2000 label points', () => {
  assert.match(json.source, /d3-celestial/);
  assert.ok(json.count >= 88 && json.count <= 89, `count ${json.count}`);
  assert.equal(json.data.length, json.count);
  const orion = json.data.find((row) => row[1] === 'Orion');
  assert.deepEqual(orion.slice(2, 4), [84, 13]);
  // d3-celestial's "la" (IAU Latin) field is the classical Latin spelling,
  // not the English name — "Ursa Maior", not "Ursa Major" — and some
  // two-word Latin names use U+2005 (four-per-em space) instead of an
  // ASCII space, so match loosely rather than with strict equality.
  assert.ok(json.data.some((row) => /^Ursa\s+Maior$/.test(row[1])));
  for (const [id, name, ra, dec, rank] of json.data) {
    assert.match(id, /^[A-Z][A-Za-z0-9]{1,4}$/, id);
    // Some two-word Latin names in the source use U+2005 (four-per-em
    // space) instead of an ASCII space (e.g. "Canis Maior"); \s covers it.
    assert.match(name, /^[A-Za-z\s]+$/, name);
    assert.ok(ra >= 0 && ra < 360, `${name} ra ${ra}`);
    assert.ok(dec >= -90 && dec <= 90, `${name} dec ${dec}`);
    assert.ok([1, 2, 3].includes(rank), `${name} rank ${rank}`);
  }
});
