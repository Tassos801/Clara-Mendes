import assert from 'node:assert/strict';

import {
  ART_RATIO,
  MOCKUP_OUTPUT,
  MOCKUP_SCENES,
  computePrintPlacement,
  filterMockupScenes,
  mockupFileName,
  mockupRelativePath,
  resolveMockupAppendPlan,
} from './lib/room-mockup-scenes.mjs';

// Two scenes per sellable size.
assert.equal(MOCKUP_SCENES.length, 6);
assert.equal(
  new Set(MOCKUP_SCENES.map((scene) => scene.fileSuffix)).size,
  MOCKUP_SCENES.length,
);
for (const scene of MOCKUP_SCENES) {
  const alt = scene.altFor('Quiet Form I');
  assert.ok(alt.includes('Quiet Form I'), `${scene.key}: alt names the print`);
  assert.ok(alt.includes('unframed'), `${scene.key}: alt states unframed`);
}
assert.deepEqual(
  filterMockupScenes(MOCKUP_SCENES, '16x20').map((scene) => scene.key),
  ['detail-16x20', 'context-16x20'],
);
assert.deepEqual(
  filterMockupScenes(MOCKUP_SCENES, '20x24').map((scene) => scene.key),
  ['detail-20x24', 'context-20x24'],
);
assert.equal(filterMockupScenes(MOCKUP_SCENES, '8x10').length, 2);
assert.equal(filterMockupScenes(MOCKUP_SCENES).length, 6);
assert.throws(
  () => filterMockupScenes(MOCKUP_SCENES, 'large'),
  /Unknown mockup size filter/,
);

const largeScenes = filterMockupScenes(MOCKUP_SCENES, '16x20');
assert.deepEqual(
  largeScenes.map((scene) => scene.fileSuffix),
  ['room-detail-16x20', 'room-context-16x20'],
);
for (const scene of largeScenes) {
  assert.match(scene.altFor('Quiet Form I'), /16 by 20 inch/);
}
assert.equal(
  largeScenes.find((scene) => scene.key === 'context-16x20').print.widthRatio,
  0.384,
);

const biggerScenes = filterMockupScenes(MOCKUP_SCENES, '20x24');
assert.deepEqual(
  biggerScenes.map((scene) => scene.fileSuffix),
  ['room-detail-20x24', 'room-context-20x24'],
);
for (const scene of biggerScenes) {
  assert.match(scene.altFor('Quiet Form I'), /20 by 24 inch/);
}
assert.equal(
  biggerScenes.find((scene) => scene.key === 'context-20x24').print.widthRatio,
  0.48,
);

// Crops keep the output aspect ratio (no distortion when resizing).
const outputRatio = MOCKUP_OUTPUT.width / MOCKUP_OUTPUT.height;
for (const scene of MOCKUP_SCENES) {
  const cropRatio = scene.crop.width / scene.crop.height;
  assert.ok(
    Math.abs(cropRatio - outputRatio) < 0.01,
    `${scene.key}: crop ratio ${cropRatio.toFixed(3)} != output ${outputRatio}`,
  );
}

// Placement stays inside the canvas and preserves the size's print ratio.
for (const scene of MOCKUP_SCENES) {
  const placement = computePrintPlacement(scene);
  assert.ok(placement.left >= 0 && placement.top >= 0, scene.key);
  assert.ok(placement.left + placement.width <= MOCKUP_OUTPUT.width, scene.key);
  assert.ok(
    placement.top + placement.height <= MOCKUP_OUTPUT.height,
    scene.key,
  );
  const ratio = placement.width / placement.height;
  const expectedRatio = scene.artRatio ?? ART_RATIO;
  assert.ok(
    Math.abs(ratio - expectedRatio.width / expectedRatio.height) < 0.01,
    `${scene.key}: print ratio ${ratio.toFixed(3)} is incorrect`,
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
  mockupRelativePath(
    '/images/product-art/quiet-form/quiet-form-01.webp',
    detail,
  ),
  'quiet-form/quiet-form-01-room-detail.webp',
);
assert.equal(
  mockupRelativePath('flat-file.webp', detail),
  'flat-file-room-detail.webp',
);
assert.equal(
  mockupFileName('quiet-form-01.webp', largeScenes[0]),
  'quiet-form-01-room-detail-16x20.webp',
);
assert.equal(
  mockupFileName('quiet-form-01.webp', biggerScenes[0]),
  'quiet-form-01-room-detail-20x24.webp',
);
