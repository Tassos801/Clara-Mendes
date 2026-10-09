#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Home-screen icons for "Add to Home Screen", drawn from the favicon's clay
 * vessel (app/assets/favicon.svg) on the oat brand colour. Deterministic and
 * offline: node scripts/build-app-icons.mjs
 *
 * Writes public/icons/:
 * - icon-192.png, icon-512.png    manifest "any" icons
 * - icon-maskable-512.png         Android shaped icons (vessel inside the
 *                                 central 80% safe zone)
 * - apple-touch-icon.png (180)    iOS home screen (iOS rounds the corners)
 */
import {mkdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/icons');

export const ICON_BACKGROUND = '#F4F0E8'; // Oat
const VESSEL = '#9C6F5D'; // Clay

// The vessel spans x 8–24 and y 4–28 in the favicon's 32-unit box.
const VESSEL_BOX = {x: 8, y: 4, width: 16, height: 24};

export const ICONS = [
  {file: 'icon-192.png', size: 192, height: 0.6},
  {file: 'icon-512.png', size: 512, height: 0.6},
  {file: 'icon-maskable-512.png', size: 512, height: 0.48},
  {file: 'apple-touch-icon.png', size: 180, height: 0.58},
];

async function vesselPath() {
  const svg = await readFile(path.join(ROOT, 'app/assets/favicon.svg'), 'utf8');
  const d = svg.match(/<path[^>]*\sd="([^"]+)"/)?.[1];
  if (!d) throw new Error('No vessel path found in app/assets/favicon.svg');
  return d;
}

function iconSvg(d, size, heightShare) {
  const scale = (size * heightShare) / VESSEL_BOX.height;
  const x = size / 2 - (VESSEL_BOX.x + VESSEL_BOX.width / 2) * scale;
  // Sit the vessel a touch below centre so its neck does not crowd the top.
  const y =
    size / 2 - (VESSEL_BOX.y + VESSEL_BOX.height / 2) * scale + size * 0.01;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${ICON_BACKGROUND}"/>
  <path d="${d}" fill="${VESSEL}" fill-rule="evenodd" transform="translate(${x.toFixed(3)} ${y.toFixed(3)}) scale(${scale.toFixed(4)})"/>
</svg>`;
}

async function main() {
  const d = await vesselPath();
  await mkdir(OUT, {recursive: true});
  for (const icon of ICONS) {
    const target = path.join(OUT, icon.file);
    const info = await sharp(Buffer.from(iconSvg(d, icon.size, icon.height)))
      .png({compressionLevel: 9})
      .toFile(target);
    console.log(
      `${path.relative(ROOT, target)}  ${info.width}x${info.height}  ${info.size} bytes`,
    );
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}

/* eslint-enable no-console */
