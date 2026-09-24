import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import fontkit from '@pdf-lib/fontkit';
import {LABEL_SIZE, LABEL_TRACKING} from '../app/lib/sky/style.ts';
import {computeSky} from '../app/lib/sky/scene.ts';
import {validateSkyParams} from '../app/lib/sky/params.ts';
import {loadSkyCatalogSync} from './lib/sky-catalog.mjs';

// The print draws labels in EB Garamond Regular, glyph by glyph with
// tracking (pdf.server.ts drawTracked), so the real ink box is the sum of
// the real advance widths plus the tracking between glyphs.
const regular = fontkit.create(readFileSync('public/fonts/EBGaramond-Regular.ttf'));
const advance = (ch) => regular.layout(ch).advanceWidth / regular.unitsPerEm;

function realBox(label, scale) {
  const size = LABEL_SIZE * scale;
  const tracking = LABEL_TRACKING * scale;
  const chars = [...label.text];
  const width =
    chars.reduce((w, ch) => w + advance(ch) * size, 0) + tracking * (chars.length - 1);
  return {
    x0: label.x - width / 2,
    x1: label.x + width / 2,
    y0: label.y - 0.72 * size, // cap height with overshoot
    y1: label.y + 0.02 * size,
  };
}

const intersects = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

function collisions(scene) {
  const boxes = scene.labels.map((l) => ({text: l.text, box: realBox(l, scene.scale)}));
  const hits = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (intersects(boxes[i].box, boxes[j].box)) hits.push(`${boxes[i].text}/${boxes[j].text}`);
    }
  }
  return hits;
}

const catalog = loadSkyCatalogSync();
const scene = (input, size) => {
  const result = validateSkyParams({
    place: 'Test, Test',
    title: 'Test',
    theme: 'linen',
    details: 'names',
    ...input,
  });
  assert.ok(result.ok, result.error);
  return computeSky({params: result.params, size, catalog});
};

test('evidence skies: no two printed labels touch', () => {
  const sydney = scene(
    {date: '2019-06-14', time: '21:15', tz: 'Australia/Sydney', lat: -33.8688, lon: 151.2093, layout: 'classic'},
    '20x24',
  );
  const paris = scene(
    {date: '2024-03-20', time: '12:00', tz: 'Europe/Paris', lat: 48.8566, lon: 2.3522, layout: 'compass'},
    '8x10',
  );
  assert.ok(sydney.labels.length > 5 && paris.labels.length > 5, 'both skies still carry labels');
  assert.deepEqual(collisions(sydney), [], 'Sydney 2019-06-14 classic 20x24');
  assert.deepEqual(collisions(paris), [], 'Paris 2024-03-20 compass 8x10');
});

test('sweep: labels never overlap by real EB Garamond widths', () => {
  const failures = [];
  let scenes = 0;
  let labels = 0;
  for (const lat of [-60, -30, 0, 30, 60]) {
    for (const date of ['2024-01-15', '2024-04-15', '2024-07-15', '2024-10-15']) {
      for (const time of ['21:00', '00:00', '03:00']) {
        for (const layout of ['classic', 'compass', 'full', 'minimal']) {
          for (const size of ['8x10', '20x24']) {
            const s = scene({date, time, tz: 'UTC', lat, lon: 0, layout}, size);
            scenes++;
            labels += s.labels.length;
            const hits = collisions(s);
            if (hits.length) failures.push(`${lat}° ${date} ${time} ${layout} ${size}: ${hits.join(', ')}`);
          }
        }
      }
    }
  }
  assert.equal(scenes, 480);
  // The padding must not strip the map bare: the old estimate placed 36.9
  // labels per sky on this sweep.
  assert.ok(labels / scenes > 30, `${(labels / scenes).toFixed(1)} labels per sky`);
  assert.deepEqual(failures, [], `${failures.length} of ${scenes} skies have touching labels`);
});
