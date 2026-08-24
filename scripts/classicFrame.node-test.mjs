import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildClassicFrameUrl,
  CLASSIC_FRAME_HANDLE,
  CLASSIC_FRAME_PRODUCT_TYPE,
  CLASSIC_FRAME_SIZE_LABELS,
  filterAccurateClassicFrameImages,
  getUnframedPresentationRedirectPath,
  isAccurateClassicFrameImage,
  isClassicFrameSizeLabel,
  isUnframedPresentation,
  selectAccurateClassicFrameImage,
  selectAccurateClassicFrameVariant,
  selectedClassicFrameSize,
  UNFRAMED_PRINT_SIZE_LABELS,
} from '../app/lib/classicFrame.ts';

test('frame-only product mirrors all three print sizes', () => {
  assert.equal(CLASSIC_FRAME_PRODUCT_TYPE, 'Frames');
  assert.deepEqual(CLASSIC_FRAME_SIZE_LABELS, [
    '8 × 10 in',
    '16 × 20 in',
    '20 × 24 in',
  ]);
  assert.deepEqual(UNFRAMED_PRINT_SIZE_LABELS, CLASSIC_FRAME_SIZE_LABELS);
});

test('frame links preselect only an approved size', () => {
  assert.equal(
    buildClassicFrameUrl('20 × 24 in'),
    `/products/${CLASSIC_FRAME_HANDLE}?Size=20+%C3%97+24+in`,
  );
  assert.equal(
    buildClassicFrameUrl('Patina Blue'),
    `/products/${CLASSIC_FRAME_HANDLE}`,
  );
  assert.equal(isClassicFrameSizeLabel('16 × 20 in'), true);
  assert.equal(isClassicFrameSizeLabel('16 x 20 in'), false);
  assert.equal(
    selectedClassicFrameSize([{name: 'Size', value: '8 × 10 in'}]),
    '8 × 10 in',
  );
});

test('legacy presentation links canonicalize to the unframed print', () => {
  assert.equal(
    getUnframedPresentationRedirectPath(
      'https://shopclaramendes.com/products/quiet-form-ii-art-print?Size=16+%C3%97+20+in&Presentation=Natural+frame',
    ),
    '/products/quiet-form-ii-art-print?Size=16+%C3%97+20+in&Presentation=Unframed',
  );
  assert.equal(
    getUnframedPresentationRedirectPath(
      'https://shopclaramendes.com/products/quiet-form-ii-art-print?Presentation=Unframed',
    ),
    null,
  );
  assert.equal(
    isUnframedPresentation([{name: 'Presentation', value: 'Natural frame'}]),
    false,
  );
  assert.equal(
    isUnframedPresentation([{name: 'Presentation', value: 'Unframed'}]),
    true,
  );
});

test('storefront media guard accepts only the empty Natural frame', () => {
  const accurate = {
    altText: 'Natural classic frame only; artwork not included',
    url: 'https://cdn.shopify.com/frame-only-natural.png',
  };
  const retiredArtworkMockup = {
    altText:
      'Quiet Form artwork in the Prodigi Natural classic frame, no mat, 16 × 20 in',
    url: 'https://cdn.shopify.com/quiet-form.webp',
  };

  assert.equal(isAccurateClassicFrameImage(accurate), true);
  assert.equal(isAccurateClassicFrameImage(retiredArtworkMockup), false);
  assert.deepEqual(
    filterAccurateClassicFrameImages([retiredArtworkMockup, accurate]),
    [accurate],
  );
  assert.equal(
    selectAccurateClassicFrameImage([retiredArtworkMockup, accurate]),
    accurate,
  );
  assert.deepEqual(
    selectAccurateClassicFrameVariant([
      {id: 'retired', image: retiredArtworkMockup},
      {id: 'approved', image: accurate},
    ]),
    {id: 'approved', image: accurate},
  );
});
