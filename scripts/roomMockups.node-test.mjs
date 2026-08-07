import assert from 'node:assert/strict';

import {
  ART_RATIO,
  MOCKUP_OUTPUT,
  MOCKUP_SCENES,
  computePrintPlacement,
  mockupFileName,
  mockupRelativePath,
  resolveMockupAppendPlan,
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

// Append plan: fresh product (flat art only) appends every mockup.
const planned = [{alt: 'detail alt'}, {alt: 'context alt'}];
const fresh = resolveMockupAppendPlan([{alt: 'flat'}], planned);
assert.equal(fresh.action, 'append');
assert.equal(fresh.missing.length, 2);

// Append plan: partial media (one mockup landed) appends only the gap.
const partial = resolveMockupAppendPlan(
  [{alt: 'flat'}, {alt: 'detail alt'}],
  planned,
);
assert.equal(partial.action, 'append');
assert.deepEqual(partial.missing, [{alt: 'context alt'}]);

// Append plan: everything present is a no-op.
assert.equal(
  resolveMockupAppendPlan(
    [{alt: 'flat'}, {alt: 'detail alt'}, {alt: 'context alt'}],
    planned,
  ).action,
  'complete',
);

// Append plan: full media count with non-matching alts (scene copy edited
// after an apply) must NOT append duplicates.
assert.equal(
  resolveMockupAppendPlan(
    [{alt: 'flat'}, {alt: 'old detail alt'}, {alt: 'old context alt'}],
    planned,
  ).action,
  'mismatch',
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
