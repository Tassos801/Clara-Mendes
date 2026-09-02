import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fadeInOut} from './timing.ts';

test('fadeInOut ramps in, holds at 1, ramps out', () => {
  assert.equal(fadeInOut(0, 72, 6), 0);
  assert.equal(fadeInOut(3, 72, 6), 0.5);
  assert.equal(fadeInOut(6, 72, 6), 1);
  assert.equal(fadeInOut(36, 72, 6), 1);
  assert.equal(fadeInOut(69, 72, 6), 0.5);
  assert.equal(fadeInOut(72, 72, 6), 0);
});

test('fadeInOut never leaves [0, 1]', () => {
  assert.equal(fadeInOut(-10, 72, 6), 0);
  assert.equal(fadeInOut(500, 72, 6), 0);
});
