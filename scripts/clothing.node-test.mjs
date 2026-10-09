import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import {parse, visit} from 'graphql';
import {clothingCategories, clothingCapsules, clothingCategory, isClothingProduct, isClothingProductType, isClothingCategoryCollection, buildClothingSearchQuery, hasClothingApprovals} from '../app/lib/clothing.ts';
import {isDemoProduct, isDemoCollection, isListedProduct, filterDemoProducts, PRODUCT_RELEASE_FLAGS, EXTENSION_RELEASE_FLAGS} from '../app/lib/catalogFilters.ts';
import {filterSitemapProductEntries, filterSitemapCollectionEntries, removeExcludedSitemapEntries, sitemapProductEligibilityQuery} from '../app/lib/sitemap.ts';
import {recentlyViewedProductIds} from '../app/lib/recentlyViewed.ts';

const approved = {type: 'boolean', value: 'true'};
const capsule = {handle: 'meadow', title: 'Meadow', clothingKind: {type: 'single_line_text_field', value: 'capsule'}};
const future = {
  __typename: 'Product', id: 'gid://shopify/Product/99999999',
  handle: 'future-meadow-dress', title: 'Meadow Dress', vendor: 'Clara Mendes',
  productType: 'Dresses', tags: [],
  storefrontApproved: approved, fulfillmentVerified: approved,
  collections: {nodes: [capsule]},
  variants: {nodes: []}, options: [], description: '',
};
const hidden = {...future, handle: 'future-unapproved-dress', storefrontApproved: null};

test('garment classification uses exact types or explicit merchant tag, never fuzzy titles', () => {
  assert.equal(clothingCategory(future)?.slug, 'dresses');
  assert.equal(clothingCategory({productType: ' YOGA LEGGINGS '})?.slug, 'leggings');
  assert.equal(isClothingProduct({productType: 'Art Prints', title: 'Dress for the Studio', vendor: 'Clara Mendes', tags: ['clothing-inspired']}), false);
  assert.equal(isClothingProduct({productType: 'New garment type', tags: ['clara-mendes-clothing']}), true);
  assert.equal(isClothingProduct({productType: 'Yoga Leggings Poster'}), false);
  assert.equal(isClothingProductType(' dresses '), true);
  assert.equal(isClothingProductType('Dress Art Print'), false);
  assert.deepEqual(clothingCategories([future, future, {productType: 'Studio Top'}]), [
    {slug: 'tops', label: 'Tops', count: 1}, {slug: 'dresses', label: 'Dresses', count: 2},
  ]);
});

test('capsules use explicit collection metadata and actual membership, excluding garment categories', () => {
  assert.deepEqual(clothingCapsules([future, {...future, collections: {nodes: [{...capsule, handle: 'clothing', title: 'Clothing'}, capsule, capsule, {...capsule, handle: 'dresses', title: 'Dresses'}, {handle: 'all', title: 'Shop All'}, {...capsule, handle: 'unknown', clothingKind: {value: 'capsule'}}]}}]), [{handle: 'meadow', title: 'Meadow', count: 2}]);
  assert.deepEqual(clothingCapsules([{productType: 'Dresses', tags: ['Meadow'], title: 'Meadow Dress'}]), []);
  assert.equal(isClothingCategoryCollection({handle: 'new-leggings', title: 'Leggings'}), true);
  assert.deepEqual(clothingCapsules([{...future, collections: {nodes: [{handle: 'quiet-current', title: 'Quiet Current'}]}}]), [{handle: 'quiet-current', title: 'Quiet Current', count: 1}]);
});

test('future collections require an actual listed member; hidden, empty and legacy groups fail closed', () => {
  assert.equal(isDemoCollection({handle: 'meadow', products: {nodes: [future]}}), false);
  assert.equal(isDemoCollection({handle: 'meadow', products: {nodes: [hidden]}}), true);
  assert.equal(isDemoCollection({handle: 'meadow', products: {nodes: []}}), true);
  assert.equal(isDemoCollection({handle: 'women', products: {nodes: [future]}}), true);
  assert.equal(isDemoCollection({handle: 'new-group', products: {nodes: [{handle: 'your-sky-star-map'}]}}), true);
});

test('future clothing requires two typed boolean approvals with exact true values', () => {
  assert.equal(isDemoProduct(future), false);
  assert.equal(isListedProduct(future), true);
  for (const field of ['storefrontApproved', 'fulfillmentVerified']) {
    for (const value of [undefined, null, {type: 'boolean', value: 'false'}, {type: 'boolean', value: 'TRUE'}, {value: 'true'}, {type: 'single_line_text_field', value: 'true'}]) {
      assert.equal(hasClothingApprovals({...future, [field]: value}), false);
      assert.equal(isListedProduct({...future, [field]: value}), false);
    }
  }
  assert.equal(isListedProduct({...future, productType: 'Art Prints'}), false);
  assert.deepEqual(filterDemoProducts([hidden, future]), [future]);
});

test('off-theme, unfulfillable and protected staged products cannot bypass gates by being tagged clothing', () => {
  for (const handle of ['acne-cream', 'drawer-reset-bundle', 'first-light-birth-poster', 'clara-mendes-art-calendar-2026', ...Object.keys(EXTENSION_RELEASE_FLAGS).filter((handle) => !EXTENSION_RELEASE_FLAGS[handle])]) {
    assert.equal(isListedProduct({...future, handle, tags: ['clara-mendes-clothing']}), false, handle);
  }
  assert.equal(isListedProduct({...future, vendor: 'Tux-USA'}), false);
  assert.equal(isListedProduct({...future, handle: 'your-sky-star-map'}), false);
  assert.equal(isListedProduct({...future, handle: ''}), false);
});

test('the four released Quiet Current products retain visibility with their real false approvals', () => {
  const existing = readJson('docs/audits/clothing-catalog-2026-10-08.json').clothing;
  assert.equal(existing.length, 4);
  for (const product of existing) {
    assert.equal(PRODUCT_RELEASE_FLAGS[product.handle], true);
    assert.equal(hasClothingApprovals(product), false);
    assert.equal(isListedProduct(product), true);
  }
});

test('category query values cannot inject extra Shopify search conditions', () => {
  assert.match(buildClothingSearchQuery(), /tag:"clara-mendes-clothing"/);
  assert.equal(buildClothingSearchQuery({category: 'leggings'}), '(product_type:"Yoga Leggings" OR product_type:"Leggings")');
  assert.equal(buildClothingSearchQuery({category: 'leggings" OR *'}), 'tag:"__unknown-clothing-category__"');
});

test('product sitemap admits approved future clothing only with current metadata and publication', async () => {
  const entry = (handle) => `<url><loc>https://shopclaramendes.com/products/${handle}</loc></url>`;
  const xml = `<urlset>${[future.handle, hidden.handle, 'unpublished-dress', 'unknown-import'].map(entry).join('')}</urlset>`;
  assert.equal(removeExcludedSitemapEntries(xml), '<urlset></urlset>');
  const result = await filterSitemapProductEntries(xml, async (handles) => {
    assert.equal(handles.length, 4);
    return [future, hidden, null, {...future, handle: 'unknown-import', productType: 'Mugs'}];
  });
  assert.equal(result, `<urlset>${entry(future.handle)}</urlset>`);
  const revoked = await filterSitemapProductEntries(xml, async () => [{...future, fulfillmentVerified: {type: 'boolean', value: 'false'}}]);
  assert.equal(revoked, '<urlset></urlset>');
  const query = sitemapProductEligibilityQuery(['odd"handle']);
  assert.equal(query.variables.handle0, 'odd"handle');
  assert.doesNotMatch(query.query, /odd/);
  requireApprovalSelections(query.query);
});

test('collection sitemap resolves future members and removes empty, revoked and protected groups', async () => {
  const entry = (handle) => `<url><loc>https://shopclaramendes.com/collections/${handle}</loc></url>`;
  const handles = ['meadow', 'revoked', 'empty', 'unpublished', 'women', 'quiet-form'];
  const xml = `<urlset>${handles.map(entry).join('')}</urlset>`;
  const result = await filterSitemapCollectionEntries(xml, async (handle) => {
    assert.notEqual(handle, 'women');
    if (handle === 'unpublished') return null;
    return {handle, products: {nodes: handle === 'meadow' ? [future] : handle === 'revoked' ? [hidden] : []}};
  });
  assert.equal(result, `<urlset>${entry('meadow')}${entry('quiet-form')}</urlset>`);
});

test('actual collection sitemap loader finds approved members beyond the first Shopify page', async () => {
  const xml = '<urlset><url><loc>https://shopclaramendes.com/collections/meadow</loc></url></urlset>';
  const route = loadRoute('sitemap.$type.$page[.xml]', {getSitemap: async () => new Response(xml)});
  let calls = 0;
  const response = await route.loader({params: {type: 'collections', page: '1'}, request: new Request('https://shopclaramendes.com/sitemap/collections/1.xml'), context: {storefront: {
    CacheNone: () => ({mode: 'no-store'}),
    query: async (query, {variables}) => {
      requireApprovalSelections(query);
      assert.equal(variables.handle, 'meadow');
      calls++;
      assert.equal(variables.after, calls === 1 ? null : 'next');
      return {collection: {handle: 'meadow', products: {nodes: calls === 1 ? [hidden] : [future], pageInfo: {hasNextPage: calls === 1, endCursor: calls === 1 ? 'next' : null}}}};
    },
  }}});
  assert.equal(await response.text(), xml);
  assert.equal(calls, 2);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('actual regular and predictive search loaders include eligible future garments and hide failed approvals', async () => {
  const route = loadRoute('search');
  for (const predictive of [false, true]) {
    const result = await route.loader({request: new Request(`https://shopclaramendes.com/search?q=dress${predictive ? '&predictive=1' : ''}`), context: {storefront: {query: async (query) => {
      requireApprovalSelections(query);
      return predictive ? {predictiveSearch: {products: [future, hidden], collections: [], pages: [], articles: [], queries: []}} : {products: {nodes: [future, hidden], pageInfo: {}}, pages: {nodes: []}, articles: {nodes: []}};
    }}}});
    const products = predictive ? result.result.items.products : result.result.items.products.nodes;
    assert.deepEqual(products.map(({handle}) => handle), [future.handle]);
  }
});

test('actual PDP loader accepts future approved garments and refuses revoked or channel-missing products', async () => {
  const route = loadRoute('products.$handle');
  const load = (product) => route.loader({params: {handle: future.handle}, request: new Request(`https://shopclaramendes.com/products/${future.handle}`), context: {env: {PUBLIC_STORE_DOMAIN: 'example.myshopify.com'}, storefront: {query: async (query) => {
    requireApprovalSelections(query);
    return {product, relatedProducts: {nodes: []}, capsuleProducts: {nodes: []}};
  }}}});
  assert.equal((await load(future)).product.handle, future.handle);
  await assert.rejects(load({...future, storefrontApproved: null}), (response) => response.status === 302);
  await assert.rejects(load(null), (response) => response.status === 404);
});

test('recently viewed revalidates current product metadata, excluding unapproved and unpublished saved identities', async () => {
  const route = loadRoute('api.recently-viewed');
  const ids = [future.id, 'gid://shopify/Product/111', 'gid://shopify/Product/222'];
  const response = await route.loader({request: new Request(`https://shopclaramendes.com/api/recently-viewed?${new URLSearchParams(ids.map((id) => ['id', id]))}`), context: {storefront: {
    i18n: {country: 'CY', language: 'EN'},
    CacheNone: () => ({mode: 'no-store'}),
    query: async (query, {variables}) => {
      assert.deepEqual(variables.ids, ids);
      assert.equal(variables.country, 'CY');
      requireApprovalSelections(query);
      return {nodes: [future, hidden, null]};
    },
  }}});
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual((await response.json()).products.map(({handle}) => handle), [future.handle]);
  assert.deepEqual(recentlyViewedProductIds(['bad', 'gid://shopify/Order/1', future.id, future.id]), [future.id]);
  assert.equal(recentlyViewedProductIds(Array.from({length: 30}, (_, i) => `gid://shopify/Product/${i}`)).length, 12);
});

function readJson(file) { return JSON.parse(readFileSync(file, 'utf8')); }

function requireApprovalSelections(query) {
  const aliases = new Set();
  visit(parse(query), {Field(node) { if (node.name.value === 'metafield') aliases.add(node.alias?.value); }});
  assert.equal(aliases.has('storefrontApproved'), true);
  assert.equal(aliases.has('fulfillmentVerified'), true);
}

/** Execute real route loaders; only rendering and Hydrogen transport helpers are replaced. */
function loadRoute(name, hydrogen = {}) {
  const path = resolve(`app/routes/${name}.tsx`);
  const localRequire = createRequire(path);
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022}}).outputText;
  const exports = {};
  const load = (specifier) => {
    if (specifier.startsWith('~/components/')) return {};
    if (specifier === '@shopify/hydrogen') return {getSelectedProductOptions: () => [], getPaginationVariables: () => ({first: 8}), ...hydrogen};
    if (specifier.startsWith('~/lib/')) return localRequire(resolve(`app/${specifier.slice(2)}.ts`));
    return localRequire(specifier);
  };
  new Function('exports', 'require', output)(exports, load);
  return exports;
}

// --- Page presentation: looks, sizes, small-assortment tools, swatches ---
const {
  allMadeToOrder, clothingFeaturePicks, clothingLooks, clothingSizeRange,
  clothingSwatchBackground, showClothingTools, CLOTHING_TOOLS_MIN_PRODUCTS,
} = await import('../app/lib/clothingPresentation.ts');
const {capsuleStory, CLOTHING_PAGE_HERO} = await import('../app/lib/clothingEditorial.ts');

const variantFor = (handle, colour, size = 'XS') => ({
  id: `gid://shopify/ProductVariant/${handle}-${colour}`,
  availableForSale: true,
  image: {url: `https://cdn.example/${handle}-${colour}.png`, altText: null, width: 800, height: 1000},
  price: {amount: '50.0', currencyCode: 'EUR'},
  selectedOptions: [{name: 'Colour', value: colour}, {name: 'Size', value: size}],
});
const garment = (handle, title, productType, colours, sizes = ['XS', 'S', 'M', 'L', 'XL']) => ({
  id: `gid://shopify/Product/${handle}`, handle, title, productType,
  tags: ['Activewear', 'Made to order', 'Quiet Current'],
  featuredImage: null, priceRange: {minVariantPrice: {amount: '50.0', currencyCode: 'EUR'}},
  collections: {nodes: [{handle: 'quiet-current', title: 'Quiet Current', clothingKind: null}]},
  options: [
    {name: 'Colour', optionValues: colours.map((name) => ({name, swatch: null, firstSelectableVariant: variantFor(handle, name)}))},
    {name: 'Size', optionValues: sizes.map((name) => ({name, swatch: null, firstSelectableVariant: null}))},
  ],
});
const capsuleSet = [
  garment('quiet-current-high-waist-leggings', 'Quiet Current High-Waist Leggings', 'Yoga Leggings', ['Moss / Mist', 'Clay / Oat']),
  garment('quiet-current-studio-tank', 'Quiet Current Studio Tank', 'Studio Top', ['Moss / Mist', 'Clay / Oat']),
  garment('quiet-current-studio-bra', 'Quiet Current Studio Bra', 'Sports Bra', ['Moss / Mist', 'Clay / Oat']),
  garment('solo-dress', 'Solo Dress', 'Dresses', ['Ink']),
];

test('coordinated looks group real colour variants, tops before bottoms, and skip single-piece colours', () => {
  const looks = clothingLooks(capsuleSet);
  assert.deepEqual(looks.map((look) => look.colour), ['Moss / Mist', 'Clay / Oat']);
  const moss = looks[0].pieces;
  assert.deepEqual(moss.map((piece) => piece.title), ['Studio Tank', 'Studio Bra', 'High-Waist Leggings']);
  assert.equal(moss[2].image.url, 'https://cdn.example/quiet-current-high-waist-leggings-Moss / Mist.png');
  assert.match(looks[1].pieces[0].url, /^\/products\/quiet-current-studio-tank\?Colour=Clay\+%2F\+Oat&Size=XS$/);
});

test('homepage picks show two colourways and never repeat a product', () => {
  const picks = clothingFeaturePicks(capsuleSet);
  assert.equal(picks.length, 2);
  assert.deepEqual(picks.map((pick) => pick.colour), ['Moss / Mist', 'Clay / Oat']);
  assert.notEqual(picks[0].id, picks[1].id);
  const fallback = clothingFeaturePicks([capsuleSet[3]]);
  assert.deepEqual(fallback.map((pick) => pick.title), ['Solo Dress']);
  assert.deepEqual(clothingFeaturePicks([]), []);
});

test('size range is stated only for a known run of sizes', () => {
  assert.equal(clothingSizeRange(capsuleSet), 'XS–XL');
  assert.equal(clothingSizeRange([garment('a', 'A', 'Dresses', ['Ink'], ['S', 'M'])]), 'S–M');
  assert.equal(clothingSizeRange([garment('a', 'A', 'Dresses', ['Ink'], ['One size'])]), null);
  assert.equal(clothingSizeRange([{...capsuleSet[0], options: []}]), null);
});

test('made-to-order copy needs the tag on every piece', () => {
  assert.equal(allMadeToOrder(capsuleSet), true);
  assert.equal(allMadeToOrder([...capsuleSet, {tags: ['Activewear']}]), false);
  assert.equal(allMadeToOrder([]), false);
});

test('category links and sorting stay hidden for small assortments', () => {
  assert.equal(CLOTHING_TOOLS_MIN_PRODUCTS, 9);
  assert.equal(showClothingTools(4), false);
  assert.equal(showClothingTools(8), false);
  assert.equal(showClothingTools(9), true);
});

test('palette colourways get split swatches; unknown names fall back to text', () => {
  assert.equal(clothingSwatchBackground('Moss / Mist'), 'linear-gradient(135deg, #6F7769 0% 50%, #DFE4DC 50% 100%)');
  assert.equal(clothingSwatchBackground('Clay'), '#9C6F5D');
  assert.equal(clothingSwatchBackground('Sunset / Moss'), null);
  assert.equal(clothingSwatchBackground('Anything', '#123456'), '#123456');
});

test('editorial copy is optional per capsule and never calls the print hand-painted', () => {
  const story = capsuleStory('quiet-current');
  assert.ok(story?.intro);
  assert.equal(capsuleStory('meadow'), null);
  const copy = [CLOTHING_PAGE_HERO.title, CLOTHING_PAGE_HERO.text, story.intro, story.looksImage.alt, story.looksImage.caption].join(' ');
  assert.doesNotMatch(copy, /hand-?painted|painted on|paintings? printed/i);
  assert.match(story.looksImage.caption, /digital mockups/i);
});

test('every page image the editorial config names exists in public/', async () => {
  const {existsSync} = await import('node:fs');
  const story = capsuleStory('quiet-current');
  for (const src of [story.looksImage.src, '/images/clothing/olive-mineral.webp']) {
    assert.ok(existsSync(resolve('public' + src)), `${src} is missing`);
  }
});
