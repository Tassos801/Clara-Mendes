import assert from 'node:assert/strict';
import test from 'node:test';

import {
  filterGalleryImagesForSize,
  printScaleGeometry,
  selectedPrintSize,
} from '../app/lib/productSizePresentation.ts';

const flat = {altText: 'Quiet Form I art print', url: '/quiet-form-01.webp'};
const smallDetail = {
  altText: 'Quiet Form I art print shown unframed on a sage green wall',
  url: '/quiet-form-01-room-detail.webp?v=1',
};
const smallContext = {
  altText:
    'Quiet Form I art print shown unframed at its true 8 by 10 inch size on a sage wall beside a reading lamp',
  url: '/quiet-form-01-room-context.webp?v=1',
};
const largeDetail = {
  altText:
    'Quiet Form I 16 by 20 inch art print shown unframed on a sage green wall',
  url: '/quiet-form-01-room-detail-16x20.webp?v=1',
};
const largeContext = {
  altText:
    'Quiet Form I art print shown unframed at its true 16 by 20 inch size on a sage wall beside a reading lamp',
  url: '/quiet-form-01-room-context-16x20.webp?v=1',
};
const smallSofa = {
  altText:
    'Quiet Form I unframed 8 by 10 inch art print shown at relative scale above a sofa in a warm neutral living room',
  url: '/quiet-form-01-room-sofa-8x10.jpg?v=1',
};
const largeSofa = {
  altText:
    'Quiet Form I unframed 16 by 20 inch art print shown at relative scale above a sofa in a warm neutral living room',
  url: '/quiet-form-01-room-sofa-16x20.jpg?v=1',
};
const biggerSofa = {
  altText:
    'Quiet Form I unframed 20 by 24 inch art print shown at relative scale above a sofa in a warm neutral living room',
  url: '/quiet-form-01-room-sofa-20x24.jpg?v=1',
};
const biggerDetail = {
  altText:
    'Quiet Form I 20 by 24 inch art print shown unframed on a sage green wall',
  url: '/quiet-form-01-room-detail-20x24.webp?v=1',
};
const biggerContext = {
  altText:
    'Quiet Form I art print shown unframed at its true 20 by 24 inch size on a sage wall beside a reading lamp',
  url: '/quiet-form-01-room-context-20x24.webp?v=1',
};
const gallery = [
  flat,
  smallSofa,
  largeSofa,
  biggerSofa,
  smallDetail,
  smallContext,
  largeDetail,
  largeContext,
  biggerDetail,
  biggerContext,
];

test('maps the selected Size option and defaults safely to 8x10', () => {
  assert.equal(selectedPrintSize([]).key, '8x10');
  assert.equal(
    selectedPrintSize([{name: 'Size', value: '16 × 20 in'}]).key,
    '16x20',
  );
  assert.equal(
    selectedPrintSize([{name: 'Size', value: '20 × 24 in'}]).key,
    '20x24',
  );
});

test('keeps flat art while showing only the selected-size room mockups', () => {
  assert.deepEqual(filterGalleryImagesForSize(gallery, '8x10', true), [
    flat,
    smallSofa,
    smallDetail,
    smallContext,
  ]);
  assert.deepEqual(filterGalleryImagesForSize(gallery, '16x20', true), [
    flat,
    largeSofa,
    largeDetail,
    largeContext,
  ]);
  assert.deepEqual(filterGalleryImagesForSize(gallery, '20x24', true), [
    flat,
    biggerSofa,
    biggerDetail,
    biggerContext,
  ]);
  assert.equal(filterGalleryImagesForSize(gallery, '20x24', false).length, 10);
});

test('scales both diagrams against the same 84 inch sofa', () => {
  assert.deepEqual(
    {
      height: printScaleGeometry('8x10').height,
      width: printScaleGeometry('8x10').width,
    },
    {height: 35, width: 28},
  );
  assert.deepEqual(
    {
      height: printScaleGeometry('16x20').height,
      width: printScaleGeometry('16x20').width,
    },
    {height: 70, width: 56},
  );
  assert.deepEqual(
    {
      height: printScaleGeometry('20x24').height,
      width: printScaleGeometry('20x24').width,
    },
    {height: 84, width: 70},
  );
});
