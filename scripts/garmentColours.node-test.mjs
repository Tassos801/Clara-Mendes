import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {
  garmentColourHex,
  imageColour,
  imagesForColour,
  isColourOptionName,
} from '../app/lib/garmentColours.ts';
import {clothingSwatchBackground} from '../app/lib/clothingPresentation.ts';
import {merchantFeedRows} from '../app/lib/merchantFeed.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(ROOT, file), 'utf8');

test('fabric colours take Printful catalog hex values by name', () => {
  // The live Counter-Diagonal blanks (Printful v2 catalog, 2026-11-06).
  assert.equal(garmentColourHex('Dust'), '#f4e7d6');
  assert.equal(garmentColourHex('Bone'), '#f5e8ce');
  assert.equal(garmentColourHex('Faded Bone'), '#f3ede4');
  assert.equal(garmentColourHex('Ivory'), '#fff4d9');
  assert.equal(garmentColourHex('Oyster'), '#f3e6cf');
  assert.equal(garmentColourHex('Ecru'), '#fff2d9');
  assert.equal(garmentColourHex('Natural Raw'), '#fff5e8');
  // Case and spacing do not matter; unknown names have no swatch.
  assert.equal(garmentColourHex('  faded   BONE '), '#f3ede4');
  assert.equal(garmentColourHex('Sunset'), null);
  assert.equal(garmentColourHex(''), null);
  assert.equal(garmentColourHex(null), null);
});

test('the swatch order: Shopify swatch, fabric hex, palette, split colourway', () => {
  assert.equal(clothingSwatchBackground('Dust', '#123456'), '#123456');
  assert.equal(clothingSwatchBackground('Dust'), '#f4e7d6');
  // A fabric name beats the brand palette's tone of the same name.
  assert.equal(clothingSwatchBackground('Ivory'), '#fff4d9');
  // Palette-only names still resolve, and Quiet Current keeps its split dot.
  assert.equal(clothingSwatchBackground('Clay'), '#9C6F5D');
  assert.equal(
    clothingSwatchBackground('Moss / Mist'),
    'linear-gradient(135deg, #6F7769 0% 50%, #DFE4DC 50% 100%)',
  );
  assert.equal(clothingSwatchBackground('Black / Sunset'), null);
});

test('colour options are found by name', () => {
  for (const name of ['Colour', 'Color', 'colourway', ' Colorway ']) {
    assert.equal(isColourOptionName(name), true, name);
  }
  for (const name of ['Size', 'Colours', 'Finish', '', null]) {
    assert.equal(isColourOptionName(name), false, String(name));
  }
});

const colours = ['Dust', 'Black', 'Bone', 'Faded Bone', 'Off White'];
const img = (altText) => ({altText, url: `https://cdn.example/${altText}.jpg`});

test('an image belongs to the longest colour its alt text names', () => {
  assert.equal(
    imageColour(img('Hoodie in Faded Bone: back view'), colours),
    'Faded Bone',
  );
  assert.equal(
    imageColour(img('Hoodie in Bone, worn: front'), colours),
    'Bone',
  );
  assert.equal(
    imageColour(img('Hoodie in black, laid flat'), colours),
    'Black',
  );
  assert.equal(imageColour(img('Hoodie in Off  White'), colours), 'Off White');
  // Whole words only, and a shot that names no colour is shared.
  assert.equal(imageColour(img('Blackened steel buckle'), colours), null);
  assert.equal(imageColour(img('Hoodie, inside label'), colours), null);
  assert.equal(imageColour({altText: null}, colours), null);
});

test('a colour gallery keeps its own and the shared images, in order', () => {
  const images = [
    img('Hoodie in Dust: back'),
    img('Hoodie in Black: back'),
    img('Hoodie, label close-up'),
    img('Hoodie in Dust, worn: front'),
    img('Hoodie in Black, worn: front'),
  ];
  assert.deepEqual(
    imagesForColour(images, colours, 'Black').map((i) => i.altText),
    [
      'Hoodie in Black: back',
      'Hoodie, label close-up',
      'Hoodie in Black, worn: front',
    ],
  );
  assert.deepEqual(
    imagesForColour(images, colours, 'dust').map((i) => i.altText),
    [
      'Hoodie in Dust: back',
      'Hoodie, label close-up',
      'Hoodie in Dust, worn: front',
    ],
  );
  // A colour with no images of its own keeps the shared ones only.
  assert.deepEqual(
    imagesForColour(images, colours, 'Bone').map((i) => i.altText),
    ['Hoodie, label close-up'],
  );
});

test('a gallery stays whole when no image names a colour, or there is one colour', () => {
  const plain = [img('Front'), img('Back'), img('Detail')];
  assert.deepEqual(imagesForColour(plain, colours, 'Black'), plain);
  const dust = [img('Hoodie in Dust: back'), img('Hoodie in Black: back')];
  assert.deepEqual(imagesForColour(dust, ['Dust'], 'Dust'), dust);
  assert.deepEqual(imagesForColour(dust, colours, null), dust);
});

test('the product page reads every image of a garment in several colours', () => {
  const route = read('app/routes/products.$handle.tsx');
  assert.match(route, /query ProductColourGallery[\s\S]*images\(first: 100\)/);
  assert.match(
    route,
    /imagesForColour\(allImages, colourNames, selectedColour\)/,
  );
  // Shopify's own swatch reaches the picker when the merchant sets one.
  assert.match(route, /optionValues \{\s*id\s*name\s*swatch \{\s*color\s*\}/);
  assert.match(route, /swatch=\{isApparel \? colourSwatch : undefined\}/);
});

test('no local colour fixture reaches the code', () => {
  for (const file of [
    'app/lib/clothing.server.ts',
    'app/routes/products.$handle.tsx',
    'app/routes/clothing.tsx',
  ]) {
    assert.doesNotMatch(read(file), /devColourFixture|DEV-FIXTURE/, file);
  }
});

test('a garment in two colours feeds one row per colour and size', () => {
  let n = 0;
  const v = (sku, Colour, Size) => ({
    id: `gid://shopify/ProductVariant/${++n}`,
    sku,
    availableForSale: true,
    price: {amount: '55.99', currencyCode: 'EUR'},
    selectedOptions: [
      {name: 'Colour', value: Colour},
      {name: 'Size', value: Size},
    ],
    image: {url: `https://cdn.example/${Colour}.jpg`},
  });
  const rows = merchantFeedRows(
    [
      {
        handle: 'counter-diagonal-heavyweight-hoodie',
        title: 'Counter-Diagonal Heavyweight Hoodie',
        productType: 'Hoodies',
        tags: ['clara-mendes-clothing', 'Counter-Diagonal', 'Made to order'],
        description: 'Hoodie.',
        featuredImage: {url: 'https://cdn.example/hoodie.jpg'},
        storefrontApproved: {type: 'boolean', value: 'true'},
        fulfillmentVerified: {type: 'boolean', value: 'true'},
        variants: {
          nodes: [
            v('CD-HW-DUST-M', 'Dust', 'M'),
            v('CD-HW-BLACK-M', 'Black', 'M'),
          ],
        },
      },
    ],
    'printful',
  );
  assert.deepEqual(
    rows.map((row) => [
      row.id,
      row.item_group_id,
      row.color,
      row.size,
      row.image_link,
      row.custom_label_0,
    ]),
    [
      [
        'CD-HW-DUST-M',
        'counter-diagonal-heavyweight-hoodie',
        'Dust',
        'M',
        'https://cdn.example/Dust.jpg',
        'Counter-Diagonal',
      ],
      [
        'CD-HW-BLACK-M',
        'counter-diagonal-heavyweight-hoodie',
        'Black',
        'M',
        'https://cdn.example/Black.jpg',
        'Counter-Diagonal',
      ],
    ],
  );
  assert.match(rows[1].link, /Colour=Black&Size=M$/);
  assert.equal(rows[1].title, 'Counter-Diagonal Heavyweight Hoodie — M, Black');
});
