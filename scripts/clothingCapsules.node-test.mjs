import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import {
  clothingCapsules,
  isClothingCapsuleCollection,
} from '../app/lib/clothing.ts';
import {featuredClothingOrder} from '../app/lib/clothingPresentation.ts';
import {
  clothingLinesHero,
  clothingPageHero,
  genericCapsuleStory,
} from '../app/lib/clothingEditorial.ts';
import {parseApparelDescription} from '../app/lib/apparelCopy.ts';
import {merchantFeedRows} from '../app/lib/merchantFeed.ts';

const approved = {type: 'boolean', value: 'true'};
const capsuleKind = {type: 'single_line_text_field', value: 'capsule'};
const cd = {handle: 'counter-diagonal', title: 'Counter-Diagonal', clothingKind: capsuleKind};
const sea = {handle: 'sea-line', title: 'Sea Line', clothingKind: capsuleKind};
const retired = {handle: 'quiet-current', title: 'Quiet Current', clothingKind: capsuleKind};
const suprema = {handle: 'suprema', title: 'Suprema', clothingKind: capsuleKind};
const rhythm = {handle: 'rhythm', title: 'Rhythm', clothingKind: capsuleKind};

function piece(handle, productType, collections, tags = ['clara-mendes-clothing', 'Made to order']) {
  return {
    __typename: 'Product',
    id: `gid://shopify/Product/${handle}`,
    handle,
    title: handle,
    vendor: 'Clara Mendes',
    productType,
    tags,
    storefrontApproved: approved,
    fulfillmentVerified: approved,
    featuredImage: {url: `https://cdn.example/${handle}.png`, altText: null, width: 1000, height: 1000},
    images: {nodes: []},
    priceRange: {minVariantPrice: {amount: '40', currencyCode: 'EUR'}, maxVariantPrice: {amount: '40', currencyCode: 'EUR'}},
    sizeVariants: {nodes: []},
    cardVariant: {nodes: []},
    collections: {nodes: collections},
    options: [{name: 'Size', optionValues: ['S', 'M'].map((name) => ({name, swatch: null, firstSelectableVariant: null}))}],
  };
}

// Newest first, as Shopify returns them: Rhythm is the newest line.
const rhythmTee = piece('rhythm-tee', 'T-Shirts', [rhythm]);
const supremaHoodie = piece('suprema-hoodie', 'Hoodies', [suprema]);
const supremaTee = piece('suprema-tee', 'T-Shirts', [suprema]);
const cdTee = piece('counter-diagonal-tee', 'T-Shirts', [cd]);
const cdHoodie = piece('counter-diagonal-hoodie-x', 'Hoodies', [cd]);
const seaTee = piece('sea-line-tee', 'T-Shirts', [sea]);
const newestFirst = [rhythmTee, supremaTee, cdTee, supremaHoodie, cdHoodie, seaTee];

test('a collection is a capsule by its metafield; the retired Quiet Current never', () => {
  assert.equal(isClothingCapsuleCollection(suprema), true);
  assert.equal(isClothingCapsuleCollection({...suprema, clothingKind: {type: 'single_line_text_field', value: ' Capsule '}}), true);
  assert.equal(isClothingCapsuleCollection(retired), false);
  assert.equal(isClothingCapsuleCollection({...retired, clothingKind: null}), false);
  assert.equal(isClothingCapsuleCollection({...cd, clothingKind: null}), true);
  // No metafield, a text-typed lookalike, or a garment category: never.
  assert.equal(isClothingCapsuleCollection({...suprema, clothingKind: null}), false);
  assert.equal(isClothingCapsuleCollection({...suprema, clothingKind: {type: 'multi_line_text_field', value: 'capsule'}}), false);
  assert.equal(isClothingCapsuleCollection({handle: 'hoodies', title: 'Hoodies', clothingKind: capsuleKind}), false);
  assert.equal(isClothingCapsuleCollection({handle: 'clothing', title: 'Clothing', clothingKind: capsuleKind}), false);
});

test('Counter-Diagonal comes first, then the capsules by their newest piece', () => {
  assert.deepEqual(clothingCapsules(newestFirst), [
    {handle: 'counter-diagonal', title: 'Counter-Diagonal', count: 2},
    {handle: 'rhythm', title: 'Rhythm', count: 1},
    {handle: 'suprema', title: 'Suprema', count: 2},
    {handle: 'sea-line', title: 'Sea Line', count: 1},
  ]);
  // Without Counter-Diagonal, the newest line leads.
  assert.equal(clothingCapsules([supremaTee, seaTee, rhythmTee])[0].handle, 'suprema');
});

test('featured order follows the capsule order, garments in kind order', () => {
  assert.deepEqual(featuredClothingOrder(newestFirst).map((p) => p.handle), [
    'counter-diagonal-hoodie-x',
    'counter-diagonal-tee',
    'rhythm-tee',
    'suprema-hoodie',
    'suprema-tee',
    'sea-line-tee',
  ]);
});

test('a capsule without an editorial entry gets a generic hero', () => {
  assert.deepEqual(clothingPageHero('suprema', 'hoodies and tees', {title: 'Suprema', madeToOrder: true}), {
    eyebrow: 'New · Suprema',
    title: 'Clothing, with an artistic touch.',
    text: 'Hoodies and tees from the Suprema collection. Made for you after you order.',
    cta: 'Shop Suprema',
  });
  assert.equal(clothingPageHero('suprema', null, {title: 'Suprema', madeToOrder: false}).text, 'Clothing from the Suprema collection.');
  // Editorial entries keep their own wording.
  assert.equal(clothingPageHero('counter-diagonal', 'tees', {title: 'Counter-Diagonal', madeToOrder: true}).eyebrow, 'New · Counter-Diagonal');
  // No capsule at all: the general wording.
  assert.deepEqual(clothingPageHero(null, null, null), {eyebrow: null, title: 'Clothing, with an artistic touch.', text: 'Original designs inspired by modern artists, made for you after you order.', cta: 'Shop clothing'});
  // Several lines: the hero names each line and each artist.
  assert.deepEqual(
    clothingLinesHero(
      [
        {title: 'Counter-Diagonal', credit: 'Inspired by Theo van Doesburg'},
        {title: 'Free Abyss', credit: 'Inspired by Kazimir Malevich'},
        {title: 'Circle Rhythm', credit: 'Inspired by Sophie Taeuber-Arp'},
      ],
      true,
    ),
    {
      eyebrow: 'Three lines · Made to order',
      title: 'Clothing, with an artistic touch.',
      text: 'Counter-Diagonal, Free Abyss and Circle Rhythm: three original designs, inspired by Theo van Doesburg, Kazimir Malevich and Sophie Taeuber-Arp. Made for you after you order.',
      cta: 'Shop all clothing',
    },
  );
  // A line without a credit leaves the artists out rather than guess.
  assert.equal(clothingLinesHero([{title: 'A', credit: 'Inspired by X'}, {title: 'B', credit: null}], false).text, 'A and B: two original designs.');
});

test('the generic story is the collection description and image', () => {
  const story = genericCapsuleStory({
    title: 'Suprema',
    description: '  Planes   that float.\nInspired by Kazimir Malevich. ',
    image: {url: 'https://cdn.shopify.com/s/files/suprema.jpg?v=1', altText: '', width: 2000, height: 1500},
  });
  assert.equal(story.intro, 'Planes that float. Inspired by Kazimir Malevich.');
  assert.deepEqual(story.looksImage, {
    src: 'https://cdn.shopify.com/s/files/suprema.jpg?v=1&width=1280',
    width: 1280,
    height: 960,
    alt: 'Suprema',
    caption: null,
  });
  const long = genericCapsuleStory({title: 'X', description: `${'A sentence of words here. '.repeat(30)}`});
  assert.ok(long.intro.length <= 420 && long.intro.endsWith('.'), long.intro);
  assert.equal(long.looksImage, undefined);
  assert.equal(genericCapsuleStory(null), null);
});

test('the real /clothing loader lists a new capsule with its generic block', async () => {
  const route = loadRoute('clothing');
  const queried = [];
  const load = (products) =>
    route.loader({
      request: new Request('https://shopclaramendes.com/clothing'),
      context: {
        storefront: {
          i18n: {country: 'CY', language: 'EN'},
          CacheShort: () => ({}),
          query: async (_query, {variables}) => {
            if (variables.handle) {
              queried.push(variables.handle);
              return variables.handle === 'suprema'
                ? {collection: {title: 'Suprema', description: 'Floating planes, inspired by Kazimir Malevich.', image: null}}
                : {collection: null};
            }
            return {products: {nodes: products, pageInfo: {hasNextPage: false, endCursor: null}}};
          },
        },
      },
    });
  const data = await load(newestFirst);
  assert.deepEqual(data.lines.map((line) => line.handle), ['counter-diagonal', 'rhythm', 'suprema', 'sea-line']);
  // Only capsules without an editorial entry are read.
  assert.deepEqual(queried.sort(), ['rhythm', 'sea-line', 'suprema']);
  assert.equal(data.lines[0].credit, 'Inspired by Theo van Doesburg');
  assert.equal(data.lines[1].credit, null);
  // Several lines: the hero names them all, with no single line's emblem.
  assert.equal(data.hero.eyebrow, 'Four lines · Made to order');
  assert.match(data.hero.text, /^Counter-Diagonal, Rhythm, Suprema and Sea Line: four original designs\./);
  assert.equal(data.hero.accent, null);

  // One line alone leads with its own (here generic) hero.
  const alone = await load([supremaTee, supremaHoodie]);
  assert.equal(alone.hero.eyebrow, 'New · Suprema');
  assert.equal(alone.hero.text, 'Hoodies and tees from the Suprema collection. Made for you after you order.');
  assert.equal(alone.hero.accent, null);
  assert.equal(alone.hero.looksImage, null);
  assert.equal(alone.description, 'Clara Mendes Clothing: Suprema, an original design, on hoodies and tees. Made to order.');
});

test('an artist quote becomes the pull-quote, never the lede', () => {
  const copy = parseApparelDescription(`
    <p>An oversized tee with a floating composition.</p>
    <blockquote><p>“The square is not a subconscious form.”</p><cite>Kazimir Malevich, 1915 (our translation)</cite></blockquote>
    <ul><li>Heavyweight cotton</li></ul>
    <p>Machine wash cold.</p>`);
  assert.equal(copy.lede, 'An oversized tee with a floating composition.');
  assert.deepEqual(copy.quote, {text: 'The square is not a subconscious form.', cite: 'Kazimir Malevich, 1915 (our translation)'});
  assert.deepEqual(copy.fabricAndCare, ['Machine wash cold.']);

  // A quote placed first still never leads; <figure>, <footer> and a
  // dashed last line all give the credit.
  const first = parseApparelDescription('<figure><blockquote><p>Line one.</p><p>Line two.</p></blockquote><figcaption>— Sophie Taeuber-Arp, 1927</figcaption></figure><p>The lede.</p>');
  assert.equal(first.lede, 'The lede.');
  assert.deepEqual(first.quote, {text: 'Line one. Line two.', cite: 'Sophie Taeuber-Arp, 1927'});
  assert.deepEqual(parseApparelDescription('<p>Lede.</p><blockquote><p>Words &amp; more.</p><footer>A. Artist</footer></blockquote>').quote, {text: 'Words & more.', cite: 'A. Artist'});
  assert.deepEqual(parseApparelDescription('<p>Lede.</p><blockquote><p>"Plain words."</p><p>— A. Artist, 1920</p></blockquote>').quote, {text: 'Plain words.', cite: 'A. Artist, 1920'});
  // A dash inside the quote stays in the quote.
  assert.deepEqual(parseApparelDescription('<p>Lede.</p><blockquote><p>Sail on! The white, free abyss — infinity is before you.</p></blockquote>').quote, {text: 'Sail on! The white, free abyss — infinity is before you.', cite: null});
  assert.deepEqual(parseApparelDescription('<p>Lede.</p><blockquote><p>Sail on! The white, free abyss — infinity is before you.</p><cite>Kazimir Malevich, “Suprematism”, 1919 (our translation)</cite></blockquote>').quote, {text: 'Sail on! The white, free abyss — infinity is before you.', cite: 'Kazimir Malevich, “Suprematism”, 1919 (our translation)'});
  assert.deepEqual(parseApparelDescription('<p>Lede.</p><blockquote>Unsigned.</blockquote>').quote, {text: 'Unsigned.', cite: null});
  assert.equal(parseApparelDescription('<p>Lede.</p>').quote, null);
});

test('the product page renders the quote as a figure with its credit', () => {
  const route = readFileSync(resolve('app/routes/products.$handle.tsx'), 'utf8');
  assert.match(route, /apparelCopy\?\.quote \? \(\s*<figure className="product-pull-quote">\s*<blockquote>\s*<p>“\{apparelCopy\.quote\.text\}”<\/p>/);
  assert.match(route, /<figcaption>\s*<cite>\{apparelCopy\.quote\.cite\}<\/cite>/);
  assert.match(readFileSync(resolve('app/styles/app.css'), 'utf8'), /\.product-pull-quote \{/);
});

test('a new capsule names itself in custom_label_0', () => {
  const variant = (sku) => ({
    id: `gid://shopify/ProductVariant/${sku}`,
    sku,
    availableForSale: true,
    price: {amount: '41.99', currencyCode: 'EUR'},
    selectedOptions: [{name: 'Colour', value: 'Black'}, {name: 'Size', value: 'M'}],
    image: {url: `https://cdn.example/${sku}.jpg`},
  });
  const feedProduct = (handle, collections, tags) => ({
    handle,
    title: handle,
    productType: 'T-Shirts',
    tags,
    description: 'Tee.',
    storefrontApproved: approved,
    fulfillmentVerified: approved,
    variants: {nodes: [variant(handle.toUpperCase())]},
    collections: {nodes: collections},
  });
  const rows = merchantFeedRows(
    [
      feedProduct('suprema-tee', [suprema, {handle: 't-shirts', title: 'T-Shirts', clothingKind: capsuleKind}], ['clara-mendes-clothing']),
      feedProduct('counter-diagonal-tee', [cd], ['clara-mendes-clothing', 'Counter-Diagonal']),
      // No collections read: the capsule tag still names it.
      feedProduct('tagged-tee', undefined, ['clara-mendes-clothing', 'Counter-Diagonal']),
      feedProduct('loose-tee', [{handle: 'sale', title: 'Sale', clothingKind: null}], ['clara-mendes-clothing']),
    ].map((p) => (p.collections.nodes ? p : {...p, collections: null})),
    'printful',
  );
  assert.deepEqual(rows.map((row) => [row.item_group_id, row.custom_label_0]), [
    ['suprema-tee', 'Suprema'],
    ['counter-diagonal-tee', 'Counter-Diagonal'],
    ['tagged-tee', 'Counter-Diagonal'],
    ['loose-tee', ''],
  ]);
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

test('Circle Rhythm credits Sophie Taeuber-Arp as inspiration, with brand-free art', async () => {
  const {capsuleStory} = await import('../app/lib/clothingEditorial.ts');
  const {existsSync} = await import('node:fs');
  const story = capsuleStory('circle-rhythm');
  assert.equal(story.credit, 'Inspired by Sophie Taeuber-Arp');
  assert.equal(story.colourwayChooser, false);
  const hero = clothingPageHero('circle-rhythm', 'hoodies and tees');
  assert.equal(hero.text, 'Hoodies and tees in one design of circles, rings and bars, inspired by Sophie Taeuber-Arp. Made for you after you order.');
  const copy = [story.credit, story.intro, hero.eyebrow, hero.text, hero.cta].join(' ');
  assert.doesNotMatch(copy, /\bart by\b|(?<!inspired )\bby sophie\b|\bpainted\b|\breproduction of (?!any)/i);
  assert.match(story.intro, /not a reproduction of any of her works/);
  assert.doesNotMatch(copy, /[€$]|\bEUR\b|\bUSD\b|clara mendes/i);
  for (const src of [story.band.src, story.accent.src]) {
    assert.match(src, /\.(jpe?g|png)$/, src);
    assert.ok(existsSync(resolve('public' + src)), `${src} is missing`);
  }
  // Looks image and collection hero: logo-credit mockups, labelled as such.
  const {collectionHero} = await import('../app/lib/collectionHeroes.ts');
  const page = collectionHero('circle-rhythm');
  assert.match(story.looksImage.caption, /digital mockups/i);
  assert.match(page.alt, /digital mockups/i);
  assert.match(page.eyebrow, /Inspired by Sophie Taeuber-Arp/);
  assert.doesNotMatch([page.eyebrow, page.subtitle, page.alt, story.looksImage.alt].join(' '), /\bart by\b|[€$]|\bEUR\b|\bUSD\b/i);
  for (const src of [story.looksImage.src, page.image, page.imageMobile]) {
    assert.match(src, /\.(jpe?g|png)$/, src);
    assert.ok(existsSync(resolve('public' + src)), `${src} is missing`);
  }
});

test('Free Abyss credits Kazimir Malevich as inspiration, with brand-free art', async () => {
  const {capsuleStory} = await import('../app/lib/clothingEditorial.ts');
  const {existsSync} = await import('node:fs');
  const story = capsuleStory('free-abyss');
  assert.equal(story.credit, 'Inspired by Kazimir Malevich');
  assert.equal(story.colourwayChooser, false);
  const hero = clothingPageHero('free-abyss', 'hoodies, tees and totes');
  assert.equal(hero.text, 'Hoodies, tees and totes in one Suprematist design, inspired by Kazimir Malevich. Made for you after you order.');
  const copy = [story.credit, story.intro, hero.eyebrow, hero.text, hero.cta].join(' ');
  assert.doesNotMatch(copy, /\bart by\b|(?<!inspired )\bby kazimir\b|\bpainted\b/i);
  assert.match(story.intro, /not a reproduction of a Malevich painting/);
  assert.doesNotMatch(copy, /[€$]|\bEUR\b|\bUSD\b|clara mendes/i);
  // Looks image and collection hero: logo-credit mockups, labelled as such.
  const {collectionHero} = await import('../app/lib/collectionHeroes.ts');
  const page = collectionHero('free-abyss');
  assert.match(story.looksImage.caption, /digital mockups/i);
  assert.match(page.alt, /digital mockups/i);
  assert.match(page.eyebrow, /Inspired by Kazimir Malevich/);
  assert.doesNotMatch([page.eyebrow, page.subtitle, page.alt, story.looksImage.alt].join(' '), /\bart by\b|[€$]|\bEUR\b|\bUSD\b/i);
  for (const src of [story.band.src, story.accent.src, story.looksImage.src, page.image, page.imageMobile]) {
    assert.match(src, /\.(jpe?g|png)$/, src);
    assert.ok(existsSync(resolve('public' + src)), `${src} is missing`);
  }
});

test('the lines show as compact tiles, with no colourway chooser', () => {
  const route = readFileSync(resolve('app/routes/clothing.tsx'), 'utf8');
  assert.match(route, /<li className="clothing-line-tile" key=\{line\.handle\}>/);
  // Each tile: looks image (lazy, below the fold), band, name, credit, links.
  assert.match(route, /className="clothing-line-tile-image"[\s\S]*?loading="lazy"/);
  assert.match(route, /to=\{href\('capsule', line\.handle\)\}/);
  assert.match(route, /to=\{`\/collections\/\$\{line\.handle\}`\}/);
  assert.doesNotMatch(route, /Choose a colourway|clothing-colourway|clothing-collection-looks/);
  // One filter bar: line chips and category tabs that narrow together.
  assert.match(route, /aria-label="Clothing lines" className="clothing-chips"/);
  assert.match(route, /aria-label="Clothing categories"/);
  const css = readFileSync(resolve('app/styles/clothing.css'), 'utf8');
  // Grid: 4 columns, 3 on tablets, 2 on phones.
  assert.match(css, /\.clothing-grid \{[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 1023px\) \{\s*\.clothing-grid \{[^}]*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 699px\) \{[\s\S]*?\.clothing-grid \{[^}]*repeat\(2, minmax\(0, 1fr\)\)/);
});

test('every card names its line, so two lines never share a title', () => {
  const card = readFileSync(resolve('app/components/ClothingProductCard.tsx'), 'utf8');
  assert.match(card, /<p className="clothing-card-line" aria-hidden="true">/);
  // Screen readers hear the line inside the title link instead.
  assert.match(card, /<span className="sr-only">, \{line\}<\/span>/);
});

test('retired Quiet Current pages redirect to /clothing, published or not', async () => {
  const {isRetiredClothingHandle, RETIRED_CLOTHING_PRODUCTS} = await import('../app/lib/clothing.ts');
  assert.deepEqual([...RETIRED_CLOTHING_PRODUCTS], [
    'quiet-current-high-waist-leggings',
    'quiet-current-studio-bra',
    'quiet-current-high-waist-biker-shorts',
    'quiet-current-studio-tank',
  ]);
  assert.equal(isRetiredClothingHandle('product', 'Quiet-Current-Studio-Bra'), true);
  assert.equal(isRetiredClothingHandle('collection', 'quiet-current'), true);
  assert.equal(isRetiredClothingHandle('product', 'counter-diagonal-tee'), false);
  // Both routes redirect before they query Shopify.
  const pdp = readFileSync(resolve('app/routes/products.$handle.tsx'), 'utf8');
  assert.match(pdp, /if \(isRetiredClothingHandle\('product', handle\)\) \{\s*throw redirect\('\/clothing', 301\);/);
  const collection = readFileSync(resolve('app/routes/collections.$handle.tsx'), 'utf8');
  assert.match(collection, /if \(isRetiredClothingHandle\('collection', handle\)\) \{\s*throw redirect\('\/clothing', 301\);/);
});

test('line chips count inside the chosen tab and drop empty lines', async () => {
  const {clothingLineChips} = await import('../app/lib/clothingPresentation.ts');
  assert.deepEqual(clothingLineChips(newestFirst, ''), [
    {handle: 'counter-diagonal', title: 'Counter-Diagonal', count: 2},
    {handle: 'rhythm', title: 'Rhythm', count: 1},
    {handle: 'suprema', title: 'Suprema', count: 2},
    {handle: 'sea-line', title: 'Sea Line', count: 1},
  ]);
  // Hoodies only: Rhythm and Sea Line have none, so they drop out.
  assert.deepEqual(clothingLineChips(newestFirst, 'hoodies-sweatshirts').map((chip) => `${chip.handle}:${chip.count}`), ['counter-diagonal:1', 'suprema:1']);
});

test('old single-category links open their group; unknown values open nothing', async () => {
  const {clothingGroupSlug} = await import('../app/lib/clothing.ts');
  assert.equal(clothingGroupSlug('hoodies'), 'hoodies-sweatshirts');
  assert.equal(clothingGroupSlug('Sweatshirts'), 'hoodies-sweatshirts');
  assert.equal(clothingGroupSlug('t-shirts'), 'tees-long-sleeves');
  assert.equal(clothingGroupSlug('long-sleeves'), 'tees-long-sleeves');
  assert.equal(clothingGroupSlug('leggings'), 'activewear');
  assert.equal(clothingGroupSlug('accessories'), 'accessories');
  assert.equal(clothingGroupSlug('tees-long-sleeves'), 'tees-long-sleeves');
  assert.equal(clothingGroupSlug('bogus'), null);
  assert.equal(clothingGroupSlug(''), null);
});

test('/artists lists the clothing artists apart, as "Clothing inspired by", never as museum works', async () => {
  const {CLOTHING_ARTISTS} = await import('../app/lib/clothingArtists.ts');
  assert.deepEqual(CLOTHING_ARTISTS.map((artist) => [artist.capsule, artist.name]), [
    ['counter-diagonal', 'Theo van Doesburg'],
    ['free-abyss', 'Kazimir Malevich'],
    ['circle-rhythm', 'Sophie Taeuber-Arp'],
  ]);
  for (const artist of CLOTHING_ARTISTS) {
    assert.match(artist.note, /our own/, artist.name);
    assert.doesNotMatch(artist.note, /\bart by\b|reproduction of (?!a|any)|museum/i, artist.name);
    assert.match(artist.meta[0], /^\d{4}–\d{4}$/, artist.name);
  }
  const page = readFileSync(resolve('app/routes/artists._index.tsx'), 'utf8');
  assert.match(page, /Clothing inspired by\s*<\/h2>/);
  assert.match(page, /<h2 className="artists-group-title">Museum works<\/h2>/);
  // Each clothing row opens its line's collection.
  assert.match(page, /path: `\/collections\/\$\{entry\.capsule\}`/);
});
