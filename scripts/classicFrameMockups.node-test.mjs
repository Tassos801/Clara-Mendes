import assert from 'node:assert/strict';
import {test} from 'node:test';

import sharp from 'sharp';

import {
  ARTWORKS,
  ART_HEIGHT,
  ART_POSITION,
  ART_WIDTH,
  CANVAS,
  FRAME_FACE_MM,
  FRAME_FACE_PX,
  PRINT_WIDTH_MM,
  generateClassicFrameMockups,
} from './generate-classic-frame-mockups.mjs';

test('classic frame previews use the exact art in a correctly scaled no-mat frame', async () => {
  await generateClassicFrameMockups({log: false});

  assert.equal(ART_WIDTH / ART_HEIGHT, 16 / 20);
  assert.ok(
    Math.abs(FRAME_FACE_PX / ART_WIDTH - FRAME_FACE_MM / PRINT_WIDTH_MM) <
      0.0005,
  );

  for (const artwork of ARTWORKS) {
    const metadata = await sharp(artwork.outputPath).metadata();
    assert.equal(
      metadata.width,
      CANVAS.width,
      `${artwork.title}: preview width`,
    );
    assert.equal(
      metadata.height,
      CANVAS.height,
      `${artwork.title}: preview height`,
    );
    assert.equal(metadata.format, 'webp', `${artwork.title}: preview format`);

    const [expectedArt, compositedArt] = await Promise.all([
      sharp(artwork.sourcePath).removeAlpha().raw().toBuffer(),
      sharp(artwork.outputPath)
        .extract({
          ...ART_POSITION,
          width: ART_WIDTH,
          height: ART_HEIGHT,
        })
        .removeAlpha()
        .raw()
        .toBuffer(),
    ]);

    assert.deepEqual(
      compositedArt,
      expectedArt,
      `${artwork.title}: artwork pixels must remain unchanged and touch the frame`,
    );
  }
});
