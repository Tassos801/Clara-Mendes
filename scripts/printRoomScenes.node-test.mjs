import assert from 'node:assert/strict';
import test from 'node:test';

import catalog from '../data/print-catalog.json' with {type: 'json'};
import {
  ROOM_KEYS,
  roomMediaPlan,
  validateRoomScenes,
} from './lib/print-room-scenes.mjs';

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
