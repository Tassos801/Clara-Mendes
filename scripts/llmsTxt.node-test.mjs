import assert from 'node:assert/strict';
import test from 'node:test';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  ART_PRODUCT_CATALOG,
  FAMILY_SPECS,
} from '../app/lib/artProductCatalog.ts';
import {publicArtists} from '../app/lib/artistShops.ts';
import {CLOTHING_ARTISTS} from '../app/lib/clothingArtists.ts';
import {buildLlmsTxt, clothingSummary, numberWord} from '../app/lib/llmsTxt.ts';
import {releasedMuseumFamilies} from '../app/lib/museumProductFacts.ts';
import {PRINT_CATALOG} from '../app/lib/printCatalog.ts';
import {
  APPAREL_DISPATCH_WINDOW_BUSINESS_DAYS,
  DELIVERY_EU_BUSINESS_DAYS,
  DELIVERY_US_BUSINESS_DAYS,
  DISPATCH_WINDOW_BUSINESS_DAYS,
  PRINTFUL_SUBLIMATION_DISPATCH_WINDOW_BUSINESS_DAYS,
} from '../app/lib/storefrontBasics.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const text = buildLlmsTxt();

/** The museum-product-types bullet of a family label. */
function familyBullet(output, label) {
  const start = output.indexOf(
    `- ${label.charAt(0).toUpperCase()}${label.slice(1)} (`,
  );
  assert.ok(start >= 0, `no "${label}" bullet`);
  const end = output.indexOf('\n- ', start + 1);
  return output.slice(start, end < 0 ? undefined : end);
}

test('llms.txt is a route, not a static file that goes stale', () => {
  assert.equal(existsSync(path.join(ROOT, 'public/llms.txt')), false);
  assert.ok(existsSync(path.join(ROOT, 'app/routes/[llms.txt].tsx')));
});

test('every released museum product family is listed with an example product', () => {
  const released = new Set(
    ART_PRODUCT_CATALOG.products
      .filter((product) => product.released === true)
      .map((product) => product.family),
  );
  assert.ok(released.size > 0);
  const families = releasedMuseumFamilies();
  for (const family of released) {
    const facts = families.find((entry) => entry.family === family);
    assert.ok(facts, `${family} missing from releasedMuseumFamilies`);
    const bullet = familyBullet(text, facts.label);
    const example = ART_PRODUCT_CATALOG.products.find(
      (product) => product.family === family && product.released === true,
    );
    assert.ok(
      bullet.includes(`/products/${example.handle})`),
      `${family} has no example link`,
    );
  }
  // The released museum art prints too.
  const prints = PRINT_CATALOG.collections.filter(
    (collection) =>
      collection.kind === 'museum' &&
      collection.prints.some((print) => print.released === true),
  );
  if (prints.length) assert.match(text, /^- Art prints \(/m);
});

test('the throw blanket, the first real sale, is named with its size', () => {
  const bullet = familyBullet(text, 'throw blankets');
  assert.match(bullet, /50 × 60 in/);
  assert.match(bullet, /\/products\/the-great-wave-off-kanagawa-blanket\)/);
});

test('every artist with released products is listed with an artist-shop link', () => {
  const artists = publicArtists();
  assert.ok(artists.length >= 4);
  for (const {artist} of artists)
    assert.ok(
      text.includes(
        `[${artist.name}](https://shopclaramendes.com/artists/${artist.slug})`,
      ),
      `${artist.name} missing`,
    );
});

test('a newly released family and artist appear without editing llms.txt', () => {
  // Release every Line and Colour framed print in a copy of the catalog.
  const artProducts = {
    ...ART_PRODUCT_CATALOG,
    products: ART_PRODUCT_CATALOG.products.map((product) =>
      product.collection === 'line-and-colour' &&
      product.family === 'framed-print'
        ? {...product, released: true}
        : product,
    ),
  };
  const before = familyBullet(text, 'framed prints');
  const after = familyBullet(buildLlmsTxt({artProducts}), 'framed prints');
  assert.doesNotMatch(before, /Line and Colour/);
  assert.match(after, /Floating World and Line and Colour/);
});

test('dispatch windows and reach come from the code, per family', () => {
  for (const family of releasedMuseumFamilies()) {
    const bullet = familyBullet(text, family.label);
    assert.ok(
      bullet.includes(`dispatched within ${family.dispatch} business days`),
      family.family,
    );
    const reach =
      family.family === 'print'
        ? 'worldwide'
        : FAMILY_SPECS[family.family].shippingReach;
    if (reach === 'eu') assert.match(bullet, /within the EU only/);
    if (reach === 'selected') assert.match(bullet, /selected countries/);
  }
  assert.match(
    familyBullet(text, 'throw blankets'),
    new RegExp(
      `within ${PRINTFUL_SUBLIMATION_DISPATCH_WINDOW_BUSINESS_DAYS} business`,
    ),
  );
  assert.match(
    familyBullet(text, 'cushions'),
    new RegExp(`within ${APPAREL_DISPATCH_WINDOW_BUSINESS_DAYS} business`),
  );
  assert.match(
    familyBullet(text, 'framed prints'),
    new RegExp(`within ${DISPATCH_WINDOW_BUSINESS_DAYS} business`),
  );
  assert.ok(
    text.includes(
      `${DELIVERY_EU_BUSINESS_DAYS} business days after dispatch across the EU`,
    ),
  );
  assert.ok(text.includes(`estimated at ${DELIVERY_US_BUSINESS_DAYS}`));
  assert.ok(text.includes('buyers in the United States see USD'));
});

test('clothing lines and their artists follow the listed products', () => {
  const capsule = (handle, title) => ({
    handle,
    title,
    clothingKind: {type: 'single_line_text_field', value: 'capsule'},
  });
  const products = [
    {
      productType: 'T-Shirts',
      tags: [],
      collections: {nodes: [capsule('free-abyss', 'Free Abyss')]},
    },
    {
      productType: 'Hoodies',
      tags: [],
      collections: {nodes: [capsule('counter-diagonal', 'Counter-Diagonal')]},
    },
    {
      productType: 'Sports Bra',
      tags: [],
      collections: {nodes: [capsule('counter-diagonal', 'Counter-Diagonal')]},
    },
  ];
  const clothing = clothingSummary(products);
  assert.deepEqual(clothing.types, ['hoodies', 't-shirts', 'sports bras']);
  assert.deepEqual(
    clothing.lines.map((line) => line.handle),
    ['counter-diagonal', 'free-abyss'],
  );
  const output = buildLlmsTxt({clothing});
  assert.match(output, /hoodies, t-shirts and sports bras/);
  assert.match(output, /Counter-Diagonal \(inspired by Theo van Doesburg\)/);
  for (const entry of CLOTHING_ARTISTS) {
    const listed = clothing.lines.some((line) => line.handle === entry.capsule);
    assert.equal(output.includes(`- ${entry.name} (`), listed, entry.name);
  }
  // A failed clothing read keeps a generic, true line.
  assert.match(
    buildLlmsTxt({clothing: null}),
    /made-to-order clothing in\n {2}our own designs/,
  );
});

test('the gift page is listed, and no hand-typed counts', () => {
  assert.match(text, /\[Art gifts\]\(https:\/\/shopclaramendes\.com\/gifts\)/);
  assert.equal(numberWord(24), 'twenty-four');
  assert.match(text, /^> Twenty-four works of our own across seven capsules/m);
});
