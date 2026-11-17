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
import * as prints from '../app/lib/printCatalog.ts';
import {PRINT_CATALOG} from '../app/lib/printCatalog.ts';
import {getProductLede} from '../app/lib/productCopy.ts';
import {buildProdigiOrderFromShopify} from '../app/lib/sky/fulfilment.ts';
import {
  requestedPhoneModel,
  TOUGH_CASE_PHONES,
  toughCasePhoneGroups,
} from '../app/lib/toughCase.ts';
import {compareEditionFile} from './lib/art-product-assets.mjs';
import {
  buildFamilyProductInput,
  editionDifference,
  familyAssetPlan,
  familyHandoffRows,
  familyReadbackIssues,
  familyReleaseBlockers,
  familyStageAction,
  familyStatus,
  familySummary,
  formatArtProductCatalog,
  parseFamilyMappings,
  printfulMappingFromReadback,
  selectFamilies,
  syncFamilyProducts,
} from './lib/art-product-pipeline.mjs';
import {
  assertPrintCollection,
  buildProductSetInput,
  MUSEUM_TAG,
  PENDING_TAGS,
} from './lib/product-pipeline.mjs';
import {stagedArtProducts, stagedPrintCatalog} from './lib/staged-fixtures.mjs';

const FLOATING_WORLD = PRINT_CATALOG.collections.find(
  (collection) => collection.slug === 'floating-world',
);
const ART_COLLECTION = family.ART_PRODUCT_CATALOG.collections.find(
  (collection) => collection.slug === 'floating-world',
);
/**
 * The five rendered families Floating World sells (no mug), in catalog
 * order. The supplied-file families (hanger, acrylic, metal, Printful mug,
 * cushion, blanket) have their own tests in artSuppliedFamilies.node-test.mjs.
 */
const FW_FAMILIES = family.ART_PRODUCT_FAMILIES.filter(
  (kind) =>
    kind in ART_COLLECTION.families && !family.FAMILY_SPECS[kind].suppliedFiles,
);
const rendered = (product) => FW_FAMILIES.includes(product.family);
/** Artist-shop types of the supplied-file families (staged, not released). */
const SUPPLIED_LABELS = new Set(
  family.ART_PRODUCT_FAMILIES.filter(
    (kind) => family.FAMILY_SPECS[kind].suppliedFiles,
  ).map((kind) => family.FAMILY_SPECS[kind].artistFamily),
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
 * The shipped data, with every museum print and family product staged, and
 * the Great Wave's family products fully releasable: Hokusai approved, both
 * reviews cleared, crops approved, assets current, Shopify ids recorded and
 * every mapping verified on the current file. Starting from staged copies
 * keeps these tests independent of what the live data has released.
 */
function releasable({release = false} = {}) {
  const catalog = stagedArtProducts();
  const prints = stagedPrintCatalog();
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
  crops.crops[wave].approval = {approved: true, at: '2026-10-13', by: 'Owner'};
  for (const product of catalog.products.filter(
    (p) => p.print === WAVE && rendered(p),
  )) {
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
  return {catalog, crops, prints, registry};
}

test('the shipped family catalog is valid: 50 released products, 10 per family', () => {
  assert.deepEqual(family.validateArtProductCatalog(), []);
  const floatingWorld = family.ART_PRODUCT_CATALOG.products.filter(
    (product) => product.collection === 'floating-world' && rendered(product),
  );
  assert.deepEqual(familySummary(floatingWorld), [
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
  // Released 2026-10-14: validation above also proves every release gate.
  for (const product of floatingWorld) {
    assert.equal(product.released, true, product.handle);
    assert.deepEqual(family.familyReleaseIssues(product), [], product.handle);
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
    FW_FAMILIES.map((kind) => wave(kind).variants[0].sku),
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
  for (const variant of shippedCase.variants)
    variant.mapping = {verified: false};
  // Likewise the live registry may already hold a cleared master review;
  // reset it so the master gate is exercised regardless of owner progress.
  const pendingRegistry = structuredClone(registryModule.ART_REGISTRY);
  pendingRegistry.artworks.find(
    (a) => a.id === shippedCase.artworkId,
  ).reviews.master = {status: 'pending'};
  const blocked = family
    .validateArtProductCatalog(shipped, {registry: pendingRegistry})
    .join('\n');
  for (const gate of [
    'a cleared master review',
    'Shopify ids',
    'a verified fulfilment mapping of the current file',
  ])
    assert.match(blocked, new RegExp(`phone-case: released without ${gate}`));

  const ready = releasable({release: true});
  assert.deepEqual(family.validateArtProductCatalog(ready.catalog, ready), []);
  for (const product of ready.catalog.products.filter(
    (p) => p.print === WAVE && rendered(p),
  ))
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
  const unapprovedWork = productOf(
    unapproved.catalog,
    WAVE,
    'canvas',
  ).artworkId;
  unapproved.crops.crops[unapprovedWork].approval = {approved: false};
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
    FW_FAMILIES.map((kind) => {
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
  for (const kind of FW_FAMILIES) {
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
    families: [...FW_FAMILIES],
    prints: FLOATING_WORLD.prints,
  };
  assert.deepEqual(syncFamilyProducts(catalog, FLOATING_WORLD, options), {
    added: [],
    refreshed: [],
    skipped: [],
  });
  assert.equal(JSON.stringify(catalog), before);

  const empty = {...structuredClone(catalog), products: []};
  assert.equal(
    syncFamilyProducts(empty, FLOATING_WORLD, options).added.length,
    50,
  );
  assert.deepEqual(
    empty.products.map((p) => p.handle),
    catalog.products
      .filter((p) => p.collection === FLOATING_WORLD.slug && rendered(p))
      .map((p) => p.handle),
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
    family.ART_PRODUCT_CATALOG.products.filter(
      (p) => p.print === WAVE && rendered(p),
    ),
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
  assert.throws(
    () => selectFamilies({family: 'tote-bag'}),
    /Unknown family tote-bag/,
  );
  // `--families` is what the collection offers, in catalog order;
  // Floating World has no Prodigi mug.
  const offered = Object.keys(ART_COLLECTION.families);
  assert.deepEqual(
    selectFamilies({all: true, offered}),
    family.ART_PRODUCT_FAMILIES.filter((kind) => offered.includes(kind)),
  );
  assert.ok(!selectFamilies({all: true, offered}).includes('mug'));
  assert.equal(FW_FAMILIES.length, 5);
  assert.throws(
    () => selectFamilies({family: 'mug', offered}),
    /does not offer mug/,
  );
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
  // While staged, the line never reaches Prodigi.
  const staged = stagedArtProducts();
  assert.equal(family.artCaseLineForSku(sku, staged), null);
  assert.equal(
    (
      await buildProdigiOrderFromShopify(order, {
        ...options,
        artProducts: staged,
      })
    ).kind,
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
  const staged = stagedArtProducts();
  const handles = staged.products.map((p) => p.handle);
  const sellable = computeSellableHandles(
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    staged,
  );
  for (const handle of handles) {
    assert.ok(!sellable.has(handle), `${handle} is not sellable`);
    assert.ok(
      family.isUnreleasedArtProductHandle(handle, staged),
      `${handle} stays out of sitemaps`,
    );
    assert.equal(family.artProductPage(handle, staged), null);
    // The sitemap/listing guard consults exactly this gate.
    assert.equal(
      isUnreleasedExtensionHandle(handle),
      family.isUnreleasedArtProductHandle(handle),
    );
  }

  const {catalog, prints, registry} = releasable({release: true});
  const released = computeSellableHandles(
    undefined,
    undefined,
    prints,
    undefined,
    undefined,
    catalog,
  );
  for (const kind of FW_FAMILIES) assert.ok(released.has(`${WAVE}-${kind}`));
  assert.ok(!released.has(`hodogaya-on-the-tokaido-canvas`));

  const products = shops
    .artistProducts({artProducts: catalog, catalog: prints, registry})
    .filter(
      (p) =>
        p.artistId === 'katsushika-hokusai' && !SUPPLIED_LABELS.has(p.family),
    );
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
      ['Art Prints', 'prints'],
      ['Framed Art', 'framed-prints'],
      ['Canvas Art', 'canvas'],
      ['Cards', 'cards'],
      ['Postcards', 'postcards'],
      ['Phone Cases', 'phone-cases'],
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
    .publicArtists({artProducts: catalog, catalog: prints, registry})
    .find((entry) => entry.artist.id === 'katsushika-hokusai');
  assert.deepEqual(
    hokusai.products.map((p) => p.handle),
    FW_FAMILIES.map((kind) => `${WAVE}-${kind}`),
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
  for (const kind of FW_FAMILIES) {
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
    shops.productArtworkCredit(`${WAVE}-postcard`, {
      artProducts: stagedArtProducts(),
      registry,
    }),
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

test('museum "Pair with": the same artwork first, then the artist, released only', () => {
  const {catalog, prints, registry} = releasable({release: true});
  // A staged product is never suggested, even beside released siblings.
  productOf(catalog, WAVE, 'postcard').released = false;
  const floatingWorld = prints.collections.find(
    (collection) => collection.slug === 'floating-world',
  );
  // Hodogaya is Hokusai's too; Nissaka is Hiroshige's.
  for (const slug of [
    WAVE,
    'hodogaya-on-the-tokaido',
    'nissaka-sayo-no-nakayama',
  ])
    floatingWorld.prints.find((print) => print.slug === slug).released = true;
  productOf(catalog, 'hodogaya-on-the-tokaido', 'greeting-card').released =
    true;
  const sources = {artProducts: catalog, catalog: prints, registry};
  const pairs = (handle) =>
    shops.museumPairings(handle, sources)?.products.map((p) => p.handle);

  assert.deepEqual(pairs(`${WAVE}-greeting-card`), [
    `${WAVE}-art-print`,
    `${WAVE}-framed-print`,
    `${WAVE}-canvas`,
    `${WAVE}-phone-case`,
    // Then the artist's other works, the same product type first.
    'hodogaya-on-the-tokaido-greeting-card',
    'hodogaya-on-the-tokaido-art-print',
  ]);
  assert.deepEqual(pairs(`${WAVE}-art-print`), [
    `${WAVE}-framed-print`,
    `${WAVE}-canvas`,
    `${WAVE}-greeting-card`,
    `${WAVE}-phone-case`,
    'hodogaya-on-the-tokaido-art-print',
    'hodogaya-on-the-tokaido-greeting-card',
  ]);
  const pairing = shops.museumPairings(`${WAVE}-greeting-card`, sources);
  assert.deepEqual(pairing.artist, {
    name: 'Katsushika Hokusai',
    path: '/artists/hokusai',
  });
  assert.equal(pairing.query, 'tag:"Floating World"');
  assert.ok(
    !pairs('nissaka-sayo-no-nakayama-art-print').some((handle) =>
      handle.startsWith(WAVE),
    ),
    'another artist is never paired',
  );

  // Studio products keep their usual companions.
  assert.equal(
    shops.museumPairings('orbital-silence-art-print', sources),
    null,
  );
  assert.equal(shops.museumPairings('no-such-product', sources), null);
  // With nothing released the block has nothing to show.
  const staged = shops.museumPairings(`${WAVE}-canvas`, {
    artProducts: stagedArtProducts(),
    catalog: stagedPrintCatalog(),
    registry,
  });
  assert.deepEqual(staged.products, []);
  assert.equal(staged.artist.path, null);
});

test('single-size family pages name their size by the price', () => {
  const {catalog} = releasable({release: true});
  const size = (kind) => family.artProductPage(`${WAVE}-${kind}`, catalog).size;
  assert.equal(size('framed-print'), '16 × 20 in');
  assert.equal(size('canvas'), '16 × 20 in');
  assert.equal(size('greeting-card'), '5 × 7 in');
  assert.equal(size('postcard'), '7 × 5 in');
  assert.equal(size('phone-case'), null, 'cases choose a device instead');
  for (const kind of ['framed-print', 'canvas', 'greeting-card', 'postcard'])
    assert.equal(size(kind), productOf(catalog, WAVE, kind).variants[0].option);
});

test('the case picker groups the offered devices by brand and never guesses one', () => {
  const groups = toughCasePhoneGroups();
  assert.deepEqual(
    groups.map((group) => group.label),
    ['iPhone', 'Samsung Galaxy', 'Google Pixel'],
  );
  assert.equal(
    groups.flatMap((group) => group.phones).length,
    TOUGH_CASE_PHONES.length,
  );
  const offered = productOf(
    family.ART_PRODUCT_CATALOG,
    WAVE,
    'phone-case',
  ).variants.map((variant) => variant.option);
  assert.deepEqual(
    toughCasePhoneGroups(offered)
      .flatMap((group) => group.phones.map((phone) => phone.label))
      .sort(),
    [...offered].sort(),
  );
  const one = toughCasePhoneGroups([offered[0]]);
  assert.equal(one.length, 1);
  assert.deepEqual(
    one[0].phones.map((phone) => phone.label),
    [offered[0]],
  );

  const pick = (requested) => requestedPhoneModel(requested, 'Device', offered);
  assert.equal(pick([]), null, 'no model is preselected');
  assert.equal(pick([{name: 'Device', value: 'Nokia 3310'}]), null);
  assert.equal(pick([{name: 'Phone Model', value: offered[3]}]), null);
  assert.equal(pick([{name: 'Device', value: offered[3]}]), offered[3]);
});

test("curator's notes say which products keep the whole composition", () => {
  const notes = registryModule.ART_REGISTRY.artists
    .map((artist) => artist.curatorNote)
    .filter(Boolean);
  assert.ok(notes.length >= 2);
  for (const note of notes) {
    assert.doesNotMatch(note, /every print keeps/i);
    assert.match(
      note,
      /(Prints(, framed prints and mugs| and framed prints)|Hanger, acrylic and metal prints, cushions and blankets|Throw blankets, cushions and mugs) keep the full composition .* set on (a white border|white|a plain off-white mount)(; (cards, postcards, )?canvas and phone cases use a chosen detail)?\.$/,
    );
  }
});

test('a framed print needs its work offered at 16×20, whose print file it reuses', () => {
  const printCatalog = structuredClone(PRINT_CATALOG);
  const collection = printCatalog.collections.find(
    (entry) => entry.slug === 'floating-world',
  );
  const wave = collection.prints.find((print) => print.slug === WAVE);
  wave.sizes = ['8x10'];
  wave.releasedSizes = ['8x10'];
  assert.match(
    family
      .validateArtProductCatalog(family.ART_PRODUCT_CATALOG, {printCatalog})
      .join('\n'),
    /the-great-wave-off-kanagawa-framed-print: the framed print reuses the 16x20 print file, which the-great-wave-off-kanagawa is not offered in/,
  );
  assert.throws(
    () =>
      familyAssetPlan(
        productOf(family.ART_PRODUCT_CATALOG, WAVE, 'framed-print'),
        {collection, framedPpi: 213.9, launchRoot: LAUNCH},
      ),
    /reuses the 16x20 print file/,
  );
});

test('family sync adds a product only where its work qualifies', () => {
  const catalog = structuredClone(family.ART_PRODUCT_CATALOG);
  const lineAndColour = PRINT_CATALOG.collections.find(
    (entry) => entry.slug === 'line-and-colour',
  );
  const sync = (families) =>
    syncFamilyProducts(catalog, lineAndColour, {
      families,
      prints: lineAndColour.prints,
    });
  // Everything that qualifies is already in the catalog.
  const existing = sync([
    'framed-print',
    'canvas',
    'phone-case',
    'hanger-print',
    'acrylic-print',
    'metal-print',
    'mug',
    'cushion',
    'blanket',
  ]);
  assert.deepEqual(existing.added, []);
  assert.deepEqual(
    existing.skipped
      .filter((entry) => entry.family === 'framed-print')
      .map((entry) => entry.print),
    [
      'landscape-with-two-poplars',
      'houses-at-murnau',
      'painting-with-troika',
      'painting-with-green-center',
      'composition-no-1-gray-red',
    ],
  );
  assert.deepEqual(
    existing.skipped
      .filter((entry) => entry.family === 'canvas')
      .map((entry) => entry.print),
    [
      'painting-with-troika',
      'painting-with-green-center',
      'lozenge-composition',
      'composition-no-1-gray-red',
    ],
  );
  assert.deepEqual(
    existing.skipped
      .filter((entry) => entry.family === 'phone-case')
      .map((entry) => entry.print),
    [
      'houses-at-murnau',
      'painting-with-troika',
      'painting-with-green-center',
      'lozenge-composition',
      'composition-no-1-gray-red',
    ],
  );
  // Supplied-file families fit every work.
  assert.ok(
    existing.skipped.every(
      (entry) => !family.FAMILY_SPECS[entry.family].suppliedFiles,
    ),
  );
});

// ------------------------------------------------- editions (Art & Words) --

const EDITION = 'art-and-words';
const EDITION_HANDLES = [
  'the-great-wave-off-kanagawa-quote-blanket',
  'composition-with-red-yellow-and-blue-quote-blanket',
  'painting-with-troika-quote-blanket',
];
const editionCatalogs = () => ({
  art: structuredClone(family.ART_PRODUCT_CATALOG),
  print: structuredClone(PRINT_CATALOG),
});
const editionCollection = (catalog) =>
  catalog.collections.find((entry) => entry.slug === EDITION);
const byHandle = (catalog, handle) =>
  catalog.products.find((product) => product.handle === handle);
const waveEdition = (catalog) =>
  byHandle(catalog, 'the-great-wave-off-kanagawa-quote-blanket');

test('an edition is a second blanket of the same work, with its own handle, SKU and title', () => {
  assert.deepEqual(family.validateArtProductCatalog(), []);
  assert.deepEqual(shops.validateArtistLinks(), []);
  const products = family.ART_PRODUCT_CATALOG.products.filter(
    (product) => product.collection === EDITION,
  );
  assert.deepEqual(
    products.map((product) => product.handle),
    EDITION_HANDLES,
  );
  for (const product of products) {
    const record = family.editionFileOf(product);
    const base = byHandle(family.ART_PRODUCT_CATALOG, record.base.handle);
    assert.equal(base.artworkId, product.artworkId);
    assert.equal(base.family, product.family);
    assert.notEqual(base.handle, product.handle);
    assert.notEqual(base.variants[0].sku, product.variants[0].sku);
    assert.match(product.variants[0].sku, /^CM-AW-0[123]-BLANKET50X60$/);
    assert.equal(product.title, `${base.title}, Art & Words`);
    assert.equal(product.released, false); // the release commit flips this
    // Staged as a hidden Draft and mapped in Printful (2026-11-17), not released.
    assert.match(product.shopify.productId, /^gid:\/\/shopify\/Product\/\d+$/);
    assert.notEqual(product.shopify.productId, base.shopify.productId);
    assert.equal(product.variants[0].mapping.verified, true);
    assert.equal(
      product.variants[0].mapping.assetSha256,
      product.assets.files['blanket-50x60'].sha256,
    );
    assert.notEqual(
      product.variants[0].mapping.printfulSyncProductId,
      base.variants[0].mapping.printfulSyncProductId,
    );
    // A placeholder at the plain blanket's price, for the owner to confirm.
    assert.equal(product.variants[0].priceEUR, base.variants[0].priceEUR);
    // The words are on the file, and the copy says so.
    assert.match(family.reproductionSentence(product.handle), /own words/);
    assert.doesNotMatch(
      family.reproductionSentence(product.handle),
      /The work itself is unchanged/,
    );
    // The recorded check passed against the record as it stands.
    const file = product.assets.files['blanket-50x60'];
    assert.ok(family.editionFileChecked(file, record), product.handle);
    assert.equal(file.provenance.aiFill, undefined);
    assert.equal(file.provenance.masterSha256, record.base.sha256);
    assert.equal(file.ppi, base.assets.files['blanket-50x60'].ppi);
    assert.ok(file.provenance.edition.outsideMaxDifference <= 1);
    // Staging and mapping are done; no pipeline blocker remains. The owner
    // still confirms the ppi exceptions and the price before release.
    assert.deepEqual(familyReleaseBlockers(product), []);
  }
  // The live blankets are untouched by their editions.
  assert.equal(
    family.reproductionSentence('the-great-wave-off-kanagawa-blanket'),
    family.FAMILY_SPECS.blanket.reproduction,
  );
});

test('an edition that collides with its base product by handle, SKU or identity is refused', () => {
  // The same print slug: the handle (and so the product) collides.
  {
    const {art, print} = editionCatalogs();
    const entry = editionCollection(print).prints[0];
    entry.slug = 'the-great-wave-off-kanagawa';
    const product = waveEdition(art);
    product.print = entry.slug;
    product.handle = 'the-great-wave-off-kanagawa-blanket';
    product.title = 'The Great Wave off Kanagawa Throw Blanket, Art & Words';
    const problems = family
      .validateArtProductCatalog(art, {printCatalog: print})
      .join('\n');
    assert.match(problems, /the-great-wave-off-kanagawa-blanket: duplicate handle/);
  }
  // The base collection's SKU code: the SKU collides.
  {
    const {art, print} = editionCatalogs();
    editionCollection(print).skuCode = 'FW';
    waveEdition(art).variants[0].sku = 'CM-FW-01-BLANKET50X60';
    assert.match(
      prints.validatePrintCatalog(print).join('\n'),
      /duplicate slug, skuCode or title "FW"/,
    );
    assert.match(
      family.validateArtProductCatalog(art, {printCatalog: print}).join('\n'),
      /duplicate SKU CM-FW-01-BLANKET50X60/,
    );
  }
  // Without `edition` it is a second plain blanket of the work: refused.
  {
    const {art, print} = editionCatalogs();
    delete editionCollection(print).edition;
    const problems = family
      .validateArtProductCatalog(art, {printCatalog: print})
      .join('\n');
    assert.match(problems, /met-39799 already has a blanket product/);
    const links = shops
      .validateArtistLinks({artProducts: art, catalog: print})
      .join('\n');
    assert.match(
      links,
      /art-and-words\/the-great-wave-off-kanagawa-quote: artwork met-39799 is already sold as floating-world\/the-great-wave-off-kanagawa/,
    );
    assert.match(
      links,
      /floating-world\/the-great-wave-off-kanagawa-blanket: artwork met-39799 is already sold as art-and-words\/the-great-wave-off-kanagawa-quote-blanket/,
    );
  }
  // Two products of one work in the same edition: refused.
  {
    const {art, print} = editionCatalogs();
    const second = structuredClone(editionCollection(print).prints[0]);
    Object.assign(second, {sequence: 9, slug: 'the-great-wave-again-quote'});
    editionCollection(print).prints.push(second);
    const copy = structuredClone(waveEdition(art));
    Object.assign(copy, {
      handle: 'the-great-wave-again-quote-blanket',
      print: second.slug,
    });
    copy.variants[0].sku = 'CM-AW-09-BLANKET50X60';
    art.products.push(copy);
    assert.match(
      family.validateArtProductCatalog(art, {printCatalog: print}).join('\n'),
      /met-39799 already has a blanket product in the art-and-words edition/,
    );
  }
});

test('the edition check passes text inside its boxes and fails a change anywhere else', async () => {
  const sharp = (await import('sharp')).default;
  const width = 256;
  const height = 192;
  const channels = 3;
  // A busy base, so the JPEG round trip has real noise to absorb.
  const raw = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * channels;
      raw[offset] = 128 + Math.round(90 * Math.sin(x / 13 + y / 29));
      raw[offset + 1] = 128 + Math.round(60 * Math.sin(x / 9) * Math.cos(y / 7));
      raw[offset + 2] = 60 + Math.round(y / 2);
    }
  const jpeg = (pixels) =>
    sharp(pixels, {raw: {channels, height, width}})
      .jpeg({chromaSubsampling: '4:4:4', quality: 95})
      .toBuffer();
  const decoded = async (buffer) =>
    sharp(buffer).removeAlpha().raw().toBuffer();
  const base = await jpeg(raw);
  const basePixels = await decoded(base);
  const paint = (pixels, [left, top, right, bottom], value) => {
    const out = Buffer.from(pixels);
    for (let y = top; y < bottom; y += 1)
      for (let x = left; x < right; x += 1)
        for (let c = 0; c < channels; c += 1)
          out[(y * width + x) * channels + c] = value;
    return out;
  };
  const boxes = {credit: [40, 150, 120, 162], quote: [40, 100, 200, 140]};
  // Lettering: dark strokes inside both boxes, re-encoded as JPEG.
  let lettered = paint(basePixels, [44, 104, 196, 112], 17);
  lettered = paint(lettered, [44, 124, 150, 132], 17);
  lettered = paint(lettered, [42, 152, 110, 158], 17);
  const check = await compareEditionFile(base, await jpeg(lettered), boxes);
  assert.equal(check.status, 'ok', JSON.stringify(check));
  assert.ok(check.outsideMaxDifference <= family.EDITION_CHECK.outsideMax);
  assert.ok(check.boxPeaks.quote >= family.EDITION_CHECK.insideMin);
  // A 6 × 6 px change of 40 levels outside the boxes is caught.
  const touched = Buffer.from(lettered);
  for (let y = 20; y < 26; y += 1)
    for (let x = 200; x < 206; x += 1)
      for (let c = 0; c < channels; c += 1) {
        const offset = (y * width + x) * channels + c;
        touched[offset] = Math.min(255, touched[offset] + 40);
      }
  const outside = await compareEditionFile(base, await jpeg(touched), boxes);
  assert.equal(outside.status, 'failed');
  assert.equal(outside.outsideCells[0].left, 192);
  assert.equal(outside.outsideCells[0].top, 0);
  // A declared box with nothing in it fails too.
  const empty = await compareEditionFile(base, await jpeg(lettered), {
    ...boxes,
    signature: [200, 20, 240, 40],
  });
  assert.equal(empty.status, 'failed');
  assert.equal(empty.boxPeaks.signature < family.EDITION_CHECK.insideMin, true);
  // Re-encoding alone (no lettering) fails: the boxes must hold the words.
  assert.equal(
    (await compareEditionFile(base, await jpeg(basePixels), boxes)).status,
    'failed',
  );
  // The pure check refuses images of different sizes.
  assert.throws(
    () =>
      editionDifference(
        Buffer.alloc(12),
        Buffer.alloc(9),
        {channels, height: 2, width: 2},
        boxes,
      ),
    /differ in size/,
  );
});

test('an edition file changed outside its text boxes, or never checked, cannot be released', () => {
  const {art} = editionCatalogs();
  const product = waveEdition(art);
  const file = product.assets.files['blanket-50x60'];
  file.provenance.edition = {
    ...file.provenance.edition,
    outsideCells: [{difference: 12.5, left: 4096, top: 640}],
    status: 'failed',
  };
  assert.match(
    family.validateArtProductCatalog(art).join('\n'),
    /the-great-wave-off-kanagawa-quote-blanket 50x60: blanket-50x60 has no passed check against its base file/,
  );
  assert.ok(
    familyReleaseBlockers(product, {catalog: art}).includes(
      'every file checked against its base file: changed only inside its text boxes',
    ),
  );
  // A plain file's AI-fill flag never stands in for the edition check.
  delete file.provenance.edition;
  file.provenance.aiFill = {block_identical: true, status: 'ok'};
  assert.ok(
    familyReleaseBlockers(product, {catalog: art}).includes(
      'every file checked against its base file: changed only inside its text boxes',
    ),
  );
  // The base file itself is not an edition file.
  const {art: same} = editionCatalogs();
  const base = waveEdition(same).assets.files['blanket-50x60'];
  base.sha256 = family.editionFileOf(waveEdition(same), same).base.sha256;
  assert.match(
    family.validateArtProductCatalog(same).join('\n'),
    /blanket-50x60 is its base file/,
  );
});

test('a quote, font or box change makes the edition stale and its mapping unverified', () => {
  const {art} = editionCatalogs();
  const product = waveEdition(art);
  const [variant] = product.variants;
  const file = product.assets.files['blanket-50x60'];
  const signature = family.familySourceSignature(product, {catalog: art});
  assert.equal(signature, product.assets.sourceSignature);
  // The signature carries the words, font and boxes; the base's does not.
  const recorded = JSON.parse(JSON.parse(signature).edition);
  assert.equal(recorded.quote, family.editionFileOf(product, art).quote);
  assert.equal(recorded.credit, 'Katsushika Hokusai, 1834');
  assert.match(recorded.font[1], /^[0-9a-f]{64}$/);
  assert.equal(recorded.textBoxes.length, 3);
  const base = byHandle(art, 'the-great-wave-off-kanagawa-blanket');
  assert.equal('edition' in JSON.parse(family.familySourceSignature(base)), false);

  // Mapped on today's file and record (what `mapped --printful` writes).
  product.shopify = {
    productId: 'gid://shopify/Product/1',
    variantIds: {'50x60': 'gid://shopify/ProductVariant/2'},
  };
  const {mappings, problems} = printfulMappingFromReadback(
    product,
    {
      sync_product: {external_id: '1', id: 77},
      sync_variants: [
        {
          external_id: '2',
          files: [{hash: 'abc', type: 'default'}],
          id: 88,
          synced: true,
          variant_id: 10986,
        },
      ],
    },
    {fileFacts: () => ({md5: 'abc', name: 'x.jpg'}), today: '2026-11-17'},
  );
  assert.deepEqual(problems, []);
  assert.equal(mappings['50x60'].sourceSignature, signature);
  variant.mapping = mappings['50x60'];
  assert.equal(family.variantMappingCurrent(product, variant, {catalog: art}), true);

  for (const change of [
    (record) => (record.quote = 'At a hundred and ten, every dot will seem alive.'),
    (record) => (record.credit = 'Hokusai, 1834'),
    (record) => (record.font.sha256 = '0'.repeat(64)),
    (record) => (record.textBoxes.quote[0] += 1),
  ]) {
    const changed = structuredClone(art);
    change(family.editionFileOf(waveEdition(changed), changed));
    const stale = waveEdition(changed);
    stale.variants[0].mapping = mappings['50x60'];
    // The same file and sync ids, but no longer the words on record.
    assert.equal(stale.variants[0].mapping.assetSha256, file.sha256);
    assert.equal(
      family.variantMappingCurrent(stale, stale.variants[0], {catalog: changed}),
      false,
    );
    const blockers = familyReleaseBlockers(stale, {catalog: changed});
    assert.ok(blockers.includes('current assets'), blockers.join(', '));
    assert.ok(
      blockers.includes('a verified fulfilment mapping of the current file'),
    );
    assert.ok(
      blockers.includes(
        'every file checked against its base file: changed only inside its text boxes',
      ),
    );
    assert.equal(familyStatus(stale, {catalog: changed}).current, false);
  }
});

test('an edition file needs the owner’s approval of that very file', () => {
  const blocked = (art) =>
    familyReleaseBlockers(waveEdition(art), {catalog: art}).includes(
      'the owner’s approval of this edition file',
    );
  assert.equal(blocked(family.ART_PRODUCT_CATALOG), false);
  // The Great Wave's crop is approved: that never passes an edition file.
  assert.equal(MUSEUM_CROPS.crops['met-39799'].approval.approved, true);
  {
    const {art} = editionCatalogs();
    delete editionCollection(art).suppliedApprovals['met-39799'];
    assert.equal(blocked(art), true);
  }
  // An approval of the base (plain) file is not an approval of the edition.
  {
    const {art} = editionCatalogs();
    const record = family.editionFileOf(waveEdition(art), art);
    editionCollection(art).suppliedApprovals['met-39799'].sha256 =
      record.base.sha256;
    assert.equal(blocked(art), true);
  }
  // One without the file's sha256 is refused outright in an edition.
  {
    const {art} = editionCatalogs();
    delete editionCollection(art).suppliedApprovals['met-39799'].sha256;
    assert.match(
      family.validateArtProductCatalog(art).join('\n'),
      /suppliedApprovals met-39799 names the sha256 of the edition file approved/,
    );
    assert.equal(blocked(art), true);
  }
  // The plain collection's approvals do not reach the edition.
  const lineAndColour = family.ART_PRODUCT_CATALOG.collections.find(
    (entry) => entry.slug === 'line-and-colour',
  );
  assert.ok(lineAndColour.suppliedApprovals['aic-8983']);
  {
    const {art} = editionCatalogs();
    delete editionCollection(art).suppliedApprovals['aic-8983'];
    const troika = byHandle(art, 'painting-with-troika-quote-blanket');
    assert.ok(
      familyReleaseBlockers(troika, {catalog: art}).includes(
        'the owner’s approval of this edition file',
      ),
    );
  }
  // ppi exceptions are the edition's own, dated, never copied.
  const own = editionCollection(family.ART_PRODUCT_CATALOG).families.blanket
    .ppiExceptions;
  assert.deepEqual(Object.keys(own).sort(), ['aic-8983', 'met-39799']);
  for (const exception of Object.values(own)) {
    assert.equal(exception.at, '2026-11-17');
    assert.match(exception.note, /owner to confirm/);
  }
});

test('an edition is never staged, prepared or released as an art print', () => {
  const edition = editionCollection(PRINT_CATALOG);
  assert.equal(prints.isEditionCollection(edition), true);
  assert.throws(
    () => assertPrintCollection(edition, 'stage'),
    /never art prints.*--family blanket/,
  );
  assert.throws(
    () => buildProductSetInput(edition, edition.prints[0]),
    /never art prints/,
  );
  assert.equal(assertPrintCollection(FLOATING_WORLD, 'stage'), FLOATING_WORLD);
  // The data cannot make it one either.
  const bad = structuredClone(PRINT_CATALOG);
  const collection = editionCollection(bad);
  collection.variants = structuredClone(FLOATING_WORLD.variants);
  collection.prints[0].released = true;
  collection.prints[0].rooms = structuredClone(FLOATING_WORLD.prints[0].rooms);
  const problems = prints.validatePrintCatalog(bad).join('\n');
  assert.match(problems, /an edition collection has no print variants/);
  assert.match(problems, /an edition print is never released as a print/);
  assert.match(problems, /an edition print has no room scenes/);
  // Never an art print on the storefront or in the museum tool's links.
  assert.equal(
    computeSellableHandles().has('the-great-wave-off-kanagawa-quote-art-print'),
    false,
  );
});
