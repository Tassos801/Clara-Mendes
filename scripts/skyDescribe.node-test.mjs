import assert from 'node:assert/strict';
import test from 'node:test';
import {describeSkyScene, moonPhaseName} from '../app/lib/sky/describe.ts';

test('moon phases are named from the lit fraction and direction', () => {
  assert.equal(moonPhaseName(0.01, true), 'New moon');
  assert.equal(moonPhaseName(0.2, true), 'Waxing crescent moon');
  assert.equal(moonPhaseName(0.2, false), 'Waning crescent moon');
  assert.equal(moonPhaseName(0.5, true), 'First-quarter moon');
  assert.equal(moonPhaseName(0.5, false), 'Last-quarter moon');
  assert.equal(moonPhaseName(0.8, true), 'Waxing gibbous moon');
  assert.equal(moonPhaseName(0.8, false), 'Waning gibbous moon');
  assert.equal(moonPhaseName(0.99, false), 'Full moon');
});

test('the scene line reads moon, then planets, joined naturally', () => {
  const moon = {x: 0, y: 0, r: 1, phaseFraction: 0.8, litRight: true};
  const planet = (name) => ({x: 0, y: 0, r: 1, name});
  assert.equal(
    describeSkyScene({moon, planets: [planet('Jupiter'), planet('Saturn')]}, 48.8),
    'Waxing gibbous moon · Jupiter and Saturn above the horizon',
  );
  assert.equal(
    describeSkyScene(
      {moon, planets: [planet('Venus'), planet('Mars'), planet('Jupiter')]},
      48.8,
    ),
    'Waxing gibbous moon · Venus, Mars and Jupiter above the horizon',
  );
  assert.equal(
    describeSkyScene({moon: null, planets: []}, 48.8),
    'Moon below the horizon · no planets in view',
  );
});

test('the southern hemisphere reads the lit side the other way round', () => {
  const moon = {x: 0, y: 0, r: 1, phaseFraction: 0.2, litRight: true};
  assert.equal(
    describeSkyScene({moon, planets: []}, -33.9),
    'Waning crescent moon · no planets in view',
  );
});
