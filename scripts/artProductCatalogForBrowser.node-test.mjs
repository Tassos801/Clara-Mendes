import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ART_PRODUCT_CATALOG,
  artProductByHandle,
  artProductPage,
  isUnreleasedArtProductHandle,
  releasedArtProductHandles,
  releasedArtProductTypes,
  reproductionSentence,
} from '../app/lib/artProductCatalog.ts';
import {
  artProductCatalogForBrowser,
  browserArtProductCatalog,
} from '../app/lib/artProductCatalogForBrowser.ts';
import * as shops from '../app/lib/artistShops.ts';
import {
  computeSellableHandles,
  shopProductTypes,
} from '../app/lib/catalogFilters.ts';
import {museumListingRanks} from '../app/lib/museumListingOrder.ts';

const full = ART_PRODUCT_CATALOG;
const slim = artProductCatalogForBrowser(full);
const handles = full.products.map((product) => product.handle);

test('the browser copy of the art-product catalog is a small part of it', () => {
  const size = (value) => JSON.stringify(value).length;
  assert.ok(size(slim) < size(full) / 4, `${size(slim)} of ${size(full)}`);
  for (const product of slim.products) {
    assert.equal(product.assets, undefined, product.handle);
    assert.equal(product.shopify, undefined, product.handle);
    for (const variant of product.variants)
      assert.deepEqual(Object.keys(variant), ['option'], product.handle);
  }
});

// Server renders read the whole file and the browser hydrates from the copy:
// any reader that answers differently would show as a hydration mismatch.
test('every storefront reader answers the same from the browser copy', () => {
  assert.deepEqual(
    releasedArtProductHandles(slim),
    releasedArtProductHandles(full),
  );
  assert.deepEqual(releasedArtProductTypes(slim), releasedArtProductTypes(full));
  for (const handle of [...handles, 'not-a-product']) {
    assert.deepEqual(
      artProductPage(handle, slim),
      artProductPage(handle, full),
      handle,
    );
    assert.equal(
      Boolean(artProductByHandle(handle, slim)),
      Boolean(artProductByHandle(handle, full)),
      handle,
    );
    assert.equal(
      isUnreleasedArtProductHandle(handle, slim),
      isUnreleasedArtProductHandle(handle, full),
      handle,
    );
    assert.equal(
      reproductionSentence(handle, slim),
      reproductionSentence(handle, full),
      handle,
    );
    assert.deepEqual(
      shops.museumPairings(handle, {artProducts: slim}),
      shops.museumPairings(handle, {artProducts: full}),
      handle,
    );
    assert.deepEqual(
      shops.productArtworkCredit(handle, {artProducts: slim}),
      shops.productArtworkCredit(handle, {artProducts: full}),
      handle,
    );
  }
  assert.deepEqual(
    shops.artistProducts({artProducts: slim}),
    shops.artistProducts({artProducts: full}),
  );
  assert.deepEqual(
    shops.publicArtists({artProducts: slim}),
    shops.publicArtists({artProducts: full}),
  );
  assert.deepEqual(
    shops.artistFeature({artProducts: slim}),
    shops.artistFeature({artProducts: full}),
  );
  assert.deepEqual(
    [...museumListingRanks({artProducts: slim})],
    [...museumListingRanks({artProducts: full})],
  );
  assert.deepEqual(
    shopProductTypes({artProducts: slim}),
    shopProductTypes({artProducts: full}),
  );
  const sellable = (artProducts) => [
    ...computeSellableHandles(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      artProducts,
    ),
  ];
  assert.deepEqual(sellable(slim), sellable(full));
});

test('only the client build gets the browser copy', () => {
  const plugin = browserArtProductCatalog();
  const code = JSON.stringify(full);
  const file = 'C:\\shop\\data\\art-product-catalog.json';
  const client = plugin.transform.call({}, code, file, {ssr: false});
  assert.deepEqual(JSON.parse(client.code), JSON.parse(JSON.stringify(slim)));
  assert.equal(plugin.transform.call({}, code, file, {ssr: true}), null);
  assert.equal(
    plugin.transform.call(
      {environment: {config: {consumer: 'server'}}},
      code,
      file,
      undefined,
    ),
    null,
  );
  assert.equal(
    plugin.transform.call({}, '{}', '/shop/data/print-catalog.json', {}),
    null,
  );
});
