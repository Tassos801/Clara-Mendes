#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Composites each original-art print into the owned room scenes defined in
 * scripts/lib/room-mockup-scenes.mjs and writes the results to
 * public/images/product-art-mockups/<capsule>/. Re-running overwrites the
 * same files. Output bytes are only reproducible with the exact pinned
 * sharp/libvips build (webp encoding varies across versions), so regenerate
 * and commit only when the scenes or artwork actually change.
 *
 *   node ./scripts/generate-room-mockups.mjs            # all 15 prints
 *   node ./scripts/generate-room-mockups.mjs --only=quiet-form-01
 */

import {mkdirSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import sharp from 'sharp';

import {
  MOCKUP_OUTPUT,
  MOCKUP_SCENES,
  computePrintPlacement,
  mockupRelativePath,
} from './lib/room-mockup-scenes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const catalog = JSON.parse(
  readFileSync(path.join(repoRoot, 'data', 'original-art-catalog.json'), 'utf8'),
);

const onlyArg = process.argv
  .slice(2)
  .find((arg) => arg.startsWith('--only='))
  ?.slice('--only='.length);

const WEBP_QUALITY = 84;

function shadowSvg(scene, placement) {
  const {left, top, width, height} = placement;
  const soft = scene.shadow;
  const contact = scene.contactShadow;
  return `<svg width="${MOCKUP_OUTPUT.width}" height="${MOCKUP_OUTPUT.height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="soft" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="${soft.blur}"/>
    </filter>
    <filter id="contact" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="${contact.blur}"/>
    </filter>
  </defs>
  <rect x="${left + soft.dx}" y="${top + soft.dy}" width="${width}" height="${height}" fill="#141210" opacity="${soft.opacity}" filter="url(#soft)"/>
  <rect x="${left + contact.dx}" y="${top + contact.dy}" width="${width}" height="${height}" fill="#141210" opacity="${contact.opacity}" filter="url(#contact)"/>
</svg>`;
}

function sheenSvg(scene, placement) {
  const {left, top, width, height} = placement;
  const fromLeft = scene.sheen.angle === 'top-left';
  const x1 = fromLeft ? 0 : 1;
  return `<svg width="${MOCKUP_OUTPUT.width}" height="${MOCKUP_OUTPUT.height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sheen" x1="${x1}" y1="0" x2="${1 - x1}" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="${scene.sheen.opacity * 1.8}"/>
      <stop offset="0.55" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="${left}" y="${top}" width="${width}" height="${height}" fill="url(#sheen)"/>
  <rect x="${left + 1}" y="${top + 1}" width="${width - 2}" height="${height - 2}" fill="none" stroke="#000000" stroke-opacity="0.08" stroke-width="2"/>
</svg>`;
}

async function sceneBaseBuffer(scene) {
  // Crops upscale to the output size (1.4-1.8x); a light sharpen keeps the
  // wall texture and lamp edges crisp.
  return sharp(path.join(repoRoot, scene.source))
    .extract(scene.crop)
    .resize(MOCKUP_OUTPUT.width, MOCKUP_OUTPUT.height)
    .sharpen({sigma: 0.6})
    .toBuffer();
}

async function main() {
  const items = onlyArg
    ? catalog.filter((item) => item.image.includes(onlyArg))
    : catalog;
  if (!items.length) {
    throw new Error(`--only=${onlyArg} matched no catalog entries`);
  }

  for (const scene of MOCKUP_SCENES) {
    const placement = computePrintPlacement(scene);
    const base = await sceneBaseBuffer(scene);
    const shadow = Buffer.from(shadowSvg(scene, placement));
    const sheen = Buffer.from(sheenSvg(scene, placement));

    for (const item of items) {
      const artPath = path.join(
        repoRoot,
        'public',
        item.image.replace(/^\//, '').replaceAll('/', path.sep),
      );
      const art = await sharp(artPath)
        .resize(placement.width, placement.height)
        .toBuffer();

      const relative = mockupRelativePath(item.image, scene);
      const outPath = path.join(
        repoRoot,
        'public',
        'images',
        'product-art-mockups',
        relative.replaceAll('/', path.sep),
      );
      mkdirSync(path.dirname(outPath), {recursive: true});

      await sharp(base)
        .composite([
          {input: shadow, left: 0, top: 0},
          {input: art, left: placement.left, top: placement.top},
          {input: sheen, left: 0, top: 0},
        ])
        .webp({quality: WEBP_QUALITY})
        .toFile(outPath);

      console.log(`  ${scene.key.padEnd(5)} ${relative}`);
    }
  }

  console.log(
    `\nGenerated ${items.length * MOCKUP_SCENES.length} mockups into public/images/product-art-mockups/.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

/* eslint-enable no-console */
