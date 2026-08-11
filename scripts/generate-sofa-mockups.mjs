#!/usr/bin/env node
/* eslint-disable no-console */

import {mkdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import sharp from 'sharp';

import {sofaMockupRelativePath} from './lib/sofa-mockup-scenes.mjs';

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
const FONT = 'Arial, Helvetica, sans-serif';
const CAPSULE_SCENES = Object.freeze({
  'midnight-garden': Object.freeze({artY: 338}),
  'neo-deco': Object.freeze({artY: 302}),
  'patina-blue': Object.freeze({artY: 320}),
  'quiet-form': Object.freeze({artY: 338}),
  'sunlit-mosaic': Object.freeze({artY: 300}),
});

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function svg(content) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${content}</svg>`,
  );
}

function shadowRect(x, y, width, height) {
  return `<defs><filter id="shadow"><feGaussianBlur stdDeviation="12"/></filter></defs><rect x="${x + 4}" y="${y + 12}" width="${width}" height="${height}" fill="#000" opacity="0.24" filter="url(#shadow)"/>`;
}

function capsuleSlugFor(item) {
  const match = item.image.match(/^\/images\/product-art\/([^/]+)\//);
  if (!match) throw new Error(`${item.handle}: invalid catalog image path`);
  return match[1];
}

async function buildSofaMockup(item) {
  const capsuleSlug = capsuleSlugFor(item);
  const scene = CAPSULE_SCENES[capsuleSlug];
  if (!scene) throw new Error(`${item.handle}: missing sofa scene settings`);

  const backgroundPath = path.join(
    sourceRoot,
    `${capsuleSlug}-living-room.png`,
  );
  const artPath = path.join(repoRoot, 'public', ...item.image.split('/'));
  const relativeOutput = sofaMockupRelativePath(item.image);
  const outputPath = path.join(outputRoot, ...relativeOutput.split('/'));
  await mkdir(path.dirname(outputPath), {recursive: true});

  const background = await sharp(backgroundPath)
    .resize(WIDTH, HEIGHT, {fit: 'cover', position: 'centre'})
    .toBuffer();
  const artWidth = 180;
  const artHeight = 225;
  const artX = Math.round((WIDTH - artWidth) / 2);
  const art = await sharp(artPath)
    .resize(artWidth, artHeight, {fit: 'fill'})
    .toBuffer();
  const overlay = svg(`
    ${shadowRect(artX, scene.artY, artWidth, artHeight)}
    <rect x="52" y="52" width="432" height="186" rx="22" fill="#F8F4EC" fill-opacity="0.94"/>
    <text x="80" y="91" font-family="${FONT}" font-size="20" font-weight="700" letter-spacing="3" fill="#252421">CLARA MENDES</text>
    <text x="80" y="132" font-family="${FONT}" font-size="27" font-weight="600" fill="#252421">${escapeXml(item.shortTitle)}</text>
    <text x="80" y="181" font-family="${FONT}" font-size="42" font-weight="700" fill="#252421">16 &#215; 20 in</text>
    <text x="80" y="216" font-family="${FONT}" font-size="21" fill="#4D4A45">40.6 &#215; 50.8 cm &#183; &#8364;39.99</text>
    <text x="1024" y="94" text-anchor="end" font-family="${FONT}" font-size="18" font-weight="700" letter-spacing="2" fill="#F8F4EC">NEW SIZE</text>
    <line x1="${artX - 16}" y1="${scene.artY}" x2="${artX - 16}" y2="${scene.artY + artHeight}" stroke="#F8F4EC" stroke-width="3"/>
    <line x1="${artX - 26}" y1="${scene.artY}" x2="${artX - 6}" y2="${scene.artY}" stroke="#F8F4EC" stroke-width="3"/>
    <line x1="${artX - 26}" y1="${scene.artY + artHeight}" x2="${artX - 6}" y2="${scene.artY + artHeight}" stroke="#F8F4EC" stroke-width="3"/>
  `);

  await sharp(background)
    .composite([
      {input: overlay, top: 0, left: 0},
      {input: art, top: scene.artY, left: artX},
    ])
    .jpeg({quality: 92, chromaSubsampling: '4:4:4'})
    .toFile(outputPath);

  return path.relative(repoRoot, outputPath);
}

const outputs = [];
for (const item of catalog) outputs.push(await buildSofaMockup(item));

console.log(`Generated ${outputs.length} sofa mockups:`);
for (const output of outputs) console.log(`  ${output}`);

/* eslint-enable no-console */
