import assert from 'node:assert/strict';
import {getSwipeIntent} from '../app/lib/cartSwipe.ts';

assert.deepEqual(
  getSwipeIntent({
    currentX: 130,
    currentY: 103,
    startX: 220,
    startY: 100,
  }),
  {direction: 'left', offset: -90, shouldOpen: true},
);

assert.deepEqual(
  getSwipeIntent({
    currentX: 185,
    currentY: 96,
    startX: 220,
    startY: 100,
  }),
  {direction: 'left', offset: -35, shouldOpen: false},
);

assert.deepEqual(
  getSwipeIntent({
    currentX: 170,
    currentY: 150,
    startX: 220,
    startY: 100,
  }),
  {direction: 'vertical', offset: 0, shouldOpen: false},
);

assert.deepEqual(
  getSwipeIntent({
    currentX: 250,
    currentY: 102,
    startX: 220,
    startY: 100,
  }),
  {direction: 'right', offset: 0, shouldOpen: false},
);
