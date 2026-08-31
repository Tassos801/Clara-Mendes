import assert from 'node:assert/strict';
import artCatalog from '../data/original-art-catalog.json' with {type: 'json'};
import {getGalleryPage} from '../app/lib/galleryPages.ts';
import {PRINT_SIZE_SPECS} from '../app/lib/productSizePresentation.ts';
import {
  getWallSet,
  listWallSets,
  parseWallGuideFileName,
  WALL_GUIDE_GAP_CM,
  WALL_GUIDE_SIZES,
  wallGuideFileName,
  wallGuideGeometry,
  wallSetLinesForSize,
  wallSetsContainingHandle,
} from '../app/lib/wallSets.ts';

const catalogHandles = new Set(artCatalog.map((entry) => entry.handle));
const capsuleByHandle = new Map(
  artCatalog.map((entry) => [entry.handle, entry.capsule]),
);
const CAPSULE_SLUGS = new Set([
  'quiet-form',
  'patina-blue',
  'neo-deco',
  'midnight-garden',
  'sunlit-mosaic',
]);

const sets = listWallSets();

// Seven sets: the five capsule walls plus two mixes.
assert.equal(sets.length, 7);
assert.equal(sets.filter((set) => set.kind === 'capsule').length, 5);
assert.equal(sets.filter((set) => set.kind === 'mix').length, 2);

const slugs = sets.map((set) => set.slug);
assert.equal(new Set(slugs).size, slugs.length, 'mount slugs must be unique');

for (const set of sets) {
  assert.equal(set.handles.length, 3, `${set.slug}: exactly three prints`);
  assert.equal(
    new Set(set.handles).size,
    3,
    `${set.slug}: no duplicate prints`,
  );
  for (const handle of set.handles) {
    assert.ok(
      catalogHandles.has(handle),
      `${set.slug}: unknown handle ${handle}`,
    );
  }
  assert.ok(set.name.length > 0 && set.story.length > 0);
  assert.equal(getWallSet(set.slug), set);
}

// Capsule walls mount on the capsule slugs and contain that capsule's trio.
for (const set of sets.filter((entry) => entry.kind === 'capsule')) {
  assert.ok(CAPSULE_SLUGS.has(set.slug), `${set.slug} is not a capsule slug`);
  for (const handle of set.handles) {
    assert.equal(
      capsuleByHandle.get(handle).toLowerCase().replace(/\s+/g, '-'),
      set.slug,
      `${set.slug}: ${handle} belongs to another capsule`,
    );
  }
}

// Mixes span three distinct capsules and mount on real gallery pages.
for (const set of sets.filter((entry) => entry.kind === 'mix')) {
  const capsules = new Set(set.handles.map((h) => capsuleByHandle.get(h)));
  assert.equal(capsules.size, 3, `${set.slug}: must span three capsules`);
  assert.ok(
    getGalleryPage(set.slug),
    `${set.slug}: mix must have a gallery page entry`,
  );
}

assert.equal(getWallSet('not-a-set'), null);
assert.equal(getWallSet(undefined), null);

// Guide filename codec round-trips every set × size and rejects junk.
for (const set of sets) {
  for (const size of WALL_GUIDE_SIZES) {
    const file = wallGuideFileName(set.slug, size);
    assert.equal(file, `${set.slug}-${size}.pdf`);
    const parsed = parseWallGuideFileName(file);
    assert.ok(parsed, `${file} must parse`);
    assert.equal(parsed.set, set);
    assert.equal(parsed.size, size);
  }
}
assert.equal(parseWallGuideFileName('quiet-form-9x12.pdf'), null);
assert.equal(parseWallGuideFileName('nope-16x20.pdf'), null);
assert.equal(parseWallGuideFileName('quiet-form-16x20.txt'), null);
assert.equal(parseWallGuideFileName(''), null);

// Sets containing a handle: capsule wall first, then mixes.
const containing = wallSetsContainingHandle('quiet-form-i-art-print');
assert.equal(containing.length, 2);
assert.equal(containing[0].slug, 'quiet-form');
assert.equal(containing[1].slug, 'ink-and-cream-gallery-wall');
assert.deepEqual(wallSetsContainingHandle('no-such-print'), []);

// Guide geometry derives from PRINT_SIZE_SPECS and sums exactly.
for (const size of WALL_GUIDE_SIZES) {
  const geometry = wallGuideGeometry(size);
  const [expectedW, expectedH] = PRINT_SIZE_SPECS[size].centimeters
    .split('×')
    .map((part) => Number.parseFloat(part));
  assert.equal(geometry.widthCm, expectedW);
  assert.equal(geometry.heightCm, expectedH);
  assert.equal(geometry.gapCm, WALL_GUIDE_GAP_CM);
  assert.equal(geometry.centreCm, 145);
  assert.ok(
    Math.abs(geometry.totalWidthCm - (3 * expectedW + 2 * WALL_GUIDE_GAP_CM)) <
      1e-9,
    `${size}: total width must be three frames plus two gaps`,
  );
}

// Line builder: released-variants-only, Unframed-only, exact sums.
const euro = (amount) => ({amount, currencyCode: 'EUR'});
const variant = (id, size, amount, extra = {}) => ({
  availableForSale: true,
  id,
  price: euro(amount),
  selectedOptions: [{name: 'Size', value: size}],
  ...extra,
});
const testProduct = (handle, variants) => ({handle, variants});

const quietForm = testProduct('quiet-form-i-art-print', [
  variant('gid://v/qf-8', '8 × 10 in', '29.99'),
  variant('gid://v/qf-16', '16 × 20 in', '39.99'),
  variant('gid://v/qf-20', '20 × 24 in', '49.99'),
]);
const neoDeco = testProduct('neo-deco-ii-art-print', [
  variant('gid://v/nd-8', '8 × 10 in', '29.99'),
  variant('gid://v/nd-16', '16 × 20 in', '39.99'),
  variant('gid://v/nd-20', '20 × 24 in', '49.99'),
]);
const midnight = testProduct('midnight-garden-ii-art-print', [
  variant('gid://v/mg-8', '8 × 10 in', '29.99'),
  variant('gid://v/mg-16', '16 × 20 in', '39.99'),
  variant('gid://v/mg-20', '20 × 24 in', '49.99'),
]);

const built = wallSetLinesForSize([quietForm, neoDeco, midnight], '16x20');
assert.ok(built);
assert.deepEqual(
  built.lines.map((line) => line.merchandiseId),
  ['gid://v/qf-16', 'gid://v/nd-16', 'gid://v/mg-16'],
);
assert.ok(built.lines.every((line) => line.quantity === 1));
assert.deepEqual(built.total, euro('119.97'));

const large = wallSetLinesForSize([quietForm, neoDeco, midnight], '20x24');
assert.deepEqual(large.total, euro('149.97'));

// A staged (availableForSale: false) variant must not satisfy its size.
const staged = testProduct('neo-deco-ii-art-print', [
  variant('gid://v/nd-8', '8 × 10 in', '29.99'),
  variant('gid://v/nd-16', '16 × 20 in', '39.99', {availableForSale: false}),
]);
assert.equal(wallSetLinesForSize([quietForm, staged, midnight], '16x20'), null);
assert.ok(wallSetLinesForSize([quietForm, staged, midnight], '8x10'));

// A framed presentation variant must not satisfy its size.
const framedOnly = testProduct('neo-deco-ii-art-print', [
  {
    availableForSale: true,
    id: 'gid://v/nd-16-framed',
    price: euro('99.99'),
    selectedOptions: [
      {name: 'Size', value: '16 × 20 in'},
      {name: 'Presentation', value: 'Natural frame'},
    ],
  },
]);
assert.equal(
  wallSetLinesForSize([quietForm, framedOnly, midnight], '16x20'),
  null,
);

// An explicit Unframed presentation is fine.
const unframed = testProduct('neo-deco-ii-art-print', [
  {
    availableForSale: true,
    id: 'gid://v/nd-16-unframed',
    price: euro('39.99'),
    selectedOptions: [
      {name: 'Size', value: '16 × 20 in'},
      {name: 'Presentation', value: 'Unframed'},
    ],
  },
]);
assert.ok(wallSetLinesForSize([quietForm, unframed, midnight], '16x20'));

// An unrelated size value must not fall back onto the 8x10 default.
const oddSize = testProduct('neo-deco-ii-art-print', [
  variant('gid://v/nd-odd', 'A3', '29.99'),
]);
assert.equal(wallSetLinesForSize([quietForm, oddSize, midnight], '8x10'), null);

// Missing a member entirely → null.
assert.equal(wallSetLinesForSize([quietForm, neoDeco], '16x20'), null);

