import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import {
  PRINTFUL_FEE_REGIONS,
  PRINTFUL_SHIPPING_GROUPS,
  printfulFeeRegion,
  printfulShippingFee,
  printfulShippingGroup,
  shippingFeeText,
} from '../app/lib/printfulShipping.ts';
import {PRINTFUL_SHIPPING_FEES} from '../app/lib/printfulShippingFees.ts';
import {fixedShippingFee} from '../app/lib/fixedShippingFee.ts';

const garment = (handle, productType) => ({handle, productType, tags: []});
// EUR fees follow Printful's USD rates, so the page says "about".
const eur = (fee) => ({...fee, about: true});
const variant = (currencyCode, selectedOptions = []) => ({
  availableForSale: true,
  price: {amount: '50.00', currencyCode},
  selectedOptions,
});

test('Printful pieces map to the shipping groups their profiles charge alike', () => {
  const cases = [
    ['counter-diagonal-heavyweight-hoodie', 'Hoodies', 'hoodie'],
    ['free-abyss-heavyweight-crewneck', 'Sweatshirts', 'hoodie'],
    ['circle-rhythm-tee', 'T-Shirts', 'tee'],
    ['counter-diagonal-long-sleeve-tee', 'Long Sleeve Shirts', 'tee'],
    ['free-abyss-cap', 'Hats', 'cap'],
    ['free-abyss-beanie', 'Hats', 'light'],
    ['circle-rhythm-tote', 'Tote Bags', 'light'],
    ['counter-diagonal-leggings', 'Yoga Leggings', 'light'],
    ['free-abyss-fitted-tank', 'Studio Top', 'light'],
    ['the-great-wave-off-kanagawa-mug', 'Mugs', 'mug'],
    ['houses-at-murnau-blanket', 'Blankets', 'blanket'],
  ];
  for (const [handle, type, group] of cases)
    assert.equal(printfulShippingGroup(garment(handle, type)), group, handle);
  const cushion = garment('lozenge-composition-cushion', 'Cushions');
  assert.equal(printfulShippingGroup(cushion, [{name: 'Filling', value: 'Cover only'}]), 'light');
  assert.equal(printfulShippingGroup(cushion, [{name: 'Filling', value: 'With insert'}]), 'cushion-insert');
  // Prodigi lines, the retired Quiet Current and unknown garments get none.
  assert.equal(printfulShippingGroup(garment('where-mist-rests', 'Art Prints')), null);
  assert.equal(printfulShippingGroup(garment('great-wave-tough-case', 'Phone Cases')), null);
  assert.equal(printfulShippingGroup(garment('quiet-current-studio-tank', 'Studio Top')), null);
  assert.equal(printfulShippingGroup(garment('counter-diagonal-dress', 'Dresses')), null);
});

test('every EU country is one region; the table covers each group in the EU and the US', () => {
  assert.equal(PRINTFUL_FEE_REGIONS.EU.countries.length, 27);
  for (const country of ['CY', 'de', 'SK', 'SI', 'GR']) assert.equal(printfulFeeRegion(country), 'EU', country);
  assert.equal(printfulFeeRegion('US'), 'US');
  assert.equal(printfulFeeRegion('GB'), null);
  assert.equal(printfulFeeRegion('BR'), null);
  assert.equal(printfulFeeRegion(null), null);
  for (const group of PRINTFUL_SHIPPING_GROUPS) {
    assert.equal(PRINTFUL_SHIPPING_FEES[group]?.EU?.currencyCode, 'EUR', group);
    assert.equal(PRINTFUL_SHIPPING_FEES[group]?.US?.currencyCode, 'USD', group);
    for (const [region, fee] of Object.entries(PRINTFUL_SHIPPING_FEES[group])) {
      assert.ok(region in PRINTFUL_FEE_REGIONS, region);
      assert.match(fee.amount, /^\d+\.\d\d$/);
    }
  }
});

test('the fee follows the buyer: EUR in the EU, USD in the US, none where it cannot ship', () => {
  const hoodie = garment('counter-diagonal-heavyweight-hoodie', 'Hoodies');
  assert.deepEqual(printfulShippingFee(hoodie, variant('EUR'), 'CY'), eur(PRINTFUL_SHIPPING_FEES.hoodie.EU));
  assert.deepEqual(printfulShippingFee(hoodie, variant('EUR'), 'SK'), eur(PRINTFUL_SHIPPING_FEES.hoodie.EU));
  assert.deepEqual(printfulShippingFee(hoodie, variant('USD'), 'US'), PRINTFUL_SHIPPING_FEES.hoodie.US);
  // Not for sale in the buyer's market: no line.
  assert.equal(printfulShippingFee(hoodie, variant('EUR'), 'DE', {ships: false}), null);
  // No region (no rate quoted there) and a currency the buyer does not pay in.
  assert.equal(printfulShippingFee(hoodie, variant('EUR'), 'GB'), null);
  assert.equal(printfulShippingFee(hoodie, variant('EUR'), 'US'), null);
  assert.equal(printfulShippingFee(hoodie, null, 'CY'), null);
  // A Prodigi print gets no line from this table.
  assert.equal(printfulShippingFee(garment('where-mist-rests', 'Art Prints'), variant('EUR'), 'CY'), null);
  // The cushion fee follows the selected filling.
  const cushion = garment('lozenge-composition-cushion', 'Cushions');
  assert.deepEqual(
    printfulShippingFee(cushion, variant('EUR', [{name: 'Filling', value: 'With insert'}]), 'DE'),
    eur(PRINTFUL_SHIPPING_FEES['cushion-insert'].EU),
  );
  // Dollar rates are exact; euro amounts move with the exchange rate.
  assert.equal(shippingFeeText(printfulShippingFee(hoodie, variant('USD'), 'US')), `$${PRINTFUL_SHIPPING_FEES.hoodie.US.amount}`);
  assert.equal(shippingFeeText(printfulShippingFee(hoodie, variant('EUR'), 'CY')), `about €${PRINTFUL_SHIPPING_FEES.hoodie.EU.amount}`);
  assert.equal(shippingFeeText({amount: '16.00', currencyCode: 'EUR'}), '€16.00');
});

test('Prodigi lines show their flat EUR rate to EU buyers only', () => {
  const print = {productType: 'Art Prints'};
  const fee = (product, country, currencyCode = 'EUR') => fixedShippingFee(product, variant(currencyCode), country);
  // Checked against checkout carts on 2026-11-12.
  assert.deepEqual(fee(print, 'CY'), {amount: '3.99', currencyCode: 'EUR'});
  assert.deepEqual(fee(print, 'DE'), {amount: '16.00', currencyCode: 'EUR'});
  assert.deepEqual(fee({productType: 'Canvas Art'}, 'SK'), {amount: '16.00', currencyCode: 'EUR'});
  assert.deepEqual(fee({productType: 'Cards'}, 'SI'), {amount: '2.90', currencyCode: 'EUR'});
  assert.equal(shippingFeeText(fee(print, 'CY')), '€3.99');
  // The US pays a USD conversion the table does not hold; outside the EU no
  // row was checked; cases, pots and Your Sky have no checked row.
  assert.equal(fee(print, 'US', 'USD'), null);
  assert.equal(fee(print, 'CH'), null);
  assert.equal(fee({productType: 'Phone Cases'}, 'CY'), null);
  assert.equal(fee({productType: 'Plant Pots'}, 'CY'), null);
  assert.equal(fee({productType: 'Personalised Art'}, 'CY'), null);
  assert.equal(fixedShippingFee(print, {...variant('EUR'), availableForSale: false}, 'DE'), null);
});

/** Execute the real route loader; only rendering helpers are replaced. */
function loadRoute(name) {
  const path = resolve(`app/routes/${name}.tsx`);
  const localRequire = createRequire(path);
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022}}).outputText;
  const exports = {};
  const load = (specifier) => {
    if (specifier.startsWith('~/components/')) return {};
    if (specifier === '@shopify/hydrogen') return {getSelectedProductOptions: () => []};
    if (specifier.startsWith('~/lib/')) return localRequire(resolve(`app/${specifier.slice(2)}.ts`));
    return localRequire(specifier);
  };
  new Function('exports', 'require', output)(exports, load);
  return exports;
}

const approved = {type: 'boolean', value: 'true'};
function pdpProduct(handle, productType, currencyCode, options = [{name: 'Size', value: 'M'}]) {
  const selected = {
    id: `gid://shopify/ProductVariant/${handle}`,
    availableForSale: true,
    price: {amount: '60.00', currencyCode},
    compareAtPrice: null,
    selectedOptions: options,
    image: null,
    sku: 'SKU',
    title: 'M',
    product: {handle, title: handle},
  };
  return {
    __typename: 'Product', id: `gid://shopify/Product/${handle}`, handle, title: handle,
    vendor: 'Clara Mendes', productType, tags: [], description: '', descriptionHtml: '',
    storefrontApproved: approved, fulfillmentVerified: approved,
    collections: {nodes: []}, options: [], selectedOrFirstAvailableVariant: selected,
    variants: {nodes: [selected]}, images: {nodes: []}, galleryImages: {nodes: []},
  };
}

test('the product page loader shows the fee without any cart mutation', async () => {
  const route = loadRoute('products.$handle');
  const mutations = [];
  const load = (product, country) => route.loader({
    params: {handle: product.handle},
    request: new Request(`https://shopclaramendes.com/products/${product.handle}`),
    context: {
      env: {PUBLIC_STORE_DOMAIN: 'example.myshopify.com'},
      waitUntil: () => {},
      storefront: {
        i18n: {country, language: 'EN'},
        CacheShort: () => ({}),
        query: async (query) => {
          assert.doesNotMatch(query, /\bmutation\b|cartCreate/);
          return {product, relatedProducts: {nodes: []}, capsuleProducts: {nodes: []}, nodes: [], products: {nodes: [], pageInfo: {hasNextPage: false, endCursor: null}}};
        },
        mutate: async (mutation) => {
          mutations.push(mutation);
          throw new Error('A product page must not create a cart');
        },
      },
    },
  });

  const cy = await load(pdpProduct('counter-diagonal-heavyweight-hoodie', 'Hoodies', 'EUR'), 'CY');
  assert.deepEqual(cy.clothingShipping, eur(PRINTFUL_SHIPPING_FEES.hoodie.EU));
  const us = await load(pdpProduct('counter-diagonal-heavyweight-hoodie', 'Hoodies', 'USD'), 'US');
  assert.deepEqual(us.clothingShipping, PRINTFUL_SHIPPING_FEES.hoodie.US);
  const blanket = await load(pdpProduct('houses-at-murnau-blanket', 'Blankets', 'EUR', [{name: 'Size', value: '50 × 60 in'}]), 'DE');
  assert.deepEqual(blanket.clothingShipping, eur(PRINTFUL_SHIPPING_FEES.blanket.EU));
  const print = await load(pdpProduct('quiet-form-i-art-print', 'Art Prints', 'EUR', [{name: 'Size', value: '8 × 10 in'}]), 'DE');
  assert.deepEqual(print.clothingShipping, {amount: '16.00', currencyCode: 'EUR'});
  // A piece the buyer's market does not sell shows no fee line.
  const unsold = pdpProduct('counter-diagonal-heavyweight-hoodie', 'Hoodies', 'EUR');
  unsold.selectedOrFirstAvailableVariant.availableForSale = false;
  assert.equal((await load(unsold, 'SK')).clothingShipping, null);
  assert.deepEqual(mutations, []);
});

test('no page loader or component quotes a cart any more', () => {
  for (const file of ['app/routes/products.$handle.tsx', 'app/routes/collections.$handle.tsx', 'app/components/ApparelShipping.tsx']) {
    const source = readFileSync(resolve(file), 'utf8');
    assert.doesNotMatch(source, /\.mutate\(|cartCreate|clothingShipping\.server/, file);
  }
});
