import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {
  PRODUCT_RELEASE_FLAGS,
  isDemoProduct,
  isUnreleasedExtensionHandle,
} from '../app/lib/catalogFilters.ts';
import {potInput, stagePot, verifyPot} from './stage-pastel-plant-pots.mjs';
import {
  CUSTOM_SITEMAP_PATHS,
  removeExcludedSitemapEntries,
} from '../app/lib/sitemap.ts';

const manifest = JSON.parse(
  readFileSync(
    new URL('../data/pastel-plant-pots.json', import.meta.url),
    'utf8',
  ),
);

test('the preview is discoverable, while Draft product URLs stay out of the sitemap', () => {
  assert.ok(CUSTOM_SITEMAP_PATHS.includes('/pastel-forms'));
  const xml = `<urlset>${manifest.designs.map((d) => `<url><loc>https://shopclaramendes.com/products/${d.handle}</loc></url>`).join('')}</urlset>`;
  assert.equal(removeExcludedSitemapEntries(xml), '<urlset></urlset>');
});

test('every pastel pot is explicitly unreleased and excluded from purchase surfaces', () => {
  for (const design of manifest.designs) {
    assert.equal(PRODUCT_RELEASE_FLAGS[design.handle], false, design.handle);
    assert.equal(isUnreleasedExtensionHandle(design.handle), true);
    assert.equal(
      isDemoProduct({handle: design.handle, vendor: 'Clara Mendes'}),
      true,
    );
  }
});

test('staging input cannot enable checkout or claim verified fulfillment', () => {
  const input = potInput(manifest.designs[0], [
    {originalSource: 'https://example.com/mockup.jpg'},
    {originalSource: 'https://example.com/art.jpg'},
  ]);
  assert.equal(input.status, 'DRAFT');
  assert.ok(input.metafields.every((m) => m.value === 'false'));
  assert.equal(input.variants[0].inventoryPolicy, 'DENY');
  assert.equal(input.variants[0].inventoryItem.tracked, true);
  assert.ok(input.tags.includes('Provisional Price'));
});

test('an existing Active pot is refused without any mutation or upload', async () => {
  let calls = 0;
  const admin = async (query) => {
    calls++;
    assert.doesNotMatch(query, /mutation/);
    return {
      data: {
        productByIdentifier: {
          handle: manifest.designs[0].handle,
          status: 'ACTIVE',
          resourcePublications: {nodes: []},
          variants: {nodes: []},
          media: {nodes: []},
        },
      },
    };
  };
  await assert.rejects(
    stagePot(admin, manifest.designs[0], true),
    /not the expected Draft/,
  );
  assert.equal(calls, 1);
});

test('verification rejects missing products and no-op dry runs never mutate', async () => {
  assert.throws(
    () => verifyPot(manifest.designs[0], null),
    /not the expected Draft/,
  );
  const result = await stagePot(
    async (query) => {
      assert.doesNotMatch(query, /mutation/);
      return {data: {productByIdentifier: null}};
    },
    manifest.designs[0],
    false,
  );
  assert.equal(result.status, 'NOT_STAGED');
});

test('four unique designs use the official 194 x 109 mm 300dpi template', () => {
  assert.equal(manifest.designs.length, 4);
  assert.equal(new Set(manifest.designs.map((d) => d.handle)).size, 4);
  assert.equal(new Set(manifest.designs.map((d) => d.sku)).size, 4);
  assert.deepEqual(manifest.print, {
    width: 2291,
    height: 1287,
    dpi: 300,
    templateSizeMm: [194, 109],
  });
  for (const design of manifest.designs) {
    const svg = readFileSync(
      new URL(`../assets/plant-pots/artwork/${design.id}.svg`, import.meta.url),
      'utf8',
    );
    assert.match(svg, /viewBox="0 0 2291 1287"/);
    assert.match(svg, /<rect width="2291" height="1287"/);
    assert.doesNotMatch(svg, /<text\b|<image\b|https?:\/\/(?!www\.w3\.org)/);
  }
});
