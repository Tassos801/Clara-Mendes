import assert from 'node:assert/strict';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import * as family from '../app/lib/artProductCatalog.ts';
import {findArtwork, masterSize} from '../app/lib/artRegistry.ts';
import {ARTIST_PRODUCT_FAMILIES} from '../app/lib/artistShops.ts';
import {PRINT_CATALOG} from '../app/lib/printCatalog.ts';
import {
  artMatchError,
  describeFile,
  renderFamilyFile,
  renderFamilyPreview,
} from './lib/art-product-assets.mjs';
import {
  buildFamilyProductInput,
  expectedFamilyProduct,
  familyAssetPlan,
  PREVIEW_SIZE,
} from './lib/art-product-pipeline.mjs';

const FLOATING_WORLD = PRINT_CATALOG.collections.find(
  (collection) => collection.slug === 'floating-world',
);
const WAVE = FLOATING_WORLD.prints.find(
  (print) => print.slug === 'the-great-wave-off-kanagawa',
);
const LAUNCH = path.join('X:', 'launches');
/** A mug offered with its price still pending (no priceEUR). */
const PENDING = {providerSku: 'GLOBAL-MUG-W'};
const MUG = family.FAMILY_SPECS.mug;

/** The shipped catalog with Floating World offering a price-pending mug. */
function withMug(config = PENDING) {
  const catalog = structuredClone(family.ART_PRODUCT_CATALOG);
  const collection = catalog.collections.find(
    (entry) => entry.slug === 'floating-world',
  );
  collection.families.mug = config;
  return {catalog, collection};
}

test('the mug is Prodigi GLOBAL-MUG-W: 229 × 95 mm at 300 dpi, two whole-work panels', () => {
  assert.equal(family.ART_PRODUCT_FAMILIES.at(-1), 'mug');
  assert.equal(MUG.providerSku, 'GLOBAL-MUG-W');
  assert.equal(MUG.route, 'channel');
  assert.equal(MUG.shape, null, 'the whole composition, never a crop');
  assert.equal(MUG.minPpi, 300);
  assert.deepEqual(MUG.single, {
    key: '11oz',
    option: '11 oz',
    skuSuffix: 'MUG11',
  });
  const {file} = MUG;
  assert.deepEqual([file.width, file.height, file.dpi], [2705, 1122, 300]);
  // 229 × 95 mm at 300 dpi, to the pixel.
  assert.equal(Math.round((229 / 25.4) * 300), file.width);
  assert.equal(Math.round((95 / 25.4) * 300), file.height);
  assert.deepEqual(file.wholePanels, [
    {centreX: 57.25, centreY: 47.5, height: 85, width: 100},
    {centreX: 171.75, centreY: 47.5, height: 85, width: 100},
  ]);
  assert.equal(file.followsOrientation, false);
  assert.deepEqual(family.familyFileSize('mug', 'portrait'), {
    height: 1122,
    width: 2705,
  });
  assert.deepEqual(family.familyFileSize('mug', 'landscape'), {
    height: 1122,
    width: 2705,
  });
  // The artist shop lists it under its own product type.
  assert.equal(MUG.artistFamily, 'Mugs');
  assert.ok(ARTIST_PRODUCT_FAMILIES.includes('Mugs'));
});

test('each panel holds the whole work, fitted and centred, symmetric on the wrap', () => {
  // Mondrian, Cleveland 1967.215: near-square, limited by the 85 mm height.
  const square = family.wholePanelLayout({height: 9998, width: 9856}, 'mug');
  assert.deepEqual(square.panels, [
    {height: 1004, left: 86, top: 59, width: 1181},
    {height: 1004, left: 1438, top: 59, width: 1181},
  ]);
  assert.deepEqual(square.placements, [
    {height: 1003, left: 182, top: 60, width: 989},
    {height: 1003, left: 1534, top: 60, width: 989},
  ]);
  assert.deepEqual(square.imageMm, {height: 84.9, width: 83.7});
  assert.equal(square.nativePpi, 2989.7);
  // The Great Wave, landscape: limited by the 100 mm width.
  const wave = family.wholePanelLayout({height: 2644, width: 3867}, 'mug');
  assert.deepEqual(wave.placements[0], {
    height: 807,
    left: 86,
    top: 158,
    width: 1181,
  });
  assert.deepEqual(wave.imageMm, {height: 68.3, width: 100});
  assert.equal(wave.nativePpi, 982.3);
  // AIC 8991 as served at the 3000 px cap still prints far above 300 ppi.
  assert.equal(
    family.wholePanelLayout({height: 3000, width: 2987}, 'mug').nativePpi,
    897,
  );

  for (const size of [
    {height: 9998, width: 9856},
    {height: 2644, width: 3867},
    {height: 3000, width: 2987},
    {height: 2250, width: 2417},
    {height: 4000, width: 1000},
  ]) {
    const layout = family.wholePanelLayout(size, 'mug');
    layout.placements.forEach((box, index) => {
      const panel = layout.panels[index];
      // Inside its panel, touching it on the limiting side.
      assert.ok(box.left >= panel.left && box.top >= panel.top);
      assert.ok(box.left + box.width <= panel.left + panel.width);
      assert.ok(box.top + box.height <= panel.top + panel.height);
      assert.ok(
        panel.width - box.width <= 1 || panel.height - box.height <= 1,
        'fitted, not shrunk',
      );
      // No stretch: the work's aspect within a pixel.
      assert.ok(
        Math.abs(box.width / box.height - size.width / size.height) <
          1.5 / Math.min(box.width, box.height),
      );
    });
    const [left, right] = layout.placements;
    assert.deepEqual(
      [left.width, left.height, left.top],
      [right.width, right.height, right.top],
    );
    // Mirror margins: the wrap is symmetric about its centre.
    assert.ok(Math.abs(left.left - (2705 - (right.left + right.width))) <= 1);
  }
  assert.equal(family.wholePanelLayout({height: 1, width: 1}, 'canvas'), null);
  assert.equal(
    family.wholePanelLayout({height: 1, width: 1}, 'framed-print'),
    null,
  );
});

test('a price-pending mug is offered and prepared, never staged', () => {
  const {catalog, collection} = withMug();
  const product = expectedFamilyProduct(
    FLOATING_WORLD,
    WAVE,
    'mug',
    collection.families.mug,
  );
  assert.equal(product.handle, 'the-great-wave-off-kanagawa-mug');
  assert.equal(product.title, 'The Great Wave off Kanagawa Mug');
  assert.deepEqual(
    product.variants.map((variant) => [
      variant.key,
      variant.option,
      variant.sku,
      variant.providerSku,
    ]),
    [['11oz', '11 oz', 'CM-FW-01-MUG11', 'GLOBAL-MUG-W']],
  );
  assert.equal(product.variants[0].priceEUR, undefined);
  catalog.products.push(product);
  assert.deepEqual(family.validateArtProductCatalog(catalog), []);
  assert.throws(
    () =>
      buildFamilyProductInput(product, {
        artCollection: collection,
        collection: FLOATING_WORLD,
      }),
    /no approved mug price yet/,
  );
  // A priceless product in Shopify is refused outright.
  product.shopify = {
    productId: 'gid://shopify/Product/1',
    variantIds: {'11oz': 'v'},
  };
  assert.match(
    family.validateArtProductCatalog(catalog).join('\n'),
    /staged or released without an approved mug price/,
  );

  // Once the owner approves a price, the Draft input carries it.
  const priced = withMug({...PENDING, priceEUR: '19.99'});
  const mug = expectedFamilyProduct(
    FLOATING_WORLD,
    WAVE,
    'mug',
    priced.collection.families.mug,
  );
  const input = buildFamilyProductInput(mug, {
    artCollection: priced.collection,
    collection: FLOATING_WORLD,
  });
  assert.equal(input.productType, 'Mugs');
  assert.equal(input.status, 'DRAFT');
  assert.deepEqual(input.productOptions[0].values, [{name: '11 oz'}]);
  assert.equal(input.variants[0].price, '19.99');
  assert.equal(input.variants[0].sku, 'CM-FW-01-MUG11');
  assert.match(input.descriptionHtml, /Printed whole, on each side/);
  assert.ok(input.tags.includes('Mugs'));
});

test('a mug must be the Prodigi product its file is drawn for, at a real price', () => {
  const other = withMug({providerSku: 'GLOBAL-MUG-15OZ'});
  assert.match(
    family.validateArtProductCatalog(other.catalog).join('\n'),
    /mug providerSku must be GLOBAL-MUG-W/,
  );
  const price = withMug({...PENDING, priceEUR: '19.9'});
  assert.match(
    family.validateArtProductCatalog(price.catalog).join('\n'),
    /mug priceEUR must look like "29.99"/,
  );
});

test('the mug plan extracts the whole master and renders its own file', () => {
  const {collection} = withMug();
  const plan = (print) =>
    familyAssetPlan(
      expectedFamilyProduct(
        FLOATING_WORLD,
        print,
        'mug',
        collection.families.mug,
      ),
      {collection: FLOATING_WORLD, launchRoot: LAUNCH},
    );
  const wave = plan(WAVE);
  assert.equal(wave.output.reused, false);
  assert.equal(
    wave.output.path,
    'floating-world/mug/the-great-wave-off-kanagawa-mug-11oz-300dpi.jpg',
  );
  assert.deepEqual(
    [wave.output.width, wave.output.height, wave.output.dpi, wave.output.panel],
    [2705, 1122, 300, null],
  );
  assert.equal(wave.box, null);
  const master = masterSize(findArtwork(WAVE.artworkId));
  assert.deepEqual(wave.extract, {
    height: master.height,
    left: 0,
    top: 0,
    width: master.width,
  });
  assert.deepEqual(
    wave.output.placements,
    family.wholePanelLayout(master, 'mug').placements,
  );
  assert.equal(wave.ppi, 982.3);
  assert.equal(wave.minPpi, 300);
  assert.match(
    wave.sourceSignature,
    /"whole":\[\[86,158,1181,807\],\[1438,158,1181,807\]\]/,
  );
  // A recorded trim is left out: Hodogaya's 98 px mount tab.
  const hodogaya = plan(
    FLOATING_WORLD.prints.find(
      (print) => print.slug === 'hodogaya-on-the-tokaido',
    ),
  );
  assert.equal(hodogaya.extract.top, 98);
  assert.equal(hodogaya.extract.height, hodogaya.source.height - 98);
  for (const print of FLOATING_WORLD.prints)
    assert.ok(plan(print).ppi >= 300, `${print.slug} mug ppi`);
});

test('the mug file is the whole work twice on white, and the preview shows it', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'cm-mug-'));
  try {
    // A synthetic portrait "original": a gradient with a red block.
    const width = 900;
    const height = 1200;
    const raw = Buffer.alloc(width * height * 3);
    for (let y = 0; y < height; y += 1)
      for (let x = 0; x < width; x += 1) {
        const i = (y * width + x) * 3;
        const block = x > 300 && x < 600 && y > 400 && y < 700;
        raw[i] = block ? 220 : (x * 200) / width;
        raw[i + 1] = block ? 30 : (y * 200) / height;
        raw[i + 2] = 90;
      }
    const source = path.join(dir, 'original.jpg');
    writeFileSync(
      source,
      await sharp(raw, {raw: {channels: 3, height, width}})
        .jpeg({quality: 98})
        .toBuffer(),
    );
    const layout = family.wholePanelLayout({height, width}, 'mug');
    const plan = {
      extract: {height, left: 0, top: 0, width},
      family: 'mug',
      handle: 'synthetic-mug',
      output: {
        dpi: 300,
        height: MUG.file.height,
        panel: null,
        placements: layout.placements,
        width: MUG.file.width,
      },
      preview: PREVIEW_SIZE,
      source: {file: source},
    };
    const file = await renderFamilyFile(plan);
    const facts = await describeFile(file);
    assert.deepEqual(
      [
        facts.width,
        facts.height,
        Math.round(facts.dpi),
        facts.space,
        facts.channels,
      ],
      [2705, 1122, 300, 'srgb', 3],
    );
    assert.ok(
      (await artMatchError(plan, file)) < 4,
      'both panels hold the work',
    );
    // One panel moved is caught.
    const moved = structuredClone(plan);
    moved.output.placements[1].left += 60;
    assert.ok(
      (await artMatchError(moved, file)) > 4,
      'a misplaced panel is caught',
    );
    // Outside the placements the wrap is white: the outer margins and the
    // strip between the two panels.
    const [left, right] = layout.placements;
    for (const box of [
      {height: 1122, left: 0, top: 0, width: left.left - 2},
      {
        height: 1122,
        left: left.left + left.width + 2,
        top: 0,
        width: right.left - left.left - left.width - 4,
      },
      {
        height: 1122,
        left: right.left + right.width + 2,
        top: 0,
        width: 2705 - right.left - right.width - 2,
      },
      {height: left.top - 2, left: 0, top: 0, width: 2705},
    ]) {
      // stats() reads its input, so the region is cut to a buffer first.
      const stats = await sharp(
        await sharp(file).extract(box).toBuffer(),
      ).stats();
      stats.channels
        .slice(0, 3)
        .forEach((channel) =>
          assert.ok(channel.mean > 253, JSON.stringify(box)),
        );
    }
    const preview = await renderFamilyPreview(plan, file);
    const shown = await sharp(preview).metadata();
    assert.deepEqual(
      [shown.format, shown.width, shown.height],
      ['webp', 1600, 2000],
    );
    // The art faces the viewer: the red block shows on the mug's front.
    const {data, info} = await sharp(preview)
      .removeAlpha()
      .raw()
      .toBuffer({resolveWithObject: true});
    let red = 0;
    for (let i = 0; i < data.length; i += info.channels)
      if (data[i] > 170 && data[i + 1] < 90) red += 1;
    assert.ok(red > 5000, `red block visible in the preview (${red} px)`);
  } finally {
    rmSync(dir, {force: true, recursive: true});
  }
});
