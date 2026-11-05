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
  KNOWN_CLOTHING_CAPSULES,
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
  assert.deepEqual(clothingCategories(newestFirst).map(({slug: s, count}) => `${s}:${count}`), [
    'hoodies:2', 'sweatshirts:1', 't-shirts:1', 'long-sleeves:1', 'tops:1', 'leggings:1', 'accessories:2',
  ]);
  assert.equal(clothingCategories(newestFirst).find(({slug: s}) => s === 'long-sleeves').label, 'Long sleeves');
  assert.equal(isClothingCategoryCollection({handle: 'accessories', title: 'Accessories'}), true);
});

test('Counter-Diagonal is a capsule by handle and comes before Quiet Current', () => {
  assert.equal(LEAD_CLOTHING_CAPSULE, 'counter-diagonal');
  assert.deepEqual(KNOWN_CLOTHING_CAPSULES, ['counter-diagonal', 'quiet-current']);
  assert.deepEqual(clothingCapsules(newestFirst), [
    {handle: 'counter-diagonal', title: 'Counter-Diagonal', count: 7},
    {handle: 'quiet-current', title: 'Quiet Current', count: 2},
  ]);
  const meadow = {handle: 'meadow', title: 'A Meadow', clothingKind: {type: 'single_line_text_field', value: 'capsule'}};
  assert.deepEqual(
    clothingCapsules([piece('meadow-dress', 'Meadow Dress', 'Dresses', {collection: meadow}), heavyweight, leggings]).map((c) => c.handle),
    ['counter-diagonal', 'quiet-current', 'meadow'],
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
    // Both accessories: newest first, as Shopify returned them.
    'counter-diagonal-tote',
    'counter-diagonal-cap',
    'quiet-current-studio-tank',
    'quiet-current-high-waist-leggings',
  ]);
  assert.equal(DEFAULT_CLOTHING_SORT, 'featured');
  assert.equal(CLOTHING_SORTS[0].value, 'featured');
  assert.equal(selectClothing(newestFirst, new URLSearchParams()).products[0].handle, 'counter-diagonal-heavyweight-hoodie');
  assert.deepEqual(selectClothing(newestFirst, new URLSearchParams('sort=newest')).products.map((p) => p.handle), newestFirst.map((p) => p.handle));
  assert.deepEqual(selectClothing(newestFirst, new URLSearchParams('category=accessories')).products.map((p) => p.handle), ['counter-diagonal-tote', 'counter-diagonal-cap']);
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
  // Without a hero of its own (Quiet Current) the page keeps its old hero.
  assert.deepEqual(clothingPageHero('quiet-current', null), {eyebrow: null, title: CLOTHING_PAGE_HERO.title, text: CLOTHING_PAGE_HERO.text, cta: 'Shop clothing'});
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

test('the real /clothing loader leads with Counter-Diagonal and keeps Quiet Current', async () => {
  const route = loadRoute('clothing');
  const load = (products, search = '') => route.loader({
    request: new Request(`https://shopclaramendes.com/clothing${search}`),
    context: {storefront: {
      i18n: {country: 'US', language: 'EN'},
      CacheShort: () => ({}),
      query: async () => ({products: {nodes: products, pageInfo: {hasNextPage: false, endCursor: null}}}),
    }},
  });
  const data = await load(newestFirst);
  assert.equal(data.products[0].handle, 'counter-diagonal-heavyweight-hoodie');
  assert.deepEqual(data.collections.map((c) => c.handle), ['counter-diagonal', 'quiet-current']);
  assert.equal(data.collections[0].story.credit, 'Inspired by Theo van Doesburg');
  assert.equal(data.hero.eyebrow, 'New · Counter-Diagonal');
  assert.equal(data.hero.text, 'Hoodies, sweatshirts, tees, long sleeves, hats and totes in one geometric design, inspired by Theo van Doesburg. Made for you after you order.');
  assert.equal(data.hero.looksImage.src, '/images/clothing/counter-diagonal-looks.w1280.jpg');
  assert.match(data.description, /^Clara Mendes Clothing: Counter-Diagonal hoodies, .* and totes in one geometric design inspired by Theo van Doesburg, and Quiet Current activewear/);
  assert.equal(data.showTools, true);
  assert.equal(data.cutAndSewn, false);
  assert.equal(data.shippingFrom, null);
  assert.deepEqual(data.capsules.map((c) => c.handle), ['counter-diagonal', 'quiet-current']);

  // Before the line goes live, the page is exactly the Quiet Current page.
  const before = await load([tank, leggings]);
  assert.deepEqual(before.collections.map((c) => c.handle), ['quiet-current']);
  assert.equal(before.hero.text, CLOTHING_PAGE_HERO.text);
  assert.equal(before.hero.cta, 'Shop clothing');
  assert.equal(before.cutAndSewn, true);
  assert.equal(before.shippingFrom, '3.99');
  assert.match(before.description, /^Clara Mendes Clothing: leggings, a sports bra/);

  // An unapproved line piece or an old draft never reaches the page.
  const leaked = await load([{...heavyweight, storefrontApproved: null}, {...premium, handle: 'counter-diagonal-hoodie'}, tank]);
  assert.deepEqual(leaked.products.map((p) => p.handle), ['quiet-current-studio-tank']);
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
