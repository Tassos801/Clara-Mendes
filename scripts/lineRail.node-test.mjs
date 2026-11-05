import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SKY_PRODUCT_HANDLE} from '../app/lib/catalogFilters.ts';
import {LINE_RAIL_ENTRIES, lineRailEntries} from '../app/lib/lineRail.ts';
import {TOUGH_CASE_HANDLE} from '../app/lib/toughCase.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const LABELS = [
  'Prints',
  'Artists',
  'Clothing',
  'Book Nooks',
  'Cases',
  'Your Sky',
  'Pots',
];

const POT_HANDLE = JSON.parse(
  readFileSync(path.join(ROOT, 'data/pastel-plant-pots.json'), 'utf8'),
).designs[0].handle;

const keys = (entries) => entries.map((entry) => entry.key);

test('the live rail: unique keys, prints first, site links, sized images', () => {
  const entryKeys = keys(LINE_RAIL_ENTRIES);
  assert.equal(new Set(entryKeys).size, entryKeys.length);
  assert.equal(entryKeys[0], 'prints');
  assert.ok(entryKeys.includes('prints'));
  assert.ok(entryKeys.includes('clothing'));
  for (const entry of LINE_RAIL_ENTRIES) {
    assert.match(entry.href, /^\//, `${entry.key} links inside the site`);
    assert.match(
      entry.image.src,
      /^(\/images\/|https:\/\/cdn\.shopify\.com\/)/,
      `${entry.key} image is local or on the Shopify CDN`,
    );
    assert.ok(entry.image.width > 0 && entry.image.height > 0);
  }
});

test('labels are sentence case and keep the rail order', () => {
  const positions = LINE_RAIL_ENTRIES.map((entry) =>
    LABELS.indexOf(entry.label),
  );
  assert.ok(
    positions.every((position) => position >= 0),
    'known labels',
  );
  assert.deepEqual(
    positions,
    [...positions].sort((a, b) => a - b),
  );
});

test('an unreleased line never appears', () => {
  assert.ok(!keys(lineRailEntries({artists: 0})).includes('artists'));
  assert.ok(!keys(lineRailEntries({bookNooks: 0})).includes('book-nooks'));
  const noProducts = keys(lineRailEntries({productFlags: {}}));
  assert.ok(!noProducts.includes('cases'));
  assert.ok(!noProducts.includes('pots'));
  assert.ok(
    !keys(lineRailEntries({personalisedFlags: {}})).includes('your-sky'),
  );
});

test('every line released gives the full rail in order', () => {
  const entries = lineRailEntries({
    artists: 1,
    bookNooks: 1,
    productFlags: {[TOUGH_CASE_HANDLE]: true, [POT_HANDLE]: true},
    personalisedFlags: {[SKY_PRODUCT_HANDLE]: true},
  });
  assert.deepEqual(keys(entries), [
    'prints',
    'artists',
    'clothing',
    'book-nooks',
    'cases',
    'your-sky',
    'pots',
  ]);
  assert.deepEqual(
    entries.map((entry) => entry.label),
    LABELS,
  );
});

test('the rail component swipes on phones and names links by label', () => {
  const source = readFileSync(
    path.join(ROOT, 'app/components/LineRail.tsx'),
    'utf8',
  );
  assert.match(source, /scroll-snap-type: x mandatory/);
  assert.match(source, /overflow-x: auto/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /alt=""/);
  assert.match(source, /aria-label="Shop by line"/);
  assert.match(source, /suppressHydrationWarning/);
  assert.match(source, /loading=\{index < 2 \? 'eager' : 'lazy'\}/);
});
