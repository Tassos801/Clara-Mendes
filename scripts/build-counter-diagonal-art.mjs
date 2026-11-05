#!/usr/bin/env node

// Builds the /clothing page art for the Counter-Diagonal capsule ("Inspired
// by Theo van Doesburg") from its design pack.
//
//   node scripts/build-counter-diagonal-art.mjs --source "<...>\Clara-Mendes-Van-Doesburg-Hoodie-2026-10-30"
//
// Optional: --out <dir> writes somewhere else (default public/images/clothing).
//
// Output (no network, no randomness, plain sRGB without ICC profiles, because
// Oxygen re-encodes WebP and ICC-tagged JPEGs into bigger files):
//   counter-diagonal-band.w1600.jpg    strip of the back composition, on white
//                                      (the page shows it with multiply, so
//                                      white reads as transparent)
//   counter-diagonal-looks.w1280.jpg   Printful mockups: heavyweight hoodie
//                                      back + oversized tee front, 4:3
//   counter-diagonal-emblem.w240.png   chest emblem, transparent palette PNG
//
// Sources in the design pack: source/back.svg (the vector composition),
// previews/printful-mockup-*.png (Printful's digital mockups) and
// print-files-samples/heavyweight-hoodie/front.png (the emblem print file).

import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index > 0 ? process.argv[index + 1] : undefined;
}

const source = arg('source');
if (!source) {
  console.error('Usage: --source <Counter-Diagonal design pack folder>');
  process.exit(1);
}
const out = path.resolve(arg('out') ?? path.join(repoRoot, 'public/images/clothing'));
await mkdir(out, {recursive: true});

const STONE = '#E8E4DC';

async function write(name, buffer) {
  await writeFile(path.join(out, name), buffer);
  const meta = await sharp(buffer).metadata();
  process.stdout.write(`${name}: ${meta.width}x${meta.height}, ${(buffer.length / 1024).toFixed(1)} kB
`);
}

// 1. Band: the composition's middle (y 2050-3650 of the 6000 px artboard,
// where red, blue, yellow and black all cross), rendered from the vector on
// white instead of the cream ground.
{
  const svg = (await readFile(path.join(source, 'source/back.svg'), 'utf8')).replace(
    /<rect width="6000" height="6000" fill="#EAE2D3"\/>/,
    '<rect width="6000" height="6000" fill="#FFFFFF"/>',
  );
  const full = await sharp(Buffer.from(svg), {density: 72 * (2400 / 6000)})
    .resize(2400, 2400)
    .flatten({background: '#FFFFFF'})
    .toBuffer();
  const band = await sharp(full)
    .extract({left: 0, top: Math.round(2050 * 0.4), width: 2400, height: Math.round(1600 * 0.4)})
    .resize(1600, 427)
    .jpeg({quality: 82, mozjpeg: true, chromaSubsampling: '4:4:4'})
    .toBuffer();
  await write('counter-diagonal-band.w1600.jpg', band);
}

// 2. Looks: two Printful mockups on a light stone ground, 1280 x 960.
{
  const mockup = (name, size) =>
    sharp(path.join(source, `previews/printful-mockup-${name}.png`))
      .resize(size, size)
      .png()
      .toBuffer();
  const hoodie = await mockup('heavyweight-hoodie-back', 860);
  const tee = await mockup('oversized-tee-front', 640);
  const looks = await sharp({
    create: {width: 1280, height: 960, channels: 3, background: STONE},
  })
    .composite([
      {input: hoodie, left: 10, top: 40},
      {input: tee, left: 640, top: 300},
    ])
    .jpeg({quality: 80, mozjpeg: true})
    .toBuffer();
  await write('counter-diagonal-looks.w1280.jpg', looks);
}

// 4. Collection hero for /collections/counter-diagonal (collectionHeroes.ts):
// the same two mockups on deep blue from the palette, with faint diagonal
// rules. Desktop 2560 x 1000 keeps the garments right of x 1300 so the white
// title stays on plain ground; mobile 1040 x 870 keeps them low and right
// under the title's top shade.
{
  const NAVY = '#0C2B55';
  const rules = (width, height, step) => {
    const lines = [];
    for (let x = -height; x < width; x += step) {
      lines.push(
        `<line x1="${x}" y1="0" x2="${x + height}" y2="${height}" stroke="#1B3F6F" stroke-width="3"/>`,
      );
    }
    return Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${lines.join('')}</svg>`,
    );
  };
  const mockup = (name, size) =>
    sharp(path.join(source, `previews/printful-mockup-${name}.png`))
      .resize(size, size)
      .png()
      .toBuffer();
  const hero = async (width, height, step, pieces) =>
    sharp({create: {width, height, channels: 3, background: NAVY}})
      .composite([
        {input: rules(width, height, step), left: 0, top: 0},
        ...(await Promise.all(
          pieces.map(async ([name, size, left, top]) => ({
            input: await mockup(name, size),
            left,
            top,
          })),
        )),
      ])
      .jpeg({quality: 80, mozjpeg: true})
      .toBuffer();
  await write(
    'counter-diagonal-collection-hero.jpg',
    await hero(2560, 1000, 220, [
      ['heavyweight-hoodie-back', 900, 1220, 70],
      ['oversized-tee-front', 640, 1800, 330],
    ]),
  );
  await write(
    'counter-diagonal-collection-hero-mobile.jpg',
    await hero(1040, 870, 140, [
      ['heavyweight-hoodie-back', 600, 250, 300],
      ['oversized-tee-front', 440, 590, 440],
    ]),
  );
}

// 3. Emblem: the chest emblem trimmed from its transparent print file.
{
  const emblem = await sharp(
    path.join(source, 'print-files-samples/heavyweight-hoodie/front.png'),
  )
    .trim()
    .resize({width: 240})
    .png({palette: true, colours: 32, compressionLevel: 9})
    .toBuffer();
  await write('counter-diagonal-emblem.w240.png', emblem);
}
