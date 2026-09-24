import assert from 'node:assert/strict';
import test from 'node:test';
import {validateSkyParams} from '../app/lib/sky/params.ts';
import {computeSky} from '../app/lib/sky/scene.ts';
import {createSkySceneMemo, skyLayerKey} from '../app/lib/sky/sceneMemo.ts';
import {loadSkyCatalogSync} from './lib/sky-catalog.mjs';

const catalog = loadSkyCatalogSync();
const base = {
  date: '2019-06-14',
  time: '22:00',
  lat: 48.8566,
  lon: 2.3522,
  tz: 'Europe/Paris',
  place: 'Paris, France',
  title: 'One',
  theme: 'linen',
  layout: 'compass',
  details: 'names',
};
const params = (over = {}) => validateSkyParams({...base, ...over}).params;
const LAYERS = [
  'stars',
  'glows',
  'lines',
  'milkyWay',
  'grid',
  'labels',
  'compass',
  'moon',
  'planets',
  'cardinal',
  'disc',
];

test('a text-only edit keeps every sky layer and updates the text', () => {
  const memo = createSkySceneMemo();
  const first = memo({params: params(), size: '8x10', catalog});
  const edited = params({title: 'Two', place: 'Paris, Île-de-France'});
  const titled = memo({params: edited, size: '8x10', catalog});
  for (const layer of LAYERS) {
    assert.equal(titled[layer], first[layer], `${layer} was rebuilt`);
  }
  assert.equal(titled.title, 'Two');
  assert.match(titled.subtitle, /^PARIS, ÎLE-DE-FRANCE · /);
  assert.deepEqual(titled, computeSky({params: edited, size: '8x10', catalog}));
});

test('the Time detail only changes the text; the other details change layers', () => {
  const memo = createSkySceneMemo();
  const first = memo({params: params(), size: '8x10', catalog});
  const timed = memo({params: params({details: 'names,time'}), size: '8x10', catalog});
  assert.equal(timed.stars, first.stars);
  assert.match(timed.subtitle, / · 22:00 · /);
  const gridded = memo({
    params: params({details: 'names,grid,time'}),
    size: '8x10',
    catalog,
  });
  assert.notEqual(gridded.stars, first.stars);
  assert.ok(gridded.grid);
});

test('time, layout, size or catalogue changes recompute', () => {
  const memo = createSkySceneMemo();
  const first = memo({params: params(), size: '8x10', catalog});
  assert.notEqual(
    memo({params: params({time: '22:05'}), size: '8x10', catalog}).stars,
    first.stars,
  );
  const again = memo({params: params(), size: '8x10', catalog});
  const big = memo({params: params(), size: '20x24', catalog});
  assert.notEqual(big.stars, again.stars);
  const copied = memo({params: params(), size: '20x24', catalog: {...catalog}});
  assert.notEqual(copied.stars, big.stars);
  assert.notEqual(
    skyLayerKey(params(), '8x10'),
    skyLayerKey(params({layout: 'full'}), '8x10'),
  );
  assert.equal(
    skyLayerKey(params(), '8x10'),
    skyLayerKey(params({title: 'x', theme: 'quiet-form'}), '8x10'),
  );
});
