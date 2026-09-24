#!/usr/bin/env node
/* eslint-disable no-console */
// Renders SkySvg to static markup for every layout × style (details off and
// all on, both sizes) and prints one SHA-256 over all of it. Run before and
// after a refactor of app/lib/sky/svg.tsx: the hashes must match.
//
//   node scripts/sky-svg-fingerprint.mjs
import {createHash} from 'node:crypto';
import {mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import esbuild from 'esbuild';
import {loadSkyCatalogSync} from './lib/sky-catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = path.join(root, 'output', 'sky-fingerprint');
mkdirSync(buildDir, {recursive: true});
const bundle = await esbuild.build({
  bundle: true,
  entryPoints: [path.join(root, 'scripts', 'lib', 'your-sky-render.mjs')],
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
const hash = createHash('sha256');
let cases = 0;
for (const size of ['8x10', '20x24']) {
  for (const layout of ['classic', 'compass', 'full', 'minimal']) {
    for (const theme of ['linen', 'midnight-garden', 'quiet-form']) {
      for (const details of ['none', 'names,grid,time']) {
        const {svg} = renderSkySvg({
          catalog,
          params: {
            date: '2019-06-14',
            time: '22:00',
            lat: 48.8566,
            lon: 2.3522,
            tz: 'Europe/Paris',
            place: 'Paris, France',
            title: 'The night we met',
            theme,
            layout,
            details,
          },
          plateDataUrl: null,
          size,
          theme,
        });
        hash.update(svg);
        cases += 1;
      }
    }
  }
}
console.log(`${cases} cases ${hash.digest('hex')}`);
/* eslint-enable no-console */
