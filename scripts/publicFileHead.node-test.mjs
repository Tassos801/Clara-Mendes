import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import test from 'node:test';

import {
  headForPublicFile,
  isPublicFilePath,
  PUBLIC_FILE_ROOTS,
} from '../app/lib/publicFileHead.server.ts';

const ORIGIN = 'https://shopclaramendes.com';

test('the list of public roots is the public folder', () => {
  const onDisk = readdirSync(new URL('../public/', import.meta.url), {
    withFileTypes: true,
  })
    .filter((entry) => !entry.name.startsWith('.'))
    .map((entry) => `/${entry.name}${entry.isDirectory() ? '/' : ''}`)
    .sort();
  assert.deepEqual([...PUBLIC_FILE_ROOTS].sort(), onDisk);
});

test('only paths inside the public folder count as public files', () => {
  for (const path of [
    '/favicon.ico',
    '/icons/icon-192.png',
    '/images/share-card.jpg',
    '/fonts/pdf/EBGaramond-Regular.bin',
    '/print-files/tough-case/midnight-garden-02.jpg',
  ])
    assert.equal(isPublicFilePath(path), true, path);
  for (const path of [
    '/',
    '/favicon.ico/x',
    '/favicon.icon',
    '/images',
    '/images/',
    '/products/images/x.jpg',
    '/collections/all',
    '/your-sky',
    '/api/sky-print/token.pdf',
  ])
    assert.equal(isPublicFilePath(path), false, path);
});

/** A fetch stand-in that records what it was asked for. */
function recorder(answer) {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({url, method: init?.method});
    return answer();
  };
  return {calls, fetcher};
}

test('a HEAD for a public file is answered from a GET of the same file, without a body', async () => {
  const {calls, fetcher} = recorder(
    () =>
      new Response('icon bytes', {
        status: 200,
        headers: {
          'Content-Type': 'image/x-icon',
          'Cache-Control': 'public, max-age=31536000',
        },
      }),
  );
  const response = await headForPublicFile(
    new Request(`${ORIGIN}/favicon.ico`, {method: 'HEAD'}),
    fetcher,
  );
  assert.deepEqual(calls, [{url: `${ORIGIN}/favicon.ico`, method: 'GET'}]);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'image/x-icon');
  assert.equal(
    response.headers.get('Cache-Control'),
    'public, max-age=31536000',
  );
  assert.equal(response.body, null);
});

test('everything else keeps the answer the app gave', async () => {
  const found = () => new Response('x', {status: 200});

  // Not a HEAD request, or not a public path: nothing is fetched.
  for (const request of [
    new Request(`${ORIGIN}/favicon.ico`),
    new Request(`${ORIGIN}/favicon.ico`, {method: 'POST'}),
    new Request(`${ORIGIN}/no-such-page`, {method: 'HEAD'}),
    new Request(`${ORIGIN}/products/images/x.jpg`, {method: 'HEAD'}),
  ]) {
    const {calls, fetcher} = recorder(found);
    assert.equal(await headForPublicFile(request, fetcher), null);
    assert.deepEqual(calls, []);
  }

  // A public path with no file behind it stays "not found".
  const missing = recorder(() => new Response('nope', {status: 404}));
  assert.equal(
    await headForPublicFile(
      new Request(`${ORIGIN}/images/nope.png`, {method: 'HEAD'}),
      missing.fetcher,
    ),
    null,
  );
  assert.equal(missing.calls.length, 1);

  // A failed fetch must not turn a 404 into a crash.
  const broken = recorder(() => {
    throw new TypeError('fetch failed');
  });
  assert.equal(
    await headForPublicFile(
      new Request(`${ORIGIN}/images/x.png`, {method: 'HEAD'}),
      broken.fetcher,
    ),
    null,
  );
});

test('the worker asks for the public file before it looks for a redirect', () => {
  const server = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  const notFound = server.indexOf('if (response.status === 404) {');
  const head = server.indexOf('await headForPublicFile(request)');
  const redirect = server.indexOf('return storefrontRedirect({');
  assert.ok(notFound > 0 && head > notFound && redirect > head);
});
