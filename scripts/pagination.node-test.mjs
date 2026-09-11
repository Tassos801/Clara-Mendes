import assert from 'node:assert/strict';
import test from 'node:test';

import {ensurePaginatedData} from '../app/lib/pagination.ts';

const request = (url) => new Request(url);
const failure = {errors: [{message: 'Malformed cursor'}]};

test('a clean result passes through', () => {
  assert.equal(
    ensurePaginatedData(request('https://x.test/collections/all?cursor=abc'), {
      products: {nodes: []},
    }),
    undefined,
  );
  assert.equal(
    ensurePaginatedData(request('https://x.test/blogs'), {errors: []}),
    undefined,
  );
  assert.equal(ensurePaginatedData(request('https://x.test/blogs'), null), undefined);
});

test('a bad cursor redirects to the first page and keeps other params', () => {
  let thrown;
  try {
    ensurePaginatedData(
      request('https://x.test/collections/all?sort=price&cursor=garbage&direction=next'),
      failure,
    );
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof Response);
  assert.equal(thrown.status, 302);
  assert.equal(thrown.headers.get('Location'), '/collections/all?sort=price');
});

test('a bad direction alone is stripped as well', () => {
  let thrown;
  try {
    ensurePaginatedData(request('https://x.test/blogs?direction=previous'), failure);
  } catch (error) {
    thrown = error;
  }
  assert.equal(thrown.status, 302);
  assert.equal(thrown.headers.get('Location'), '/blogs');
});

test('errors on a plain first-page request become a 502, never a redirect loop', () => {
  const quiet = console.error;
  console.error = () => {};
  let thrown;
  try {
    ensurePaginatedData(request('https://x.test/collections/all'), failure);
  } catch (error) {
    thrown = error;
  } finally {
    console.error = quiet;
  }
  assert.ok(thrown instanceof Response);
  assert.equal(thrown.status, 502);
});
