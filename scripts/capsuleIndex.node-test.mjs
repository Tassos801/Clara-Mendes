import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {listShopCapsules} from '../app/lib/capsules.ts';
import {
  capsuleIndexCopy,
  capsuleTiles,
  closingTileSpan,
} from '../app/lib/capsuleIndex.ts';

const PUBLIC = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
);
const onDisk = (src) =>
  existsSync(path.join(PUBLIC, ...src.split('/').filter(Boolean)));

test('every shop capsule gets a tile whose artwork and room scene exist', () => {
  const tiles = capsuleTiles();
  assert.equal(tiles.length, listShopCapsules().length);
  assert.ok(tiles.some((tile) => tile.slug === 'light-and-silence'));
  assert.ok(tiles.some((tile) => tile.slug === 'scifi-cinema'));
  for (const tile of tiles) {
    assert.ok(onDisk(tile.image), `${tile.slug} artwork missing: ${tile.image}`);
    assert.ok(onDisk(tile.room), `${tile.slug} room scene missing: ${tile.room}`);
    assert.ok(tile.works > 0, `${tile.slug} has no released works`);
  }
});

test('launch capsules open their landing page, pipeline ones the shop filter', () => {
  const bySlug = new Map(capsuleTiles().map((tile) => [tile.slug, tile]));
  assert.equal(bySlug.get('quiet-form').href, '/collections/quiet-form');
  assert.equal(
    bySlug.get('scifi-cinema').href,
    '/collections/all?capsule=scifi-cinema',
  );
});

test('room scenes: 20x24 room detail for launch capsules, living room for pipeline prints', () => {
  const bySlug = new Map(capsuleTiles().map((tile) => [tile.slug, tile]));
  assert.equal(
    bySlug.get('quiet-form').room,
    '/images/product-art-mockups/quiet-form/quiet-form-01-room-detail-20x24.webp',
  );
  const light = bySlug.get('light-and-silence');
  const print = light.image
    .split('/')
    .pop()
    .replace(/\.webp$/, '');
  assert.equal(
    light.room,
    `/images/product-art-mockups/light-and-silence/${print}-living-room.jpg`,
  );
});

test('works labels are singular for one work', () => {
  const [one, three] = capsuleTiles([
    {
      handles: ['a'],
      image: '/images/product-art/x/a.webp',
      note: 'n',
      slug: 'x',
      title: 'X',
    },
    {
      handles: ['a', 'b', 'c'],
      image: '/images/product-art/y/a.webp',
      note: 'n',
      slug: 'y',
      title: 'Y',
    },
  ]);
  assert.equal(one.worksLabel, '1 work');
  assert.equal(three.worksLabel, '3 works');
});

test('heading copy counts capsules and works from the tiles', () => {
  const copy = capsuleIndexCopy([3, 3, 3, 3, 3, 4, 5].map((works) => ({works})));
  assert.equal(copy.moods, 'Seven moods.');
  assert.equal(copy.totalWorks, 24);
  assert.equal(
    copy.works,
    'Twenty-four original works, in capsules that hang together.',
  );
});

test('the closing tile always completes the last row', () => {
  assert.equal(closingTileSpan(7, 4), 1);
  assert.equal(closingTileSpan(7, 3), 2);
  assert.equal(closingTileSpan(7, 2), 1);
  assert.equal(closingTileSpan(8, 4), 4);
  for (const count of [5, 6, 7, 8, 9, 10]) {
    for (const columns of [2, 3, 4]) {
      const span = closingTileSpan(count, columns);
      assert.ok(span >= 1 && span <= columns);
      assert.equal(
        (count + span) % columns,
        0,
        `${count} tiles, ${columns} columns`,
      );
    }
  }
});
