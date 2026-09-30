#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Art Tough Phone Case assets, generated from the local 16×20 300 dpi print
 * masters (not in Git):
 *
 * - Print files: one 4:5 JPEG per artwork under public/print-files/tough-case/.
 *   The orders/paid webhook sends its URL to Prodigi with
 *   `sizing: fillPrintArea`, so Prodigi centre-crops it to each device's print
 *   area. 2000×2500 covers the largest area (Galaxy S23 Ultra, 1380×2310).
 * - Previews: the same centre crop on the iPhone 16 Pro template, clipped to
 *   the case outline with the camera opening shown, for the product gallery
 *   (output/launches/art-tough-phone-case/previews/, uploaded separately).
 *
 * Usage:
 *   node scripts/generate-tough-case-assets.mjs --source-dir <dir> [--source-dir <dir> …]
 */

import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import sharp from 'sharp';

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

export const PRINT_FILE_SIZE = {width: 2000, height: 2500};
export const PRINT_FILE_DIR = path.join(
  REPO_ROOT,
  'public',
  'print-files',
  'tough-case',
);
export const PREVIEW_DIR = path.join(
  REPO_ROOT,
  'output',
  'launches',
  'art-tough-phone-case',
  'previews',
);
export const PREVIEW_DEVICE = 'IPHONE-16-PRO';
const PREVIEW_CANVAS = {width: 1600, height: 2000};
const LINEN = {r: 238, g: 234, b: 227};

/** "midnight-garden-ii-art-print" → "midnight-garden-02"; "the-fold-art-print" → "the-fold". */
export function toughCaseArtworkSlug(sourceHandle) {
  const base = sourceHandle.replace(/-art-print$/, '');
  const roman = {i: '01', ii: '02', iii: '03'};
  return base.replace(/-(i|ii|iii)$/, (_, numeral) => `-${roman[numeral]}`);
}

export function printFilePath(design) {
  return `/print-files/tough-case/${toughCaseArtworkSlug(design.sourceHandle)}.jpg`;
}

function findMaster(slug, sourceDirs) {
  for (const dir of sourceDirs) {
    const candidate = path.join(dir, `${slug}-16x20-300dpi.jpg`);
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`No 16x20 print master for ${slug} in ${sourceDirs.join(', ')}`);
}

/**
 * Prodigi templates are overlays: bleed and camera opening are ~30% black
 * (alpha ≈ 77), the printable case body is transparent, outlines and the
 * instruction text are opaque. Grey connected to the corner is outside the
 * case; large grey regions inside it are the camera opening. Small inside
 * regions are anti-aliasing around the text and outline, not openings.
 */
const MIN_OPENING_PX = 3000;

function floodFill(mask, width, height, seed, visit) {
  const stack = [seed];
  const filled = [];
  visit[seed] = 1;
  while (stack.length) {
    const index = stack.pop();
    filled.push(index);
    const x = index % width;
    const neighbours = [
      x > 0 ? index - 1 : -1,
      x < width - 1 ? index + 1 : -1,
      index >= width ? index - width : -1,
      index < width * (height - 1) ? index + width : -1,
    ];
    for (const next of neighbours) {
      if (next < 0 || visit[next] || !mask[next]) continue;
      visit[next] = 1;
      stack.push(next);
    }
  }
  return filled;
}

export async function caseMasks(templatePath) {
  const {data, info} = await sharp(templatePath)
    .ensureAlpha()
    .raw()
    .toBuffer({resolveWithObject: true});
  const {width, height} = info;
  const size = width * height;
  const grey = new Uint8Array(size);
  for (let i = 0; i < size; i += 1) {
    const alpha = data[i * 4 + 3];
    grey[i] = alpha >= 55 && alpha <= 100 ? 1 : 0;
  }
  const visited = new Uint8Array(size);
  const outside = new Uint8Array(size);
  for (const index of floodFill(grey, width, height, 0, visited)) {
    outside[index] = 1;
  }
  const caseMask = Buffer.alloc(size);
  const cameraMask = Buffer.alloc(size);
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let i = 0; i < size; i += 1) {
    if (!outside[i]) caseMask[i] = 255;
    if (!grey[i] || visited[i]) continue;
    const region = floodFill(grey, width, height, i, visited);
    if (region.length < MIN_OPENING_PX) continue;
    for (const index of region) {
      cameraMask[index] = 255;
      const x = index % width;
      const y = (index - x) / width;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  return {
    width,
    height,
    caseMask,
    cameraMask,
    camera: {left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1},
  };
}

function cameraSvg({width, height, camera}) {
  // Triple-lens Pro module: two lenses on the left, one on the right.
  const r = camera.width * 0.19;
  const lenses = [
    [camera.left + camera.width * 0.28, camera.top + camera.height * 0.28],
    [camera.left + camera.width * 0.28, camera.top + camera.height * 0.72],
    [camera.left + camera.width * 0.72, camera.top + camera.height * 0.5],
  ];
  const flash = [camera.left + camera.width * 0.74, camera.top + camera.height * 0.2];
  const lens = ([cx, cy]) => `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#3a3a3d"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.78}" fill="#0c0c0e"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.42}" fill="#1b2230"/>
    <circle cx="${cx - r * 0.18}" cy="${cy - r * 0.2}" r="${r * 0.12}" fill="#5b6478" opacity="0.7"/>`;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="#1c1c1e"/>
    ${lenses.map(lens).join('')}
    <circle cx="${flash[0]}" cy="${flash[1]}" r="${r * 0.28}" fill="#d9d2c0"/>
  </svg>`);
}

// sharp applies alpha operations in its own pipeline order, not call order,
// so layers are combined here on raw pixels.
function rgbaFromRaw(buffer, width, height) {
  return sharp(buffer, {raw: {width, height, channels: 4}});
}

export async function renderPreview(masterPath, masks) {
  const {width, height, caseMask, cameraMask} = masks;
  const art = await sharp(masterPath)
    .resize(width, height, {fit: 'cover', position: 'centre', kernel: 'lanczos3'})
    .removeAlpha()
    .raw()
    .toBuffer();
  const camera = await sharp(cameraSvg(masks))
    .resize(width, height)
    .removeAlpha()
    .raw()
    .toBuffer();
  // Blurred case mask: low near the outline, so the rim darkens softly and
  // reads as the wrapped, rounded case edge.
  const edge = await sharp(caseMask, {raw: {width, height, channels: 1}})
    .blur(18)
    .raw()
    .toBuffer();

  const caseRgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const inCamera = cameraMask[i] > 0;
    const shade = inCamera ? 1 : 1 - 0.55 * (1 - edge[i] / 255);
    for (let c = 0; c < 3; c += 1) {
      caseRgba[i * 4 + c] = inCamera
        ? camera[i * 3 + c]
        : Math.round(art[i * 3 + c] * shade);
    }
    caseRgba[i * 4 + 3] = caseMask[i];
  }

  const scale = (PREVIEW_CANVAS.height * 0.82) / height;
  const caseWidth = Math.round(width * scale);
  const caseHeight = Math.round(height * scale);
  const scaledCase = await rgbaFromRaw(caseRgba, width, height)
    .resize(caseWidth, caseHeight, {kernel: 'lanczos3'})
    .png()
    .toBuffer();

  const pad = 60;
  const shadowMask = await sharp(caseMask, {raw: {width, height, channels: 1}})
    .resize(caseWidth, caseHeight)
    .extend({top: pad, bottom: pad, left: pad, right: pad, background: '#000000'})
    .blur(26)
    .extractChannel(0)
    .raw()
    .toBuffer({resolveWithObject: true});
  if (shadowMask.info.channels !== 1) throw new Error('Shadow mask must be one channel');
  const shadowSize = shadowMask.info.width * shadowMask.info.height;
  const shadowRgba = Buffer.alloc(shadowSize * 4);
  for (let i = 0; i < shadowSize; i += 1) {
    shadowRgba[i * 4] = 60;
    shadowRgba[i * 4 + 1] = 48;
    shadowRgba[i * 4 + 2] = 36;
    shadowRgba[i * 4 + 3] = Math.round(shadowMask.data[i] * 0.32);
  }
  const shadow = await rgbaFromRaw(
    shadowRgba,
    shadowMask.info.width,
    shadowMask.info.height,
  )
    .png()
    .toBuffer();

  const left = Math.round((PREVIEW_CANVAS.width - caseWidth) / 2);
  const top = Math.round((PREVIEW_CANVAS.height - caseHeight) / 2);
  return sharp({
    create: {...PREVIEW_CANVAS, channels: 3, background: LINEN},
  })
    .composite([
      {input: shadow, left: left - pad + 14, top: top - pad + 26},
      {input: scaledCase, left, top},
    ])
    .jpeg({quality: 88, mozjpeg: true})
    .toBuffer();
}

export async function renderPrintFile(masterPath) {
  return sharp(masterPath)
    .resize(PRINT_FILE_SIZE.width, PRINT_FILE_SIZE.height, {
      fit: 'cover',
      position: 'centre',
      kernel: 'lanczos3',
    })
    .toColourspace('srgb')
    .withMetadata({density: 300})
    .jpeg({quality: 90, mozjpeg: true, chromaSubsampling: '4:4:4'})
    .toBuffer();
}

async function main() {
  const args = process.argv.slice(2);
  const sourceDirs = args
    .map((arg, index) => (arg === '--source-dir' ? args[index + 1] : null))
    .filter(Boolean);
  if (!sourceDirs.length) {
    throw new Error('Pass at least one --source-dir holding *-16x20-300dpi.jpg masters.');
  }
  const manifest = JSON.parse(
    await readFile(path.join(REPO_ROOT, 'data', 'art-tough-phone-case.json'), 'utf8'),
  );
  const device = manifest.phones.find((phone) => phone.code === PREVIEW_DEVICE);
  const masks = await caseMasks(path.join(REPO_ROOT, device.template.localFile));

  await mkdir(PRINT_FILE_DIR, {recursive: true});
  await mkdir(PREVIEW_DIR, {recursive: true});
  const report = [];
  for (const design of manifest.designs) {
    const slug = toughCaseArtworkSlug(design.sourceHandle);
    const master = findMaster(slug, sourceDirs);
    const printFile = await renderPrintFile(master);
    await writeFile(path.join(PRINT_FILE_DIR, `${slug}.jpg`), printFile);
    const preview = await renderPreview(master, masks);
    await writeFile(path.join(PREVIEW_DIR, `${slug}.jpg`), preview);
    report.push({
      skuPrefix: design.skuPrefix,
      slug,
      master,
      printFile: printFilePath(design),
      printFileBytes: printFile.length,
      printFileSha256: createHash('sha256').update(printFile).digest('hex'),
      preview: path.relative(REPO_ROOT, path.join(PREVIEW_DIR, `${slug}.jpg`)),
    });
    console.log(`${design.skuPrefix} ${slug} print ${(printFile.length / 1e6).toFixed(2)} MB`);
  }
  await writeFile(
    path.join(PREVIEW_DIR, '..', 'assets-report.json'),
    `${JSON.stringify({previewDevice: PREVIEW_DEVICE, printFileSize: PRINT_FILE_SIZE, report}, null, 2)}\n`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
/* eslint-enable no-console */
