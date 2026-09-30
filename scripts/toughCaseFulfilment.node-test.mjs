import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import sharp from 'sharp';

import manifest from '../data/art-tough-phone-case.json' with {type: 'json'};
import {buildProdigiOrderFromShopify} from '../app/lib/sky/fulfilment.ts';
import {
  TOUGH_CASE_DESIGNS,
  TOUGH_CASE_PHONES,
  TOUGH_CASE_TEASER_ARTWORKS,
  toughCaseArtworkSlug,
  toughCaseVariantForSku,
} from '../app/lib/toughCase.ts';
import {toughCaseArtworkSlug as generatorSlug} from './generate-tough-case-assets.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SECRET = 'test-secret-at-least-32-characters-long!!';
const ORIGIN = 'https://shopclaramendes.com';

function order(lineItems) {
  return {
    id: 7001,
    name: '#2077',
    email: 'eva@example.com',
    phone: null,
    shipping_address: {
      name: 'Eva Papadopoulou',
      address1: 'Ermou 10',
      address2: '',
      city: 'Athens',
      province: null,
      zip: '10563',
      country_code: 'GR',
      phone: null,
    },
    line_items: lineItems,
  };
}

test('a phone case line becomes a Prodigi item with the device SKU, attributes and artwork file', async () => {
  const build = await buildProdigiOrderFromShopify(
    order([
      {id: 1, sku: 'CM-MG-02-TC-IPHONE-16-PRO', quantity: 2, properties: []},
    ]),
    {secret: SECRET, origin: ORIGIN},
  );
  assert.equal(build.kind, 'order');
  assert.equal(build.payload.idempotencyKey, 'shopify:7001');
  assert.equal(build.payload.shippingMethod, 'Standard');
  assert.deepEqual(build.payload.items, [
    {
      merchantReference: 'line:1',
      sku: 'GLOBAL-TECH-IP16PR-TCB-CS-M',
      copies: 2,
      sizing: 'fillPrintArea',
      attributes: {
        brand: 'Apple',
        finish: 'matte',
        size: 'iphone 16 pro',
        style: 'Tough',
      },
      assets: [
        {
          printArea: 'default',
          url: 'https://shopclaramendes.com/print-files/tough-case/midnight-garden-02.jpg',
        },
      ],
    },
  ]);
});

test('prints stay with the Prodigi app while cases in the same order go to the API', async () => {
  const build = await buildProdigiOrderFromShopify(
    order([
      {id: 1, sku: 'CM-MG-02-16X20', quantity: 1, properties: []},
      {id: 2, sku: 'cm-ls-04-tc-samsung-galaxy-s23-fe', quantity: 1, properties: []},
    ]),
    {secret: SECRET, origin: ORIGIN},
  );
  assert.equal(build.kind, 'order');
  assert.equal(build.payload.items.length, 1);
  const [item] = build.payload.items;
  assert.equal(item.merchantReference, 'line:2');
  assert.equal(item.sku, 'GLOBAL-TECH-SGS23FE-TCB-CS-M');
  assert.equal(item.attributes.size, 'galaxy s23 fan edition');
  assert.match(item.assets[0].url, /\/print-files\/tough-case\/fern-in-shadow\.jpg$/);
});

test('orders with no case or personalised lines are skipped', async () => {
  const build = await buildProdigiOrderFromShopify(
    order([
      {id: 1, sku: 'CM-MG-02-16X20', quantity: 1, properties: []},
      {id: 2, sku: 'CM-MG-02-TC-NOKIA-3310', quantity: 1, properties: []},
    ]),
    {secret: SECRET, origin: ORIGIN},
  );
  assert.equal(build.kind, 'skip');
});

test('a case order without a usable address is a problem, not a silent skip', async () => {
  const build = await buildProdigiOrderFromShopify(
    {
      ...order([{id: 1, sku: 'CM-QF-01-TC-IPHONE-15', quantity: 1, properties: []}]),
      shipping_address: null,
    },
    {secret: SECRET, origin: ORIGIN},
  );
  assert.equal(build.kind, 'problem');
});

test('every one of the 960 Shopify variant SKUs maps to a verified matte tough case', () => {
  assert.equal(TOUGH_CASE_DESIGNS.length, 24);
  assert.equal(TOUGH_CASE_PHONES.length, 40);
  const prodigiSkus = new Set();
  let mapped = 0;
  for (const design of manifest.designs) {
    for (const phone of manifest.phones) {
      const variant = toughCaseVariantForSku(`${design.skuPrefix}-TC-${phone.code}`);
      assert.ok(variant, `${design.skuPrefix} × ${phone.code}`);
      assert.equal(variant.design.title, design.title);
      assert.equal(variant.phone.label, phone.label);
      assert.match(variant.phone.prodigiSku, /^GLOBAL-TECH-[A-Z0-9]+-TCB-CS-M$/);
      assert.deepEqual(Object.keys(variant.phone.prodigiAttributes).sort(), [
        'brand',
        'finish',
        'size',
        'style',
      ]);
      assert.equal(variant.phone.prodigiAttributes.finish, 'matte');
      assert.equal(variant.phone.prodigiAttributes.style, 'Tough');
      prodigiSkus.add(variant.phone.prodigiSku);
      mapped += 1;
    }
  }
  assert.equal(mapped, 960);
  assert.equal(prodigiSkus.size, 40);
});

test('the storefront and the asset generator agree on print file names', () => {
  for (const design of manifest.designs) {
    assert.equal(
      toughCaseArtworkSlug(design.sourceHandle),
      generatorSlug(design.sourceHandle),
    );
  }
  assert.equal(toughCaseArtworkSlug('midnight-garden-iii-art-print'), 'midnight-garden-03');
  assert.equal(toughCaseArtworkSlug('the-fold-art-print'), 'the-fold');
});

test('every artwork has a committed 4:5 print file that covers the largest print area', async () => {
  const largest = manifest.phones.reduce(
    (max, phone) => ({
      width: Math.max(max.width, phone.printArea.width),
      height: Math.max(max.height, phone.printArea.height),
    }),
    {width: 0, height: 0},
  );
  for (const design of TOUGH_CASE_DESIGNS) {
    const file = path.join(REPO_ROOT, 'public', design.printFilePath);
    assert.ok(existsSync(file), `${design.title}: ${design.printFilePath}`);
    const {width, height, format} = await sharp(file).metadata();
    assert.equal(format, 'jpeg');
    assert.equal(width * 5, height * 4, `${design.title} is not 4:5`);
    // Centre-cropping a 4:5 file to a taller device keeps the full height.
    assert.ok(height >= largest.height, `${design.title} height ${height}`);
    assert.ok((height * 4) / 5 >= largest.width, `${design.title} width`);
  }
});

test('every homepage teaser artwork is a released case artwork', () => {
  const titles = new Set(TOUGH_CASE_DESIGNS.map((design) => design.title));
  assert.ok(TOUGH_CASE_TEASER_ARTWORKS.length >= 3);
  for (const artwork of TOUGH_CASE_TEASER_ARTWORKS) {
    assert.ok(titles.has(artwork), `${artwork} is not a case artwork`);
  }
});
