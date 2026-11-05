import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {LOGO_COLORS, LOGO_HORIZONTAL, LOGO_MARK, LOGO_STACKED} from '../app/content/logo.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const subpaths = (d) => d.split('M').length - 1;

test('the mark is six rectangles that meet on one seam, in the file colours', () => {
  assert.equal(LOGO_MARK.rects.length, 6);
  assert.deepEqual(
    LOGO_MARK.rects.map((r) => r.fill),
    ['ink', 'red', 'blue', 'ink', 'yellow', 'ink'],
  );
  const seam = 290;
  const endsOnSeam = LOGO_MARK.rects.filter((r) => r.y + r.height === seam);
  const startsOnSeam = LOGO_MARK.rects.filter((r) => r.y === seam);
  assert.equal(endsOnSeam.length, 3, 'tall bar, red and blue end on the seam');
  assert.equal(startsOnSeam.length, 2, 'lower bar and yellow start on the seam');
  for (const r of LOGO_MARK.rects) {
    assert.ok(r.x >= 0 && r.x + r.width <= LOGO_MARK.width, `${r.fill} inside the box`);
    assert.ok(r.y >= 0 && r.y + r.height <= LOGO_MARK.height, `${r.fill} inside the box`);
  }
  assert.deepEqual(LOGO_COLORS, {red: '#CE1415', blue: '#023E95', yellow: '#F9C006', ink: '#111111'});
});

test('the stacked lockup holds eleven capitals with their counters and the mark at full size', () => {
  assert.equal(LOGO_STACKED.width, 803);
  assert.equal(LOGO_STACKED.height, LOGO_MARK.height);
  // 11 letters; A, R, A and D each carry a counter.
  assert.equal(subpaths(LOGO_STACKED.textPath), 15);
  assert.match(LOGO_STACKED.textPath, /^M-?\d+ -?\d+[LC]/);
  assert.doesNotMatch(LOGO_STACKED.textPath, /\./, 'integer coordinates keep the inline SVG small');
  assert.deepEqual(LOGO_STACKED.mark, {x: 519, y: 0, scale: 1});
  assert.equal(LOGO_STACKED.mark.x + LOGO_MARK.width, LOGO_STACKED.width);
  assert.ok(LOGO_STACKED.textPath.length < 14000, `path ${LOGO_STACKED.textPath.length} bytes`);
});

test('the one-line lockup keeps every letter and scales the mark to 2.4 cap heights', () => {
  assert.equal(subpaths(LOGO_HORIZONTAL.textPath), 15);
  assert.equal(LOGO_HORIZONTAL.height, 240);
  assert.equal(LOGO_HORIZONTAL.capHeight, 100);
  assert.ok(Math.abs(LOGO_HORIZONTAL.mark.scale * LOGO_MARK.height - 240) < 0.5);
  assert.equal(
    LOGO_HORIZONTAL.width,
    Math.round(LOGO_HORIZONTAL.mark.x + LOGO_MARK.width * LOGO_HORIZONTAL.mark.scale),
  );
  const xs = LOGO_HORIZONTAL.textPath.match(/-?\d+(?= -?\d+)/g).map(Number);
  assert.ok(Math.min(...xs) >= -1, 'the text starts at the left edge');
});

test('the standalone SVG files carry the same mark and an accessible title', () => {
  for (const name of ['clara-mendes-logo.svg', 'clara-mendes-logo-horizontal.svg', 'clara-mendes-mark.svg']) {
    const svg = readFileSync(path.join(ROOT, 'public/images/brand', name), 'utf8');
    assert.match(svg, /<title id="t">Clara Mendes<\/title>/, name);
    assert.equal((svg.match(/<rect /g) || []).length, 6, name);
    assert.match(svg, /fill="#CE1415"/, name);
    assert.match(svg, /fill="#023E95"/, name);
    assert.match(svg, /fill="#F9C006"/, name);
    assert.ok(svg.length < 16000, `${name} ${svg.length} bytes`);
  }
  const stacked = readFileSync(path.join(ROOT, 'public/images/brand/clara-mendes-logo.svg'), 'utf8');
  assert.match(stacked, /viewBox="0 0 803 497"/);
  assert.ok(stacked.includes(`d="${LOGO_STACKED.textPath}"`), 'the file and the module share one trace');
});
