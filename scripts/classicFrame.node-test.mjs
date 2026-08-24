import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildClassicFrameUrl,
  CLASSIC_FRAME_ARTWORKS,
  CLASSIC_FRAME_HANDLE,
  CLASSIC_FRAME_SIZE_LABEL,
  getClassicFrameArtworkByTitle,
  getClassicFrameArtworkForPrint,
  getMatchingUnframedHandleForCartLine,
  getUnframedPresentationRedirectPath,
  filterAccurateClassicFrameImages,
  isAccurateClassicFrameImage,
  isUnframedPresentation,
  selectAccurateClassicFrameImage,
  selectAccurateClassicFrameVariant,
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

test('framed cart lines exclude the identical unframed artwork', () => {
  assert.equal(
    getMatchingUnframedHandleForCartLine(CLASSIC_FRAME_HANDLE, [
      {name: 'Artwork', value: 'Sunlit Mosaic'},
    ]),
    'sunlit-mosaic-i-art-print',
  );
  assert.equal(
    getMatchingUnframedHandleForCartLine('quiet-form-i-art-print', [
      {name: 'Artwork', value: 'Quiet Form'},
    ]),
    null,
  );
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
  assert.equal(
    selectAccurateClassicFrameImage([misleading, accurate]),
    accurate,
  );
  assert.deepEqual(
    selectAccurateClassicFrameVariant([
      {id: 'legacy', image: misleading},
      {id: 'approved', image: accurate},
    ]),
    {id: 'approved', image: accurate},
  );
});
