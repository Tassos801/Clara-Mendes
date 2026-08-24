import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildClassicFrameUrl,
  CLASSIC_FRAME_ARTWORKS,
  CLASSIC_FRAME_HANDLE,
  CLASSIC_FRAME_SIZE_LABEL,
  getClassicFrameArtworkByTitle,
  getClassicFrameArtworkForPrint,
  filterAccurateClassicFrameImages,
  isAccurateClassicFrameImage,
  selectedClassicFrameArtwork,
  UNFRAMED_PRINT_SIZE_LABELS,
} from '../app/lib/classicFrame.ts';

test('classic frame catalog exposes five exact sequence-one artworks', () => {
  assert.equal(CLASSIC_FRAME_ARTWORKS.length, 5);
  assert.deepEqual(
    CLASSIC_FRAME_ARTWORKS.map((artwork) => artwork.printHandle),
    [
      'quiet-form-i-art-print',
      'patina-blue-i-art-print',
      'neo-deco-i-art-print',
      'midnight-garden-i-art-print',
      'sunlit-mosaic-i-art-print',
    ],
  );
  assert.equal(getClassicFrameArtworkForPrint('quiet-form-ii-art-print'), null);
});

test('classic frame links preselect the matching artwork', () => {
  assert.equal(
    buildClassicFrameUrl('Patina Blue'),
    `/products/${CLASSIC_FRAME_HANDLE}?Artwork=Patina+Blue`,
  );
  assert.equal(
    getClassicFrameArtworkByTitle('patina blue')?.printHandle,
    'patina-blue-i-art-print',
  );
  assert.equal(
    selectedClassicFrameArtwork([{name: 'Artwork', value: 'Neo Deco'}])
      ?.printHandle,
    'neo-deco-i-art-print',
  );
});

test('framed and unframed size promises stay distinct', () => {
  assert.equal(CLASSIC_FRAME_SIZE_LABEL, '16 × 20 in');
  assert.deepEqual(UNFRAMED_PRINT_SIZE_LABELS, [
    '8 × 10 in',
    '16 × 20 in',
    '20 × 24 in',
  ]);
});

test('storefront frame media guard rejects the old mat-and-brown-frame files', () => {
  const accurate = {
    altText:
      'Quiet Form artwork in the Prodigi Natural classic frame, no mat, 16 × 20 in',
    url: 'https://cdn.shopify.com/quiet-form.webp',
  };
  const misleading = {
    altText:
      'Quiet Form artwork shown on the classic framed art print — 16 × 20 in',
    url: 'https://cdn.shopify.com/classic-frame-quiet-form.jpg',
  };

  assert.equal(isAccurateClassicFrameImage(accurate), true);
  assert.equal(isAccurateClassicFrameImage(misleading), false);
  assert.deepEqual(filterAccurateClassicFrameImages([misleading, accurate]), [
    accurate,
  ]);
});
