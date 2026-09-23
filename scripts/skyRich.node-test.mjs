import assert from 'node:assert/strict';
import test from 'node:test';
import {GLOW_RINGS, milkyWayOpacity, starStyle} from '../app/lib/sky/style.ts';
import {GALAXY_SAMPLES, galacticToEquatorial} from '../app/lib/sky/galaxy.ts';

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
