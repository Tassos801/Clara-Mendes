import assert from 'node:assert/strict';
import test from 'node:test';
import {SKY_LAYOUT_IDS} from '../app/lib/sky/params.ts';
import {skyPageLayout} from '../app/lib/sky/layouts.ts';
import {layoutFor} from '../app/lib/sky/projection.ts';

const SIZES = [
  [576, 720],
  [1440, 1728],
];

test('classic matches the original proportions exactly', () => {
  const a = layoutFor(576, 720);
  const b = skyPageLayout('classic', 576, 720);
  const close = (x, y) => Math.abs(x - y) < 1e-9;
  assert.ok(close(a.disc.cx, 288) && close(a.disc.cy, 288) && close(a.disc.r, 230.4), JSON.stringify(a.disc));
  assert.deepEqual(a.disc, b.disc);
  assert.equal(b.titleY, 720 * 0.79);
  assert.equal(b.subtitleY, 720 * 0.835);
  assert.equal(b.titleSize, 30);
  assert.equal(b.ring, 'plain');
});

test('every layout keeps the map, cardinals and text on the sheet', () => {
  for (const id of SKY_LAYOUT_IDS) {
    for (const [w, h] of SIZES) {
      const l = skyPageLayout(id, w, h);
      const {cx, cy, r} = l.disc;
      assert.equal(l.scale, w / 576);
      const outer = r + l.cardinalOffset + l.cardinalSize;
      assert.ok(cy - outer > 0, `${id} ${w}: top ${cy - outer}`);
      assert.ok(cx - outer > 0 && cx + outer < w, `${id} ${w}: sides`);
      const bottom = cy + r + l.cardinalOffset + 5 * l.scale;
      assert.ok(bottom < l.titleY - l.titleSize * 0.8, `${id} ${w}: S cardinal ${bottom} vs title ${l.titleY}`);
      assert.ok(l.titleY < l.subtitleY && l.subtitleY < l.creditY && l.creditY < h, `${id} ${w}: text order`);
    }
  }
});

test('layouts differ in the promised direction', () => {
  const r = (id) => skyPageLayout(id, 576, 720).disc.r;
  assert.ok(r('full') > r('classic') * 1.1, 'full is ~15% larger');
  assert.ok(r('compass') < r('classic'), 'compass is smaller');
  assert.ok(r('minimal') < r('compass'), 'minimal is smallest');
  assert.equal(skyPageLayout('compass', 576, 720).ring, 'compass');
});
