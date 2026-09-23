import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import catalog from '../data/print-catalog.json' with {type: 'json'};
import {
  ROOM_KEYS,
  inspectRoomAssets,
  mediaMatchesRoomSource,
  resolvePrintRoomMediaPlan,
  roomMediaPlan,
  validateRoomScenes,
} from './lib/print-room-scenes.mjs';
import {REPO_ROOT} from './lib/product-pipeline.mjs';

test('room manifest matches current source images and rejects stale artwork', () => {
  const [collection] = catalog.collections;
  const manifest = JSON.parse(
    readFileSync(
      path.join(
        REPO_ROOT,
        'public/images/product-art-mockups',
        collection.slug,
        'manifest.json',
      ),
      'utf8',
    ),
  );
  const [print] = collection.prints;
  assert.deepEqual(
    inspectRoomAssets(collection, print, manifest, REPO_ROOT),
    [],
  );

  const stale = structuredClone(manifest);
  stale.images.find((entry) => entry.print === print.slug).artwork.sha256 =
    'stale';
  assert.match(
    inspectRoomAssets(collection, print, stale, REPO_ROOT).join('; '),
    /artwork is missing or changed/,
  );
  stale.images = stale.images.filter(
    (entry) => entry.print !== print.slug || entry.room !== 'bedroom',
  );
  assert.match(
    inspectRoomAssets(collection, print, stale, REPO_ROOT).join('; '),
    /expected one manifest record/,
  );
});

test('every Sci-fi print defines four ordered tailored room scenes', () => {
  assert.deepEqual(ROOM_KEYS, [
    'living-room',
    'bedroom',
    'study',
    'wide-interior',
  ]);
  const [collection] = catalog.collections;
  for (const print of collection.prints) {
    assert.deepEqual(validateRoomScenes(print), []);
    const plan = roomMediaPlan(collection, print);
    assert.deepEqual(
      plan.map((scene) => scene.key),
      ROOM_KEYS,
    );
    assert.equal(new Set(plan.map((scene) => scene.alt)).size, 4);
    assert.ok(
      plan.every((scene) =>
        scene.outputRelativePath.startsWith(`${collection.slug}/`),
      ),
    );
  }
});

test('room validation rejects missing, duplicate and non-portrait placements', () => {
  const [collection] = catalog.collections;
  const print = structuredClone(collection.prints[0]);
  print.rooms = [
    {
      key: 'living-room',
      alt: 'Room alt',
      backgroundFile: 'living-room.png',
      placement: {left: 10, top: 20, width: 400, height: 400},
    },
    {
      key: 'living-room',
      alt: 'Room alt',
      backgroundFile: 'duplicate.png',
      placement: {left: 10, top: 20, width: 400, height: 500},
    },
  ];
  const problems = validateRoomScenes(print).join('\n');
  assert.match(problems, /four room scenes/);
  assert.match(problems, /duplicate room key/);
  assert.match(problems, /4:5 portrait/);
});

function readyMedia(entry, index) {
  return {
    alt: entry.alt,
    id: `room-${index}`,
    image: {
      url: `https://cdn.shopify.com/files/${entry.outputRelativePath.split('/').at(-1)}`,
    },
    mediaContentType: 'IMAGE',
    status: 'READY',
  };
}

test('room media reconciliation migrates one flat image to an exact five-image gallery', () => {
  const [collection] = catalog.collections;
  const print = collection.prints[0];
  const planned = roomMediaPlan(collection, print);
  const flat = {
    alt: print.alt,
    id: 'flat',
    image: {url: 'https://cdn.shopify.com/files/orbital-silence.webp'},
    mediaContentType: 'IMAGE',
    status: 'READY',
  };

  assert.equal(
    resolvePrintRoomMediaPlan([flat], planned, print.alt).action,
    'migrate',
  );
  const exact = [flat, ...planned.map(readyMedia)];
  const complete = resolvePrintRoomMediaPlan(exact, planned, print.alt);
  assert.equal(complete.action, 'complete');
  assert.equal(complete.currentByAlt.size, 4);
  assert.ok(
    planned.every((entry, index) =>
      mediaMatchesRoomSource(exact[index + 1], entry),
    ),
  );
});

test('room media reconciliation refuses duplicates, failed images and unknown extras', () => {
  const [collection] = catalog.collections;
  const print = collection.prints[0];
  const planned = roomMediaPlan(collection, print);
  const flat = {
    alt: print.alt,
    id: 'flat',
    image: {url: 'https://cdn.shopify.com/files/orbital-silence.webp'},
    mediaContentType: 'IMAGE',
    status: 'READY',
  };
  const exact = planned.map(readyMedia);
  assert.equal(
    resolvePrintRoomMediaPlan([flat, ...exact, exact[0]], planned, print.alt)
      .action,
    'mismatch',
  );
  assert.equal(
    resolvePrintRoomMediaPlan(
      [flat, {...exact[0], status: 'FAILED'}, ...exact.slice(1)],
      planned,
      print.alt,
    ).action,
    'mismatch',
  );
  assert.equal(
    resolvePrintRoomMediaPlan(
      [flat, ...exact, {id: 'unknown', alt: 'Unknown image'}],
      planned,
      print.alt,
    ).action,
    'mismatch',
  );
});
