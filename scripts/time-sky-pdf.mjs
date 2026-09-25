#!/usr/bin/env node
/* eslint-disable no-console */
// Local render timing for the heaviest print: 20×24, Compass, every detail.
// Budget from the spec: < 2 s per render (Oxygen runs the same V8 code).
//
//   node scripts/time-sky-pdf.mjs
import {readFileSync} from 'node:fs';
import {computeSky} from '../app/lib/sky/scene.ts';
import {validateSkyParams} from '../app/lib/sky/params.ts';
import {renderSkyPdf} from '../app/lib/sky/pdf.server.ts';
import {SKY_THEMES} from '../app/lib/sky/themes.ts';
import {loadSkyCatalogSync} from './lib/sky-catalog.mjs';

const catalog = loadSkyCatalogSync();
const fonts = {
  regular: new Uint8Array(readFileSync('public/fonts/EBGaramond-Regular.ttf')),
  italic: new Uint8Array(readFileSync('public/fonts/EBGaramond-Italic.ttf')),
};
const plate = new Uint8Array(readFileSync('public/sky/plates/linen-20x24.jpg'));
const params = validateSkyParams({
  date: '2019-06-14',
  time: '22:00',
  lat: 48.8566,
  lon: 2.3522,
  tz: 'Europe/Paris',
  place: 'Paris, France',
  title: 'The night we met',
  theme: 'linen',
  layout: 'compass',
  details: 'names,grid,time',
}).params;
const times = [];
let bytes = 0;
for (let i = 0; i < 6; i++) {
  const start = performance.now();
  const scene = computeSky({params, size: '20x24', catalog});
  const pdf = await renderSkyPdf({scene, theme: SKY_THEMES.linen, fonts, plate, createdAt: new Date(0)});
  times.push(performance.now() - start);
  bytes = pdf.byteLength;
}
const warm = times.slice(1).sort((a, b) => a - b);
console.log(
  `20x24 compass+details: ${(bytes / 1024).toFixed(0)} KB; cold ${times[0].toFixed(0)} ms; warm median ${warm[2].toFixed(0)} ms`,
);
if (warm[2] > 2000) process.exitCode = 1;
/* eslint-enable no-console */
