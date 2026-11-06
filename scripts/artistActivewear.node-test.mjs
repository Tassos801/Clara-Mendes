import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {
  buildClothingSearchQuery,
  clothingCategories,
  clothingCategoryGroup,
  clothingLineTitle,
} from '../app/lib/clothing.ts';
import {
  clothingFilterUrl,
  clothingGarmentPhrase,
  clothingLooks,
  clothingLineChips,
  clothingSwatchBackground,
  selectClothing,
} from '../app/lib/clothingPresentation.ts';
import {filterDemoProducts} from '../app/lib/catalogFilters.ts';
import {garmentColourHex} from '../app/lib/garmentColours.ts';
import {merchantFeedRows} from '../app/lib/merchantFeed.ts';

// Fixture: the artist activewear as the coordinator describes it (6 Nov).
// Circle Rhythm first; Counter-Diagonal and Free Abyss use the same blanks.
const approved = {type: 'boolean', value: 'true'};
const capsuleKind = {type: 'single_line_text_field', value: 'capsule'};
const lines = {
  'counter-diagonal': {handle: 'counter-diagonal', title: 'Counter-Diagonal', clothingKind: capsuleKind},
  'circle-rhythm': {handle: 'circle-rhythm', title: 'Circle Rhythm', clothingKind: capsuleKind},
  'free-abyss': {handle: 'free-abyss', title: 'Free Abyss', clothingKind: capsuleKind},
};
const qcLine = {handle: 'quiet-current', title: 'Quiet Current', clothingKind: capsuleKind};
const BLANKS = [
  ['high-waist-leggings', 'High-Waist Leggings', 'Yoga Leggings'],
  ['sports-bra', 'Sports Bra', 'Sports Bra'],
  ['high-waist-biker-shorts', 'High-Waist Biker Shorts', 'Biker Shorts'],
  ['fitted-tank', 'Fitted Tank', 'Studio Top'],
];
const COLOURS = ['Cream', 'Black'];

function piece(line, [slug, name, productType], {approvals = true, collection} = {}) {
  const handle = `${line}-${slug}`;
  return {
    __typename: 'Product',
    id: `gid://shopify/Product/${handle}`,
    handle,
    title: `${lines[line]?.title ?? 'Quiet Current'} ${name}`,
    vendor: 'Clara Mendes',
    productType,
    description: `${name}.`,
    tags: ['clara-mendes-clothing', lines[line]?.title ?? 'Quiet Current', 'Activewear'],
    storefrontApproved: approvals ? approved : null,
    fulfillmentVerified: approvals ? approved : null,
    featuredImage: {url: `https://cdn.example/${handle}.jpg`, altText: null, width: 1000, height: 1000},
    images: {nodes: []},
    priceRange: {minVariantPrice: {amount: '49', currencyCode: 'EUR'}, maxVariantPrice: {amount: '49', currencyCode: 'EUR'}},
    sizeVariants: {nodes: []},
    cardVariant: {nodes: []},
    collections: {nodes: [collection ?? lines[line]]},
    options: [
      {name: 'Colour', optionValues: COLOURS.map((colour) => ({name: colour, swatch: null, firstSelectableVariant: null}))},
      {name: 'Size', optionValues: ['XS', 'S', 'M', 'L', 'XL'].map((size) => ({name: size, swatch: null, firstSelectableVariant: null}))},
    ],
    variants: {
      nodes: COLOURS.map((colour) => ({
        id: `gid://shopify/ProductVariant/${handle}-${colour}`,
        sku: `${handle}-${colour}-M`.toUpperCase(),
        availableForSale: true,
        price: {amount: '49', currencyCode: 'EUR'},
        selectedOptions: [{name: 'Colour', value: colour}, {name: 'Size', value: 'M'}],
        image: {url: `https://cdn.example/${handle}-${colour}.jpg`},
      })),
    },
  };
}

const cdHoodie = {
  ...piece('counter-diagonal', ['heavyweight-hoodie', 'Heavyweight Hoodie', 'Hoodies']),
  options: [{name: 'Size', optionValues: [{name: 'M', swatch: null, firstSelectableVariant: null}]}],
};
const crActivewear = BLANKS.map((blank) => piece('circle-rhythm', blank));
const crDrafts = BLANKS.map((blank) => piece('circle-rhythm', blank, {approvals: false}));
// The retired line, still published and even approved: it must never list.
const qcPieces = [
  ['high-waist-leggings', 'High-Waist Leggings', 'Yoga Leggings'],
  ['studio-bra', 'Studio Bra', 'Sports Bra'],
  ['high-waist-biker-shorts', 'High-Waist Biker Shorts', 'Biker Shorts'],
  ['studio-tank', 'Studio Tank', 'Studio Top'],
].map((blank) => piece('quiet-current', blank, {collection: qcLine}));

const tabs = (products) => clothingCategories(filterDemoProducts(products)).map(({slug, label, count}) => `${slug}|${label}|${count}`);

test('all four activewear types file under one Activewear tab, the tank included', () => {
  for (const product of crActivewear) assert.equal(clothingCategoryGroup(product)?.slug, 'activewear', product.productType);
  assert.deepEqual(tabs([cdHoodie, ...crActivewear]), ['hoodies-sweatshirts|Hoodies & sweatshirts|1', 'activewear|Activewear|4']);
  // Shopify search for the tab asks for every activewear type.
  const query = buildClothingSearchQuery({category: 'activewear'});
  for (const type of ['Yoga Leggings', 'Sports Bra', 'Biker Shorts', 'Studio Top']) assert.match(query, new RegExp(`product_type:"${type}"`));
  // An everyday tank top stays with the tees.
  assert.equal(clothingCategoryGroup({productType: 'Tank Tops'})?.slug, 'tees-long-sleeves');
});

test('no Activewear tab while the artist pieces are Drafts and Quiet Current is retired', () => {
  // A Draft is not on the Storefront API at all; an Active piece without its
  // two approvals fails the same gate.
  assert.deepEqual(tabs([cdHoodie]), ['hoodies-sweatshirts|Hoodies & sweatshirts|1']);
  assert.deepEqual(tabs([cdHoodie, ...crDrafts]), ['hoodies-sweatshirts|Hoodies & sweatshirts|1']);
  assert.deepEqual(tabs([cdHoodie, ...qcPieces]), ['hoodies-sweatshirts|Hoodies & sweatshirts|1']);
  assert.deepEqual(tabs([cdHoodie, ...qcPieces, ...crDrafts]), ['hoodies-sweatshirts|Hoodies & sweatshirts|1']);
  // One live artist piece is enough to show the tab.
  assert.deepEqual(tabs([cdHoodie, ...qcPieces, crActivewear[3]]), ['hoodies-sweatshirts|Hoodies & sweatshirts|1', 'activewear|Activewear|1']);
});

test('activewear cards name their line, and the line chips and tabs narrow each other', () => {
  for (const product of crActivewear) assert.equal(clothingLineTitle(product), 'Circle Rhythm');
  const listed = filterDemoProducts([cdHoodie, ...crActivewear, ...qcPieces]);
  assert.deepEqual(clothingLineChips(listed, 'activewear').map(({handle, count}) => `${handle}:${count}`), ['circle-rhythm:4']);
  assert.deepEqual(clothingLineChips(listed, '').map(({handle, count}) => `${handle}:${count}`), ['counter-diagonal:1', 'circle-rhythm:4']);
  const both = selectClothing(listed, new URLSearchParams('capsule=circle-rhythm&category=activewear'));
  assert.equal(both.total, 4);
  assert.deepEqual(both.products.map((p) => p.handle).sort(), crActivewear.map((p) => p.handle).sort());
  assert.equal(selectClothing(listed, new URLSearchParams('capsule=counter-diagonal&category=activewear')).total, 0);
  // The old one-category links open the group.
  for (const old of ['leggings', 'bras', 'shorts', 'studio-tops']) {
    const result = selectClothing(listed, new URLSearchParams(`category=${old}`));
    assert.equal(result.category, 'activewear', old);
  }
  assert.equal(clothingFilterUrl(new URLSearchParams('capsule=circle-rhythm'), 'category', 'activewear'), '/clothing?capsule=circle-rhythm&category=activewear#pieces');
  // Other lines' activewear joins the same tab and gets its own chip.
  const faTank = piece('free-abyss', BLANKS[3]);
  const cdBra = piece('counter-diagonal', BLANKS[1]);
  assert.deepEqual(
    clothingLineChips(filterDemoProducts([cdHoodie, cdBra, ...crActivewear, faTank]), 'activewear').map(({handle, count}) => `${handle}:${count}`),
    ['counter-diagonal:1', 'circle-rhythm:4', 'free-abyss:1'],
  );
  assert.equal(clothingLineTitle(faTank), 'Free Abyss');
});

test('Cream swatches as #EAE2D3, Black by its catalog hex', () => {
  assert.equal(garmentColourHex('Cream'), '#eae2d3');
  assert.equal(garmentColourHex(' cream '), '#eae2d3');
  assert.equal(clothingSwatchBackground('Cream'), '#eae2d3');
  assert.match(clothingSwatchBackground('Black'), /^#[0-9a-f]{6}$/i);
  // A Shopify swatch set on the value still wins.
  assert.equal(clothingSwatchBackground('Cream', '#f0e8d8'), '#f0e8d8');
});

test('activewear feeds as women\'s Activewear with its colour and line', () => {
  const rows = merchantFeedRows([...crActivewear, ...qcPieces], 'printful');
  assert.equal(rows.length, 8);
  assert.ok(rows.every((row) => !row.item_group_id.startsWith('quiet-current')));
  assert.deepEqual([...new Set(rows.map((row) => row.color))], ['Cream', 'Black']);
  assert.ok(rows.every((row) => row.custom_label_0 === 'Circle Rhythm'));
  assert.ok(rows.every((row) => row.gender === 'female' && row.google_product_category === 'Apparel & Accessories > Clothing > Activewear'));
});

test('the page copy names the activewear, and looks put the tops first', () => {
  assert.equal(clothingGarmentPhrase([cdHoodie, ...crActivewear]), 'hoodies, tanks, sports bras, leggings and biker shorts');
  const looks = clothingLooks(crActivewear);
  assert.deepEqual(looks.map((look) => look.colour), ['Cream', 'Black']);
  assert.deepEqual(looks[0].pieces.map((p) => p.title.replace(/^Circle Rhythm /, '')).slice(0, 2).sort(), ['Fitted Tank', 'Sports Bra']);
});

test('on phones the chosen line chip and tab scroll into view, not the page', () => {
  const route = readFileSync(new URL('../app/routes/clothing.tsx', import.meta.url), 'utf8');
  assert.match(route, /<div className="clothing-filters" ref=\{filters\}>/);
  assert.match(route, /querySelector<HTMLElement>\('a\[aria-current\]'\)/);
  assert.match(route, /nav\.scrollLeft \+=/);
  assert.doesNotMatch(route, /scrollIntoView/);
});
