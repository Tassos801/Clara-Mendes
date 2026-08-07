import assert from 'node:assert/strict';

import {
  ART_RATIO,
  MOCKUP_OUTPUT,
  MOCKUP_SCENES,
  computePrintPlacement,
  mockupFileName,
  mockupRelativePath,
} from './lib/room-mockup-scenes.mjs';

// Two scenes with distinct suffixes and alt copy.
assert.equal(MOCKUP_SCENES.length, 2);
assert.equal(
  new Set(MOCKUP_SCENES.map((scene) => scene.fileSuffix)).size,
  MOCKUP_SCENES.length,
);
for (const scene of MOCKUP_SCENES) {
  const alt = scene.altFor('Quiet Form I');
  assert.ok(alt.includes('Quiet Form I'), `${scene.key}: alt names the print`);
  assert.ok(alt.includes('unframed'), `${scene.key}: alt states unframed`);
}

// Crops keep the output aspect ratio (no distortion when resizing).
const outputRatio = MOCKUP_OUTPUT.width / MOCKUP_OUTPUT.height;
for (const scene of MOCKUP_SCENES) {
  const cropRatio = scene.crop.width / scene.crop.height;
  assert.ok(
    Math.abs(cropRatio - outputRatio) < 0.01,
    `${scene.key}: crop ratio ${cropRatio.toFixed(3)} != output ${outputRatio}`,
  );
}

// Placement stays inside the canvas and preserves the 4:5 art ratio.
for (const scene of MOCKUP_SCENES) {
  const placement = computePrintPlacement(scene);
  assert.ok(placement.left >= 0 && placement.top >= 0, scene.key);
  assert.ok(placement.left + placement.width <= MOCKUP_OUTPUT.width, scene.key);
  assert.ok(
    placement.top + placement.height <= MOCKUP_OUTPUT.height,
    scene.key,
  );
  const ratio = placement.width / placement.height;
  assert.ok(
    Math.abs(ratio - ART_RATIO.width / ART_RATIO.height) < 0.01,
    `${scene.key}: print ratio ${ratio.toFixed(3)} is not 4:5`,
  );
}

// Out-of-bounds placement throws instead of silently clipping.
assert.throws(() =>
  computePrintPlacement({
    key: 'bad',
    print: {centerXRatio: 0.95, centerYRatio: 0.5, widthRatio: 0.3},
  }),
);

// File naming derives from the catalog image path.
const detail = MOCKUP_SCENES[0];
assert.equal(
  mockupFileName('quiet-form-01.webp', detail),
  'quiet-form-01-room-detail.webp',
);
assert.equal(
  mockupRelativePath('/images/product-art/quiet-form/quiet-form-01.webp', detail),
  'quiet-form/quiet-form-01-room-detail.webp',
);
assert.equal(
  mockupRelativePath('flat-file.webp', detail),
  'flat-file-room-detail.webp',
);
