#!/usr/bin/env node
/* eslint-disable no-console */
// Builds app/data/sky/*.json from public catalogues. Sources are cached in
// data/sky-sources/ (gitignored); the derived JSON is committed.
//
//   node scripts/build-sky-data.mjs
//
// Stars:   Yale Bright Star Catalogue v5 (public domain), mag ≤ 6.5
// Lines:   d3-celestial constellations.lines.json (BSD-3-Clause)
// Places:  GeoNames cities15000 (CC BY 4.0)
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';

const SOURCES = {
  stars:
    'https://raw.githubusercontent.com/aduboisforge/Bright-Star-Catalog-JSON/master/BSC.json',
  lines:
    'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.lines.json',
  cities: 'https://download.geonames.org/export/dump/cities15000.zip',
};
const SRC_DIR = resolve('data/sky-sources');
const OUT_DIR = resolve('app/data/sky');
mkdirSync(SRC_DIR, {recursive: true});
mkdirSync(OUT_DIR, {recursive: true});

async function fetchTo(url, file) {
  const target = resolve(SRC_DIR, file);
  if (existsSync(target)) return target;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  writeFileSync(target, Buffer.from(await res.arrayBuffer()));
  return target;
}

function hmsToDeg(hms) {
  const [h, m, s] = hms.split(':').map(Number);
  return (h + m / 60 + s / 3600) * 15;
}

function dmsToDeg(dms) {
  const sign = dms.trim().startsWith('-') ? -1 : 1;
  const [d, m, s] = dms.replace(/^[+-]/, '').split(':').map(Number);
  return sign * (d + m / 60 + s / 3600);
}

const r3 = (n) => Math.round(n * 1000) / 1000;
const r4 = (n) => Math.round(n * 1e4) / 1e4;

// --- Stars: flat [ra°, dec°, mag, ...] sorted bright → faint ---------------
const bsc = JSON.parse(
  readFileSync(await fetchTo(SOURCES.stars, 'BSC.json'), 'utf8'),
);
const stars = bsc
  .map((s) => ({ra: hmsToDeg(s.RA), dec: dmsToDeg(s.DEC), mag: Number(s.MAG)}))
  .filter(
    (s) => Number.isFinite(s.ra) && Number.isFinite(s.dec) && s.mag <= 6.5,
  )
  .sort((a, b) => a.mag - b.mag);
writeFileSync(
  resolve(OUT_DIR, 'stars.json'),
  JSON.stringify({
    source: 'Yale Bright Star Catalogue v5 (public domain)',
    count: stars.length,
    data: stars.flatMap((s) => [
      r3(s.ra),
      r3(s.dec),
      Math.round(s.mag * 100) / 100,
    ]),
  }),
);

// --- Constellation lines: RA from -180..180 → 0..360 ------------------------
const geo = JSON.parse(
  readFileSync(
    await fetchTo(SOURCES.lines, 'constellations.lines.json'),
    'utf8',
  ),
);
const lines = [];
for (const feature of geo.features) {
  for (const line of feature.geometry.coordinates) {
    for (let i = 1; i < line.length; i++) {
      const [ra1, dec1] = line[i - 1];
      const [ra2, dec2] = line[i];
      lines.push([
        r3((ra1 + 360) % 360),
        r3(dec1),
        r3((ra2 + 360) % 360),
        r3(dec2),
      ]);
    }
  }
}
writeFileSync(
  resolve(OUT_DIR, 'constellations.json'),
  JSON.stringify({
    source: 'd3-celestial constellations.lines.json (BSD-3-Clause)',
    count: lines.length,
    data: lines.flat(),
  }),
);

// --- Places: [name, ascii, cc, lat, lon, tzIndex, population, alternates] ---
// Alternate names (native spellings such as Lisboa, München, Αθήνα) are kept
// for cities people search in their own language: Latin-script alternates
// from 50k inhabitants, any script from 100k. GeoNames lists them roughly
// alphabetically, so no small cap — "Wien" sits 40th in Vienna's list.
const normalize = (t) =>
  t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
const LATIN = /^[a-z0-9 .'’-]+$/;
function pickAlternates(raw, name, ascii, population) {
  if (population < 50000 || !raw) return [];
  const seen = new Set([normalize(name), normalize(ascii)]);
  const out = [];
  for (const candidate of raw.split(',')) {
    const alt = candidate.trim();
    if (alt.length < 2 || alt.length > 40 || /^https?:/.test(alt)) continue;
    const key = normalize(alt);
    if (!key || seen.has(key)) continue;
    if (!LATIN.test(key) && population < 100000) continue;
    seen.add(key);
    out.push(alt);
    if (out.length >= 60) break;
  }
  return out;
}
const zip = await fetchTo(SOURCES.cities, 'cities15000.zip');
const txt = resolve(SRC_DIR, 'cities15000.txt');
if (!existsSync(txt)) execFileSync('unzip', ['-o', '-q', zip, '-d', SRC_DIR]);
const tzIndex = new Map();
const places = [];
for (const row of readFileSync(txt, 'utf8').split('\n')) {
  if (!row) continue;
  const c = row.split('\t');
  const tz = c[17];
  if (!tz) continue;
  if (!tzIndex.has(tz)) tzIndex.set(tz, tzIndex.size);
  const population = Number(c[14]) || 0;
  places.push([
    c[1],
    c[2],
    c[8],
    r4(+c[4]),
    r4(+c[5]),
    tzIndex.get(tz),
    population,
    pickAlternates(c[3], c[1], c[2], population),
  ]);
}
places.sort((a, b) => b[6] - a[6]);
writeFileSync(
  resolve(OUT_DIR, 'places.json'),
  JSON.stringify({
    source: 'GeoNames cities15000 (CC BY 4.0) https://www.geonames.org',
    tz: [...tzIndex.keys()],
    data: places,
  }),
);

console.log(
  `stars ${stars.length}, lines ${lines.length}, places ${places.length}`,
);
/* eslint-enable no-console */
