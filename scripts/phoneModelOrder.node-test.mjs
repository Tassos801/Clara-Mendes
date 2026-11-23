import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import test from 'node:test';

import manifest from '../data/art-tough-phone-case.json' with {type: 'json'};
import {TOUGH_CASE_PHONES, toughCasePhoneGroups} from '../app/lib/toughCase.ts';

const labels = (group) => group.phones.map((phone) => phone.label);

test('the phone list runs by generation, then by model tier, inside each brand', () => {
  const [iphone, galaxy, pixel] = toughCasePhoneGroups();
  assert.deepEqual(labels(iphone), [
    'iPhone 13',
    'iPhone 13 Mini',
    'iPhone 13 Pro',
    'iPhone 13 Pro Max',
    'iPhone 14',
    'iPhone 14 Plus',
    'iPhone 14 Pro',
    'iPhone 14 Pro Max',
    'iPhone 15',
    'iPhone 15 Plus',
    'iPhone 15 Pro',
    'iPhone 15 Pro Max',
    'iPhone 16',
    'iPhone 16e',
    'iPhone 16 Plus',
    'iPhone 16 Pro',
    'iPhone 16 Pro Max',
    'iPhone 17',
    'iPhone 17 Pro',
    'iPhone 17 Pro Max',
    'iPhone 18 Pro',
    'iPhone 18 Pro Max',
  ]);
  assert.deepEqual(labels(galaxy), [
    'Samsung Galaxy S23',
    'Samsung Galaxy S23 FE',
    'Samsung Galaxy S23 Plus',
    'Samsung Galaxy S23 Ultra',
    'Samsung Galaxy S24',
    'Samsung Galaxy S24 Plus',
    'Samsung Galaxy S24 Ultra',
    'Samsung Galaxy S25',
    'Samsung Galaxy S25 Plus',
    'Samsung Galaxy S25 Ultra',
    'Samsung Galaxy S26',
    'Samsung Galaxy S26 Plus',
    'Samsung Galaxy S26 Ultra',
  ]);
  assert.deepEqual(labels(pixel), [
    'Google Pixel 8',
    'Google Pixel 8 Pro',
    'Google Pixel 9',
    'Google Pixel 9 Pro',
    'Google Pixel 9 Pro XL',
  ]);
});

test('the order is for display only: every model is listed once and the manifest is untouched', () => {
  const shown = toughCasePhoneGroups().flatMap(labels);
  assert.equal(shown.length, manifest.phones.length);
  assert.deepEqual(
    [...shown].sort(),
    manifest.phones.map((phone) => phone.label).sort(),
  );
  // The pipeline checks Shopify variants against manifest order.
  assert.deepEqual(
    TOUGH_CASE_PHONES.map((phone) => phone.code),
    manifest.phones.map((phone) => phone.code),
  );
});

test('a model the tiers do not know keeps its place after the known ones', () => {
  const phone = (label) => ({
    label,
    code: label,
    brand: 'Apple',
    prodigiSku: 'X',
    prodigiAttributes: {},
  });
  const [group] = toughCasePhoneGroups(null, [
    phone('iPhone 19 Fold'),
    phone('iPhone 19 Air'),
    phone('iPhone 19 Pro'),
    phone('iPhone 19'),
    phone('iPhone SE'),
    phone('iPhone 18 Pro'),
  ]);
  assert.deepEqual(labels(group), [
    'iPhone 18 Pro',
    'iPhone 19',
    'iPhone 19 Pro',
    'iPhone 19 Fold',
    'iPhone 19 Air',
    'iPhone SE',
  ]);
});

test('every page title that names the shop ends with it', () => {
  const routes = new URL('../app/routes/', import.meta.url);
  const leading = readdirSync(routes)
    .filter((name) => name.endsWith('.tsx'))
    .filter((name) =>
      /title: [`'"]Clara Mendes \|/.test(
        readFileSync(new URL(name, routes), 'utf8'),
      ),
    );
  assert.deepEqual(leading, []);
  assert.ok(
    readFileSync(new URL('cart.tsx', routes), 'utf8').includes(
      "title: 'Cart | Clara Mendes'",
    ),
  );
});
