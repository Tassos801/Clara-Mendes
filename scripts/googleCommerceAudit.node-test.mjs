import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validateGoogleAttributeReadback,
  validateGooglePublicationReadiness,
} from './lib/google-commerce-audit.mjs';

const originals = [
  {
    handle: 'quiet-form-i-art-print',
    id: 'gid://shopify/Product/1',
    variants: {
      nodes: [{sku: 'CM-QF-01-8X10'}, {sku: 'CM-QF-01-12X16'}],
    },
  },
];
const extensions = [
  {
    handle: 'art-premium-fleece-blanket-30x40',
    id: 'gid://shopify/Product/2',
  },
];

test('strict publication readiness fails closed without native readback', () => {
  assert.deepEqual(
    validateGooglePublicationReadiness({
      approvedHandles: [],
      expectedExtensionHandles: extensions.map((product) => product.handle),
      expectedOriginalHandles: originals.map((product) => product.handle),
      googlePublicationIds: [],
      publicationAuditAvailable: false,
      publicationProducts: [],
    }),
    [
      'Google publication data is unavailable; read_publications is required',
      'expected exactly one Google publication, found 0',
      'Google approval status is unavailable',
    ],
  );
});

test('publication readiness requires every original and excludes every extension', () => {
  const publicationId = 'gid://shopify/Publication/9';
  const issues = validateGooglePublicationReadiness({
    approvedHandles: [
      'quiet-form-i-art-print',
      'art-premium-fleece-blanket-30x40',
    ],
    expectedExtensionHandles: extensions.map((product) => product.handle),
    expectedOriginalHandles: originals.map((product) => product.handle),
    googlePublicationIds: [publicationId],
    publicationAuditAvailable: true,
    publicationProducts: [
      {
        ...originals[0],
        resourcePublicationsV2: {
          nodes: [{isPublished: false, publication: {id: publicationId}}],
        },
      },
      {
        ...extensions[0],
        resourcePublicationsV2: {
          nodes: [{isPublished: true, publication: {id: publicationId}}],
        },
      },
    ],
  });

  assert.ok(
    issues.some((issue) => issue.includes('original is not published')),
  );
  assert.ok(issues.some((issue) => issue.includes('extension leaked')));
  assert.ok(
    issues.some((issue) => issue.includes('extension is Google-approved')),
  );
});

test('Google attribute readback proves MPN, custom product, GTIN, and Hydrogen links', () => {
  assert.deepEqual(
    validateGoogleAttributeReadback({
      expectedExtensionHandles: extensions.map((product) => product.handle),
      originals,
      readback: null,
    }),
    ['Google product-attribute readback is required in strict mode'],
  );

  const readback = {
    excludedHandles: extensions.map((product) => product.handle),
    merchantId: '123456789',
    products: originals[0].variants.nodes.map(({sku}) => ({
      customProduct: true,
      googleProductCategory: 'Home & Garden > Decor > Artwork',
      gtin: null,
      handle: originals[0].handle,
      link: `https://shopclaramendes.com/products/${originals[0].handle}`,
      mpn: sku,
      sku,
      status: 'approved',
    })),
    source: 'Google Merchant Center diagnostics export',
    verifiedAt: '2026-08-13T00:00:00.000Z',
    version: 1,
  };

  assert.deepEqual(
    validateGoogleAttributeReadback({
      expectedExtensionHandles: extensions.map((product) => product.handle),
      originals,
      readback,
    }),
    [],
  );

  readback.products[0] = {
    ...readback.products[0],
    customProduct: false,
    gtin: 'invented-barcode',
    link: 'https://checkout.shopclaramendes.com/products/wrong',
    mpn: 'wrong-mpn',
  };
  const issues = validateGoogleAttributeReadback({
    expectedExtensionHandles: extensions.map((product) => product.handle),
    originals,
    readback,
  });
  assert.ok(issues.some((issue) => issue.includes('MPN does not match SKU')));
  assert.ok(
    issues.some((issue) => issue.includes('customProduct is not true')),
  );
  assert.ok(issues.some((issue) => issue.includes('GTIN must be blank')));
  assert.ok(issues.some((issue) => issue.includes('Hydrogen product URL')));
});
