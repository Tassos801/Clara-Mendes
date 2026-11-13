import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ART_PRODUCT_CATALOG,
  ART_PRODUCT_FAMILIES,
} from '../app/lib/artProductCatalog.ts';
import {
  clipAtWord,
  museumMetaDescription,
  museumProductFacts,
  sizePhrase,
} from '../app/lib/museumProductFacts.ts';
import {PRINT_CATALOG, printHandle} from '../app/lib/printCatalog.ts';
import {titleWithArtist} from '../app/lib/artistShops.ts';
import {buildSeoMeta} from '../app/lib/seo.ts';

// What each family's description must open with.
const LEADS = {
  'framed-print': /^Framed art print, 16 × 20 in: /,
  canvas: /^Canvas print, 16 × 20 in: /,
  'greeting-card': /^Greeting card, 5 × 7 in: /,
  postcard: /^Postcard, 7 × 5 in: /,
  'phone-case':
    /^Tough phone case for iPhone, Samsung Galaxy and Google Pixel: /,
  mug: /^Mug, 11 oz: /,
  'hanger-print': /^Print with a wooden hanger, A3 or (76 × 51|60 × 90) cm: /,
  'acrylic-print': /^Acrylic print, 8 × 12, 12 × 16 or 16 × 24 in: /,
  'metal-print': /^Metal print, 8 × 12 in: /,
  'printful-mug': /^Mug, 11 oz: /,
  cushion: /^Cushion, 18 × 18 or 22 × 22 in: /,
  blanket: /^Throw blanket, 50 × 60 in: /,
  print: /^Art print, 8 × 10, 16 × 20 or 20 × 24 in: /,
};

/** Released museum handles, one per family (and art print). */
function releasedSamples() {
  const samples = new Map();
  for (const product of ART_PRODUCT_CATALOG.products)
    if (product.released && !samples.has(product.family))
      samples.set(product.family, product.handle);
  for (const collection of PRINT_CATALOG.collections)
    if (collection.kind === 'museum')
      for (const print of collection.prints)
        if (print.released && !samples.has('print'))
          samples.set('print', printHandle(print));
  return samples;
}

function assertGoodDescription(description, label) {
  assert.ok(description.length <= 155, `${label}: ${description.length} chars`);
  // Ends on a full sentence or a marked cut after a whole word.
  assert.match(description, /(\.|[^\s.,;:]…)$/u, `${label}: ${description}`);
  assert.doesNotMatch(description, /\.\.\.$/);
}

test('every released museum family leads with type, size, work and artist', () => {
  const samples = releasedSamples();
  assert.ok(samples.size >= 12, `only ${samples.size} families released`);
  for (const [family, handle] of samples) {
    const description = museumMetaDescription(handle);
    const facts = museumProductFacts(handle);
    assert.ok(description, `${family}: no description`);
    assert.match(description, LEADS[family], `${family}: ${description}`);
    assert.ok(description.includes(`${facts.work} by ${facts.artist}`), family);
    assertGoodDescription(description, family);
    // buildSeoMeta must pass it through untouched.
    const meta = buildSeoMeta({description, title: 't', url: 'https://x'});
    assert.equal(
      meta.find((tag) => tag.name === 'description').content,
      description,
    );
  }
});

test('every family in the catalog has a lead pattern', () => {
  for (const family of ART_PRODUCT_FAMILIES) assert.ok(LEADS[family], family);
});

test('the Great Wave blanket says it is a 50 × 60 in throw blanket', () => {
  const description = museumMetaDescription(
    'the-great-wave-off-kanagawa-blanket',
  );
  assert.match(
    description,
    /^Throw blanket, 50 × 60 in: The Great Wave off Kanagawa by Katsushika Hokusai/,
  );
  assertGoodDescription(description, 'blanket');
});

test('every released museum product gets a description within limits', () => {
  let count = 0;
  for (const product of ART_PRODUCT_CATALOG.products) {
    if (!product.released) continue;
    assertGoodDescription(
      museumMetaDescription(product.handle),
      product.handle,
    );
    count += 1;
  }
  assert.ok(count > 100);
});

test('unreleased, studio and unknown handles keep their own copy', () => {
  const unreleased = ART_PRODUCT_CATALOG.products.find(
    (product) => !product.released,
  );
  assert.equal(museumMetaDescription(unreleased.handle), null);
  assert.equal(museumMetaDescription('orbital-silence-art-print'), null);
  assert.equal(museumMetaDescription('no-such-product'), null);
  assert.equal(museumMetaDescription(null), null);
});

test('size phrases and word-boundary cuts', () => {
  assert.equal(sizePhrase(['8 × 12 in', '12 × 16 in']), '8 × 12 or 12 × 16 in');
  assert.equal(
    sizePhrase(['A3 (42 × 29.7 cm)', '76 × 51 cm']),
    'A3 or 76 × 51 cm',
  );
  assert.equal(clipAtWord('one two three four', 12), 'one two…');
  assert.equal(clipAtWord('short', 12), 'short');
});

test('buildSeoMeta never cuts a word in half', () => {
  const long = `${'word '.repeat(40)}end`;
  const meta = buildSeoMeta({description: long, title: 't', url: 'https://x'});
  const content = meta.find((tag) => tag.name === 'description').content;
  assert.ok(content.length <= 155);
  assert.match(content, /word\.\.\.$/);
});

test('museum page titles name the artist; studio titles stay as they are', () => {
  assert.equal(
    titleWithArtist('Irises Throw Blanket', 'irises-blanket'),
    'Irises Throw Blanket by Van Gogh',
  );
  assert.equal(
    titleWithArtist('The Milkmaid Mug', 'the-milkmaid-mug'),
    'The Milkmaid Mug by Vermeer',
  );
  assert.equal(
    titleWithArtist(
      'The Great Wave off Kanagawa Throw Blanket',
      'the-great-wave-off-kanagawa-blanket',
    ),
    'The Great Wave off Kanagawa Throw Blanket by Hokusai',
  );
  // An artist tag covers a product the registry does not list.
  assert.equal(
    titleWithArtist('Some Work Cushion', 'unlisted-cushion', ['Piet Mondrian']),
    'Some Work Cushion by Mondrian',
  );
  // Never twice.
  assert.equal(
    titleWithArtist('Irises by Van Gogh', 'irises-blanket'),
    'Irises by Van Gogh',
  );
  assert.equal(
    titleWithArtist('Quiet Form I Art Print', 'quiet-form-i-art-print'),
    'Quiet Form I Art Print',
  );
});

test('a title too long for the brand suffix keeps its words', () => {
  const title = (meta) => meta.find((tag) => 'title' in tag).title;
  const ogTitle = (meta) =>
    meta.find((tag) => tag.property === 'og:title').content;
  const short = buildSeoMeta({
    description: 'd',
    title: 'Irises Mug by Van Gogh',
    url: 'https://x',
  });
  assert.equal(title(short), 'Irises Mug by Van Gogh | Clara Mendes');
  const long = buildSeoMeta({
    description: 'd',
    title: 'The Great Wave off Kanagawa Throw Blanket by Hokusai',
    url: 'https://x',
  });
  assert.equal(
    title(long),
    'The Great Wave off Kanagawa Throw Blanket by Hokusai',
  );
  assert.equal(
    ogTitle(long),
    'The Great Wave off Kanagawa Throw Blanket by Hokusai',
  );
});
