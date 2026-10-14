import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import {
  compareDeployedImage,
  MAX_REENCODE_DIFFERENCE,
} from './lib/art-product-assets.mjs';
import {
  listingPages,
  nextPageHref,
  REPO_ROOT,
} from './lib/product-pipeline.mjs';

const SHOP =
  'https://shopclaramendes.com/collections/all?capsule=floating-world';

/** A server-rendered listing page as Hydrogen writes it. */
function listingHtml(handles, next) {
  return [
    '<a class="cv-load cv-load--prev" href="/collections/all?capsule=floating-world&amp;direction=previous&amp;cursor=abc">Load previous</a>',
    ...handles.map((handle) => `<a href="/products/${handle}">${handle}</a>`),
    next
      ? `<a class="cv-load" href="/collections/all?capsule=floating-world&amp;direction=next&amp;cursor=${encodeURIComponent(next)}">Load more</a>`
      : '',
  ].join('\n');
}

test('nextPageHref finds "Load more", resolved and unescaped', () => {
  assert.equal(
    nextPageHref(listingHtml(['a'], 's.eyJ+/=='), SHOP),
    `https://shopclaramendes.com/collections/all?capsule=floating-world&direction=next&cursor=${encodeURIComponent('s.eyJ+/==')}`,
  );
  assert.equal(nextPageHref(listingHtml(['a'], null), SHOP), null);
});

test('listingPages follows every page until the last', async () => {
  const site = {
    [SHOP]: listingHtml(['case-1', 'case-2'], 'p2'),
    [`${SHOP}&direction=next&cursor=p2`]: listingHtml(['card-1'], 'p3'),
    [`${SHOP}&direction=next&cursor=p3`]: listingHtml(['wave-art-print'], null),
  };
  const fetched = [];
  const pages = await listingPages(SHOP, async (url) => {
    fetched.push(url);
    return site[url] ? {body: site[url], status: 200} : {body: '', status: 404};
  });
  assert.equal(pages.length, 3);
  assert.deepEqual(fetched, Object.keys(site));
  assert.equal(
    pages.findIndex((page) => page.body.includes('/products/wave-art-print')),
    2,
  );

  // A failing page stops the walk; a loop and the page cap end it too.
  const failing = await listingPages(SHOP, async () => ({
    body: '',
    status: 500,
  }));
  assert.deepEqual(
    failing.map((page) => page.status),
    [500],
  );
  const loop = await listingPages(SHOP, async () => ({
    body: listingHtml([], 'same'),
    status: 200,
  }));
  assert.equal(loop.length, 2);
  let count = 0;
  const capped = await listingPages(
    SHOP,
    async () => ({body: listingHtml([], `p${(count += 1)}`), status: 200}),
    {maxPages: 4},
  );
  assert.equal(capped.length, 4);
});

const caseFile = (slug) =>
  readFileSync(
    path.join(
      REPO_ROOT,
      'public/print-files/floating-world',
      `${slug}-phone-case.jpg`,
    ),
  );

test('a re-encoded case file passes; a different artwork or size fails', async () => {
  const wave = caseFile('the-great-wave-off-kanagawa');
  // What Oxygen's image service serves: the same pixels, 4:2:0 chroma.
  const reencoded = await sharp(wave)
    .jpeg({chromaSubsampling: '4:2:0', quality: 85})
    .toBuffer();
  const same = await compareDeployedImage(reencoded, wave);
  assert.equal(same.ok, true, same.detail);
  assert.ok(same.meanDifference <= MAX_REENCODE_DIFFERENCE);
  assert.deepEqual(same.size, {height: 2500, width: 2000});

  // Two different case files: far above the re-encode tolerance.
  const other = await compareDeployedImage(
    caseFile('hodogaya-on-the-tokaido'),
    wave,
  );
  assert.equal(other.ok, false);
  assert.ok(other.meanDifference > 5 * MAX_REENCODE_DIFFERENCE, other.detail);

  // A stale crop of the same artwork (shifted by 2%) fails too.
  const shifted = await sharp(wave)
    .extract({height: 2450, left: 40, top: 50, width: 1960})
    .resize(2000, 2500, {fit: 'fill'})
    .jpeg({quality: 90})
    .toBuffer();
  const stale = await compareDeployedImage(shifted, wave);
  assert.equal(stale.ok, false, stale.detail);

  // A different pixel size never passes.
  const small = await sharp(wave).resize(1000, 1250).jpeg().toBuffer();
  const resized = await compareDeployedImage(small, wave);
  assert.equal(resized.ok, false);
  assert.equal(resized.meanDifference, null);
  assert.match(resized.detail, /1000x1250 served, 2000x2500 committed/);
});
