import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {test} from 'node:test';
import {
  BEATS,
  FPS,
  beatFrames,
  beatStarts,
  picturesOf,
  totalFrames,
} from './script.ts';

const PUBLIC = path.resolve(import.meta.dirname, '../../../public');

test('the film is exactly 45 seconds at 24 fps', () => {
  assert.equal(FPS, 24);
  assert.equal(totalFrames(BEATS), 1080);
});

test('there are thirteen beats with unique ids', () => {
  assert.equal(BEATS.length, 13);
  assert.equal(new Set(BEATS.map((beat) => beat.id)).size, 13);
});

test('beat starts are contiguous from frame 0', () => {
  const starts = beatStarts(BEATS);
  assert.equal(starts[0], 0);
  for (let index = 1; index < starts.length; index += 1) {
    assert.equal(starts[index], starts[index - 1] + beatFrames(BEATS[index - 1]));
  }
});

test('every picture exists in the storefront public folder', () => {
  for (const beat of BEATS) {
    for (const src of picturesOf(beat)) {
      assert.ok(existsSync(path.join(PUBLIC, src)), `${beat.id}: missing ${src}`);
    }
  }
});

test('captions fit two lines of the caption band', () => {
  for (const beat of BEATS) {
    if ('caption' in beat && beat.caption) {
      assert.ok(beat.caption.length <= 80, `${beat.id}: caption too long`);
    }
  }
});
