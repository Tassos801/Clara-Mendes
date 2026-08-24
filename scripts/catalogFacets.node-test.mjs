import assert from 'node:assert/strict';
import test from 'node:test';
import {normalizeSingleProductTypeSearch} from '../app/lib/catalogFacets.ts';

const supported = ['Art Prints'];

test('keeps a single supported product category', () => {
  assert.equal(
    normalizeSingleProductTypeSearch(
      new URLSearchParams('type=Art+Prints&capsule=quiet-form'),
      supported,
    ),
    null,
  );
});

test('clears legacy multi-category state and pagination', () => {
  const normalized = normalizeSingleProductTypeSearch(
    new URLSearchParams(
      'type=Art+Prints&type=Framed+Art&capsule=quiet-form&cursor=abc',
    ),
    supported,
  );

  assert.equal(normalized?.toString(), 'capsule=quiet-form');
});

test('clears unsupported product categories', () => {
  const normalized = normalizeSingleProductTypeSearch(
    new URLSearchParams('type=Framed+Art&sort=price-asc'),
    supported,
  );

  assert.equal(normalized?.toString(), 'sort=price-asc');
});
