// Mobile shopping pass (2026-10): the purchase-safety and presentation rules
// behind the phone layout, plus the source contracts that keep the drawer's
// checkout reachable and hidden overlays out of reach.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {
  CART_LINE_MAX_QUANTITY,
  cartItemCountLabel,
  cartLineThumbnail,
  cartQuantitySteps,
  isCartLineUnavailable,
  sizedImageUrl,
  visibleCartOptions,
} from '../app/lib/cartPresentation.ts';
import {
  CART_OFFLINE_MESSAGE,
  shouldHoldCartSubmission,
} from '../app/lib/cartFormErrors.ts';
import {cardQuickAddMode} from '../app/lib/productCardPricing.ts';
import {
  describeOptionValues,
  findVariantForOption,
  selectedOptionsSummary,
} from '../app/lib/variantOptions.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(ROOT, file), 'utf8');

const eur = (amount) => ({amount, currencyCode: 'EUR'});
const size = (value, amount, availableForSale = true) => ({
  availableForSale,
  price: eur(amount),
  selectedOptions: [
    {name: 'Size', value},
    {name: 'Presentation', value: 'Unframed'},
  ],
});

test('card quick-add never adds a variant the shopper did not choose', () => {
  const released = (n) =>
    Array.from({length: n}, () => ({
      availableForSale: true,
      price: eur('39.99'),
    }));

  // Art prints: sizes of the artwork on the card; the first is the "From".
  assert.equal(
    cardQuickAddMode(
      {productType: 'Art Prints', sizeVariants: {nodes: released(3)}},
      {availableForSale: true},
    ),
    'add',
  );
  // A phone case's variants are phone models: adding the first would ship a
  // case for a phone the customer may not own.
  assert.equal(
    cardQuickAddMode(
      {productType: 'Phone Cases', sizeVariants: {nodes: released(10)}},
      {availableForSale: true},
    ),
    'choose',
  );
  // Canvas and cards vary by artwork.
  assert.equal(
    cardQuickAddMode(
      {productType: 'Canvas Art', sizeVariants: {nodes: released(5)}},
      {availableForSale: true},
    ),
    'choose',
  );
  // One purchasable variant (a book nook, a pot) adds directly.
  assert.equal(
    cardQuickAddMode(
      {productType: 'Book Nooks', sizeVariants: {nodes: released(1)}},
      {availableForSale: true},
    ),
    'add',
  );
  // The first size sold out while others remain: open the page.
  assert.equal(
    cardQuickAddMode(
      {
        productType: 'Art Prints',
        sizeVariants: {
          nodes: [
            {availableForSale: false, price: eur('29.99')},
            {availableForSale: true, price: eur('39.99')},
          ],
        },
      },
      {availableForSale: false},
    ),
    'choose',
  );
  // Nothing purchasable at all.
  assert.equal(
    cardQuickAddMode(
      {sizeVariants: {nodes: [{availableForSale: false, price: eur('9')}]}},
      {availableForSale: false},
    ),
    'unavailable',
  );
  // Snapshot cards without a variant sample fall back to the variant itself.
  assert.equal(cardQuickAddMode({}, {availableForSale: true}), 'add');
});

test('size chips show prices only when the sizes cost different amounts', () => {
  const product = {
    options: [
      {
        name: 'Size',
        optionValues: [
          {name: '8 × 10 in'},
          {name: '16 × 20 in'},
          {name: '20 × 24 in'},
        ],
      },
    ],
    variants: [
      size('8 × 10 in', '29.99'),
      size('16 × 20 in', '39.99'),
      size('20 × 24 in', '49.99', false),
    ],
  };
  const selected = new Map([
    ['Size', '16 × 20 in'],
    ['Presentation', 'Unframed'],
  ]);
  const {showPrices, values} = describeOptionValues({
    option: product.options[0],
    selectedMap: selected,
    variants: product.variants,
  });
  assert.equal(showPrices, true);
  assert.deepEqual(
    values.map((value) => [
      value.name,
      value.price.amount,
      value.available,
      value.selected,
    ]),
    [
      ['8 × 10 in', '29.99', true, false],
      ['16 × 20 in', '39.99', true, true],
      ['20 × 24 in', '49.99', false, false],
    ],
  );
  // Every link carries the full option set of the variant it leads to.
  assert.deepEqual(values[0].targetOptions, [
    {name: 'Size', value: '8 × 10 in'},
    {name: 'Presentation', value: 'Unframed'},
  ]);

  const samePrice = describeOptionValues({
    option: {
      name: 'Artwork',
      optionValues: [{name: 'Quiet Form I'}, {name: 'Patina Blue I'}],
    },
    selectedMap: new Map(),
    variants: [
      {
        availableForSale: true,
        price: eur('89.00'),
        selectedOptions: [{name: 'Artwork', value: 'Quiet Form I'}],
      },
      {
        availableForSale: true,
        price: eur('89.00'),
        selectedOptions: [{name: 'Artwork', value: 'Patina Blue I'}],
      },
    ],
  });
  assert.equal(samePrice.showPrices, false);
});

test('option lookup keeps the other selections, then falls back', () => {
  const variants = [
    {
      availableForSale: true,
      selectedOptions: [
        {name: 'Size', value: 'S'},
        {name: 'Finish', value: 'Black'},
      ],
    },
    {
      availableForSale: true,
      selectedOptions: [
        {name: 'Size', value: 'L'},
        {name: 'Finish', value: 'Natural'},
      ],
    },
  ];
  const keeps = findVariantForOption({
    optionName: 'Size',
    optionValue: 'L',
    selectedMap: new Map([['Finish', 'Natural']]),
    variants,
  });
  assert.equal(keeps, variants[1]);
  const fallback = findVariantForOption({
    optionName: 'Size',
    optionValue: 'S',
    selectedMap: new Map([['Finish', 'Natural']]),
    variants,
  });
  assert.equal(fallback, variants[0]);
});

test('the sticky bar and cart name exactly what will be bought', () => {
  assert.equal(
    selectedOptionsSummary(
      [
        {name: 'Size', value: '16 × 20 in'},
        {name: 'Presentation', value: 'Unframed'},
      ],
      ['Presentation'],
    ),
    '16 × 20 in',
  );
  assert.equal(
    selectedOptionsSummary([{name: 'Title', value: 'Default Title'}]),
    '',
  );
  assert.deepEqual(
    visibleCartOptions([
      {name: 'Title', value: 'Default Title'},
      {name: 'Phone Model', value: 'iPhone 16 Pro'},
    ]),
    [{name: 'Phone Model', value: 'iPhone 16 Pro'}],
  );
  assert.equal(cartItemCountLabel(1), '1 item');
  assert.equal(cartItemCountLabel(3), '3 items');
});

test('cart thumbnails show the artwork, not a speck on a wall', () => {
  const flat = {url: 'https://cdn.shopify.com/flat.jpg'};
  const room = {url: 'https://cdn.shopify.com/room.jpg'};
  const curated = {url: '/images/curated/kit.display.webp'};
  assert.equal(
    cartLineThumbnail({
      featuredImage: flat,
      productType: 'Art Prints',
      variantImage: room,
    }),
    flat,
  );
  // A phone case variant image shows the chosen artwork on the case.
  assert.equal(
    cartLineThumbnail({
      featuredImage: flat,
      productType: 'Phone Cases',
      variantImage: room,
    }),
    room,
  );
  assert.equal(
    cartLineThumbnail({
      curatedImage: curated,
      featuredImage: flat,
      variantImage: room,
    }),
    curated,
  );
  assert.equal(cartLineThumbnail({}), null);
});

test('cart quantity and availability states stay inside what Shopify accepts', () => {
  assert.deepEqual(cartQuantitySteps(1), {
    canDecrease: false,
    canIncrease: true,
    decrease: 1,
    increase: 2,
  });
  assert.equal(cartQuantitySteps(CART_LINE_MAX_QUANTITY).canIncrease, false);
  assert.equal(
    cartQuantitySteps(CART_LINE_MAX_QUANTITY).increase,
    CART_LINE_MAX_QUANTITY,
  );
  assert.equal(
    isCartLineUnavailable({merchandise: {availableForSale: false}}),
    true,
  );
  // An optimistic line has not been confirmed yet and is never flagged.
  assert.equal(
    isCartLineUnavailable({
      isOptimistic: true,
      merchandise: {availableForSale: false},
    }),
    false,
  );
  assert.equal(
    isCartLineUnavailable({merchandise: {availableForSale: true}}),
    false,
  );
});

test('thumbnails ask Shopify for a small file and leave own files alone', () => {
  assert.equal(
    sizedImageUrl('https://cdn.shopify.com/s/files/a.jpg?v=1', 96),
    'https://cdn.shopify.com/s/files/a.jpg?v=1&width=96',
  );
  assert.equal(
    sizedImageUrl('/images/curated/a.webp', 96),
    '/images/curated/a.webp',
  );
});

test('the drawer pins checkout and blocks repeat or premature taps', () => {
  const summary = read('app/components/CartSummary.tsx');
  const main = read('app/components/CartMain.tsx');
  const css = read('app/styles/app.css');
  assert.match(main, /<CartCheckoutBar cart=\{cart\} layout=\{layout\} \/>/);
  assert.match(
    css,
    /\.cart-main--aside \.cart-details \{[^}]*overflow-y: auto/s,
  );
  assert.match(css, /\.cart-checkout-bar \{[^}]*flex: none/s);
  // A second tap, or a tap while a quantity change is still in flight,
  // must not start another navigation.
  assert.match(summary, /if \(busy\) \{\s*event\.preventDefault\(\);/);
  assert.match(summary, /cart\?\.isOptimistic/);
  // Coming back from checkout restores a usable button.
  assert.match(summary, /addEventListener\('pageshow', reset\)/);
  assert.match(summary, /Shipping is calculated at checkout\./);
});

test('hidden purchase bars cannot be reached by keyboard or tap', () => {
  for (const file of [
    'app/routes/products.$handle.tsx',
    'app/routes/products.art-tough-phone-case.tsx',
    'app/components/SkyStudio.tsx',
  ]) {
    const source = read(file);
    assert.match(
      source,
      /\{inert: ''\}/,
      `${file} sticky bar must be inert while hidden`,
    );
    assert.match(source, /aria-hidden=\{show\w+ \? undefined : true\}/, file);
  }
});

test('the phone case asks for the phone instead of guessing one', () => {
  const source = read('app/routes/products.art-tough-phone-case.tsx');
  assert.ok(
    !source.includes('htmlFor="tough-case-phone">\n'),
    'label posing as a button',
  );
  assert.match(source, /onClick=\{choosePhone\}/);
  assert.match(source, /showPicker/);
});

test('phone shop toolbar scrolls away and the grid keeps two columns', () => {
  const source = read('app/routes/collections.all.tsx');
  const phone = source.slice(source.indexOf('/* ── Mobile: compact hero'));
  assert.match(phone, /\.cv-toolbar \{[^}]*position: relative;/s);
  assert.match(phone, /\.cv-type-tabs \{[^}]*overflow-x: auto;/s);
  assert.ok(
    !/grid-template-columns: 1fr;/.test(phone),
    'single-column grid on small phones',
  );
  assert.match(source, /className=\{`cv-jump/);
});

test('offline cart submissions are held instead of losing the page', () => {
  assert.equal(
    shouldHoldCartSubmission({action: '/cart', online: false}),
    true,
  );
  assert.equal(
    shouldHoldCartSubmission({
      action: 'https://shopclaramendes.com/cart',
      online: false,
    }),
    true,
  );
  // Online, or a form that is not the cart, goes through untouched.
  assert.equal(
    shouldHoldCartSubmission({action: '/cart', online: true}),
    false,
  );
  assert.equal(
    shouldHoldCartSubmission({action: '/search', online: false}),
    false,
  );
  assert.equal(shouldHoldCartSubmission({action: null, online: false}), false);
  assert.match(CART_OFFLINE_MESSAGE, /cart is unchanged/);

  const guard = read('app/components/CartConnectionGuard.tsx');
  // Capture phase, so React never starts the fetcher submission.
  assert.match(guard, /addEventListener\('submit', onSubmit, true\)/);
  assert.match(guard, /'routes\/cart'/);
  assert.match(guard, /link\.rel = 'modulepreload'/);
  assert.match(
    read('app/components/ClaraShell.tsx'),
    /<CartConnectionGuard \/>/,
  );
});
