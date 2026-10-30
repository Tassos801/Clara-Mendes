#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Favicon and site icons: the logo's Mondrian mark (LOGO_MARK in
 * app/content/logo.ts, six rectangles) on the oat brand colour, black parts
 * in the site ink. One source for every icon. Deterministic and offline:
 * node scripts/build-app-icons.mjs
 *
 * Writes:
 * - app/assets/favicon.svg        32x32 tab icon: oat tile, mark 28 px tall
 * - public/icons/icon-192.png, icon-512.png
 *                                 manifest "any" icons (mark 64% tall)
 * - public/icons/icon-maskable-512.png
 *                                 Android shaped icons (mark 56% tall, inside
 *                                 the central 80% safe circle)
 * - public/icons/apple-touch-icon.png (180)
 *                                 iOS home screen (iOS rounds the corners)
 * - public/favicon.ico (16, 32, 48) for browsers and crawlers that do not
 *   read the SVG favicon, rendered from favicon.svg.
 */
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {LOGO_COLORS, LOGO_MARK} from '../app/content/logo.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/icons');
const FAVICON = path.join(ROOT, 'app/assets/favicon.svg');
const FAVICON_ICO = path.join(ROOT, 'public/favicon.ico');

export const ICON_BACKGROUND = '#F4F0E8'; // Oat
/** The site's ink; the logo file's own black (#111111) is for third parties. */
export const SITE_INK = '#26231F';

/**
 * Mark height in the favicon's 32-unit box. At 28 the mark is exactly 16
 * units wide, so its outer edges land on whole pixels at 16 and 32 px.
 */
export const FAVICON_MARK_HEIGHT = 28;

// `height` is the mark's share of the icon height.
export const ICONS = [
  {file: 'icon-192.png', size: 192, height: 0.64},
  {file: 'icon-512.png', size: 512, height: 0.64},
  {file: 'icon-maskable-512.png', size: 512, height: 0.56},
  {file: 'apple-touch-icon.png', size: 180, height: 0.64},
];

export const ICO_SIZES = [16, 32, 48];

/**
 * The mark's six rectangles as SVG, its box placed at (x, y) and scaled.
 * `snap` rounds every edge to a whole pixel (for rasters drawn at their
 * final size): crisp edges, and touching blocks share the same pixel edge,
 * so no background seam shows between them.
 */
export function markRects({x, y, scale, ink = SITE_INK, snap = false}) {
  const at = (value) => (snap ? Math.round(value) : Number(value.toFixed(3)));
  return LOGO_MARK.rects
    .map((rect) => {
      const x0 = at(x + rect.x * scale);
      const x1 = at(x + (rect.x + rect.width) * scale);
      const y0 = at(y + rect.y * scale);
      const y1 = at(y + (rect.y + rect.height) * scale);
      const fill = rect.fill === 'ink' ? ink : LOGO_COLORS[rect.fill];
      const width = Number((x1 - x0).toFixed(3));
      const height = Number((y1 - y0).toFixed(3));
      return `<rect fill="${fill}" x="${x0}" y="${y0}" width="${width}" height="${height}"/>`;
    })
    .join('\n  ');
}

/** The mark centred in a square, `share` of its height. */
function centredMark(size, share, snap) {
  const scale = (size * share) / LOGO_MARK.height;
  return markRects({
    x: (size - LOGO_MARK.width * scale) / 2,
    y: (size - LOGO_MARK.height * scale) / 2,
    scale,
    snap,
  });
}

export function faviconSvg(markHeight = FAVICON_MARK_HEIGHT) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <!-- The Clara Mendes mark on an oat tile, black parts in the site ink.
       Written by scripts/build-app-icons.mjs from app/content/logo.ts. -->
  <rect width="32" height="32" rx="6" fill="${ICON_BACKGROUND}"/>
  ${centredMark(32, markHeight / 32, false)}
</svg>
`;
}

function iconSvg(size, share) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${ICON_BACKGROUND}"/>
  ${centredMark(size, share, true)}
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
  const favicon = faviconSvg();
  await writeFile(FAVICON, favicon);
  console.log(
    `${path.relative(ROOT, FAVICON)}  32x32  ${Buffer.byteLength(favicon)} bytes`,
  );

  await mkdir(OUT, {recursive: true});
  for (const icon of ICONS) {
    const target = path.join(OUT, icon.file);
    // Snapped edges leave only the five flat colours, so palette is lossless.
    const info = await sharp(Buffer.from(iconSvg(icon.size, icon.height)))
      .png({palette: true, compressionLevel: 9, effort: 10})
      .toFile(target);
    console.log(
      `${path.relative(ROOT, target)}  ${info.width}x${info.height}  ${info.size} bytes`,
    );
  }

  const images = [];
  for (const size of ICO_SIZES) {
    // Rasterise at 4x and scale down for smoother edges at 16px.
    const png = await sharp(Buffer.from(favicon), {
      density: (72 * size * 4) / 32,
    })
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
