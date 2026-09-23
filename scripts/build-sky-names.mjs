#!/usr/bin/env node
/* eslint-disable no-console */
// Builds app/data/sky/constellation-names.json from d3-celestial
// constellations.json (BSD-3-Clause, © Olaf Frohn): IAU name and a label
// point per constellation. Uses properties.name (the IAU English/ASCII
// form, e.g. "Ursa Major") rather than properties.la (classical Latin
// spellings such as "Ursa Maior" with irregular whitespace, which the
// print font may not render and customers would read as typos). The
// source is cached in data/sky-sources/ (gitignored); the derived JSON is
// committed.
//
//   node scripts/build-sky-names.mjs
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const SOURCE =
  'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.json';
const SRC_DIR = resolve('data/sky-sources');
const OUT = resolve('app/data/sky/constellation-names.json');
mkdirSync(SRC_DIR, {recursive: true});

const cached = resolve(SRC_DIR, 'constellations.json');
if (!existsSync(cached)) {
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`${SOURCE} → ${res.status}`);
  writeFileSync(cached, Buffer.from(await res.arrayBuffer()));
}

const geo = JSON.parse(readFileSync(cached, 'utf8'));
const r2 = (n) => Math.round(n * 100) / 100;
// d3-celestial's properties.name is the IAU name for every constellation
// except Corona Australis, which it lists under its older name.
const IAU_OVERRIDES = {'Corona Austrina': 'Corona Australis'};
const seen = new Set();
const data = [];
for (const feature of geo.features) {
  let name = feature.properties.name;
  if (!name) continue;
  name = name.replace(/\s+/g, ' ').trim();
  name = IAU_OVERRIDES[name] || name;
  if (seen.has(name)) continue;
  seen.add(name);
  const [ra, dec] = feature.geometry.coordinates;
  data.push([
    feature.id,
    name,
    r2((ra + 360) % 360),
    r2(dec),
    Number(feature.properties.rank) || 3,
  ]);
}
data.sort((a, b) => a[0].localeCompare(b[0]));
writeFileSync(
  OUT,
  JSON.stringify({
    source: 'd3-celestial constellations.json (BSD-3-Clause, (c) Olaf Frohn)',
    count: data.length,
    data,
  }),
);
console.log(`constellation names ${data.length}`);
/* eslint-enable no-console */
