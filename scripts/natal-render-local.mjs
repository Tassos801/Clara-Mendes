#!/usr/bin/env node
/* eslint-disable no-console */
// Render a First Light birth poster to PDF locally for QA.
//
//   node scripts/natal-render-local.mjs --name "Amélie" --date 2026-05-14 \
//     --time 07:32 --lat 52.52 --lon 13.405 --tz Europe/Berlin \
//     --place "Berlin, Germany" --details "3.4 kg · 51 cm" --theme linen \
//     --size 8x10 --out output/natal/test.pdf
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {parseArgs} from 'node:util';
import {validateNatalParams} from '../app/lib/natal/params.ts';
import {renderNatalPdf} from '../app/lib/natal/pdf.server.ts';
import {computeNatal} from '../app/lib/natal/scene.ts';
import {SKY_THEMES} from '../app/lib/sky/themes.ts';
import {loadSkyCatalogSync} from './lib/sky-catalog.mjs';

const {values: a} = parseArgs({
  options: {
    name: {type: 'string'},
    date: {type: 'string'},
    time: {type: 'string', default: ''},
    lat: {type: 'string'},
    lon: {type: 'string'},
    tz: {type: 'string'},
    place: {type: 'string'},
    details: {type: 'string', default: ''},
    theme: {type: 'string', default: 'linen'},
    size: {type: 'string', default: '8x10'},
    out: {type: 'string', default: 'output/natal/render.pdf'},
    'no-plate': {type: 'boolean', default: false},
  },
});

const v = validateNatalParams(a);
if (!v.ok) {
  console.error(v.error);
  process.exit(1);
}
if (!['8x10', '20x24'].includes(a.size)) {
  console.error('--size must be 8x10 or 20x24');
  process.exit(1);
}

const scene = computeNatal({
  params: v.params,
  size: a.size,
  catalog: loadSkyCatalogSync(),
});
const pdf = await renderNatalPdf({
  scene,
  theme: SKY_THEMES[v.params.theme],
  fonts: {
    regular: new Uint8Array(readFileSync('public/fonts/EBGaramond-Regular.ttf')),
    italic: new Uint8Array(readFileSync('public/fonts/EBGaramond-Italic.ttf')),
  },
  plate: a['no-plate']
    ? null
    : new Uint8Array(
        readFileSync(`public/sky/plates/${v.params.theme}-${a.size}.jpg`),
      ),
  createdAt: new Date(`${v.params.date}T00:00:00Z`),
});
mkdirSync(dirname(a.out), {recursive: true});
writeFileSync(a.out, pdf);
console.log(
  `${a.out} (${(pdf.byteLength / 1024).toFixed(0)} KB, ${scene.stars.length} stars, ${scene.lines.length} lines, moon ${scene.moon ? 'up' : 'down'})`,
);
/* eslint-enable no-console */
