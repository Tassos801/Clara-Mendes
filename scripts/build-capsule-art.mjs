#!/usr/bin/env node

// Builds the /clothing art for an artist capsule from its design pack's
// `hero` folder, the way build-counter-diagonal-art.mjs does for
// Counter-Diagonal.
//
//   node scripts/build-capsule-art.mjs --handle circle-rhythm \
//     --source "<...>\Clara-Mendes-Taeuber-Arp-2026-11\hero" \
//     [--composition circle-rhythm-back-light.svg] [--emblem circle-rhythm-emblem-light.svg] \
//     [--band-rows 0-0.43,0.5-0.76] \
//     [--looks hoodie.png,tee.png] [--trim] [--ground "#2B56AE"]
//
// Output (public/images/clothing, or --out), plain sRGB without ICC
// profiles, never WebP (Oxygen re-encodes WebP into bigger files):
//   <handle>-band.w1600.jpg     a frieze of the composition's rows, on white
//                               (the page shows it with multiply, so white
//                               reads as transparent); see step 1
//   <handle>-emblem.w240.png    the chest emblem, transparent palette PNG
//   with --looks (transparent PNG mockups, first one larger):
//   <handle>-looks.w1280.jpg    the mockups on a light stone ground, 4:3
//   <handle>-collection-hero.jpg / -mobile.jpg   the mockups on --ground,
//                               right of x 1300 (desktop) so the white
//                               collection title stays on plain ground
//
// Brand rule (owner, 2026-11-06): the art never carries a typed brand
// name. Use the composition-only SVG for the band, and mockups whose
// garment credit is the official logo.

import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index > 0 ? process.argv[index + 1] : fallback;
}

const handle = arg('handle');
const source = arg('source');
if (!handle || !source) {
  console.error(
    'Usage: --handle <capsule handle> --source <design pack hero folder>',
  );
  process.exit(1);
}
const out = path.resolve(
  arg('out', path.join(repoRoot, 'public/images/clothing')),
);
await mkdir(out, {recursive: true});

const STONE = '#E8E4DC';

async function write(name, buffer) {
  await writeFile(path.join(out, name), buffer);
  const meta = await sharp(buffer).metadata();
  process.stdout.write(
    `${name}: ${meta.width}x${meta.height}, ${(buffer.length / 1024).toFixed(1)} kB\n`,
  );
}

// 1. Band: one frieze row on white, 1600 x 427. /clothing shows the band
// cropped to about 10:1 on desktop and 5:1 on phones, anchored at 78% of
// its height (clothing.css), so the row sits at y 228-358, where both crops
// keep it whole. The row alternates rows of the composition (--band-rows
// "0-0.43,0.5-0.76": bands of its height, as fractions). A shape belongs to
// the row its centre falls in and is always drawn whole, never cut. Centres:
// a circle's cy, a rect's middle, a path's first point (the composition's
// rings start at their left edge, on the centre line). Each row is trimmed,
// scaled to the row height, and the rows are centred with even gaps.
//
// A diagonal composition reads better as a strip through it, like the
// Counter-Diagonal band: --band-strip "0.55:1000" renders it 1000 px wide,
// centred on the 1600 px band, with its height fraction 0.55 at the middle
// of the desktop crop (y 293). Its shapes run off the band's edges, as they
// do on the garment.
const strip = arg('band-strip');
if (strip) {
  const svg = await readFile(
    path.join(source, arg('composition', `${handle}-back-light.svg`)),
  );
  const [at, width] = strip.split(':').map(Number);
  const art = await sharp(svg, {density: 300})
    .resize(width || 1600)
    .flatten({background: '#FFFFFF'})
    .png()
    .toBuffer();
  const {width: artWidth, height: artHeight} = await sharp(art).metadata();
  const top = Math.round(293 - at * artHeight);
  // Composite the art onto the white band; only its overlap is kept.
  const cropTop = Math.max(0, -top);
  const visible = Math.min(artHeight - cropTop, 427 - Math.max(0, top));
  const piece = await sharp(art)
    .extract({left: 0, top: cropTop, width: artWidth, height: visible})
    .png()
    .toBuffer();
  await write(
    `${handle}-band.w1600.jpg`,
    await sharp({
      create: {width: 1600, height: 427, channels: 3, background: '#FFFFFF'},
    })
      .composite([
        {
          input: piece,
          left: Math.round((1600 - artWidth) / 2),
          top: Math.max(0, top),
        },
      ])
      .jpeg({quality: 82, mozjpeg: true, chromaSubsampling: '4:4:4'})
      .toBuffer(),
  );
} else {
  const svg = await readFile(
    path.join(source, arg('composition', `${handle}-back-light.svg`)),
    'utf8',
  );
  const ROW_TOP = 228;
  const ROW_HEIGHT = 130;
  const GAP = 80;
  const viewHeight = Number(svg.match(/viewBox="[\d.\s-]+?\s([\d.]+)"/)[1]);
  const shapes = [...svg.matchAll(/<(circle|rect|path)\b[^>]*\/>/g)];
  const number = (shape, name) =>
    Number(shape.match(new RegExp(`\\b${name}="([\\d.-]+)"`))?.[1] ?? 0);
  const centre = ([shape, tag]) =>
    tag === 'circle'
      ? number(shape, 'cy')
      : tag === 'rect'
        ? number(shape, 'y') + number(shape, 'height') / 2
        : Number(shape.match(/\bd="M\s*[\d.-]+[\s,]+([\d.-]+)/)?.[1] ?? 0);
  const slices = await Promise.all(
    arg('band-rows', '0-1')
      .split(',')
      .map(async (range) => {
        const [from, to] = range.split('-').map(Number);
        const kept = shapes
          .filter((shape) => {
            const y = centre(shape) / viewHeight;
            return y >= from && y < to;
          })
          .map(([shape]) => shape);
        const rowSvg = svg.replace(
          /(<svg\b[^>]*>)[\s\S]*<\/svg>/,
          (_, open) => `${open}${kept.join('')}</svg>`,
        );
        // One operation per pass, so the trim sees the flattened render.
        const flat = await sharp(Buffer.from(rowSvg), {density: 300})
          .resize(2000)
          .flatten({background: '#FFFFFF'})
          .png()
          .toBuffer();
        const trimmed = await sharp(flat)
          .trim({background: '#FFFFFF', threshold: 10})
          .png()
          .toBuffer();
        const buffer = await sharp(trimmed)
          .resize({height: ROW_HEIGHT})
          .png()
          .toBuffer();
        const {width} = await sharp(buffer).metadata();
        return {buffer, width};
      }),
  );
  const row = [];
  let width = 0;
  for (let index = 0; ; index++) {
    const slice = slices[index % slices.length];
    const next = width + (row.length ? GAP : 0) + slice.width;
    if (next > 1600 - 2 * GAP) break;
    row.push({...slice, left: width + (row.length ? GAP : 0)});
    width = next;
  }
  const offset = Math.round((1600 - width) / 2);
  const band = await sharp({
    create: {width: 1600, height: 427, channels: 3, background: '#FFFFFF'},
  })
    .composite(
      row.map((slice) => ({
        input: slice.buffer,
        left: offset + slice.left,
        top: ROW_TOP,
      })),
    )
    .jpeg({quality: 82, mozjpeg: true, chromaSubsampling: '4:4:4'})
    .toBuffer();
  await write(`${handle}-band.w1600.jpg`, band);
}

// 2. Emblem: 240 px wide, transparent, palette PNG.
{
  const svg = await readFile(
    path.join(source, arg('emblem', `${handle}-emblem-light.svg`)),
  );
  const emblem = await sharp(svg, {density: 600})
    .resize(240)
    .png({palette: true, colours: 32, compressionLevel: 9})
    .toBuffer();
  await write(`${handle}-emblem.w240.png`, emblem);
}

// 3. Looks and collection hero, from transparent PNG mockups.
const looks = arg('looks');
if (looks) {
  const [big, small] = looks
    .split(',')
    .map((file) => path.resolve(source, file));
  // --trim drops a render's transparent margin first, so the garment, not
  // the canvas, fills its box.
  const trim = process.argv.includes('--trim');
  const fit = async (file, size) =>
    sharp(trim ? await sharp(file).trim().png().toBuffer() : file)
      .resize(size, size, {
        fit: 'contain',
        background: {r: 0, g: 0, b: 0, alpha: 0},
      })
      .png()
      .toBuffer();
  await write(
    `${handle}-looks.w1280.jpg`,
    await sharp({
      create: {width: 1280, height: 960, channels: 3, background: STONE},
    })
      .composite([
        {input: await fit(big, 860), left: 10, top: 40},
        {input: await fit(small, 640), left: 640, top: 300},
      ])
      .jpeg({quality: 80, mozjpeg: true})
      .toBuffer(),
  );
  const ground = arg('ground', '#2B56AE');
  const hero = async (width, height, pieces) =>
    sharp({create: {width, height, channels: 3, background: ground}})
      .composite(
        await Promise.all(
          pieces.map(async ([file, size, left, top]) => ({
            input: await fit(file, size),
            left,
            top,
          })),
        ),
      )
      .jpeg({quality: 80, mozjpeg: true})
      .toBuffer();
  await write(
    `${handle}-collection-hero.jpg`,
    await hero(2560, 1000, [
      [big, 900, 1220, 70],
      [small, 640, 1800, 330],
    ]),
  );
  await write(
    `${handle}-collection-hero-mobile.jpg`,
    await hero(1040, 870, [
      [big, 600, 250, 300],
      [small, 440, 590, 440],
    ]),
  );
}
