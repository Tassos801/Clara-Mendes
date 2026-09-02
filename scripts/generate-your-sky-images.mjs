#!/usr/bin/env node
/* eslint-disable no-console */

// Renders the four static images for /your-sky from the real sky engine:
// the hero (the linen print in a natural frame on a night wall, with faint
// constellation lines behind it) and three occasion skies. Deterministic;
// outputs are committed under public/images/your-sky/.
//
//   node scripts/generate-your-sky-images.mjs

import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import esbuild from 'esbuild';
import sharp from 'sharp';
import {
  ART_HEIGHT,
  ART_WIDTH,
  buildFrameSections,
  FRAME_FACE_PX,
} from './generate-classic-frame-mockups.mjs';
import {loadSkyCatalogSync} from './lib/sky-catalog.mjs';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const outDir = path.join(repoRoot, 'public', 'images', 'your-sky');
const buildDir = path.join(repoRoot, 'output', 'your-sky');
mkdirSync(outDir, {recursive: true});
mkdirSync(buildDir, {recursive: true});

// Bundle the renderer once (its SkySvg import is TSX; esbuild ships with vite).
const bundle = await esbuild.build({
  bundle: true,
  entryPoints: [path.join(repoRoot, 'scripts', 'lib', 'your-sky-render.mjs')],
  format: 'esm',
  jsx: 'automatic',
  packages: 'external',
  platform: 'node',
  target: 'node22',
  write: false,
});
const rendererPath = path.join(buildDir, 'render.mjs');
writeFileSync(rendererPath, bundle.outputFiles[0].text);
const {renderSkySvg} = await import(pathToFileURL(rendererPath).href);

const catalog = loadSkyCatalogSync();
const plate = readFileSync(
  path.join(repoRoot, 'public', 'sky', 'plates', 'linen-preview.jpg'),
);
const plateDataUrl = `data:image/jpeg;base64,${plate.toString('base64')}`;

function plateDataUrlFor(theme) {
  const file = readFileSync(
    path.join(repoRoot, 'public', 'sky', 'plates', `${theme}-preview.jpg`),
  );
  return `data:image/jpeg;base64,${file.toString('base64')}`;
}

const PARIS = {
  lat: 48.8566,
  lon: 2.3522,
  tz: 'Europe/Paris',
  place: 'Paris, France',
};
const LISBON = {
  lat: 38.7223,
  lon: -9.1393,
  tz: 'Europe/Lisbon',
  place: 'Lisbon, Portugal',
};
const SANTORINI = {
  lat: 36.3932,
  lon: 25.4615,
  tz: 'Europe/Athens',
  place: 'Santorini, Greece',
};

const SKIES = {
  hero: {
    ...PARIS,
    date: '2019-06-14',
    time: '22:00',
    title: 'The night we met',
    theme: 'linen',
  },
  'occasion-met': {
    ...PARIS,
    date: '2019-06-14',
    time: '22:00',
    title: 'The night we met',
    theme: 'linen',
  },
  'occasion-born': {
    ...LISBON,
    date: '2023-03-02',
    time: '06:40',
    title: 'The morning she was born',
    theme: 'linen',
  },
  'occasion-yes': {
    ...SANTORINI,
    date: '2021-09-18',
    time: '20:30',
    title: 'Where you said yes',
    theme: 'linen',
  },
};

async function printPng(key, width, theme = SKIES[key].theme) {
  const {scene, svg} = renderSkySvg({
    catalog,
    params: {...SKIES[key], theme},
    plateDataUrl: theme === 'linen' ? plateDataUrl : plateDataUrlFor(theme),
    size: '8x10',
    theme,
  });
  const png = await sharp(Buffer.from(svg), {density: 300})
    .resize({width})
    .png()
    .toBuffer();
  return {png, scene};
}

// Occasion cards: the print itself, 800px wide.
// Style swatches: the example sky on each plate, 320px wide.
for (const theme of ['linen', 'midnight-garden', 'quiet-form']) {
  const {png} = await printPng('hero', 320, theme);
  const out = path.join(outDir, `style-${theme}.webp`);
  await sharp(png).webp({quality: 84}).toFile(out);
  console.log('wrote', path.relative(repoRoot, out));
}

for (const key of ['occasion-met', 'occasion-born', 'occasion-yes']) {
  const {png} = await printPng(key, 800);
  const out = path.join(outDir, `${key}.webp`);
  await sharp(png).webp({quality: 84}).toFile(out);
  console.log('wrote', path.relative(repoRoot, out));
}

// Hero: the print inside Prodigi's Natural classic frame — the same frame
// sections and 20 mm face the classic-frame mockups use — on a night wall
// with faint constellation lines and a soft shadow.
{
  const W = 2400;
  const H = 1500;
  const {png, scene} = await printPng('hero', ART_WIDTH);
  const meta = await sharp(png).metadata();
  const art = await sharp(png)
    .resize(ART_WIDTH, ART_HEIGHT, {fit: 'cover'})
    .removeAlpha()
    .png()
    .toBuffer();
  const sections = await buildFrameSections();
  const f = FRAME_FACE_PX;
  const outerRight = f + ART_WIDTH;
  const outerBottom = f + ART_HEIGHT;
  const framedFull = await sharp({
    create: {
      width: ART_WIDTH + f * 2,
      height: ART_HEIGHT + f * 2,
      channels: 4,
      background: {r: 0, g: 0, b: 0, alpha: 0},
    },
  })
    .composite([
      {input: art, left: f, top: f},
      {input: sections.topLeft, left: 0, top: 0},
      {input: sections.top, left: f, top: 0},
      {input: sections.topRight, left: outerRight, top: 0},
      {input: sections.left, left: 0, top: f},
      {input: sections.right, left: outerRight, top: f},
      {input: sections.bottomLeft, left: 0, top: outerBottom},
      {input: sections.bottom, left: f, top: outerBottom},
      {input: sections.bottomRight, left: outerRight, top: outerBottom},
    ])
    .png()
    .toBuffer();
  // Scale the framed print to sit inside the 1500px-tall hero canvas.
  const framed = await sharp(framedFull)
    .resize({height: 1180})
    .png()
    .toBuffer();
  const framedMeta = await sharp(framed).metadata();
  const left = Math.round(W * 0.66 - framedMeta.width / 2);
  const top = Math.round((H - framedMeta.height) / 2);

  // Constellation lines from the same scene, scaled onto the canvas.
  const scale = (W * 0.9) / scene.width;
  const lines = scene.lines
    .map(
      (line) =>
        `<line x1="${(line.x1 * scale).toFixed(1)}" y1="${(line.y1 * scale + 40).toFixed(1)}" x2="${(line.x2 * scale).toFixed(1)}" y2="${(line.y2 * scale + 40).toFixed(1)}"/>`,
    )
    .join('');
  const background = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs>
        <radialGradient id="g" cx="62%" cy="48%" r="70%">
          <stop offset="0" stop-color="#22304a"/>
          <stop offset="0.48" stop-color="#141b2b"/>
          <stop offset="1" stop-color="#0c111c"/>
        </radialGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#g)"/>
      <g stroke="#b08d57" stroke-opacity="0.22" stroke-width="2" fill="none" transform="translate(${W * 0.05},0)">${lines}</g>
    </svg>`,
  );
  const shadow = await sharp({
    create: {
      width: framedMeta.width + 120,
      height: framedMeta.height + 120,
      channels: 4,
      background: {r: 0, g: 0, b: 0, alpha: 0},
    },
  })
    .composite([
      {
        input: {
          create: {
            width: framedMeta.width,
            height: framedMeta.height,
            channels: 4,
            background: {r: 0, g: 0, b: 0, alpha: 0.7},
          },
        },
        left: 60,
        top: 80,
      },
    ])
    .blur(40)
    .png()
    .toBuffer();
  const out = path.join(outDir, 'hero-print.webp');
  await sharp(background)
    .composite([
      {input: shadow, left: left - 60, top: top - 60},
      {input: framed, left, top},
    ])
    .webp({quality: 82})
    .toFile(out);
  console.log(
    'wrote',
    path.relative(repoRoot, out),
    `${meta.width}x${meta.height} print`,
  );
}

/* eslint-enable no-console */
