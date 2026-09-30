#!/usr/bin/env node
/* eslint-disable no-console */
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const manifest = JSON.parse(
  await readFile(path.join(root, 'data/pastel-plant-pots.json'), 'utf8'),
);
const output = path.join(root, 'assets/plant-pots/artwork');
await mkdir(output, {recursive: true});

export function motif(id, accent, secondary) {
  switch (id) {
    case 'blush-arc':
      return `<path d="M850 885V570a295 295 0 0 1 590 0v315h-155V575a140 140 0 0 0-280 0v310Z" fill="${accent}"/><circle cx="1580" cy="345" r="90" fill="${secondary}"/>`;
    case 'sage-stem':
      return `<path d="M1140 975c-32-230 20-460 100-650" fill="none" stroke="${accent}" stroke-width="22" stroke-linecap="round"/><path d="M1150 765c-168 5-250-102-232-218 145-2 238 92 232 218Z" fill="${secondary}"/><path d="M1170 623c174 11 294-100 293-228-161-7-266 94-293 228Z" fill="${accent}"/><path d="M1216 467c-127-39-175-139-147-247 123 33 175 133 147 247Z" fill="${secondary}"/>`;
    case 'blue-drift':
      return `<path d="M715 675c-14-174 135-324 350-240 143 56 246 23 321-58 108-117 249-63 248 49-2 168-243 275-441 265-205-9-330 151-435 98-30-15-40-70-43-114Z" fill="${secondary}"/><path d="M853 790c82-81 192-116 323-99 138 18 282-32 361-76 111-61 219 13 173 109-66 139-253 204-420 174-174-31-376 75-437 29-47-36-35-102 0-137Z" fill="${accent}"/>`;
    case 'butter-sun':
      return `<circle cx="1145" cy="495" r="180" fill="${accent}"/><path d="M710 825q435-180 870 0" fill="none" stroke="${secondary}" stroke-width="70" stroke-linecap="round"/>`;
    default:
      throw new Error(`Unknown pot motif: ${id}`);
  }
}

for (const design of manifest.designs) {
  const {width, height, dpi} = manifest.print;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${design.background}"/>${motif(design.id, design.accent, design.secondary)}</svg>`;
  await writeFile(path.join(output, `${design.id}.svg`), `${svg}\n`);
  await sharp(Buffer.from(svg))
    .withMetadata({density: dpi})
    .jpeg({quality: 100, chromaSubsampling: '4:4:4'})
    .toFile(path.join(output, `${design.id}-300dpi.jpg`));
  console.log(`${design.id}: ${width} x ${height}, ${dpi} dpi, sRGB JPEG`);
}
/* eslint-enable no-console */
