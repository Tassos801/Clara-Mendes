import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import * as family from '../app/lib/artProductCatalog.ts';
import * as registryModule from '../app/lib/artRegistry.ts';
import {MUSEUM_CROPS} from '../app/lib/museumCrops.ts';
import {PRINT_CATALOG} from '../app/lib/printCatalog.ts';
import {
  buildFamilyProductInput,
  expectedFamilyProduct,
  familyAssetPlan,
  familyHandoffRows,
  familyReadbackIssues,
  familyStatus,
  parseFamilyMappings,
  printfulMappingFromReadback,
  printfulSyncPlan,
  suppliedAssetPlan,
} from './lib/art-product-pipeline.mjs';

/**
 * The "seven products per artist" families (owner decision 2026-10-16,
 * Confluence 3548282881): finished files whose margins were filled outside
 * the pipeline, recorded with their AI-fill log, several options per
 * product, and Printful as a second supplier.
 */
const SUPPLIED = [
  'hanger-print',
  'acrylic-print',
  'metal-print',
  'printful-mug',
  'cushion',
  'blanket',
];
const collectionOf = (slug) =>
  PRINT_CATALOG.collections.find((entry) => entry.slug === slug);
const artCollectionOf = (slug, catalog = family.ART_PRODUCT_CATALOG) =>
  catalog.collections.find((entry) => entry.slug === slug);
const FW = collectionOf('floating-world');
const LC = collectionOf('line-and-colour');
const WAVE = FW.prints.find(
  (print) => print.slug === 'the-great-wave-off-kanagawa',
);
const FIREWORKS = FW.prints.find(
  (print) => print.slug === 'fireworks-at-ryogoku-bridge',
);
const LOZENGE = LC.prints.find((print) => print.slug === 'lozenge-composition');
const LAUNCH = path.join('X:', 'launches');
const productOf = (catalog, print, kind) =>
  catalog.products.find(
    (product) => product.print === print.slug && product.family === kind,
  );

test('six supplied families follow the rendered ones, each its own product type', () => {
  assert.deepEqual(family.ART_PRODUCT_FAMILIES.slice(-6), SUPPLIED);
  for (const kind of SUPPLIED) {
    const spec = family.FAMILY_SPECS[kind];
    assert.ok(spec.suppliedFiles, kind);
    assert.equal(spec.shape, null, `${kind} never crops the work`);
    assert.equal(spec.single, null);
    assert.ok(spec.variantDefs.portrait.length);
  }
  assert.deepEqual(
    SUPPLIED.map((kind) => family.FAMILY_SPECS[kind].route),
    ['channel', 'channel', 'channel', 'printful', 'printful', 'printful'],
  );
  // The Printful mug is "<print>-mug", like the Prodigi one it replaces.
  assert.equal(family.familyHandle(WAVE, 'printful-mug'), `${WAVE.slug}-mug`);
  assert.equal(
    family.familyTitle(WAVE, 'hanger-print'),
    'The Great Wave off Kanagawa Print with Hanger',
  );
  assert.equal(
    family.familyTitle(WAVE, 'blanket'),
    'The Great Wave off Kanagawa Throw Blanket',
  );
});

test('hangers: two sizes per orientation, each in black, white or oak', () => {
  const keys = (orientation) =>
    family
      .familyVariantDefs('hanger-print', orientation)
      .map((def) => [def.key, def.values.join(' / '), def.providerSku]);
  assert.deepEqual(keys('landscape'), [
    ['a3-black', 'A3 (42 × 29.7 cm) / Black', 'POSTER-HANGER-40-A3-LAND'],
    ['a3-white', 'A3 (42 × 29.7 cm) / White', 'POSTER-HANGER-40-A3-LAND'],
    ['a3-oak', 'A3 (42 × 29.7 cm) / Oak', 'POSTER-HANGER-40-A3-LAND'],
    ['large-black', '76 × 51 cm / Black', 'POSTER-HANGER-80-20X30-LAND'],
    ['large-white', '76 × 51 cm / White', 'POSTER-HANGER-80-20X30-LAND'],
    ['large-oak', '76 × 51 cm / Oak', 'POSTER-HANGER-80-20X30-LAND'],
  ]);
  assert.deepEqual(
    keys('portrait')
      .map(([, option, sku]) => [option, sku])
      .slice(2, 4),
    [
      ['A3 (29.7 × 42 cm) / Oak', 'POSTER-HANGER-30-A3-PORT'],
      ['60 × 90 cm / Black', 'POSTER-HANGER-60-24X36-PORT'],
    ],
  );
  assert.deepEqual(
    family
      .familyVariantDefs('hanger-print', 'portrait')
      .map((def) => def.providerAttributes.color),
    ['black', 'white', 'natural', 'black', 'white', 'natural'],
  );
  assert.equal(
    family.familySku(FW, WAVE, 'hanger-print', 'large-oak'),
    'CM-FW-01-HANG-LG-OAK',
  );
  assert.throws(
    () => family.familySku(FW, WAVE, 'hanger-print'),
    /need a variant key/,
  );
});

test('cushions: 18 or 22 inch, cover only or with insert, on Printful 215 and 214', () => {
  const defs = family.familyVariantDefs('cushion', 'landscape');
  assert.deepEqual(
    defs.map((def) => [def.key, def.values, def.providerSku, def.file]),
    [
      ['18-cover', ['18 × 18 in', 'Cover only'], '9516', 'cushion-22'],
      ['18-insert', ['18 × 18 in', 'With insert'], '9515', 'cushion-22'],
      ['22-cover', ['22 × 22 in', 'Cover only'], '11078', 'cushion-22'],
      ['22-insert', ['22 × 22 in', 'With insert'], '11077', 'cushion-22'],
    ],
  );
  assert.deepEqual(family.familyOptionNames('cushion'), ['Size', 'Filling']);
  assert.deepEqual(family.FAMILY_SPECS.cushion.printfulPlacements, [
    'front',
    'back',
  ]);
  assert.equal(
    family.familyVariantDefs('printful-mug', 'portrait')[0].providerSku,
    '1320',
  );
  assert.equal(
    family.familyVariantDefs('blanket', 'portrait')[0].providerSku,
    '10986',
  );
});

test('both museum collections offer the six at the page prices; released but three', () => {
  // Line and Colour keeps its Prodigi mug (owner, 20 Oct 2026), so it has
  // five of the six; Floating World has the Printful mug.
  for (const [slug, mugs] of [
    ['floating-world', 1],
    ['line-and-colour', 0],
  ]) {
    const entry = artCollectionOf(slug);
    assert.ok(entry.suppliedFiles.startsWith('museum/seven-products'));
    assert.deepEqual(entry.families['hanger-print'].prices, {
      a3: '39.99',
      large: '74.99',
    });
    assert.deepEqual(entry.families['acrylic-print'].prices, {
      '8x12': '79.99',
      '12x16': '114.99',
      '16x24': '159.99',
    });
    assert.deepEqual(entry.families['metal-print'].prices, {'8x12': '79.99'});
    if (mugs)
      assert.deepEqual(entry.families['printful-mug'].prices, {
        '11oz': '24.99',
      });
    else assert.ok(!('printful-mug' in entry.families));
    assert.deepEqual(entry.families.cushion.prices, {
      '18-cover': '44.99',
      '18-insert': '64.99',
      '22-cover': '49.99',
      '22-insert': '69.99',
    });
    assert.deepEqual(entry.families.blanket.prices, {'50x60': '64.99'});
    const products = family.ART_PRODUCT_CATALOG.products.filter(
      (product) =>
        product.collection === slug && SUPPLIED.includes(product.family),
    );
    assert.equal(products.length, 50 + 10 * mugs);
    // Released on 2026-10-20, except the three whose large files are not
    // with their supplier yet.
    assert.deepEqual(
      products
        .filter((product) => !product.released)
        .map((product) => product.handle),
      slug === 'line-and-colour'
        ? [
            'chrysanthemum-hanger-print',
            'landscape-with-two-poplars-blanket',
            'chrysanthemum-blanket',
          ]
        : [],
    );
    assert.equal(
      products.reduce((sum, product) => sum + product.variants.length, 0),
      10 * (6 + 3 + 1 + mugs + 4 + 1),
    );
  }
  assert.ok('mug' in artCollectionOf('line-and-colour').families);
  assert.ok(!('mug' in artCollectionOf('floating-world').families));
  const wave = productOf(family.ART_PRODUCT_CATALOG, WAVE, 'acrylic-print');
  assert.deepEqual(
    wave.variants.map((variant) => [variant.sku, variant.priceEUR]),
    [
      ['CM-FW-01-ACRY8X12', '79.99'],
      ['CM-FW-01-ACRY12X16', '114.99'],
      ['CM-FW-01-ACRY16X24', '159.99'],
    ],
  );
});

test('every supplied file is recorded with its AI-fill log and native ppi', () => {
  for (const product of family.ART_PRODUCT_CATALOG.products.filter((p) =>
    SUPPLIED.includes(p.family),
  )) {
    const files = Object.entries(product.assets.files);
    assert.deepEqual(
      files.map(([key]) => key).sort(),
      [...new Set(product.variants.map((variant) => variant.file))].sort(),
      product.handle,
    );
    for (const [key, file] of files) {
      assert.equal(file.provenance.aiFill.block_identical, true, key);
      assert.equal(file.provenance.aiFill.status, 'ok', key);
      assert.match(file.sha256, /^[0-9a-f]{64}$/);
      assert.ok(file.path.startsWith('museum/seven-products'), file.path);
      assert.ok(file.ppi > 0);
    }
    assert.equal(
      product.assets.ppi,
      Math.min(...files.map(([, file]) => file.ppi)),
    );
    assert.equal(
      product.assets.print.sha256,
      family.variantFile(product, product.variants[0]).sha256,
    );
  }
  // A wide work is turned on the blanket; its log says so.
  const blanket = productOf(family.ART_PRODUCT_CATALOG, WAVE, 'blanket');
  assert.equal(
    blanket.assets.files['blanket-50x60'].provenance.rotated90,
    true,
  );
  const hanger = productOf(family.ART_PRODUCT_CATALOG, WAVE, 'hanger-print');
  assert.equal(hanger.assets.files['hanger-a3'].provenance.hangerStripMm, 15);
});

test('a square work follows the layout of its supplied files', () => {
  const lozenge = productOf(
    family.ART_PRODUCT_CATALOG,
    LOZENGE,
    'hanger-print',
  );
  assert.equal(lozenge.orientation, 'portrait');
  assert.equal(
    family.familyLayout(lozenge, artCollectionOf('line-and-colour')),
    'landscape',
  );
  assert.equal(lozenge.variants[0].providerSku, 'POSTER-HANGER-40-A3-LAND');
  // Only for square works, and only for supplied families.
  assert.equal(
    family.familyLayout(
      {...lozenge, family: 'canvas'},
      artCollectionOf('line-and-colour'),
    ),
    'portrait',
  );
  const catalog = structuredClone(family.ART_PRODUCT_CATALOG);
  artCollectionOf('floating-world', catalog).suppliedLayout = {
    [FIREWORKS.artworkId]: 'landscape',
  };
  assert.match(
    family.validateArtProductCatalog(catalog).join('\n'),
    /suppliedLayout is for square works; met-37093 is portrait/,
  );
});

test('validation guards prices, files and logs of the supplied families', () => {
  const problems = (edit) => {
    const catalog = structuredClone(family.ART_PRODUCT_CATALOG);
    edit(catalog);
    return family.validateArtProductCatalog(catalog).join('\n');
  };
  assert.deepEqual(family.validateArtProductCatalog(), []);
  assert.match(
    problems((catalog) => {
      artCollectionOf('floating-world', catalog).families[
        'hanger-print'
      ].prices.a3 = '39.9';
    }),
    /hanger-print price a3 must look like "29.99"/,
  );
  assert.match(
    problems((catalog) => {
      artCollectionOf('floating-world', catalog).families.cushion.priceEUR =
        '44.99';
    }),
    /cushion sells at a price per size/,
  );
  assert.match(
    problems((catalog) => {
      productOf(catalog, WAVE, 'cushion').variants[1].priceEUR = '44.99';
    }),
    /the-great-wave-off-kanagawa-cushion 18-insert: price must be the collection's 64.99/,
  );
  assert.match(
    problems((catalog) => {
      productOf(catalog, WAVE, 'hanger-print').variants[2].providerAttributes =
        {color: 'black'};
    }),
    /a3-oak: provider attributes must be \{"color":"natural"\}/,
  );
  assert.match(
    problems((catalog) => {
      productOf(catalog, WAVE, 'blanket').assets.files[
        'blanket-50x60'
      ].provenance.aiFill.block_identical = false;
    }),
    /blanket-50x60 has no check that the museum image is unchanged/,
  );
  assert.match(
    problems((catalog) => {
      delete artCollectionOf('floating-world', catalog).suppliedFiles;
    }),
    /set suppliedFiles to their folder/,
  );
  // A collection sells one mug per work: the Prodigi and Printful mugs
  // share the "<print>-mug" handle.
  assert.match(
    problems((catalog) => {
      const entry = artCollectionOf('floating-world', catalog);
      entry.families.mug = {priceEUR: '19.99', providerSku: 'GLOBAL-MUG-W'};
      catalog.products.push(
        expectedFamilyProduct(FW, WAVE, 'mug', entry.families.mug, entry),
      );
    }),
    /the-great-wave-off-kanagawa-mug: duplicate handle/,
  );
});

test('the Draft input carries both options and every variant at its own price', () => {
  const catalog = family.ART_PRODUCT_CATALOG;
  const input = (print, kind) =>
    buildFamilyProductInput(productOf(catalog, print, kind), {
      artCollection: artCollectionOf('floating-world'),
      collection: FW,
    });
  const hanger = input(WAVE, 'hanger-print');
  assert.equal(hanger.status, 'DRAFT');
  assert.equal(hanger.productType, 'Hanger Prints');
  assert.deepEqual(hanger.productOptions, [
    {
      name: 'Size',
      position: 1,
      values: [{name: 'A3 (42 × 29.7 cm)'}, {name: '76 × 51 cm'}],
    },
    {
      name: 'Hanger',
      position: 2,
      values: [{name: 'Black'}, {name: 'White'}, {name: 'Oak'}],
    },
  ]);
  assert.equal(hanger.variants.length, 6);
  assert.deepEqual(hanger.variants[4].optionValues, [
    {name: '76 × 51 cm', optionName: 'Size'},
    {name: 'White', optionName: 'Hanger'},
  ]);
  assert.deepEqual(
    hanger.variants.map((variant) => variant.price),
    ['39.99', '39.99', '39.99', '74.99', '74.99', '74.99'],
  );
  for (const variant of hanger.variants) {
    assert.equal(variant.inventoryPolicy, 'DENY');
    assert.deepEqual(variant.inventoryItem, {
      requiresShipping: true,
      tracked: true,
    });
  }
  // The copy says what was added around the work, and never "original".
  assert.match(hanger.descriptionHtml, /The work itself is unchanged/);
  assert.match(hanger.descriptionHtml, /filled in digitally/);
  assert.doesNotMatch(hanger.descriptionHtml, /original|Unframed/i);

  const cushion = input(FIREWORKS, 'cushion');
  assert.deepEqual(
    cushion.productOptions.map((option) => [
      option.name,
      option.values.map((value) => value.name),
    ]),
    [
      ['Size', ['18 × 18 in', '22 × 22 in']],
      ['Filling', ['Cover only', 'With insert']],
    ],
  );
  const mug = input(WAVE, 'printful-mug');
  assert.equal(mug.handle, 'the-great-wave-off-kanagawa-mug');
  assert.equal(mug.productType, 'Mugs');
  assert.equal(mug.variants[0].sku, 'CM-FW-01-MUG11-PF');

  // A fresh readback is compared option by option.
  const live = {
    ...hanger,
    tags: hanger.tags,
    totalInventory: 0,
    variants: {
      nodes: hanger.variants.map((variant) => ({
        inventoryItem: {requiresShipping: true, tracked: true},
        inventoryPolicy: 'DENY',
        price: variant.price,
        selectedOptions: variant.optionValues.map((value) => ({
          name: value.optionName,
          value: value.name,
        })),
        sku: variant.sku,
      })),
    },
  };
  assert.deepEqual(familyReadbackIssues(hanger, live), []);
  live.variants.nodes[5].selectedOptions[1].value = 'Black';
  assert.deepEqual(familyReadbackIssues(hanger, live), [
    'the-great-wave-off-kanagawa-hanger-print CM-FW-01-HANG-LG-OAK: Hanger is Black',
  ]);
});

/** A small manifest and AI-fill log for the Great Wave's metal print. */
function suppliedFixture() {
  const row = {
    aspect_trim_percent: 0,
    dpi: 300,
    file: 'products/met-39799/met-39799-metal-8x12.jpg',
    hanger_strip_mm: 0,
    pixels: [3600, 2400],
    product: 'metal-8x12',
    rotated_90: false,
    sha256: 'b'.repeat(64),
    sku: 'MOU-DI-20X30',
    source_master: 'masters/met-39799/ratio-2x3.png',
    source_sha256: 'c'.repeat(64),
    work: 'met-39799',
  };
  const assembly = {
    'met-39799/ratio-2x3': {
      block_identical: true,
      canvas: [3837, 2558],
      fill_sides: {left: 'paper', right: 'paper'},
      status: 'ok',
    },
  };
  return {assembly, manifest: [row], row};
}

test('suppliedAssetPlan reads the manifest row and the log, and computes ppi', () => {
  const product = productOf(family.ART_PRODUCT_CATALOG, WAVE, 'metal-print');
  const {assembly, manifest} = suppliedFixture();
  const options = {
    artCollection: artCollectionOf('floating-world'),
    assembly,
    collection: FW,
    launchRoot: LAUNCH,
    manifest,
    masterPixels: () => null,
  };
  const plan = suppliedAssetPlan(product, options);
  assert.deepEqual(plan.problems, []);
  assert.equal(plan.files.length, 1);
  const [file] = plan.files;
  assert.equal(
    file.path,
    'museum/seven-products/products/met-39799/met-39799-metal-8x12.jpg',
  );
  assert.equal(
    file.file,
    path.join(
      LAUNCH,
      'museum',
      'seven-products',
      'products',
      'met-39799',
      'met-39799-metal-8x12.jpg',
    ),
  );
  // 3837 master pixels across 12 printed inches.
  assert.equal(file.ppi, 319.8);
  assert.equal(plan.ppi, 319.8);
  assert.equal(plan.minPpi, 150);
  assert.deepEqual(file.provenance.aiFill.fill_sides, {
    left: 'paper',
    right: 'paper',
  });
  assert.equal(
    file.provenance.master,
    'museum/seven-products/masters/met-39799/ratio-2x3.png',
  );
  assert.equal(
    plan.preview.path,
    'floating-world/metal-print/web/the-great-wave-off-kanagawa-metal-print.webp',
  );

  // A file drawn for another SKU or size, or without a clean log, is refused.
  const wrong = suppliedFixture();
  wrong.row.sku = 'GLOBAL-MOU-ACRY-8X12';
  wrong.row.pixels = [2400, 3600];
  wrong.assembly['met-39799/ratio-2x3'].block_identical = false;
  const refused = suppliedAssetPlan(product, {
    ...options,
    assembly: wrong.assembly,
    manifest: wrong.manifest,
  });
  assert.equal(refused.problems.length, 3);
  assert.match(refused.problems.join('\n'), /drawn for GLOBAL-MOU-ACRY-8X12/);
  assert.match(refused.problems.join('\n'), /landscape file must be 3600×2400/);
  assert.match(refused.problems.join('\n'), /museum image unchanged/);
  assert.match(
    suppliedAssetPlan(product, {...options, manifest: []}).problems[0],
    /0 manifest rows for met-39799 metal-8x12/,
  );
  // The rendered families keep their own planner.
  assert.throws(
    () => familyAssetPlan(product, {collection: FW, launchRoot: LAUNCH}),
    /prints supplied files/,
  );
});

/** The Great Wave's family products, staged, with every gate open. */
function staged(kind) {
  const catalog = structuredClone(family.ART_PRODUCT_CATALOG);
  const product = productOf(catalog, WAVE, kind);
  product.shopify = {
    productId: 'gid://shopify/Product/900',
    variantIds: Object.fromEntries(
      product.variants.map((variant, index) => [
        variant.key,
        `gid://shopify/ProductVariant/${9000 + index}`,
      ]),
    ),
  };
  return {catalog, product};
}

test('each variant is verified on its own file; Printful needs its sync ids', () => {
  const {product} = staged('hanger-print');
  const a3 = product.assets.files['hanger-a3'].sha256;
  for (const variant of product.variants)
    variant.mapping = {
      assetSha256: a3,
      channelProductId: '7000001',
      verified: true,
    };
  // The large sizes print hanger-big, so an A3 mapping does not cover them.
  assert.deepEqual(
    product.variants.map((variant) =>
      family.variantMappingCurrent(product, variant),
    ),
    [true, true, true, false, false, false],
  );
  assert.equal(familyStatus(product).mapped, false);
  assert.equal(
    familyStatus(product).next,
    'handoff → map in Prodigi → mapped --family',
  );

  const cushion = staged('cushion').product;
  const file = cushion.assets.files['cushion-22'].sha256;
  for (const variant of cushion.variants)
    variant.mapping = {assetSha256: file, verified: true};
  assert.ok(
    cushion.variants.every(
      (variant) => !family.variantMappingCurrent(cushion, variant),
    ),
    'a Printful mapping without sync ids is not verified',
  );
  assert.equal(
    familyStatus(cushion).next,
    'handoff → sync in Printful → mapped --family',
  );
  for (const [index, variant] of cushion.variants.entries())
    variant.mapping = {
      assetSha256: file,
      printfulSyncProductId: '400',
      printfulSyncVariantId: String(4000 + index),
      verified: true,
    };
  assert.ok(familyStatus(cushion).mapped);
  // Release stays blocked by the owner gates (reviews, ppi) all the same.
  const issues = family.familyReleaseIssues(cushion);
  assert.ok(
    !issues.includes('a verified fulfilment mapping of the current file'),
  );
  assert.ok(!issues.includes('Shopify ids'));
});

test('the Printful readback must name each Shopify variant, its Printful variant and file', () => {
  const {product} = staged('cushion');
  const recorded = product.assets.files['cushion-22'];
  const name = path.basename(recorded.path);
  const syncVariant = (variant, index, files) => ({
    external_id: String(9000 + index),
    files,
    id: 5000 + index,
    synced: true,
    variant_id: Number(variant.providerSku),
  });
  const bothSides = [
    {
      filename: name,
      hash: 'f'.repeat(32),
      height: 3300,
      type: 'default',
      width: 3300,
    },
    {
      filename: name,
      hash: 'f'.repeat(32),
      height: 3300,
      type: 'back',
      width: 3300,
    },
  ];
  const readback = {
    sync_product: {external_id: '900', id: 77},
    sync_variants: product.variants.map((variant, index) =>
      syncVariant(variant, index, bothSides),
    ),
  };
  const fileFacts = () => ({md5: 'f'.repeat(32), name});
  const ok = printfulMappingFromReadback(product, readback, {
    fileFacts,
    today: '2026-10-16',
  });
  assert.deepEqual(ok.problems, []);
  assert.deepEqual(ok.mappings['22-insert'], {
    assetSha256: recorded.sha256,
    note: 'Printful file matched by md5',
    printfulSyncProductId: '77',
    printfulSyncVariantId: '5003',
    verified: true,
    verifiedAt: '2026-10-16',
  });

  // Wrong Printful variant, a missing back, another file: nothing recorded.
  const bad = structuredClone(readback);
  bad.sync_variants[0].variant_id = 9515;
  bad.sync_variants[1].files = bothSides.slice(0, 1);
  bad.sync_variants[2].files = bothSides.map((file) => ({
    ...file,
    filename: 'other.jpg',
    hash: 'e'.repeat(32),
  }));
  const refused = printfulMappingFromReadback(product, bad, {
    fileFacts,
    today: '2026-10-16',
  });
  assert.equal(refused.mappings, null);
  assert.match(
    refused.problems.join('\n'),
    /18-cover: synced to Printful variant 9515, expected 9516/,
  );
  assert.match(
    refused.problems.join('\n'),
    /18-insert: no back file in Printful/,
  );
  assert.match(
    refused.problems.join('\n'),
    /22-cover: the front file in Printful \(other\.jpg/,
  );
  assert.match(
    printfulMappingFromReadback(
      product,
      {...readback, sync_product: {external_id: '1', id: 77}},
      {fileFacts, today: '2026-10-16'},
    ).problems[0],
    /is Shopify product 1, expected 900/,
  );
  assert.deepEqual(parseFamilyMappings(FW, 'cushion', [`${WAVE.slug}=77`]), [
    {id: '77', slug: WAVE.slug},
  ]);
  assert.throws(
    () => parseFamilyMappings(FW, 'cushion', [WAVE.slug]),
    /Printful sync product id must be digits/,
  );
});

test('the Printful sync plan attaches each variant to its catalogue variant and file', () => {
  const {product} = staged('cushion');
  // Not imported by the Printful app yet: nothing can be synced.
  const missing = printfulSyncPlan(product, null);
  assert.match(missing.problems[0], /not in Printful yet/);
  assert.ok(missing.rows.every((row) => row.action === 'sync'));

  const fileIds = new Map([['cushion-22', 321]]);
  const unsynced = {
    sync_product: {external_id: '900', id: 77},
    sync_variants: product.variants.map((variant, index) => ({
      external_id: product.shopify.variantIds[variant.key].split('/').pop(),
      files: [],
      id: 5000 + index,
      synced: false,
      variant_id: null,
    })),
  };
  const first = printfulSyncPlan(product, unsynced, fileIds);
  assert.deepEqual(first.problems, []);
  assert.deepEqual(
    first.rows.map((row) => [row.key, row.action, row.body.variant_id]),
    [
      ['18-cover', 'sync', 9516],
      ['18-insert', 'sync', 9515],
      ['22-cover', 'sync', 11078],
      ['22-insert', 'sync', 11077],
    ],
  );
  // Cushions print the same file on both sides.
  assert.deepEqual(first.rows[0].body.files, [
    {id: 321, type: 'front'},
    {id: 321, type: 'back'},
  ]);

  // Synced to the right variant and file on both sides: kept; Printful may
  // call the front "default".
  const synced = structuredClone(unsynced);
  for (const [index, entry] of synced.sync_variants.entries()) {
    entry.synced = true;
    entry.variant_id = first.rows[index].body.variant_id;
    entry.files = [
      {id: 321, type: 'default'},
      {id: 321, type: 'back'},
    ];
  }
  synced.sync_variants[3].files[1].id = 999;
  assert.deepEqual(
    printfulSyncPlan(product, synced, fileIds).rows.map((row) => row.action),
    ['keep', 'keep', 'keep', 'sync'],
  );
});

test('handoffs list every variant with its own file, per supplier', () => {
  const catalog = family.ART_PRODUCT_CATALOG;
  const products = catalog.products.filter((p) => p.print === WAVE.slug);
  const options = {
    artCollection: artCollectionOf('floating-world'),
    collection: FW,
    launchRoot: LAUNCH,
    sha256: () => 'a'.repeat(64),
  };
  const prodigi = familyHandoffRows(products, options).filter((row) =>
    SUPPLIED.includes(row.family),
  );
  assert.equal(prodigi.length, 6 + 3 + 1);
  const large = prodigi.find((row) => row.sku === 'CM-FW-01-HANG-LG-OAK');
  assert.equal(large.providerSku, 'POSTER-HANGER-80-20X30-LAND');
  assert.equal(large.providerAttributes, 'color=natural');
  assert.match(large.printFile, /met-39799-hanger-big\.jpg$/);
  assert.equal(large.pixels, '9000x6000');
  const printful = familyHandoffRows(products, {...options, route: 'printful'});
  assert.deepEqual(
    printful.map((row) => [row.family, row.option, row.providerSku]),
    [
      ['printful-mug', '11 oz', '1320'],
      ['cushion', '18 × 18 in / Cover only', '9516'],
      ['cushion', '18 × 18 in / With insert', '9515'],
      ['cushion', '22 × 22 in / Cover only', '11078'],
      ['cushion', '22 × 22 in / With insert', '11077'],
      ['blanket', '50 × 60 in', '10986'],
    ],
  );
  assert.ok(printful.every((row) => 'printfulSyncVariantId' in row));
});

test('release needs the owner to accept a file below its ppi floor', () => {
  const registry = structuredClone(registryModule.ART_REGISTRY);
  const crops = structuredClone(MUSEUM_CROPS);
  const {catalog, product} = staged('blanket');
  for (const variant of product.variants)
    variant.mapping = {
      assetSha256: product.assets.files['blanket-50x60'].sha256,
      printfulSyncProductId: '1',
      printfulSyncVariantId: '2',
      verified: true,
    };
  const blankets = artCollectionOf('floating-world', catalog).families.blanket;
  const accepted = blankets.ppiExceptions[product.artworkId];
  const issuesOf = () =>
    family.familyReleaseIssues(product, {catalog, crops, registry});
  const ppiIssue = 'native ppi at its floor or an owner ppi exception';

  delete blankets.ppiExceptions[product.artworkId];
  assert.ok(product.assets.ppi < 150);
  assert.ok(issuesOf().includes(ppiIssue), issuesOf().join(', '));

  // The owner accepted it as it is (2026-10-20): supplied files may go down
  // to MIN_SUPPLIED_EXCEPTION_PPI, other families stay at MIN_EXCEPTION_PPI.
  blankets.ppiExceptions[product.artworkId] = accepted;
  assert.ok(accepted.minPpi < 150 && accepted.minPpi <= product.assets.ppi);
  assert.ok(!issuesOf().includes(ppiIssue));
  assert.deepEqual(family.validateArtProductCatalog(catalog), []);
  blankets.ppiExceptions[product.artworkId] = {
    ...accepted,
    minPpi: family.MIN_SUPPLIED_EXCEPTION_PPI - 1,
  };
  assert.match(
    family.validateArtProductCatalog(catalog).join('\n'),
    /blanket ppi exception for met-39799: minPpi must be at least 40 and below the family's 150/,
  );
});

test('the owner can approve the supplied files of a work with no approved crop', () => {
  const catalog = structuredClone(family.ART_PRODUCT_CATALOG);
  const lc = artCollectionOf('line-and-colour', catalog);
  const troika = catalog.products.find(
    (p) =>
      p.collection === 'line-and-colour' &&
      p.family === 'metal-print' &&
      p.artworkId === 'aic-8983',
  );
  assert.equal(MUSEUM_CROPS.crops['aic-8983'], undefined);
  const issues = () => family.familyReleaseIssues(troika, {catalog});
  assert.ok(lc.suppliedApprovals['aic-8983']);
  assert.ok(!issues().includes('crop approval'), issues().join(', '));
  delete lc.suppliedApprovals['aic-8983'];
  assert.ok(issues().includes('crop approval'));
  lc.suppliedApprovals['aic-8983'] = {at: '2026-10-20', by: '', note: 'x'};
  assert.match(
    family.validateArtProductCatalog(catalog).join('\n'),
    /suppliedApprovals aic-8983 records who approved, when and why/,
  );
});
