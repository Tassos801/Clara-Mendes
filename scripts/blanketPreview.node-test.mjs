import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import * as family from '../app/lib/artProductCatalog.ts';
import {
  blanketTurnedBack,
  renderSuppliedPreview,
} from './lib/art-product-assets.mjs';
import {
  familyGalleryPlan,
  familyScenePath,
} from './lib/art-product-pipeline.mjs';

const RED = {b: 30, g: 30, r: 220};
const BLUE = {b: 200, g: 60, r: 30};

/**
 * A small "work": blue, with a red block at its top-left corner, so the
 * preview shows which way up it is drawn.
 */
async function work(width, height) {
  return sharp({create: {background: BLUE, channels: 3, height, width}})
    .composite([
      {
        input: await sharp({
          create: {
            background: RED,
            channels: 3,
            height: Math.round(height / 4),
            width: Math.round(width / 4),
          },
        })
          .png()
          .toBuffer(),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toBuffer();
}

const plan = (rotated90) => ({
  family: 'blanket',
  files: [{dpi: 150, key: 'blanket-50x60', provenance: {rotated90}}],
  handle: 'test-blanket',
  preview: {height: 2000, width: 1600},
});

/** The blanket's box in the preview (pixels far from the linen). */
async function pieceOf(preview) {
  const {data, info} = await sharp(preview)
    .removeAlpha()
    .raw()
    .toBuffer({resolveWithObject: true});
  let left = info.width;
  let right = -1;
  let top = info.height;
  let bottom = -1;
  for (let y = 0; y < info.height; y += 1)
    for (let x = 0; x < info.width; x += 1) {
      const i = (y * info.width + x) * 3;
      // The work is saturated red or blue; linen and shadow are not.
      const saturated =
        Math.max(data[i], data[i + 1], data[i + 2]) -
          Math.min(data[i], data[i + 1], data[i + 2]) >
        100;
      if (!saturated) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  const pixel = (x, y) => {
    const i = (y * info.width + x) * 3;
    return {b: data[i + 2], g: data[i + 1], r: data[i]};
  };
  return {
    bottom,
    height: bottom - top + 1,
    left,
    pixel,
    right,
    top,
    width: right - left + 1,
  };
}

test('a wide work on a blanket is shown turned back: landscape, art upright', async () => {
  // The supplied file holds the wide work a quarter-turn anticlockwise
  // (PIL rotate(90)), so it fills the portrait 50 × 60 in print.
  const upright = await work(600, 500);
  const printFile = await sharp(upright).rotate(-90).png().toBuffer();
  assert.deepEqual(
    [
      (await sharp(printFile).metadata()).width,
      (await sharp(printFile).metadata()).height,
    ],
    [500, 600],
  );
  assert.equal(blanketTurnedBack(plan(true)), true);
  const preview = await renderSuppliedPreview(plan(true), printFile);
  const meta = await sharp(preview).metadata();
  assert.deepEqual([meta.width, meta.height], [1600, 2000]);
  const piece = await pieceOf(preview);
  assert.ok(
    piece.width > piece.height,
    `landscape blanket, got ${piece.width}×${piece.height}`,
  );
  assert.ok(Math.abs(piece.width / piece.height - 1.2) < 0.01);
  // The red corner is at the blanket's top-left again.
  const corner = piece.pixel(piece.left + 20, piece.top + 20);
  assert.ok(corner.r > 150 && corner.b < 100, JSON.stringify(corner));
  const far = piece.pixel(piece.right - 20, piece.bottom - 20);
  assert.ok(far.b > 150 && far.r < 100, JSON.stringify(far));
});

test('a blanket file that was not turned keeps its portrait preview', async () => {
  const printFile = await work(500, 600);
  assert.equal(blanketTurnedBack(plan(false)), false);
  const preview = await renderSuppliedPreview(plan(false), printFile);
  const piece = await pieceOf(preview);
  assert.ok(piece.height > piece.width);
  const corner = piece.pixel(piece.left + 20, piece.top + 20);
  assert.ok(corner.r > 150 && corner.b < 100, JSON.stringify(corner));
});

test('only the blanket signature carries a preview renderer, so other families stay current', () => {
  assert.equal(family.FAMILY_SPECS.blanket.previewRenderer, 2);
  for (const [name, spec] of Object.entries(family.FAMILY_SPECS))
    if (name !== 'blanket') assert.equal(spec.previewRenderer, undefined, name);
  const blanket = family.ART_PRODUCT_CATALOG.products.find(
    (product) => product.family === 'blanket',
  );
  assert.equal(JSON.parse(family.familySourceSignature(blanket)).preview, 2);
  const cushion = family.ART_PRODUCT_CATALOG.products.find(
    (product) => product.family === 'cushion',
  );
  assert.equal(
    'preview' in JSON.parse(family.familySourceSignature(cushion)),
    false,
  );
});

test('every blanket records a preview drawn by the current renderer', () => {
  for (const product of family.ART_PRODUCT_CATALOG.products) {
    if (product.family !== 'blanket') continue;
    const file = product.assets.files['blanket-50x60'];
    // The files are always portrait; the preview canvas is 4:5.
    assert.deepEqual([file.width, file.height], [7500, 9000], product.handle);
    assert.equal(
      product.assets.sourceSignature,
      family.familySourceSignature(product),
      `${product.handle}: preview drawn by the current renderer`,
    );
  }
});

test('media puts the current preview first, the scene second, and keeps every old image', () => {
  const sideways = {id: 'old', preview: false, scene: false};
  // A turned-back blanket: the live gallery is only the sideways image.
  assert.deepEqual(familyGalleryPlan([sideways], {scene: true}), {
    inPlace: false,
    kept: ['old'],
    order: ['preview', 'scene', 'old'],
    upload: ['preview', 'scene'],
  });
  assert.deepEqual(familyGalleryPlan([sideways]).order, ['preview', 'old']);
  // After the upload, the new images are found by pixels and moved first.
  const fresh = [
    sideways,
    {id: 'new', preview: true, scene: false},
    {id: 'room', preview: false, scene: true},
  ];
  const plan = familyGalleryPlan(fresh, {scene: true});
  assert.deepEqual(plan.upload, []);
  assert.deepEqual(plan.order, ['new', 'room', 'old']);
  assert.equal(plan.inPlace, false);
  // Re-running on the finished gallery changes nothing.
  assert.equal(
    familyGalleryPlan([fresh[1], fresh[2], sideways], {scene: true}).inPlace,
    true,
  );
  // A portrait blanket whose preview did not change, without a scene.
  assert.equal(
    familyGalleryPlan([{id: 'same', preview: true, scene: false}]).inPlace,
    true,
  );
});

test('a scene lives beside the preview under the launch folder', () => {
  assert.equal(
    familyScenePath({
      collection: 'floating-world',
      family: 'blanket',
      handle: 'the-great-wave-off-kanagawa-blanket',
    }),
    'floating-world/blanket/scene/the-great-wave-off-kanagawa-blanket.jpg',
  );
});
