#!/usr/bin/env node
/* eslint-disable no-console */
// Owner review sheet: every layout × style from the real SVG renderer
// (plus a Classic column with every detail on), and two sample print PDFs.
// Writes to output/your-sky/review/ (gitignored).
//
//   node scripts/render-sky-review.mjs
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import esbuild from 'esbuild';
import sharp from 'sharp';
import {computeSky} from '../app/lib/sky/scene.ts';
import {validateSkyParams} from '../app/lib/sky/params.ts';
import {renderSkyPdf} from '../app/lib/sky/pdf.server.ts';
import {SKY_THEMES} from '../app/lib/sky/themes.ts';
import {loadSkyCatalogSync} from './lib/sky-catalog.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(repoRoot, 'output', 'your-sky', 'review');
mkdirSync(outDir, {recursive: true});

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
const rendererPath = path.join(outDir, 'render.mjs');
writeFileSync(rendererPath, bundle.outputFiles[0].text);
const {renderSkySvg} = await import(pathToFileURL(rendererPath).href);

const catalog = loadSkyCatalogSync();
const plateUrl = (theme) =>
  `data:image/jpeg;base64,${readFileSync(path.join(repoRoot, 'public', 'sky', 'plates', `${theme}-preview.jpg`)).toString('base64')}`;
const base = {
  date: '2019-06-14',
  time: '22:00',
  lat: 48.8566,
  lon: 2.3522,
  tz: 'Europe/Paris',
  place: 'Paris, France',
  title: 'The night we met',
};
const COLUMNS = [
  {layout: 'classic', details: ''},
  {layout: 'compass', details: ''},
  {layout: 'full', details: ''},
  {layout: 'minimal', details: ''},
  {layout: 'classic', details: 'names,grid,time'},
];
const THEMES = ['linen', 'midnight-garden', 'quiet-form'];
const CELL_W = 480;
const CELL_H = 600;

const tiles = [];
for (const [row, theme] of THEMES.entries()) {
  for (const [col, column] of COLUMNS.entries()) {
    const {svg} = renderSkySvg({
      catalog,
      params: {...base, theme, ...column},
      plateDataUrl: plateUrl(theme),
      size: '8x10',
      theme,
    });
    const png = await sharp(Buffer.from(svg), {density: 144})
      .resize(CELL_W, CELL_H)
      .png()
      .toBuffer();
    writeFileSync(path.join(outDir, `${theme}-${column.layout}${column.details ? '-details' : ''}.png`), png);
    tiles.push({input: png, left: col * CELL_W, top: row * CELL_H});
  }
}
await sharp({
  create: {
    width: CELL_W * COLUMNS.length,
    height: CELL_H * THEMES.length,
    channels: 3,
    background: '#ffffff',
  },
})
  .composite(tiles)
  .png()
  .toFile(path.join(outDir, 'sheet.png'));

const fonts = {
  regular: new Uint8Array(readFileSync(path.join(repoRoot, 'public/fonts/EBGaramond-Regular.ttf'))),
  italic: new Uint8Array(readFileSync(path.join(repoRoot, 'public/fonts/EBGaramond-Italic.ttf'))),
};
for (const sample of [
  {size: '20x24', theme: 'linen', layout: 'compass', details: 'names,grid,time'},
  {size: '8x10', theme: 'midnight-garden', layout: 'full', details: 'names'},
]) {
  const params = validateSkyParams({...base, ...sample}).params;
  const scene = computeSky({params, size: sample.size, catalog});
  const plate = new Uint8Array(
    readFileSync(path.join(repoRoot, 'public', 'sky', 'plates', `${sample.theme}-${sample.size}.jpg`)),
  );
  const pdf = await renderSkyPdf({
    scene,
    theme: SKY_THEMES[sample.theme],
    fonts,
    plate,
    createdAt: new Date('2019-06-14T00:00:00Z'),
  });
  writeFileSync(path.join(outDir, `${sample.theme}-${sample.layout}-${sample.size}.pdf`), pdf);
}
console.log(`Review sheet and sample PDFs in ${outDir}`);
/* eslint-enable no-console */
