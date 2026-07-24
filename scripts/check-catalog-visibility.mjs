import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import {
  filterDemoCollections,
  filterDemoProducts,
  isDemoProduct,
} from '../app/lib/catalogFilters.ts';

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

test('hides empty collections from the previous catalog', () => {
  const collections = [
    {
      handle: 'home-rituals',
      products: {nodes: []},
      title: 'Home Rituals',
    },
    {
      handle: 'gift-sets',
      products: {nodes: []},
      title: 'Gift Sets',
    },
    {
      handle: 'quiet-form',
      products: {nodes: []},
      title: 'Quiet Form',
    },
  ];

  assert.deepEqual(
    filterDemoCollections(collections).map((collection) => collection.handle),
    ['quiet-form'],
  );
});

test('removes the early-access gate from customer-facing storefront code', () => {
  for (const routeFile of [
    'app/components/OriginalArtPreview.tsx',
    'app/routes/_index.tsx',
  ]) {
    const source = readFileSync(routeFile, 'utf8');

    assert.doesNotMatch(source, /Request early access/i);
    assert.doesNotMatch(source, /original art early access/i);
  }

  const previewSource = readFileSync(
    'app/components/OriginalArtPreview.tsx',
    'utf8',
  );
  assert.match(previewSource, /to=\{`\/products\/\$\{item\.handle\}`\}/);
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

test('collection pages request enough products for the fifteen-item launch', () => {
  for (const routeFile of [
    'app/routes/collections.all.tsx',
    'app/routes/collections.$handle.tsx',
  ]) {
    const source = readFileSync(routeFile, 'utf8');

    assert.match(source, /pageBy:\s*24/);
  }
});
