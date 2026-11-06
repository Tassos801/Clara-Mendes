import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import {
  clothingCapsules,
  clothingCategories,
  clothingCategory,
  isClothingProduct,
  isClothingCategoryCollection,
  LEAD_CLOTHING_CAPSULE,
} from '../app/lib/clothing.ts';
import {
  isDemoCollection,
  isListedProduct,
  PRODUCT_RELEASE_FLAGS,
} from '../app/lib/catalogFilters.ts';
import {
  clothingGarmentPhrase,
  clothingSizeRange,
  featuredClothingOrder,
  selectClothing,
  CLOTHING_SORTS,
  DEFAULT_CLOTHING_SORT,
} from '../app/lib/clothingPresentation.ts';
import {
  capsuleStory,
  capsuleStoryData,
  clothingPageHero,
  CLOTHING_PAGE_HERO,
} from '../app/lib/clothingEditorial.ts';
import {collectionHero} from '../app/lib/collectionHeroes.ts';

const approved = {type: 'boolean', value: 'true'};
const cdCollection = {handle: 'counter-diagonal', title: 'Counter-Diagonal', clothingKind: null};
const qcCollection = {handle: 'quiet-current', title: 'Quiet Current', clothingKind: null};

let created = 0;
function piece(handle, title, productType, {collection = cdCollection, sizes = ['S', 'M', 'L', 'XL', '2XL', '3XL'], approvals = true, tags} = {}) {
  created++;
  return {
    __typename: 'Product',
    id: `gid://shopify/Product/${handle}`,
    handle,
    title,
    vendor: 'Clara Mendes',
    productType,
    tags: tags ?? ['clara-mendes-clothing', 'Counter-Diagonal', 'Made to order'],
    storefrontApproved: approvals ? approved : null,
    fulfillmentVerified: approvals ? approved : null,
    featuredImage: {url: `https://cdn.example/${handle}.png`, altText: null, width: 1000, height: 1000},
    images: {nodes: []},
    priceRange: {minVariantPrice: {amount: String(40 + created), currencyCode: 'EUR'}, maxVariantPrice: {amount: String(40 + created), currencyCode: 'EUR'}},
    sizeVariants: {nodes: []},
    cardVariant: {nodes: []},
    collections: {nodes: [collection]},
    options: [{name: 'Size', optionValues: sizes.map((name) => ({name, swatch: null, firstSelectableVariant: null}))}],
  };
}

// Shopify returns newest first: the accessories were made last, Quiet
// Current a month earlier.
const tote = piece('counter-diagonal-tote', 'Counter-Diagonal Tote', 'Tote Bags', {sizes: ['One size']});
const cap = piece('counter-diagonal-cap', 'Counter-Diagonal Cap', 'Hats', {sizes: ['One size']});
const longSleeve = piece('counter-diagonal-long-sleeve', 'Counter-Diagonal Long Sleeve Tee', 'Long Sleeve Shirts');
const crew = piece('counter-diagonal-crewneck', 'Counter-Diagonal Crewneck Sweatshirt', 'Sweatshirts');
const tee = piece('counter-diagonal-oversized-tee', 'Counter-Diagonal Oversized Tee', 'T-Shirts', {sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']});
const heavyweight = piece('counter-diagonal-heavyweight-hoodie', 'Counter-Diagonal Heavyweight Hoodie', 'Hoodies');
const premium = piece('counter-diagonal-premium-hoodie', 'Counter-Diagonal Premium Hoodie', 'Hoodies');
const tank = piece('quiet-current-studio-tank', 'Quiet Current Studio Tank', 'Studio Top', {collection: qcCollection, approvals: false, sizes: ['XS', 'S', 'M', 'L', 'XL'], tags: ['Activewear', 'Made to order', 'Quiet Current']});
const leggings = piece('quiet-current-high-waist-leggings', 'Quiet Current High-Waist Leggings', 'Yoga Leggings', {collection: qcCollection, approvals: false, sizes: ['XS', 'S', 'M', 'L', 'XL'], tags: ['Activewear', 'Made to order', 'Quiet Current']});
const newestFirst = [tote, cap, longSleeve, crew, tee, heavyweight, premium, tank, leggings];

test('the contract product types map to categories; activewear keeps its own', () => {
  const slug = (productType) => clothingCategory({productType})?.slug;
  assert.equal(slug('Hoodies'), 'hoodies');
  assert.equal(slug('Sweatshirts'), 'sweatshirts');
  assert.equal(slug('T-Shirts'), 't-shirts');
  assert.equal(slug('Long Sleeve Shirts'), 'long-sleeves');
  assert.equal(slug('Hats'), 'accessories');
  assert.equal(slug('Tote Bags'), 'accessories');
  assert.equal(slug('Yoga Leggings'), 'leggings');
  assert.equal(slug('Sports Bra'), 'bras');
  assert.equal(slug('Biker Shorts'), 'shorts');
  assert.equal(slug('Studio Top'), 'tops');
  // The museum Art Canvas Tote is typed "Bags" and is not clothing.
  assert.equal(isClothingProduct({productType: 'Bags'}), false);
  assert.equal(isClothingProduct({productType: 'Mugs'}), false);
  // The tabs are broad groups, counted per group.
  assert.deepEqual(clothingCategories(newestFirst).map(({slug: s, count}) => `${s}:${count}`), [
    'hoodies-sweatshirts:3', 'tees-long-sleeves:3', 'activewear:1', 'accessories:2',
  ]);
  assert.equal(clothingCategories(newestFirst).find(({slug: s}) => s === 'tees-long-sleeves').label, 'Tees & long sleeves');
  assert.equal(isClothingCategoryCollection({handle: 'accessories', title: 'Accessories'}), true);
});

test('Counter-Diagonal is a capsule by handle; the retired Quiet Current is none', () => {
  assert.equal(LEAD_CLOTHING_CAPSULE, 'counter-diagonal');
  assert.deepEqual(clothingCapsules(newestFirst), [
    {handle: 'counter-diagonal', title: 'Counter-Diagonal', count: 7},
  ]);
  const meadow = {handle: 'meadow', title: 'A Meadow', clothingKind: {type: 'single_line_text_field', value: 'capsule'}};
  assert.deepEqual(
    clothingCapsules([piece('meadow-dress', 'Meadow Dress', 'Dresses', {collection: meadow}), heavyweight, leggings]).map((c) => c.handle),
    // A metafield capsule with the newest piece comes right after the lead.
    ['counter-diagonal', 'meadow'],
  );
});

test('approved line pieces list; the two old drafts never do, even approved and published', () => {
  for (const product of [heavyweight, premium, tee, crew, longSleeve, cap, tote]) {
    assert.equal(isListedProduct(product), true, product.handle);
    assert.equal(isListedProduct({...product, fulfillmentVerified: null}), false, product.handle);
  }
  for (const handle of ['counter-diagonal-hoodie', 'counter-diagonal-classic-hoodie']) {
    assert.equal(PRODUCT_RELEASE_FLAGS[handle], false);
    assert.equal(isListedProduct({...heavyweight, handle}), false, handle);
  }
});

test('the counter-diagonal collection route fetches, then needs a listed member', () => {
  assert.equal(isDemoCollection({handle: 'counter-diagonal'}), false);
  assert.equal(isDemoCollection({handle: 'counter-diagonal', products: {nodes: []}}), true);
  assert.equal(isDemoCollection({handle: 'counter-diagonal', products: {nodes: [{...heavyweight, storefrontApproved: null}]}}), true);
  assert.equal(isDemoCollection({handle: 'counter-diagonal', products: {nodes: [heavyweight]}}), false);
});

test('featured order: Counter-Diagonal first, in garment order, newest first within a kind', () => {
  assert.deepEqual(featuredClothingOrder(newestFirst).map((p) => p.handle), [
    'counter-diagonal-heavyweight-hoodie',
    'counter-diagonal-premium-hoodie',
    'counter-diagonal-crewneck',
    'counter-diagonal-oversized-tee',
    'counter-diagonal-long-sleeve',
    // Accessories: hats before totes, whatever Shopify returned first.
    'counter-diagonal-cap',
    'counter-diagonal-tote',
    'quiet-current-studio-tank',
    'quiet-current-high-waist-leggings',
  ]);
  assert.equal(DEFAULT_CLOTHING_SORT, 'featured');
  assert.equal(CLOTHING_SORTS[0].value, 'featured');
  assert.equal(selectClothing(newestFirst, new URLSearchParams()).products[0].handle, 'counter-diagonal-heavyweight-hoodie');
  assert.deepEqual(selectClothing(newestFirst, new URLSearchParams('sort=newest')).products.map((p) => p.handle), newestFirst.map((p) => p.handle));
  assert.deepEqual(selectClothing(newestFirst, new URLSearchParams('category=accessories')).products.map((p) => p.handle), ['counter-diagonal-cap', 'counter-diagonal-tote']);
  // Group tabs, and old single-category links opening their group.
  assert.deepEqual(selectClothing(newestFirst, new URLSearchParams('category=hoodies-sweatshirts')).products.map((p) => p.handle), ['counter-diagonal-heavyweight-hoodie', 'counter-diagonal-premium-hoodie', 'counter-diagonal-crewneck']);
  assert.equal(selectClothing(newestFirst, new URLSearchParams('category=hoodies')).category, 'hoodies-sweatshirts');
  assert.equal(selectClothing(newestFirst, new URLSearchParams('category=nonsense')).category, '');
  // Line and tab narrow together.
  assert.deepEqual(selectClothing(newestFirst, new URLSearchParams('capsule=counter-diagonal&category=tees-long-sleeves')).products.map((p) => p.handle), ['counter-diagonal-oversized-tee', 'counter-diagonal-long-sleeve']);
  assert.equal(selectClothing(newestFirst, new URLSearchParams('sort=bogus')).sort, 'featured');
});

test('the garment phrase names only kinds on sale, in page order', () => {
  const line = newestFirst.slice(0, 7);
  assert.equal(clothingGarmentPhrase(line), 'hoodies, sweatshirts, tees, long sleeves, hats and totes');
  assert.equal(clothingGarmentPhrase([premium, tee]), 'hoodies and tees');
  assert.equal(clothingGarmentPhrase([heavyweight]), 'hoodies');
  assert.equal(clothingGarmentPhrase([heavyweight, tank]), null);
  assert.equal(clothingGarmentPhrase([]), null);
});

test('size runs up to 6XL are stated; one-size accessories get none', () => {
  assert.equal(clothingSizeRange([heavyweight]), 'S–3XL');
  assert.equal(clothingSizeRange([tee]), 'XS–3XL');
  assert.equal(clothingSizeRange([piece('x', 'X', 'Hoodies', {sizes: ['2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL']})]), '2XS–6XL');
  assert.equal(clothingSizeRange([cap]), null);
});

test('Counter-Diagonal copy credits Van Doesburg as inspiration, never as the artist', () => {
  const story = capsuleStory('counter-diagonal');
  assert.equal(story.credit, 'Inspired by Theo van Doesburg');
  const hero = clothingPageHero('counter-diagonal', 'hoodies and tees');
  assert.equal(hero.text, 'Hoodies and tees in one geometric design, inspired by Theo van Doesburg. Made for you after you order.');
  assert.equal(clothingPageHero('counter-diagonal', null).text.startsWith('Clothing in one geometric design'), true);
  const copy = [story.credit, story.intro, story.looksImage.alt, story.looksImage.caption, hero.eyebrow, hero.text, hero.cta, collectionHero('counter-diagonal').subtitle, collectionHero('counter-diagonal').eyebrow, collectionHero('counter-diagonal').alt].join(' ');
  assert.doesNotMatch(copy, /\bart by\b|(?<!inspired )\bby theo van doesburg\b|\bpainted\b|\breproduction of\b/i);
  assert.match(story.intro, /not a copy/);
  assert.match(story.looksImage.caption, /digital mockups/i);
  // Market-neutral: no money in fixed copy (docs/us-market/HANDOFF.md rule 2).
  assert.doesNotMatch(copy, /[€$]|\bEUR\b|\bUSD\b/);
  // With no capsule the page keeps its general hero.
  assert.deepEqual(clothingPageHero(null, null), {eyebrow: null, title: CLOTHING_PAGE_HERO.title, text: CLOTHING_PAGE_HERO.text, cta: 'Shop clothing'});
  assert.equal('hero' in capsuleStoryData('counter-diagonal'), false);
});

test('Counter-Diagonal images exist as plain JPEG or PNG, never WebP', () => {
  const story = capsuleStory('counter-diagonal');
  const hero = collectionHero('counter-diagonal');
  for (const src of [story.band.src, story.looksImage.src, story.accent.src, hero.image, hero.imageMobile]) {
    assert.match(src, /\.(jpe?g|png)$/, src);
    assert.ok(existsSync(resolve('public' + src)), `${src} is missing`);
  }
});

test('the real /clothing loader leads with Counter-Diagonal and drops the retired Quiet Current', async () => {
  const route = loadRoute('clothing');
  const load = (products, search = '', country = 'US') => route.loader({
    request: new Request(`https://shopclaramendes.com/clothing${search}`),
    context: {storefront: {
      i18n: {country, language: 'EN'},
      CacheShort: () => ({}),
      query: async () => ({products: {nodes: products, pageInfo: {hasNextPage: false, endCursor: null}}}),
    }},
  });
  const data = await load(newestFirst);
  assert.equal(data.products[0].handle, 'counter-diagonal-heavyweight-hoodie');
  // The retired activewear never reaches the page, published or not.
  assert.equal(data.products.some((p) => p.handle.startsWith('quiet-current-')), false);
  assert.equal(data.catalogTotal, 7);
  assert.deepEqual(data.lines.map((line) => line.handle), ['counter-diagonal']);
  assert.equal(data.lines[0].credit, 'Inspired by Theo van Doesburg');
  assert.equal(data.hero.eyebrow, 'New · Counter-Diagonal');
  assert.equal(data.hero.text, 'Hoodies, sweatshirts, tees, long sleeves, hats and totes in one geometric design, inspired by Theo van Doesburg. Made for you after you order.');
  assert.equal(data.hero.looksImage.src, '/images/clothing/counter-diagonal-looks.w1280.jpg');
  assert.equal(data.description, 'Clara Mendes Clothing: Counter-Diagonal, an original design inspired by Theo van Doesburg, on hoodies, sweatshirts, tees, long sleeves, hats and totes. Made to order.');
  assert.deepEqual(data.categories.map((c) => c.slug), ['hoodies-sweatshirts', 'tees-long-sleeves', 'accessories']);
  assert.deepEqual(data.lineChips, [{handle: 'counter-diagonal', title: 'Counter-Diagonal', count: 7}]);

  // Only retired pieces: the page is empty, not the old activewear page.
  const before = await load([tank, leggings]);
  assert.equal(before.catalogTotal, 0);
  assert.deepEqual(before.lines, []);
  assert.equal(before.hero.text, CLOTHING_PAGE_HERO.text);

  // An unapproved line piece or an old draft never reaches the page.
  const leaked = await load([{...heavyweight, storefrontApproved: null}, {...premium, handle: 'counter-diagonal-hoodie'}, tank]);
  assert.deepEqual(leaked.products.map((p) => p.handle), []);
});

/** Execute the real route loader; only rendering helpers are replaced. */
function loadRoute(name) {
  const path = resolve(`app/routes/${name}.tsx`);
  const localRequire = createRequire(path);
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022}}).outputText;
  const exports = {};
  const load = (specifier) => {
    if (specifier.startsWith('~/components/')) return {};
    if (specifier === '@shopify/hydrogen') return {Image: () => null};
    if (specifier.startsWith('~/lib/')) return localRequire(resolve(`app/${specifier.slice(2)}.ts`));
    return localRequire(specifier);
  };
  new Function('exports', 'require', output)(exports, load);
  return exports;
}

// --- PDP shipping line: checkout's own fee for one piece, per buyer country ---
const {cheapestShippingQuote, quotesClothingShipping, QUOTE_ADDRESSES} = await import('../app/lib/clothingShipping.ts');
const {quoteClothingShipping} = await import('../app/lib/clothingShipping.server.ts');

test('only clothing without its own rate table gets a live quote', () => {
  assert.equal(quotesClothingShipping(heavyweight), true);
  assert.equal(quotesClothingShipping(cap), true);
  assert.equal(quotesClothingShipping(tank), false);
  assert.equal(quotesClothingShipping({handle: 'where-mist-rests', productType: 'Art Prints', tags: []}), false);
  assert.deepEqual(
    cheapestShippingQuote([
      {estimatedCost: {amount: '10.7', currencyCode: 'USD'}},
      {estimatedCost: {amount: '4.85', currencyCode: 'USD'}},
    ]),
    {amount: '4.85', currencyCode: 'USD'},
  );
  assert.equal(cheapestShippingQuote([]), null);
});

test('the quote is a one-piece cart in the buyer market; failures show no line', async () => {
  const calls = [];
  const storefront = {
    mutate: async (mutation, {variables}) => {
      calls.push({mutation, variables});
      return {cartCreate: {cart: {deliveryGroups: {nodes: [{deliveryOptions: [
        {estimatedCost: {amount: '10.70', currencyCode: 'USD'}},
        {estimatedCost: {amount: '4.85', currencyCode: 'USD'}},
      ]}]}}}};
    },
  };
  assert.deepEqual(await quoteClothingShipping(storefront, 'gid://shopify/ProductVariant/1', 'US'), {amount: '4.85', currencyCode: 'USD'});
  const {variables, mutation} = calls[0];
  assert.match(mutation, /@inContext\(country: \$country\)/);
  assert.match(mutation, /cartCreate/);
  // A throwaway cart: it never asks for a checkout URL.
  assert.doesNotMatch(mutation, /checkoutUrl/);
  assert.equal(variables.country, 'US');
  assert.deepEqual(variables.input.lines, [{merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 1}]);
  assert.deepEqual(variables.input.delivery.addresses[0].address.deliveryAddress, {countryCode: 'US', ...QUOTE_ADDRESSES.US});
  // EU countries price by code alone.
  await quoteClothingShipping(storefront, 'gid://shopify/ProductVariant/1', 'CY');
  assert.deepEqual(calls[1].variables.input.delivery.addresses[0].address.deliveryAddress, {countryCode: 'CY'});

  const none = {mutate: async () => ({cartCreate: {cart: {deliveryGroups: {nodes: []}}}})};
  assert.equal(await quoteClothingShipping(none, 'gid://shopify/ProductVariant/1', 'GB'), null);
  const broken = {mutate: async () => { throw new Error('Storefront down'); }};
  assert.equal(await quoteClothingShipping(broken, 'gid://shopify/ProductVariant/1', 'CY'), null);
  assert.equal(await quoteClothingShipping(storefront, null, 'CY'), null);
});

// --- Printful windows for Counter-Diagonal (cd-apparel readback, 2026-11-05) ---
const {fulfilmentWindows, counterDiagonalTechnique} = await import('../app/lib/storefrontBasics.ts');

test('Counter-Diagonal gets Printful windows by technique; other new garments still get none', () => {
  const printed = {production: '2–5', dispatch: '3–6'};
  const embroidered = {production: '2–7', dispatch: '3–8'};
  for (const [type, handle] of [
    ['Hoodies', 'counter-diagonal-heavyweight-hoodie'],
    ['Hoodies', 'counter-diagonal-premium-hoodie'],
    ['Sweatshirts', 'counter-diagonal-heavyweight-crewneck'],
    ['T-Shirts', 'counter-diagonal-tee'],
    ['T-Shirts', 'counter-diagonal-oversized-tee'],
    ['Long Sleeve Shirts', 'counter-diagonal-long-sleeve-tee'],
    ['Tote Bags', 'counter-diagonal-tote'],
  ]) {
    assert.deepEqual(fulfilmentWindows(type, handle, ['clara-mendes-clothing']), printed, handle);
    assert.equal(counterDiagonalTechnique(type, handle), 'printed');
  }
  for (const handle of ['counter-diagonal-cap', 'counter-diagonal-beanie']) {
    assert.deepEqual(fulfilmentWindows('Hats', handle, ['clara-mendes-clothing']), embroidered, handle);
    assert.equal(counterDiagonalTechnique('Hats', handle), 'embroidered');
  }
  // Only the line's own handles and known types.
  assert.equal(fulfilmentWindows('Hoodies', 'meadow-hoodie', ['clara-mendes-clothing']), null);
  assert.equal(counterDiagonalTechnique('Bags', 'counter-diagonal-bag'), null);
  assert.equal(fulfilmentWindows('Dresses', 'counter-diagonal-dress'), null);
  // Quiet Current keeps its cut-and-sew windows.
  assert.deepEqual(fulfilmentWindows('Studio Top', 'quiet-current-studio-tank'), embroidered);
});

test('a slow first quote shows no line now and finishes in the background', async () => {
  let release;
  const slow = {mutate: () => new Promise((resolve) => { release = () => resolve({cartCreate: {cart: {deliveryGroups: {nodes: [{deliveryOptions: [{estimatedCost: {amount: '4.69', currencyCode: 'USD'}}]}]}}}}); })};
  const background = [];
  const quote = await quoteClothingShipping(slow, 'gid://shopify/ProductVariant/9', 'US', {timeoutMs: 20, waitUntil: (promise) => background.push(promise)});
  assert.equal(quote, null);
  assert.equal(background.length, 1, 'the pending quote is handed to waitUntil');
  release();
  await background[0];
  // A quick answer is returned straight away and nothing is left running.
  const fast = {mutate: async () => ({cartCreate: {cart: {deliveryGroups: {nodes: [{deliveryOptions: [{estimatedCost: {amount: '4.45', currencyCode: 'EUR'}}]}]}}}})};
  const idle = [];
  assert.deepEqual(await quoteClothingShipping(fast, 'gid://shopify/ProductVariant/9', 'CY', {timeoutMs: 1000, waitUntil: (p) => idle.push(p)}), {amount: '4.45', currencyCode: 'EUR'});
  assert.equal(idle.length, 0);
});
