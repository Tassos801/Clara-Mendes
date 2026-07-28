import assert from 'node:assert/strict';
import {
  buildCapsuleTagQuery,
  CAPSULES,
  getCapsuleBySlug,
} from '../app/lib/capsules.ts';

// Five capsules, each mapping to exactly three catalog prints
assert.equal(CAPSULES.length, 5);
assert.deepEqual(
  CAPSULES.map((capsule) => capsule.slug).sort(),
  ['midnight-garden', 'neo-deco', 'patina-blue', 'quiet-form', 'sunlit-mosaic'],
);
for (const capsule of CAPSULES) {
  assert.equal(
    capsule.handles.length,
    3,
    `${capsule.slug} should contain 3 prints, got ${capsule.handles.length}`,
  );
}

// Slug lookup is case/whitespace tolerant and rejects unknown values
const quietForm = getCapsuleBySlug('quiet-form');
assert.ok(quietForm);
assert.deepEqual(quietForm.handles, [
  'quiet-form-i-art-print',
  'quiet-form-ii-art-print',
  'quiet-form-iii-art-print',
]);
assert.equal(getCapsuleBySlug(' Quiet-Form ')?.slug, 'quiet-form');
assert.equal(getCapsuleBySlug('not-a-capsule'), null);
assert.equal(getCapsuleBySlug(null), null);
assert.equal(getCapsuleBySlug(''), null);

// The storefront query filters by the capsule tag — tag is a supported
// product search field (handle is not; Shopify silently ignores it and
// would match the whole catalog).
assert.equal(buildCapsuleTagQuery(quietForm), 'tag:"Quiet Form"');
for (const capsule of CAPSULES) {
  const clause = buildCapsuleTagQuery(capsule);
  assert.ok(clause.startsWith('tag:"'), `unsupported filter field: ${clause}`);
  assert.ok(!clause.includes('handle:'), 'handle: is not a supported field');
}
