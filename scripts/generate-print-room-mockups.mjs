#!/usr/bin/env node
/* eslint-disable no-console */

import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import sharp from 'sharp';

import {PRINT_CATALOG} from '../app/lib/printCatalog.ts';
import {roomMediaPlan} from './lib/print-room-scenes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const collectionSlug = process.argv[2];

if (!collectionSlug) {
  throw new Error(
    'Usage: node scripts/generate-print-room-mockups.mjs <collection-slug>',
  );
}

const collection = PRINT_CATALOG.collections.find(
  (candidate) => candidate.slug === collectionSlug,
);
if (!collection) throw new Error(`Unknown collection: ${collectionSlug}`);
const sourceRoot = path.join(
  __dirname,
  'assets',
  'print-room-mockups',
  collectionSlug,
);
const outputRoot = path.join(
  repoRoot,
  'public',
  'images',
  'product-art-mockups',
  collectionSlug,
);
const WIDTH = 1080;
const HEIGHT = 1350;

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function buildRoomMockup(print, scene) {
  const backgroundPath = path.join(sourceRoot, scene.backgroundFile);
  const artPath = path.join(
    repoRoot,
    'public',
    'images',
    'product-art',
    collectionSlug,
    `${print.slug}.webp`,
  );
  const outputPath = path.join(outputRoot, `${print.slug}-${scene.key}.jpg`);
  const [backgroundSource, artSource] = await Promise.all([
    readFile(backgroundPath),
    readFile(artPath),
  ]);
  const background = await sharp(backgroundSource)
    .resize(WIDTH, HEIGHT, {fit: 'fill'})
    .toBuffer();
  const art = await sharp(artSource)
    .resize(scene.placement.width, scene.placement.height, {
      fit: 'cover',
      position: 'centre',
    })
    .toBuffer();

  await mkdir(path.dirname(outputPath), {recursive: true});
  const output = await sharp(background)
    .composite([
      {
        input: art,
        left: scene.placement.left,
        top: scene.placement.top,
      },
    ])
    .jpeg({quality: 92, chromaSubsampling: '4:4:4'})
    .withMetadata({orientation: 1})
    .toBuffer();
  await writeFile(outputPath, output);

  return {
    print: print.slug,
    room: scene.key,
    alt: scene.alt,
    placement: scene.placement,
    dimensions: {width: WIDTH, height: HEIGHT},
    background: {
      file: path.posix.join(collectionSlug, scene.backgroundFile),
      sha256: sha256(backgroundSource),
    },
    artwork: {
      file: path.posix.join(
        'images',
        'product-art',
        collectionSlug,
        `${print.slug}.webp`,
      ),
      sha256: sha256(artSource),
    },
    output: {
      file: path.posix.join(collectionSlug, `${print.slug}-${scene.key}.jpg`),
      sha256: sha256(output),
    },
  };
}

const manifest = [];
for (const print of collection.prints) {
  for (const scene of roomMediaPlan(collection, print)) {
    manifest.push(await buildRoomMockup(print, scene));
  }
}

await writeFile(
  path.join(outputRoot, 'manifest.json'),
  `${JSON.stringify({collection: collectionSlug, images: manifest}, null, 2)}\n`,
);

console.log(`Generated ${manifest.length} tailored room mockups:`);
for (const entry of manifest) console.log(`  ${entry.output.file}`);

/* eslint-enable no-console */
