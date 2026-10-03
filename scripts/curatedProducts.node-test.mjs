import assert from 'node:assert/strict';
import {test} from 'node:test';
import {
  CURATED_PRODUCTS,
  releasedCuratedProducts,
  getCuratedProduct,
} from '../app/lib/curatedProducts.ts';
import {
  computeSellableHandles,
  isListedProduct,
  isUnreleasedExtensionHandle,
} from '../app/lib/catalogFilters.ts';
import {getProductDescription, getProductLede} from '../app/lib/productCopy.ts';

test('a supplier import needs verified fulfilment and shipping before release', () => {
  const product = {...CURATED_PRODUCTS[0], released: true};
  const baseline = computeSellableHandles(
    undefined,
    undefined,
    undefined,
    undefined,
    [],
  );
  for (const missing of [
    {released: false},
    {shopifyProductId: null},
    {shopifyVariantId: null},
    {shippingProfileId: null},
    {fulfillmentVerified: false},
    {supplierSku: ''},
    {shipping: ''},
    {verifiedDeliveryCountries: []},
  ]) {
    const candidate = {...product, ...missing};
    assert.deepEqual(releasedCuratedProducts([candidate]), []);
    assert.deepEqual(
      computeSellableHandles(undefined, undefined, undefined, undefined, [
        candidate,
      ]),
      baseline,
    );
  }
  const released = computeSellableHandles(
    undefined,
    undefined,
    undefined,
    undefined,
    [product],
  );
  assert.equal(released.size, baseline.size + 1);
  assert.ok(released.has(product.handle));
  assert.ok(released.has('quiet-form-i-art-print'));
});

test('the approved kit is listed while unrelated supplier imports stay hidden', () => {
  const product = CURATED_PRODUCTS[0];
  const storefrontProduct = {
    handle: product.handle,
    productType: 'Book Nooks',
    vendor: 'Clara Mendes',
    title: 'Twilight Library',
  };
  assert.ok(isListedProduct(storefrontProduct));
  assert.equal(isUnreleasedExtensionHandle(product.handle), false);
  assert.equal(
    isListedProduct({
      ...storefrontProduct,
      handle: 'another-supplier-book-nook',
    }),
    false,
  );
  assert.equal(
    getCuratedProduct('TWILIGHT-LIBRARY-DIY-BOOK-NOOK-KIT'),
    product,
  );
});

test('the kit uses assembly specifications instead of conflicting supplier copy', () => {
  const description = getProductDescription({
    handle: CURATED_PRODUCTS[0].handle,
    description: 'Suitable for ages 7–14. Flashing lights and music.',
    productType: 'Book Nooks',
  });
  assert.match(description, /194 pieces/);
  assert.match(description, /ages 14 and over/);
  assert.match(description, /12 cm wide × 10.5 cm deep × 17.5 cm high/);
  assert.doesNotMatch(description, /7–14|music|Printed to order/);
  assert.equal(
    getProductLede({
      handle: CURATED_PRODUCTS[0].handle,
      productType: 'Book Nooks',
    }),
    'Make a little room for imagination.',
  );
});
