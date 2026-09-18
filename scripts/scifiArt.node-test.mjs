import assert from 'node:assert/strict';
import test from 'node:test';
import scifiCatalog from '../data/scifi-cinema-catalog.json' with {type: 'json'};
import * as filters from '../app/lib/catalogFilters.ts';
import * as capsules from '../app/lib/capsules.ts';
import * as scifi from '../app/lib/scifiArt.ts';

const handles = scifiCatalog.map((p) => p.handle);
/** Every flag false: the pre-release state, injected so it stays covered. */
const STAGED = Object.fromEntries(handles.map((handle) => [handle, false]));
test('release admits only approved sci-fi prints and leaves older originals sellable', () => {
  const released = filters.computeSellableHandles(
    {},
    {},
    {[handles[0]]: true, 'unreviewed-sci-fi-print': true},
  );
  assert.equal(released.has(handles[0]), true);
  for (const handle of handles.slice(1))
    assert.equal(released.has(handle), false);
  assert.equal(released.has('unreviewed-sci-fi-print'), false);
  assert.equal(released.has('quiet-form-i-art-print'), true);
});

test('accidental Shopify publication cannot list or index a staged sci-fi print', () => {
  const sellable = filters.computeSellableHandles({}, {}, STAGED);
  for (const handle of handles) {
    assert.equal(
      scifi.isUnreleasedSciFiArtHandle(handle.toUpperCase(), STAGED),
      true,
    );
    assert.equal(sellable.has(handle), false);
  }
  assert.equal(scifi.releasedSciFiArtHandles(STAGED).length, 0);
});

test('the four released sci-fi prints are listed and indexable', () => {
  assert.deepEqual(scifi.releasedSciFiArtHandles(), handles);
  for (const handle of handles) {
    assert.equal(filters.isUnreleasedExtensionHandle(handle), false);
    assert.equal(
      filters.isStoreThemeProduct({
        handle,
        vendor: 'Clara Mendes',
        productType: 'Art Prints',
      }),
      true,
    );
  }
  assert.equal(
    filters.filterDemoProducts(
      handles.map((handle) => ({handle, vendor: 'Clara Mendes'})),
    ).length,
    4,
  );
});

test('staged sci-fi does not add a shop filter or change legacy capsules', () => {
  assert.equal(typeof capsules.listShopCapsules, 'function');
  const visible = capsules.listShopCapsules(STAGED);
  assert.equal(visible.length, 5);
  assert.equal(
    visible.some((c) => c.slug === 'scifi-cinema'),
    false,
  );
  assert.equal(capsules.getShopCapsuleBySlug('scifi-cinema', STAGED), null);
  assert.equal(capsules.CAPSULES.length, 5);
  assert.ok(capsules.CAPSULES.every((c) => c.handles.length === 3));
});

test('the released shop filter carries all four sci-fi prints', () => {
  const capsule = capsules.getShopCapsuleBySlug('scifi-cinema');
  assert.equal(capsules.listShopCapsules().length, 6);
  assert.deepEqual(capsule.handles, handles);
});

test('a partial sci-fi release filters the right members and links to a real shop URL', () => {
  assert.equal(typeof capsules.listShopCapsules, 'function');
  const flags = {[handles[0]]: true, [handles[2]]: true};
  const visible = capsules.listShopCapsules(flags);
  const capsule = capsules.getShopCapsuleBySlug(' SciFi-Cinema ', flags);
  assert.equal(visible.length, 6);
  assert.deepEqual(capsule.handles, [handles[0], handles[2]]);
  assert.equal(capsules.buildCapsuleTagQuery(capsule), 'tag:"Sci-fi & Cinema"');
  assert.equal(
    capsules.shopCapsulePath(capsule.slug),
    '/collections/all?capsule=scifi-cinema',
  );
  assert.equal(
    capsules.shopCapsulePath('quiet-form'),
    '/collections/quiet-form',
  );
  assert.equal(capsules.getShopCapsuleBySlug('unknown', flags), null);
  const description = capsules.shopCapsuleDescription(capsule);
  assert.ok(description.includes('2'));
  assert.ok(description.includes('8 × 10'));
  assert.ok(!description.includes('20 × 24'));
});
