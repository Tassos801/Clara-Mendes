import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {
  PRODUCT_RELEASE_FLAGS,
  computeSellableHandles,
  isDemoProduct,
  isReleasedProductHandle,
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

test('the series and its released product URLs are discoverable', () => {
  assert.ok(CUSTOM_SITEMAP_PATHS.includes('/pastel-forms'));
  const xml = `<urlset>${manifest.designs.map((d) => `<url><loc>https://shopclaramendes.com/products/${d.handle}</loc></url>`).join('')}</urlset>`;
  assert.equal(removeExcludedSitemapEntries(xml), xml);
});

test('only the four approved mapped pots are released, with honest quality and import exceptions', () => {
  assert.equal(manifest.release.mappingVerified, true);
  assert.equal(manifest.release.supplierQuotesVerified, true);
  assert.equal(manifest.release.ownerApproved, true);
  assert.equal(manifest.release.sampleReviewed, false);
  assert.ok(manifest.release.sampleWaiver);
  assert.equal(manifest.release.deliveredCostsVerified, false);
  assert.ok(manifest.release.importCostException);
  assert.equal(manifest.shipping.tracked, false);
  assert.equal(manifest.shipping.importChargesIncluded, false);
  assert.equal(manifest.retailPrice, '29.99');
  assert.equal(manifest.shipping.retailRate, '6.99');
  assert.equal(manifest.shipping.countriesQuoted.length, 27);
  for (const design of manifest.designs) {
    assert.ok(
      design.shopifyProductId &&
        design.shopifyVariantId &&
        design.prodigiListingId,
    );
    assert.equal(PRODUCT_RELEASE_FLAGS[design.handle], true, design.handle);
    assert.equal(isUnreleasedExtensionHandle(design.handle), false);
    assert.equal(
      isDemoProduct({handle: design.handle, vendor: 'Clara Mendes'}),
      false,
    );
  }
});

test('a disabled pot flag fails closed even if Shopify has published the product', () => {
  const disabled = Object.fromEntries(
    manifest.designs.map((d) => [d.handle, false]),
  );
  const sellable = computeSellableHandles(
    undefined,
    undefined,
    undefined,
    disabled,
  );
  for (const design of manifest.designs) {
    assert.equal(isReleasedProductHandle(design.handle, disabled), false);
    assert.equal(sellable.has(design.handle), false);
  }
  assert.equal(isReleasedProductHandle('unknown-plant-pot'), false);
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
