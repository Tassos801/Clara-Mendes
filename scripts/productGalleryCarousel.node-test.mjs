import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clampCarouselIndex,
  cycleCarouselIndex,
  nearestCarouselIndex,
  resolveZoomSwipe,
} from '../app/lib/productGalleryCarousel.ts';

test('clamps product gallery navigation to a valid slide', () => {
  assert.equal(clampCarouselIndex(-4, 5), 0);
  assert.equal(clampCarouselIndex(2.4, 5), 2);
  assert.equal(clampCarouselIndex(2.6, 5), 3);
  assert.equal(clampCarouselIndex(12, 5), 4);
  assert.equal(clampCarouselIndex(Number.NaN, 5), 0);
  assert.equal(clampCarouselIndex(1, 0), 0);
});

test('finds the nearest slide after touch, wheel, or keyboard scrolling', () => {
  const offsets = [0, 640, 1280, 1920];

  assert.equal(nearestCarouselIndex(offsets, 0), 0);
  assert.equal(nearestCarouselIndex(offsets, 401), 1);
  assert.equal(nearestCarouselIndex(offsets, 1190), 2);
  assert.equal(nearestCarouselIndex(offsets, 1900), 3);
  assert.equal(nearestCarouselIndex([], 640), 0);
});

test('cycles the zoom view through photos with wrap-around', () => {
  assert.equal(cycleCarouselIndex(0, 1, 5), 1);
  assert.equal(cycleCarouselIndex(4, 1, 5), 0);
  assert.equal(cycleCarouselIndex(0, -1, 5), 4);
  assert.equal(cycleCarouselIndex(2, -1, 5), 1);
  assert.equal(cycleCarouselIndex(3, 0, 5), 3);
  assert.equal(cycleCarouselIndex(9, 1, 5), 0);
  assert.equal(cycleCarouselIndex(0, 1, 0), 0);
  assert.equal(cycleCarouselIndex(Number.NaN, 1, 5), 1);
});

test('resolves a zoom swipe into a photo step', () => {
  assert.equal(resolveZoomSwipe({deltaX: -120, deltaY: 8}), 1);
  assert.equal(resolveZoomSwipe({deltaX: 120, deltaY: -10}), -1);
  assert.equal(resolveZoomSwipe({deltaX: -30, deltaY: 0}), 0);
  assert.equal(resolveZoomSwipe({deltaX: -80, deltaY: -90}), 0);
  assert.equal(resolveZoomSwipe({deltaX: Number.NaN, deltaY: 0}), 0);
});
