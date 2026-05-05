import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import {filterDemoProducts, isDemoProduct} from '../app/lib/catalogFilters.ts';

test('keeps ordinary Shopify products that are not launch-tagged', () => {
  const catalogProducts = [
    {
      handle: 'linen-storage-basket',
      productType: 'Storage',
      tags: ['home-goods'],
      title: 'Linen Storage Basket',
      vendor: 'Clara Mendes',
    },
    {
      handle: 'hydrogen-snowboard',
      productType: 'Snowboards',
      tags: ['demo'],
      title: 'Hydrogen Snowboard',
      vendor: 'Hydrogen',
    },
  ];

  assert.equal(isDemoProduct(catalogProducts[0]), false);
  assert.deepEqual(
    filterDemoProducts(catalogProducts).map((product) => product.handle),
    ['linen-storage-basket'],
  );
});

test('collection product queries are cursor-paginated', () => {
  for (const routeFile of [
    'app/routes/collections.all.tsx',
    'app/routes/collections.$handle.tsx',
  ]) {
    const source = readFileSync(routeFile, 'utf8');

    assert.match(source, /getPaginationVariables/);
    assert.match(source, /after:\s*\$endCursor/);
    assert.match(source, /before:\s*\$startCursor/);
    assert.match(
      source,
      /pageInfo\s*{[\s\S]*hasNextPage[\s\S]*hasPreviousPage[\s\S]*startCursor[\s\S]*endCursor/,
    );
  }
});

test('collection pages request enough products for the full live catalog', () => {
  for (const routeFile of [
    'app/routes/collections.all.tsx',
    'app/routes/collections.$handle.tsx',
  ]) {
    const source = readFileSync(routeFile, 'utf8');

    assert.match(source, /pageBy:\s*60/);
  }
});
