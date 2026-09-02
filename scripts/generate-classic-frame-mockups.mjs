#!/usr/bin/env node
/* eslint-disable no-console */

import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import sharp from 'sharp';

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

export const PRODIGI_PRODUCT_URL =
  'https://www.prodigi.com/products/wall-art/framed-prints/classic-frames/';
export const PRODIGI_BLANKS_URL =
  'https://www.prodigi.com/download/blanks/prodigi-classic-frame-blanks.zip';
export const FRAME_FACE_MM = 20;
export const PRINT_WIDTH_MM = 16 * 25.4;
export const ART_WIDTH = 1120;
export const ART_HEIGHT = 1400;
export const FRAME_FACE_PX = Math.round(
  (FRAME_FACE_MM / PRINT_WIDTH_MM) * ART_WIDTH,
);
export const CANVAS = {width: 1600, height: 2000};
export const FRAME_POSITION = {left: 185, top: 210};
export const ART_POSITION = {
  left: FRAME_POSITION.left + FRAME_FACE_PX,
  top: FRAME_POSITION.top + FRAME_FACE_PX,
};

const ASSET_ROOT = path.join(REPO_ROOT, 'scripts', 'assets', 'classic-frame');
export const FRAME_SOURCE_PATH = path.join(
  ASSET_ROOT,
  'prodigi-natural-classic-frame.png',
);
export const OUTPUT_ROOT = path.join(
  REPO_ROOT,
  'public',
  'images',
  'art-product-extensions',
  'classic-frame',
);

export const FRAME_SOURCE_SHA256 =
  'adf728a3eb722d97073907eed3e0c678d2758354c470aa4ead04510bc764bd07';

export const ARTWORKS = [
  {
    slug: 'quiet-form',
    title: 'Quiet Form',
    sha256: '44362ac4970be63631ab724c12efc50985f9e6fed02e1360f4f7863045f8daf6',
  },
  {
    slug: 'patina-blue',
    title: 'Patina Blue',
    sha256: '7e6cc483ba4d33b8d62bcc0f6bbfceeb054d71f52c01397d78e9f87edcad0cc7',
  },
  {
    slug: 'neo-deco',
    title: 'Neo Deco',
    sha256: 'a52bd07312731207d9881b91651332074cef745723141e59c18a5fa574ce1773',
  },
  {
    slug: 'midnight-garden',
    title: 'Midnight Garden',
    sha256: '148faa97c6ba2ce77bee0c97ee4b2e8ef0393f5db6120941567b2f7c5a7ed0fa',
  },
  {
    slug: 'sunlit-mosaic',
    title: 'Sunlit Mosaic',
    sha256: '6236817f9bb610050b79b0759caf3347a6e9b42d6de7abfd1b101e55459dc3cc',
  },
].map((artwork) => ({
  ...artwork,
  sourcePath: path.join(ASSET_ROOT, 'artwork', `${artwork.slug}.jpg`),
  outputPath: path.join(OUTPUT_ROOT, `${artwork.slug}.webp`),
}));

// Coordinates measured from Prodigi's Natural classic frame blank. The blank
// has a generic opening, so the eight frame sections are resized around the
// exact 16:20 artwork opening without changing the frame profile.
const SOURCE = {
  outerLeft: 475,
  outerTop: 190,
  innerLeft: 564,
  innerTop: 279,
  innerRight: 1938,
  innerBottom: 2220,
  outerRight: 2028,
  outerBottom: 2310,
};

async function sha256(filePath) {
  return createHash('sha256')
    .update(await readFile(filePath))
    .digest('hex');
}

async function assertSource(filePath, expectedHash, expectedSize, label) {
  const [actualHash, metadata] = await Promise.all([
    sha256(filePath),
    sharp(filePath).metadata(),
  ]);
  if (actualHash !== expectedHash) {
    throw new Error(`${label}: source digest changed (${actualHash})`);
  }
  if (
    metadata.width !== expectedSize.width ||
    metadata.height !== expectedSize.height
  ) {
    throw new Error(
      `${label}: expected ${expectedSize.width}x${expectedSize.height}, got ${metadata.width}x${metadata.height}`,
    );
  }
}

async function frameSection(extract, width, height) {
  return sharp(FRAME_SOURCE_PATH)
    .extract(extract)
    .resize(width, height, {fit: 'fill'})
    .png()
    .toBuffer();
}

export async function buildFrameSections() {
  const leftWidth = SOURCE.innerLeft - SOURCE.outerLeft;
  const topHeight = SOURCE.innerTop - SOURCE.outerTop;
  const openingWidth = SOURCE.innerRight - SOURCE.innerLeft;
  const openingHeight = SOURCE.innerBottom - SOURCE.innerTop;
  const rightWidth = SOURCE.outerRight - SOURCE.innerRight;
  const bottomHeight = SOURCE.outerBottom - SOURCE.innerBottom;
  const f = FRAME_FACE_PX;

  const [topLeft, top, topRight, left, right, bottomLeft, bottom, bottomRight] =
    await Promise.all([
      frameSection(
        {
          left: SOURCE.outerLeft,
          top: SOURCE.outerTop,
          width: leftWidth,
          height: topHeight,
        },
        f,
        f,
      ),
      frameSection(
        {
          left: SOURCE.innerLeft,
          top: SOURCE.outerTop,
          width: openingWidth,
          height: topHeight,
        },
        ART_WIDTH,
        f,
      ),
      frameSection(
        {
          left: SOURCE.innerRight,
          top: SOURCE.outerTop,
          width: rightWidth,
          height: topHeight,
        },
        f,
        f,
      ),
      frameSection(
        {
          left: SOURCE.outerLeft,
          top: SOURCE.innerTop,
          width: leftWidth,
          height: openingHeight,
        },
        f,
        ART_HEIGHT,
      ),
      frameSection(
        {
          left: SOURCE.innerRight,
          top: SOURCE.innerTop,
          width: rightWidth,
          height: openingHeight,
        },
        f,
        ART_HEIGHT,
      ),
      frameSection(
        {
          left: SOURCE.outerLeft,
          top: SOURCE.innerBottom,
          width: leftWidth,
          height: bottomHeight,
        },
        f,
        f,
      ),
      frameSection(
        {
          left: SOURCE.innerLeft,
          top: SOURCE.innerBottom,
          width: openingWidth,
          height: bottomHeight,
        },
        ART_WIDTH,
        f,
      ),
      frameSection(
        {
          left: SOURCE.innerRight,
          top: SOURCE.innerBottom,
          width: rightWidth,
          height: bottomHeight,
        },
        f,
        f,
      ),
    ]);

  return {topLeft, top, topRight, left, right, bottomLeft, bottom, bottomRight};
}

async function buildShadow() {
  const width = ART_WIDTH + FRAME_FACE_PX * 2;
  const height = ART_HEIGHT + FRAME_FACE_PX * 2;
  return sharp({
    create: {
      ...CANVAS,
      channels: 4,
      background: {r: 0, g: 0, b: 0, alpha: 0},
    },
  })
    .composite([
      {
        input: {
          create: {
            width,
            height,
            channels: 4,
            background: {r: 29, g: 25, b: 20, alpha: 0.22},
          },
        },
        left: FRAME_POSITION.left + 18,
        top: FRAME_POSITION.top + 24,
      },
    ])
    .blur(30)
    .png()
    .toBuffer();
}

export async function generateClassicFrameMockups({log = true} = {}) {
  await assertSource(
    FRAME_SOURCE_PATH,
    FRAME_SOURCE_SHA256,
    {width: 2500, height: 2500},
    'Prodigi Natural classic frame blank',
  );
  await Promise.all(
    ARTWORKS.map((artwork) =>
      assertSource(
        artwork.sourcePath,
        artwork.sha256,
        {width: ART_WIDTH, height: ART_HEIGHT},
        artwork.title,
      ),
    ),
  );

  const [sections, shadow] = await Promise.all([
    buildFrameSections(),
    buildShadow(),
  ]);
  const f = FRAME_FACE_PX;
  const outerRight = ART_POSITION.left + ART_WIDTH;
  const outerBottom = ART_POSITION.top + ART_HEIGHT;

  for (const artwork of ARTWORKS) {
    const art = await sharp(artwork.sourcePath).removeAlpha().png().toBuffer();
    await sharp({
      create: {
        ...CANVAS,
        channels: 3,
        background: {r: 239, g: 235, b: 228},
      },
    })
      .composite([
        {input: shadow, left: 0, top: 0},
        {input: art, ...ART_POSITION},
        {input: sections.topLeft, ...FRAME_POSITION},
        {input: sections.top, left: ART_POSITION.left, top: FRAME_POSITION.top},
        {input: sections.topRight, left: outerRight, top: FRAME_POSITION.top},
        {
          input: sections.left,
          left: FRAME_POSITION.left,
          top: ART_POSITION.top,
        },
        {input: sections.right, left: outerRight, top: ART_POSITION.top},
        {
          input: sections.bottomLeft,
          left: FRAME_POSITION.left,
          top: outerBottom,
        },
        {input: sections.bottom, left: ART_POSITION.left, top: outerBottom},
        {input: sections.bottomRight, left: outerRight, top: outerBottom},
      ])
      .webp({lossless: true, effort: 6})
      .toFile(artwork.outputPath);

    if (log)
      console.log(`Generated ${path.relative(REPO_ROOT, artwork.outputPath)}`);
  }

  if (log) {
    console.log(
      `Prodigi Natural frame source preserved; ${f}px face around an ${ART_WIDTH}x${ART_HEIGHT} no-mat opening.`,
    );
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await generateClassicFrameMockups();
}

/* eslint-enable no-console */
