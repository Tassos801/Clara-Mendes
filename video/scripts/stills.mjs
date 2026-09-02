#!/usr/bin/env node
// Renders review stills for a list of frames with ONE bundle and ONE browser,
// instead of re-bundling per `remotion still` call.
//
//   node scripts/stills.mjs                 # the 18 review frames from the plan
//   node scripts/stills.mjs 48 300 1026     # specific frames
import path from 'node:path';
import {mkdir} from 'node:fs/promises';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'out', 'stills');
const DEFAULT_FRAMES = [
  48, 138, 222, 300, 326, 372, 398, 444, 470, 516, 542, 588, 614, 672, 762, 846, 930, 1026,
];
const frames = process.argv.slice(2).length
  ? process.argv.slice(2).map((value) => Number(value))
  : DEFAULT_FRAMES;

await mkdir(OUT, {recursive: true});
const serveUrl = await bundle({
  entryPoint: path.join(ROOT, 'src', 'index.ts'),
  publicDir: path.join(ROOT, '..', 'public'),
});
const composition = await selectComposition({serveUrl, id: 'IntroducingClaraMendes'});

for (const frame of frames) {
  const output = path.join(OUT, `frame-${frame}.jpg`);
  await renderStill({
    composition,
    serveUrl,
    output,
    frame,
    scale: 0.5,
    imageFormat: 'jpeg',
    jpegQuality: 90,
  });
  console.log(`rendered ${path.relative(ROOT, output)}`);
}
