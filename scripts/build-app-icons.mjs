#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Site icons drawn from the favicon's "CM" monogram (app/assets/favicon.svg,
 * the header wordmark's Georgia Italic initials) in ink on the oat brand
 * colour. Deterministic and offline: node scripts/build-app-icons.mjs
 *
 * Writes public/icons/:
 * - icon-192.png, icon-512.png    manifest "any" icons
 * - icon-maskable-512.png         Android shaped icons (monogram inside the
 *                                 central 80% safe circle)
 * - apple-touch-icon.png (180)    iOS home screen (iOS rounds the corners)
 * and public/favicon.ico (16, 32, 48) for browsers and crawlers that do not
 * read the SVG favicon.
 */
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/icons');
const FAVICON = path.join(ROOT, 'app/assets/favicon.svg');
const FAVICON_ICO = path.join(ROOT, 'public/favicon.ico');

export const ICON_BACKGROUND = '#F4F0E8'; // Oat
const INK = '#26231F';

// The monogram spans x 2.5–29.5 and y 9.49–22.51 in the favicon's 32-unit box.
const MARK_BOX = {x: 2.5, y: 9.49, width: 27, height: 13.02};

// `width` is the monogram's share of the icon width.
export const ICONS = [
  {file: 'icon-192.png', size: 192, width: 0.72},
  {file: 'icon-512.png', size: 512, width: 0.72},
  {file: 'icon-maskable-512.png', size: 512, width: 0.64},
  {file: 'apple-touch-icon.png', size: 180, width: 0.7},
];

export const ICO_SIZES = [16, 32, 48];

async function markPath() {
  const svg = await readFile(FAVICON, 'utf8');
  const d = svg.match(/<path[^>]*\sd="([^"]+)"/)?.[1];
  if (!d) throw new Error('No monogram path found in app/assets/favicon.svg');
  return d;
}

// Home-screen icons use the glyphs as drawn; the favicon's extra stroke is
// only there for tab size.
function iconSvg(d, size, widthShare) {
  const scale = (size * widthShare) / MARK_BOX.width;
  const x = size / 2 - (MARK_BOX.x + MARK_BOX.width / 2) * scale;
  const y = size / 2 - (MARK_BOX.y + MARK_BOX.height / 2) * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${ICON_BACKGROUND}"/>
  <path d="${d}" fill="${INK}" transform="translate(${x.toFixed(3)} ${y.toFixed(3)}) scale(${scale.toFixed(4)})"/>
</svg>`;
}

/** ICO container holding one PNG per size (supported by every browser). */
function icoFromPngs(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({size, png}) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size % 256, 0); // 0 means 256
    entry.writeUInt8(size % 256, 1);
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map(({png}) => png)]);
}

async function main() {
  const d = await markPath();
  await mkdir(OUT, {recursive: true});
  for (const icon of ICONS) {
    const target = path.join(OUT, icon.file);
    const info = await sharp(Buffer.from(iconSvg(d, icon.size, icon.width)))
      .png({compressionLevel: 9})
      .toFile(target);
    console.log(
      `${path.relative(ROOT, target)}  ${info.width}x${info.height}  ${info.size} bytes`,
    );
  }

  const favicon = await readFile(FAVICON);
  const images = [];
  for (const size of ICO_SIZES) {
    // Rasterise at 4x and scale down for smoother edges at 16px.
    const png = await sharp(favicon, {density: (72 * size * 4) / 32})
      .resize(size, size)
      .png({compressionLevel: 9})
      .toBuffer();
    images.push({size, png});
  }
  const ico = icoFromPngs(images);
  await writeFile(FAVICON_ICO, ico);
  console.log(
    `${path.relative(ROOT, FAVICON_ICO)}  ${ICO_SIZES.join('/')}  ${ico.length} bytes`,
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}

/* eslint-enable no-console */
