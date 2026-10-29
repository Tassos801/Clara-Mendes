#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Writes the hand-sized copies of public/images files that the storefront
 * shows (list: scripts/lib/storefront-images.mjs). Oxygen passes plain
 * sRGB JPEGs and PNGs through as they are but re-encodes WebP and
 * ICC-tagged JPEGs into larger full-size files, so each copy is a
 * progressive mozjpeg JPEG with no ICC profile (sharp converts to sRGB and
 * drops metadata), or a palette PNG where the image is transparent.
 *
 * Usage:
 *   npm run storefront:images              write every copy
 *   npm run storefront:images -- --check   verify every copy is on disk,
 *        plain, and as wide as listed
 */
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import sharp from 'sharp';
import {STOREFRONT_IMAGE_COPIES} from './lib/storefront-images.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicPath = (src) => path.join(ROOT, 'public', src);

async function write(copy) {
  const source = sharp(publicPath(copy.src));
  const {width} = await source.metadata();
  if (width < copy.width)
    throw new Error(`${copy.src} is ${width} px, narrower than ${copy.width}`);
  const resized = source.resize({width: copy.width, kernel: 'lanczos3'});
  await (
    copy.format === 'png'
      ? resized.png({compressionLevel: 9, effort: 10, palette: true})
      : resized.jpeg({mozjpeg: true, progressive: true, quality: copy.quality})
  ).toFile(publicPath(copy.to));
  const {size} = await stat(publicPath(copy.to));
  console.log(`${copy.to}  ${(size / 1024).toFixed(0)} KB`);
}

async function problems(copy) {
  let bytes;
  try {
    bytes = await readFile(publicPath(copy.to));
  } catch {
    return 'missing';
  }
  const png = bytes.readUInt32BE(0) === 0x89504e47;
  if (copy.format === 'png' ? !png : bytes.readUInt16BE(0) !== 0xffd8)
    return `not a ${copy.format.toUpperCase()}`;
  if (bytes.includes(Buffer.from(png ? 'iCCP' : 'ICC_PROFILE')))
    return 'carries an ICC profile';
  const {width} = await sharp(bytes).metadata();
  return width === copy.width ? null : `${width} px wide, not ${copy.width}`;
}

const {values} = parseArgs({
  options: {check: {type: 'boolean', default: false}},
});

if (values.check) {
  let failed = 0;
  for (const copy of STOREFRONT_IMAGE_COPIES) {
    const problem = await problems(copy);
    if (!problem) continue;
    failed++;
    console.error(`${copy.to}: ${problem}`);
  }
  console.log(
    `${STOREFRONT_IMAGE_COPIES.length - failed}/${STOREFRONT_IMAGE_COPIES.length} copies ok`,
  );
  if (failed) process.exitCode = 1;
} else {
  for (const copy of STOREFRONT_IMAGE_COPIES) await write(copy);
}
/* eslint-enable no-console */
