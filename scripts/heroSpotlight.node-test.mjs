import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  TOUCH_SPOTLIGHT_RADIUS_PX,
  spotlightDriftPoint,
  touchPointInHero,
} from '../app/lib/heroSpotlight.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const homepageSource = readFileSync(path.join(ROOT, 'app/routes/_index.tsx'), 'utf8');

test('the drift stays over the middle of the room and keeps moving', () => {
  const points = [];
  for (let ms = 0; ms <= 60000; ms += 250) points.push(spotlightDriftPoint(ms));
  for (const {x, y} of points) {
    assert.ok(x >= 25 && x <= 80, `x ${x}`);
    assert.ok(y >= 30 && y <= 72, `y ${y}`);
  }
  // It wanders across the room, not around one spot.
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 40);
  assert.ok(Math.max(...ys) - Math.min(...ys) > 25);
  // Slow: under 1.5 % of the hero per frame-ish step of 16 ms.
  for (let ms = 0; ms < 20000; ms += 16) {
    const a = spotlightDriftPoint(ms);
    const b = spotlightDriftPoint(ms + 16);
    assert.ok(Math.hypot(b.x - a.x, b.y - a.y) < 1.5);
  }
});

test('a touch maps to hero percentages, clamped to the hero', () => {
  const hero = {left: 0, top: 100, width: 400, height: 800};
  assert.deepEqual(touchPointInHero(200, 500, hero), {x: 50, y: 50});
  assert.deepEqual(touchPointInHero(-20, 0, hero), {x: 0, y: 0});
  assert.deepEqual(touchPointInHero(900, 2000, hero), {x: 100, y: 100});
});

test('touch screens get the moving spotlight; reduced motion stays still', () => {
  assert.ok(TOUCH_SPOTLIGHT_RADIUS_PX < 350, 'smaller than the desktop circle');
  assert.match(homepageSource, /spotlightDriftPoint\(now - start\)/);
  assert.match(homepageSource, /addEventListener\('touchmove', onTouch, \{passive: true\}\)/);
  assert.match(homepageSource, /\.home-root\[data-touch-spot\] \.hm-layer-sharp/);
  // The touch effect returns early for a mouse or for reduced motion.
  const effect = homepageSource.slice(homepageSource.indexOf('Touch screens have no hover'));
  assert.match(effect.slice(0, 900), /\(hover: hover\) and \(pointer: fine\)'\)\.matches \|\|/);
  assert.match(effect.slice(0, 900), /prefers-reduced-motion: reduce/);
});
