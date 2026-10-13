import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import * as family from '../app/lib/artProductCatalog.ts';
import * as registryModule from '../app/lib/artRegistry.ts';
import * as shops from '../app/lib/artistShops.ts';
import {
  computeSellableHandles,
  isUnreleasedExtensionHandle,
} from '../app/lib/catalogFilters.ts';
import {MUSEUM_CROPS} from '../app/lib/museumCrops.ts';
import {PRINT_CATALOG} from '../app/lib/printCatalog.ts';
import {getProductLede} from '../app/lib/productCopy.ts';
import {buildProdigiOrderFromShopify} from '../app/lib/sky/fulfilment.ts';
import {TOUGH_CASE_PHONES} from '../app/lib/toughCase.ts';
import {
  buildFamilyProductInput,
  familyAssetPlan,
  familyHandoffRows,
  familyReadbackIssues,
  familyStageAction,
  familyStatus,
  familySummary,
  formatArtProductCatalog,
  parseFamilyMappings,
  selectFamilies,
  syncFamilyProducts,
} from './lib/art-product-pipeline.mjs';
import {MUSEUM_TAG, PENDING_TAGS} from './lib/product-pipeline.mjs';

const FLOATING_WORLD = PRINT_CATALOG.collections.find(
  (collection) => collection.slug === 'floating-world',
);
const ART_COLLECTION = family.ART_PRODUCT_CATALOG.collections.find(
  (collection) => collection.slug === 'floating-world',
);
const WAVE = 'the-great-wave-off-kanagawa';
const LAUNCH = path.join('X:', 'launches');
const productOf = (catalog, print, kind) =>
  catalog.products.find(
    (product) => product.print === print && product.family === kind,
  );
const CLEARED = {
  at: '2026-10-14T09:00:00.000Z',
  by: 'Owner',
  status: 'cleared',
};

/**
 * The shipped data with the Great Wave's family products fully releasable:
 * Hokusai approved, both reviews cleared, crops approved, assets current,
 * Shopify ids recorded and every mapping verified on the current file.
 */
function releasable({release = false} = {}) {
  const catalog = structuredClone(family.ART_PRODUCT_CATALOG);
  const registry = structuredClone(registryModule.ART_REGISTRY);
  const crops = structuredClone(MUSEUM_CROPS);
  const wave = productOf(catalog, WAVE, 'framed-print').artworkId;
  registry.artists.find((a) => a.id === 'katsushika-hokusai').approval = {
    approved: true,
    at: CLEARED.at,
    by: 'Owner',
  };
  registry.artworks.find((a) => a.id === wave).reviews = {
    master: {...CLEARED},
    rights: {...CLEARED},
  };
  crops.approval = {approved: true, at: '2026-10-13', by: 'Owner'};
  for (const product of catalog.products.filter((p) => p.print === WAVE)) {
    product.shopify = {
      productId: `gid://shopify/Product/${product.family}`,
      variantIds: Object.fromEntries(
        product.variants.map((v) => [v.key, `gid://v/${v.sku}`]),
      ),
    };
    for (const variant of product.variants) {
      variant.mapping = {
        assetSha256: product.assets.print.sha256,
        verified: true,
        verifiedAt: '2026-10-14',
        ...(family.FAMILY_SPECS[product.family].route === 'channel'
          ? {channelProductId: '7000001'}
          : {printUrlPath: family.casePrintUrlPath(product)}),
      };
      if (release) variant.inventory = {...variant.inventory, tracked: false};
    }
    if (release) product.released = true;
  }
  return {catalog, crops, registry};
}

test('the shipped family catalog is valid: 50 hidden products, 10 per family', () => {
  assert.deepEqual(family.validateArtProductCatalog(), []);
  assert.deepEqual(familySummary(family.ART_PRODUCT_CATALOG.products), [
    {
      family: 'framed-print',
      priceEUR: '89.10',
      products: 10,
      providerSkus: 1,
      variants: 10,
    },
    {
      family: 'canvas',
      priceEUR: '80.10',
      products: 10,
      providerSkus: 1,
      variants: 10,
    },
    {
      family: 'greeting-card',
      priceEUR: '7.20',
      products: 10,
      providerSkus: 1,
      variants: 10,
    },
    {
      family: 'postcard',
      priceEUR: '5.40',
      products: 10,
      providerSkus: 1,
      variants: 10,
    },
    {
      family: 'phone-case',
      priceEUR: '35.99',
      products: 10,
      providerSkus: 40,
      variants: 400,
    },
  ]);
  for (const product of family.ART_PRODUCT_CATALOG.products) {
    assert.equal(product.released, false, product.handle);
    assert.ok(product.assets, `${product.handle} has current assets`);
    assert.ok(familyStatus(product).current, `${product.handle} is current`);
  }
  const wave = (kind) => productOf(family.ART_PRODUCT_CATALOG, WAVE, kind);
  assert.equal(wave('framed-print').handle, `${WAVE}-framed-print`);
  assert.equal(
    wave('canvas').title,
    'The Great Wave off Kanagawa Canvas Print',
  );
  assert.deepEqual(
    family.ART_PRODUCT_FAMILIES.map((kind) => wave(kind).variants[0].sku),
    [
      'CM-FW-01-CFP16X20',
      'CM-FW-01-CAN16X20',
      'CM-FW-01-CARD',
      'CM-FW-01-POST',
      'CM-FW-01-CASE-IPHONE-13',
    ],
  );
  assert.deepEqual(
    wave('phone-case').variants.map((variant) => variant.providerSku),
    TOUGH_CASE_PHONES.map((phone) => phone.prodigiSku),
  );
  // The framed print is the bordered 16×20 print file, byte for byte.
  assert.equal(
    wave('framed-print').assets.print.path,
    `floating-world/print/${WAVE}-16x20-300dpi.jpg`,
  );
});

test('validation keeps one product per artwork per type, unique handles and SKUs', () => {
  const twice = structuredClone(family.ART_PRODUCT_CATALOG);
  twice.products.push({
    ...structuredClone(productOf(twice, WAVE, 'canvas')),
    handle: 'another-wave-canvas',
  });
  const problems = family.validateArtProductCatalog(twice).join('\n');
  assert.match(problems, /met-39799 already has a canvas product/);
  assert.match(problems, /duplicate SKU CM-FW-01-CAN16X20/);
  assert.match(problems, /handle must be the-great-wave-off-kanagawa-canvas/);

  const loose = structuredClone(family.ART_PRODUCT_CATALOG);
  const card = productOf(loose, WAVE, 'greeting-card');
  delete card.released;
  card.variants[0].inventory = {policy: 'CONTINUE', quantity: 0, tracked: true};
  card.variants[0].priceEUR = '8.00';
  productOf(loose, WAVE, 'postcard').variants[0].sku = 'CM-FW-01-8X10';
  productOf(loose, WAVE, 'phone-case').variants.pop();
  const issues = family.validateArtProductCatalog(loose).join('\n');
  assert.match(issues, /greeting-card: released must be true or false/);
  assert.match(issues, /tracked at zero with DENY/);
  assert.match(issues, /price must be the collection's 7\.20/);
  assert.match(issues, /SKU must be CM-FW-01-POST/);
  assert.match(issues, /duplicate SKU CM-FW-01-8X10/);
  assert.match(issues, /the 40 case devices in manifest order/);
});

test('release is blocked until every owner, asset, Shopify and mapping gate passes', () => {
  const shipped = structuredClone(family.ART_PRODUCT_CATALOG);
  const shippedCase = productOf(shipped, WAVE, 'phone-case');
  shippedCase.released = true;
  // The live catalog now carries real Draft ids; drop them so the Shopify
  // gate is exercised regardless of what has been staged.
  delete shippedCase.shopify;
  const blocked = family.validateArtProductCatalog(shipped).join('\n');
  for (const gate of [
    'a cleared master review',
    'Shopify ids',
    'a verified fulfilment mapping of the current file',
  ])
    assert.match(blocked, new RegExp(`phone-case: released without ${gate}`));

  const ready = releasable({release: true});
  assert.deepEqual(family.validateArtProductCatalog(ready.catalog, ready), []);
  for (const product of ready.catalog.products.filter((p) => p.print === WAVE))
    assert.deepEqual(family.familyReleaseIssues(product, ready), []);

  // An unapproved artist, unapproved crops, a stale file or a mapping of an
  // older file each block it.
  const noArtist = releasable({release: true});
  noArtist.registry.artists.find(
    (a) => a.id === 'katsushika-hokusai',
  ).approval = {approved: false};
  assert.deepEqual(
    family.familyReleaseIssues(
      productOf(noArtist.catalog, WAVE, 'canvas'),
      noArtist,
    ),
    ['artist approval'],
  );
  const unapproved = releasable({release: true});
  unapproved.crops.approval = {approved: false};
  assert.ok(
    family
      .familyReleaseIssues(
        productOf(unapproved.catalog, WAVE, 'canvas'),
        unapproved,
      )
      .includes('crop approval'),
  );
  assert.deepEqual(
    family.familyReleaseIssues(
      productOf(unapproved.catalog, WAVE, 'framed-print'),
      unapproved,
    ),
    [],
    'the framed print keeps the whole work and needs no crop',
  );
  const recropped = releasable({release: true});
  recropped.crops.crops['met-39799'].canvas.cx = 0.6;
  const canvas = productOf(recropped.catalog, WAVE, 'canvas');
  assert.deepEqual(family.familyReleaseIssues(canvas, recropped), [
    'current assets',
  ]);
  assert.equal(familyStatus(canvas, {crops: recropped.crops}).current, false);
  const remapped = releasable({release: true});
  productOf(
    remapped.catalog,
    WAVE,
    'postcard',
  ).variants[0].mapping.assetSha256 = 'f'.repeat(64);
  assert.deepEqual(
    family.familyReleaseIssues(
      productOf(remapped.catalog, WAVE, 'postcard'),
      remapped,
    ),
    ['a verified fulfilment mapping of the current file'],
  );
});

test('an artwork may be a print once and, separately, each family product', () => {
  assert.deepEqual(shops.validateArtistLinks(), []);
  const catalog = structuredClone(family.ART_PRODUCT_CATALOG);
  catalog.products.push({
    ...structuredClone(productOf(catalog, WAVE, 'framed-print')),
    handle: 'wave-framed-again',
  });
  assert.match(
    shops.validateArtistLinks({artProducts: catalog}).join('\n'),
    /artwork met-39799 is already sold as floating-world\/the-great-wave-off-kanagawa-framed-print/,
  );
});

test('asset plans follow the live file contracts and the approved crops', () => {
  const plan = (kind, print = WAVE) =>
    familyAssetPlan(productOf(family.ART_PRODUCT_CATALOG, print, kind), {
      collection: FLOATING_WORLD,
      framedPpi: 213.9,
      launchRoot: LAUNCH,
    });
  const sizes = Object.fromEntries(
    family.ART_PRODUCT_FAMILIES.map((kind) => {
      const {output} = plan(kind);
      return [kind, [output.width, output.height, output.dpi]];
    }),
  );
  assert.deepEqual(sizes, {
    canvas: [3000, 2400, 150],
    'framed-print': [6000, 4800, 300],
    'greeting-card': [6117, 2161, 300],
    'phone-case': [2000, 2500, 300],
    postcard: [4323, 1559, 300],
  });
  // Portrait works turn the canvas and framed files, never the card.
  const fireworks = 'fireworks-at-ryogoku-bridge';
  assert.deepEqual(
    [
      plan('canvas', fireworks).output.width,
      plan('canvas', fireworks).output.height,
    ],
    [2400, 3000],
  );
  assert.deepEqual(plan('greeting-card').output.panel, {
    height: 2161,
    left: 1529,
    top: 0,
    width: 1529,
  });
  assert.deepEqual(plan('postcard').output.panel, {
    height: 1559,
    left: 2161,
    top: 0,
    width: 2162,
  });
  const framed = plan('framed-print');
  assert.equal(framed.output.reused, true);
  assert.equal(framed.extract, null);
  assert.equal(
    framed.output.path,
    `floating-world/print/${WAVE}-16x20-300dpi.jpg`,
  );
  assert.equal(
    plan('canvas').preview.path,
    `floating-world/canvas/web/${WAVE}-canvas.webp`,
  );
  // Hodogaya's trim moves the crop down by the 98 px tab in original pixels.
  const hodogaya = plan('postcard', 'hodogaya-on-the-tokaido');
  assert.equal(hodogaya.extract.top, hodogaya.box.top + 98);
  for (const print of FLOATING_WORLD.prints)
    for (const kind of ['canvas', 'greeting-card', 'postcard', 'phone-case']) {
      const entry = plan(kind, print.slug);
      assert.ok(
        entry.ppi >= entry.minPpi,
        `${print.slug} ${kind} ${entry.ppi}`,
      );
      assert.ok(entry.extract.left >= entry.trim.left);
      assert.ok(
        entry.extract.top + entry.extract.height <=
          entry.source.height - entry.trim.bottom,
      );
      const aspect = entry.output.panel
        ? entry.output.panel.width / entry.output.panel.height
        : entry.output.width / entry.output.height;
      assert.ok(
        Math.abs(entry.extract.width / entry.extract.height - aspect) < 0.002,
        `${print.slug} ${kind} keeps the file aspect`,
      );
    }
});

test('a family Draft input is a hidden, unbuyable museum product of its type', () => {
  const input = (kind) =>
    buildFamilyProductInput(productOf(family.ART_PRODUCT_CATALOG, WAVE, kind), {
      artCollection: ART_COLLECTION,
      collection: FLOATING_WORLD,
    });
  for (const kind of family.ART_PRODUCT_FAMILIES) {
    const draft = input(kind);
    assert.equal(draft.status, 'DRAFT');
    assert.equal(draft.vendor, 'Clara Mendes');
    assert.equal(draft.productType, family.FAMILY_SPECS[kind].productType);
    assert.equal(draft.handle, `${WAVE}-${kind}`);
    assert.match(draft.seo.title, /by Katsushika Hokusai \| Clara Mendes$/);
    assert.ok(draft.tags.includes(MUSEUM_TAG));
    assert.ok(draft.tags.includes('Floating World'));
    assert.ok(draft.tags.includes('Katsushika Hokusai'));
    for (const tag of PENDING_TAGS) assert.ok(draft.tags.includes(tag));
    assert.ok(!draft.tags.includes('Clara Mendes Original'));
    for (const variant of draft.variants) {
      assert.deepEqual(variant.inventoryItem, {
        requiresShipping: true,
        tracked: true,
      });
      assert.equal(variant.inventoryPolicy, 'DENY');
    }
    assert.match(draft.descriptionHtml, /<em>Under the Wave off Kanagawa/);
    assert.match(
      draft.descriptionHtml,
      /not affiliated with or endorsed by the museum/,
    );
    assert.match(draft.descriptionHtml, /museum record/);
    assert.doesNotMatch(
      draft.descriptionHtml,
      /original|Unframed|Frame not included/i,
    );
    if (kind !== 'framed-print')
      assert.doesNotMatch(draft.descriptionHtml, /200gsm|white border/);
  }
  const caseDraft = input('phone-case');
  assert.deepEqual(caseDraft.productOptions, [
    {
      name: 'Device',
      position: 1,
      values: TOUGH_CASE_PHONES.map((phone) => ({name: phone.label})),
    },
  ]);
  assert.equal(caseDraft.variants.length, 40);
  assert.deepEqual(caseDraft.variants[0].optionValues, [
    {name: 'iPhone 13', optionName: 'Device'},
  ]);
  assert.equal(caseDraft.variants[0].price, '35.99');
  assert.deepEqual(input('greeting-card').productOptions[0].values, [
    {name: '5 × 7 in'},
  ]);
  assert.equal(input('framed-print').variants[0].price, '89.10');
});

test('stage creates missing Drafts, never duplicates, and refuses non-Drafts', () => {
  const product = productOf(family.ART_PRODUCT_CATALOG, WAVE, 'postcard');
  const input = buildFamilyProductInput(product, {
    artCollection: ART_COLLECTION,
    collection: FLOATING_WORLD,
  });
  const live = (overrides = {}) => ({
    handle: input.handle,
    id: 'gid://shopify/Product/1',
    media: {nodes: [{id: 'm', status: 'READY'}]},
    status: 'DRAFT',
    variants: {nodes: [{id: 'gid://v/1', sku: 'CM-FW-01-POST'}]},
    ...overrides,
  });
  assert.equal(familyStageAction(product, input, null).action, 'create');
  assert.equal(familyStageAction(product, input, live()).action, 'present');
  assert.equal(
    familyStageAction(product, input, live({media: {nodes: []}})).action,
    'attach preview',
  );
  assert.throws(
    () => familyStageAction(product, input, live({status: 'ACTIVE'})),
    /stage only touches Drafts/,
  );
  assert.throws(
    () =>
      familyStageAction(
        product,
        input,
        live({variants: {nodes: [{id: 'x', sku: 'CM-FW-01-CARD'}]}}),
      ),
    /different SKUs/,
  );

  const readback = {
    ...input,
    // Shopify may re-indent lists and re-encode characters it stores.
    descriptionHtml: input.descriptionHtml
      .replaceAll('’', '&rsquo;')
      .replaceAll('<li>', '\n  <li>'),
    tags: [...input.tags].reverse(),
    totalInventory: 0,
    variants: {
      nodes: input.variants.map((variant) => ({
        inventoryItem: {requiresShipping: true, tracked: true},
        inventoryPolicy: 'DENY',
        price: variant.price,
        selectedOptions: [{name: 'Size', value: '7 × 5 in'}],
        sku: variant.sku,
      })),
    },
  };
  assert.deepEqual(familyReadbackIssues(input, readback), []);
  readback.variants.nodes[0].price = '6.00';
  readback.status = 'ACTIVE';
  assert.deepEqual(familyReadbackIssues(input, readback), [
    `${input.handle}: status is ACTIVE, expected DRAFT`,
    `${input.handle} CM-FW-01-POST: price is 6.00`,
  ]);
});

test('catalog sync is idempotent and never rewrites a staged product', () => {
  const catalog = structuredClone(family.ART_PRODUCT_CATALOG);
  const before = JSON.stringify(catalog);
  const options = {
    families: [...family.ART_PRODUCT_FAMILIES],
    prints: FLOATING_WORLD.prints,
  };
  assert.deepEqual(syncFamilyProducts(catalog, FLOATING_WORLD, options), {
    added: [],
    refreshed: [],
  });
  assert.equal(JSON.stringify(catalog), before);

  const empty = {...structuredClone(catalog), products: []};
  assert.equal(
    syncFamilyProducts(empty, FLOATING_WORLD, options).added.length,
    50,
  );
  assert.deepEqual(
    empty.products.map((p) => p.handle),
    catalog.products.map((p) => p.handle),
  );

  const staged = structuredClone(catalog);
  productOf(staged, WAVE, 'canvas').shopify = {
    productId: 'gid://p',
    variantIds: {},
  };
  staged.collections[0].families.canvas.priceEUR = '99.00';
  assert.throws(
    () => syncFamilyProducts(staged, FLOATING_WORLD, options),
    /already in Shopify but its variants changed/,
  );
  // The serialised catalog round-trips exactly.
  assert.deepEqual(JSON.parse(formatArtProductCatalog(catalog)), catalog);
});

test('handoff covers channel-mapped families; cases go through the webhook', () => {
  const rows = familyHandoffRows(
    family.ART_PRODUCT_CATALOG.products.filter((p) => p.print === WAVE),
    {
      artCollection: ART_COLLECTION,
      collection: FLOATING_WORLD,
      launchRoot: LAUNCH,
      sha256: () => 'a'.repeat(64),
    },
  );
  assert.deepEqual(
    rows.map((row) => [row.family, row.sku, row.providerSku]),
    [
      ['framed-print', 'CM-FW-01-CFP16X20', 'GLOBAL-CFP-16X20'],
      ['canvas', 'CM-FW-01-CAN16X20', 'GLOBAL-CAN-16X20'],
      ['greeting-card', 'CM-FW-01-CARD', 'GLOBAL-GRE-MOH-7X5-BLA'],
      ['postcard', 'CM-FW-01-POST', 'GLOBAL-POST-MOH-7X5'],
    ],
  );
  assert.match(rows[0].settings, /Natural classic frame/);
  assert.deepEqual(
    parseFamilyMappings(FLOATING_WORLD, 'canvas', [`${WAVE}=6400001`]),
    [{id: '6400001', slug: WAVE}],
  );
  assert.throws(
    () => parseFamilyMappings(FLOATING_WORLD, 'canvas', [WAVE]),
    /digits/,
  );
  assert.deepEqual(parseFamilyMappings(FLOATING_WORLD, 'phone-case', [WAVE]), [
    {id: null, slug: WAVE},
  ]);
  assert.throws(
    () => parseFamilyMappings(FLOATING_WORLD, 'phone-case', [`${WAVE}=1`]),
    /no channel product id/,
  );
  assert.deepEqual(selectFamilies({family: 'postcard,canvas'}), [
    'canvas',
    'postcard',
  ]);
  assert.throws(() => selectFamilies({family: 'mug'}), /Unknown family mug/);
});

test('museum case lines reach Prodigi only once released and mapped', async () => {
  const sku = 'CM-FW-01-CASE-IPHONE-16-PRO';
  const order = {
    id: 9001,
    line_items: [{id: 5, properties: [], quantity: 1, sku}],
    name: '#3001',
    shipping_address: {
      address1: 'Ermou 10',
      city: 'Athens',
      country_code: 'GR',
      name: 'Eva',
      zip: '10563',
    },
  };
  const options = {
    origin: 'https://shopclaramendes.com',
    secret: 'test-secret-at-least-32-characters-long!!',
  };
  assert.equal(family.artCaseLineForSku(sku), null);
  assert.equal(
    (await buildProdigiOrderFromShopify(order, options)).kind,
    'skip',
  );

  const {catalog} = releasable({release: true});
  const build = await buildProdigiOrderFromShopify(order, {
    ...options,
    artProducts: catalog,
  });
  assert.equal(build.kind, 'order');
  assert.deepEqual(build.payload.items, [
    {
      assets: [
        {
          printArea: 'default',
          url: `https://shopclaramendes.com/print-files/floating-world/${WAVE}-phone-case.jpg`,
        },
      ],
      attributes: TOUGH_CASE_PHONES.find((p) => p.code === 'IPHONE-16-PRO')
        .prodigiAttributes,
      copies: 1,
      merchantReference: 'line:5',
      sizing: 'fillPrintArea',
      sku: 'GLOBAL-TECH-IP16PR-TCB-CS-M',
    },
  ]);
  // An unverified route stays out even when released.
  productOf(catalog, WAVE, 'phone-case').variants.forEach((v) => {
    v.mapping.verified = false;
  });
  assert.equal(family.artCaseLineForSku(sku, catalog), null);
});

test('storefront: staged family products stay hidden; released ones join the artist shop', () => {
  const handles = family.ART_PRODUCT_CATALOG.products.map((p) => p.handle);
  const sellable = computeSellableHandles();
  for (const handle of handles) {
    assert.ok(!sellable.has(handle), `${handle} is not sellable`);
    assert.ok(
      isUnreleasedExtensionHandle(handle),
      `${handle} stays out of sitemaps`,
    );
    assert.equal(family.artProductPage(handle), null);
  }

  const {catalog, registry} = releasable({release: true});
  const released = computeSellableHandles(
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    catalog,
  );
  for (const kind of family.ART_PRODUCT_FAMILIES)
    assert.ok(released.has(`${WAVE}-${kind}`));
  assert.ok(!released.has(`hodogaya-on-the-tokaido-canvas`));

  const products = shops
    .artistProducts({artProducts: catalog, registry})
    .filter((p) => p.artistId === 'katsushika-hokusai');
  assert.equal(products.length, 6 * 6, 'six works as prints and five families');
  const view = shops.artistShopView(
    products.filter((p) => p.artworkId === 'met-39799'),
    new URLSearchParams(),
    registry,
  );
  assert.deepEqual(
    view.groups
      .find((group) => group.key === 'type')
      .options.map(({label, value}) => [label, value]),
    [
      ['Art prints', 'prints'],
      ['Framed prints', 'framed-prints'],
      ['Canvas', 'canvas'],
      ['Cards', 'cards'],
      ['Postcards', 'postcards'],
      ['Phone cases', 'phone-cases'],
    ],
  );
  const cases = shops.artistShopView(
    products,
    new URLSearchParams('type=phone-cases'),
    registry,
  );
  assert.deepEqual(
    cases.products.map((p) => p.handle),
    FLOATING_WORLD.prints
      .filter(
        (p) =>
          registryModule.findArtwork(p.artworkId).artistId ===
          'katsushika-hokusai',
      )
      .map((p) => `${p.slug}-phone-case`),
  );
  // Only released products are public: the Wave's families, not the prints.
  const hokusai = shops
    .publicArtists({artProducts: catalog, registry})
    .find((entry) => entry.artist.id === 'katsushika-hokusai');
  assert.deepEqual(
    hokusai.products.map((p) => p.handle),
    family.ART_PRODUCT_FAMILIES.map((kind) => `${WAVE}-${kind}`),
  );
});

test('family product pages carry their own copy and the museum credit', () => {
  const {catalog, registry} = releasable({release: true});
  const page = (kind) => family.artProductPage(`${WAVE}-${kind}`, catalog);
  assert.deepEqual(
    page('phone-case').details.map((d) => d.label),
    ['Case', 'Fit'],
  );
  assert.equal(page('greeting-card').shippingReach, 'eu');
  assert.equal(page('framed-print').shippingReach, 'selected');
  assert.equal(page('canvas').shippingReach, 'selected');
  for (const kind of family.ART_PRODUCT_FAMILIES) {
    const text = page(kind)
      .details.map((d) => d.text)
      .join(' ');
    assert.doesNotMatch(text, /Unframed|Frame not included|original/i);
    if (kind !== 'framed-print')
      assert.doesNotMatch(text, /200gsm|white border/);
  }
  assert.match(
    page('phone-case').details[1].text,
    /40 iPhone, Google Pixel and Samsung Galaxy models/,
  );

  const credit = shops.productArtworkCredit(`${WAVE}-postcard`, {
    artProducts: catalog,
    registry,
  });
  assert.equal(credit.artist.name, 'Katsushika Hokusai');
  assert.equal(credit.artist.path, '/artists/hokusai');
  assert.match(credit.artwork.reproduction, /^Cropped to the postcard/);
  assert.match(credit.artwork.credit, /The Metropolitan Museum of Art/);
  assert.equal(
    shops.productArtworkCredit(`${WAVE}-postcard`, {registry}),
    null,
    'nothing is credited while the product is staged',
  );
  // The canvas lede is its first sentence, like other spec-sheet products.
  assert.equal(
    getProductLede({
      description: 'First sentence here. Second sentence.',
      handle: `${WAVE}-canvas`,
      productType: 'Canvas Art',
    }),
    'First sentence here.',
  );
  assert.equal(
    getProductLede({
      description: 'A live canvas. Its whole text.',
      handle: 'stretched-canvas-art-16x20',
      productType: 'Canvas Art',
    }),
    'A live canvas. Its whole text.',
    'live products keep their lede',
  );
});

test('rendered files hold exactly the crop in the live layouts', async () => {
  const {mkdtempSync, writeFileSync, rmSync} = await import('node:fs');
  const os = await import('node:os');
  const sharp = (await import('sharp')).default;
  const {artMatchError, describeFile, renderFamilyFile} =
    await import('./lib/art-product-assets.mjs');
  const dir = mkdtempSync(path.join(os.tmpdir(), 'cm-family-'));
  try {
    // A synthetic "original": a diagonal gradient with a red block.
    const width = 1200;
    const height = 900;
    const raw = Buffer.alloc(width * height * 3);
    for (let y = 0; y < height; y += 1)
      for (let x = 0; x < width; x += 1) {
        const i = (y * width + x) * 3;
        raw[i] =
          x > 500 && x < 700 && y > 300 && y < 500 ? 220 : (x * 255) / width;
        raw[i + 1] = (y * 255) / height;
        raw[i + 2] = 120;
      }
    const source = path.join(dir, 'original.jpg');
    writeFileSync(
      source,
      await sharp(raw, {raw: {channels: 3, height, width}})
        .jpeg({quality: 98})
        .toBuffer(),
    );
    const plan = (kind, extract) => ({
      extract,
      family: kind,
      handle: `synthetic-${kind}`,
      output: {
        dpi: family.FAMILY_SPECS[kind].file.dpi,
        panel: family.FAMILY_SPECS[kind].file.panel ?? null,
        ...family.familyFileSize(kind, 'landscape'),
      },
      source: {file: source},
    });
    const cases = [
      plan('greeting-card', {height: 800, left: 300, top: 50, width: 566}),
      plan('postcard', {height: 600, left: 100, top: 100, width: 832}),
      plan('canvas', {height: 720, left: 150, top: 90, width: 900}),
      plan('phone-case', {height: 850, left: 400, top: 25, width: 680}),
    ];
    for (const entry of cases) {
      const file = await renderFamilyFile(entry);
      const facts = await describeFile(file);
      assert.deepEqual(
        [facts.width, facts.height, Math.round(facts.dpi), facts.space],
        [entry.output.width, entry.output.height, entry.output.dpi, 'srgb'],
        entry.family,
      );
      assert.ok(
        (await artMatchError(entry, file)) < 4,
        `${entry.family} art matches its crop`,
      );
      // A shifted crop does not match: the check sees misplaced art.
      const shifted = {
        ...entry,
        extract: {...entry.extract, left: entry.extract.left - 80},
      };
      assert.ok(
        (await artMatchError(shifted, file)) > 4,
        `${entry.family} detects a shift`,
      );
    }
    // The card's rear panel is one flat colour; its inside stays blank.
    const card = await renderFamilyFile(cases[0]);
    const region = async (box) =>
      sharp(await sharp(card).extract(box).toBuffer()).stats();
    const rear = await region({height: 2161, left: 0, top: 0, width: 1500});
    assert.ok(rear.channels.every((channel) => channel.stdev < 1.5));
    const inside = await region({
      height: 2161,
      left: 3100,
      top: 0,
      width: 2900,
    });
    // Warm white (244, 239, 230), within JPEG rounding.
    inside.channels
      .slice(0, 3)
      .forEach((channel, index) =>
        assert.ok(Math.abs(channel.mean - [244, 239, 230][index]) < 2),
      );
  } finally {
    rmSync(dir, {force: true, recursive: true});
  }
});
