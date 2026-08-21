#!/usr/bin/env node
/* eslint-disable no-console */
// Painterly background plates for the star map: layered radial gradients
// plus gaussian grain. One JPEG per theme and sheet at Prodigi's recommended
// 300 dpi pixel size (2400×3000 for 8×10, 6000×7200 for 20×24) plus a
// 1200×1440 preview for the browser.
//
//   node scripts/generate-sky-plates.mjs
import sharp from 'sharp';
import {mkdirSync} from 'node:fs';

const SIZES = {
  '8x10': [2400, 3000],
  '20x24': [6000, 7200],
};

// [colour, cx, cy, radius, opacity] in unit coordinates.
const THEMES = {
  linen: {
    base: '#efe8dc',
    blobs: [
      ['#f8f3e9', 0.5, 0.32, 0.75, 0.95],
      ['#e4d9c7', 0.12, 0.85, 0.7, 0.8],
      ['#d8c7af', 0.9, 0.92, 0.6, 0.65],
      ['#f3ece0', 0.8, 0.15, 0.5, 0.7],
    ],
    grain: 13,
  },
  'midnight-garden': {
    base: '#141b2b',
    blobs: [
      ['#24365a', 0.35, 0.28, 0.7, 0.9],
      ['#2c2f4d', 0.78, 0.55, 0.6, 0.8],
      ['#0b0f1c', 0.5, 0.98, 0.8, 0.95],
      ['#3b3560', 0.15, 0.68, 0.45, 0.55],
      ['#1d3a4a', 0.9, 0.12, 0.4, 0.5],
    ],
    grain: 9,
  },
  'quiet-form': {
    base: '#f6f2ea',
    blobs: [
      ['#fcf9f3', 0.5, 0.4, 0.8, 1],
      ['#ece2d4', 0.08, 0.88, 0.6, 0.7],
      ['#e8dac8', 0.92, 0.12, 0.5, 0.55],
    ],
    grain: 8,
  },
};

mkdirSync('public/sky/plates', {recursive: true});

for (const [id, t] of Object.entries(THEMES)) {
  for (const [sizeKey, [W, H]] of Object.entries(SIZES)) {
  const gradients = t.blobs
    .map(
      ([c, x, y, r, o], i) =>
        `<radialGradient id="g${i}" cx="${x}" cy="${y}" r="${r}"><stop offset="0" stop-color="${c}" stop-opacity="${o}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`,
    )
    .join('');
  const rects = t.blobs
    .map((_, i) => `<rect width="${W}" height="${H}" fill="url(#g${i})"/>`)
    .join('');
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${gradients}</defs><rect width="${W}" height="${H}" fill="${t.base}"/>${rects}</svg>`,
  );
  const grain = await sharp({
    create: {
      width: W,
      height: H,
      channels: 3,
      noise: {type: 'gaussian', mean: 128, sigma: t.grain},
    },
  })
    .png()
    .toBuffer();
  // Rasterise the SVG first; compositing straight onto an SVG input trips
  // sharp's dimension check.
  const base = await sharp(svg).png().toBuffer();
  const plate = sharp(base)
    .composite([{input: grain, blend: 'soft-light'}])
    .blur(0.6);
  const printJpeg = await plate.jpeg({quality: 82, mozjpeg: true}).toBuffer();
  await sharp(printJpeg).toFile(`public/sky/plates/${id}-${sizeKey}.jpg`);
  if (sizeKey === '8x10') {
    // Preview is derived from the finished print plate (resizing before the
    // composite would make the grain layer larger than the base).
    await sharp(printJpeg)
      .resize(1200, 1440)
      .jpeg({quality: 80, mozjpeg: true})
      .toFile(`public/sky/plates/${id}-preview.jpg`);
  }
  console.log('plate', id, sizeKey);
  }
}
/* eslint-enable no-console */
