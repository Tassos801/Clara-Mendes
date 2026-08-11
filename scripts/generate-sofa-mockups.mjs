#!/usr/bin/env node
/* eslint-disable no-console */

import {mkdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import sharp from 'sharp';

import {
  SOFA_SCENES,
  sofaMockupRelativePath,
} from './lib/sofa-mockup-scenes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(__dirname, 'assets', 'sofa-mockups');
const outputRoot = path.join(
  repoRoot,
  'public',
  'images',
  'product-art-mockups',
);
const catalog = JSON.parse(
  await readFile(
    path.join(repoRoot, 'data', 'original-art-catalog.json'),
    'utf8',
  ),
);

const WIDTH = 1080;
const HEIGHT = 1350;
const CAPSULE_SCENES = Object.freeze({
  'midnight-garden': Object.freeze({artY: 338}),
  'neo-deco': Object.freeze({artY: 302}),
  'patina-blue': Object.freeze({artY: 320}),
  'quiet-form': Object.freeze({artY: 338}),
  'sunlit-mosaic': Object.freeze({artY: 300}),
});

function svg(content) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${content}</svg>`,
  );
}

function shadowRect(x, y, width, height) {
  return `<defs><filter id="shadow"><feGaussianBlur stdDeviation="10"/></filter></defs><rect x="${x + 4}" y="${y + 10}" width="${width}" height="${height}" fill="#000" opacity="0.22" filter="url(#shadow)"/>`;
}

function heightBracket(x, y, height) {
  const bracketX = x - 16;
  return `
    <line x1="${bracketX}" y1="${y}" x2="${bracketX}" y2="${y + height}" stroke="#F8F4EC" stroke-opacity="0.88" stroke-width="3"/>
    <line x1="${bracketX - 10}" y1="${y}" x2="${bracketX + 10}" y2="${y}" stroke="#F8F4EC" stroke-opacity="0.88" stroke-width="3"/>
    <line x1="${bracketX - 10}" y1="${y + height}" x2="${bracketX + 10}" y2="${y + height}" stroke="#F8F4EC" stroke-opacity="0.88" stroke-width="3"/>`;
}

function capsuleSlugFor(item) {
  const match = item.image.match(/^\/images\/product-art\/([^/]+)\//);
  if (!match) throw new Error(`${item.handle}: invalid catalog image path`);
  return match[1];
}

async function buildSofaMockup(item, sizeScene) {
  const capsuleSlug = capsuleSlugFor(item);
  const scene = CAPSULE_SCENES[capsuleSlug];
  if (!scene) throw new Error(`${item.handle}: missing sofa scene settings`);

  const backgroundPath = path.join(
    sourceRoot,
    `${capsuleSlug}-living-room.png`,
  );
  const artPath = path.join(repoRoot, 'public', ...item.image.split('/'));
  const relativeOutput = sofaMockupRelativePath(item.image, sizeScene);
  const outputPath = path.join(outputRoot, ...relativeOutput.split('/'));
  await mkdir(path.dirname(outputPath), {recursive: true});

  const background = await sharp(backgroundPath)
    .resize(WIDTH, HEIGHT, {fit: 'cover', position: 'centre'})
    .toBuffer();
  // The approved 16 x 20 placement is 180 px wide. Keeping 11.25 pixels per
  // physical inch makes the three offered sizes honest at 1 : 2 : 2.5 width.
  const pixelsPerInch = 11.25;
  const artWidth = Math.round(sizeScene.widthInches * pixelsPerInch);
  const artHeight = Math.round(sizeScene.heightInches * pixelsPerInch);
  const artX = Math.round((WIDTH - artWidth) / 2);
  const artCenterY = scene.artY + 225 / 2;
  const artY = Math.round(artCenterY - artHeight / 2);
  const art = await sharp(artPath)
    .resize(artWidth, artHeight, {fit: 'cover', position: 'centre'})
    .toBuffer();
  const overlay = svg(
    `${shadowRect(artX, artY, artWidth, artHeight)}${heightBracket(artX, artY, artHeight)}`,
  );

  await sharp(background)
    .composite([
      {input: overlay, top: 0, left: 0},
      {input: art, top: artY, left: artX},
    ])
    .jpeg({quality: 92, chromaSubsampling: '4:4:4'})
    .toFile(outputPath);

  return path.relative(repoRoot, outputPath);
}

const outputs = [];
for (const item of catalog) {
  for (const sizeScene of SOFA_SCENES) {
    outputs.push(await buildSofaMockup(item, sizeScene));
  }
}

console.log(`Generated ${outputs.length} sofa mockups:`);
for (const output of outputs) console.log(`  ${output}`);

/* eslint-enable no-console */
