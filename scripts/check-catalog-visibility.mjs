import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import {filterDemoProducts, isDemoProduct} from '../app/lib/catalogFilters.ts';

test('shows only explicitly approved original-art launch products', () => {
  const catalogProducts = [
    {
      handle: 'quiet-form-i-art-print',
      productType: 'Art Prints',
      tags: ['Clara Mendes Original'],
      title: 'Quiet Form I Art Print',
      vendor: 'Clara Mendes',
    },
    {
      handle: 'linen-storage-basket',
      productType: 'Storage',
      tags: ['home-goods'],
      title: 'Linen Storage Basket',
      vendor: 'Clara Mendes',
    },
  ];

  assert.equal(isDemoProduct(catalogProducts[0]), false);
  assert.equal(isDemoProduct(catalogProducts[1]), true);
  assert.deepEqual(
    filterDemoProducts(catalogProducts).map((product) => product.handle),
    ['quiet-form-i-art-print'],
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

test('collection pages request enough products for the nine-item launch', () => {
  for (const routeFile of [
    'app/routes/collections.all.tsx',
    'app/routes/collections.$handle.tsx',
  ]) {
    const source = readFileSync(routeFile, 'utf8');

    assert.match(source, /pageBy:\s*24/);
  }
});
