import assert from 'node:assert/strict';
import test from 'node:test';
import * as registryModule from '../app/lib/artRegistry.ts';
import * as crops from '../app/lib/museumCrops.ts';
import * as prints from '../app/lib/printCatalog.ts';

const FLOATING_WORLD = prints.PRINT_CATALOG.collections.find(
  (collection) => collection.slug === 'floating-world',
);

/** A synthetic landscape work, 4000×2500, with an inset printed area. */
const SIZE = {height: 2500, width: 4000};
const AREA = {bottom: 0.98, left: 0.02, right: 0.98, top: 0.02};
const centred = {cx: 0.5, cy: 0.5};
const spec = (overrides = {}) => ({
  area: AREA,
  canvas: centred,
  card: centred,
  case: centred,
  postcard: centred,
  ...overrides,
});

test('the shipped crop data is valid and frames every Floating World work', () => {
  assert.deepEqual(crops.validateMuseumCrops(), []);
  for (const print of FLOATING_WORLD.prints)
    assert.ok(
      crops.MUSEUM_CROPS.crops[print.artworkId],
      `${print.slug} has crops`,
    );
  // Crops are proposals until the owner approves them.
  assert.equal(typeof crops.MUSEUM_CROPS.approval.approved, 'boolean');
});

test('every shipped crop has its exact aspect, stays printed, and prints sharp', () => {
  for (const print of FLOATING_WORLD.prints) {
    const plan = crops.cropPlan(print.artworkId);
    const {area} = crops.MUSEUM_CROPS.crops[print.artworkId];
    for (const entry of plan.shapes) {
      const {box, shape} = entry;
      const aspect = crops.shapeAspect(shape, plan.size);
      assert.ok(
        Math.abs(box.width - box.height * aspect) <= 1,
        `${print.slug} ${shape} aspect`,
      );
      assert.ok(
        box.left >= Math.round(area.left * plan.size.width),
        `${print.slug} ${shape} left`,
      );
      assert.ok(
        box.top >= Math.round(area.top * plan.size.height),
        `${print.slug} ${shape} top`,
      );
      assert.ok(
        box.left + box.width <= Math.round(area.right * plan.size.width),
        `${print.slug} ${shape} right`,
      );
      assert.ok(
        box.top + box.height <= Math.round(area.bottom * plan.size.height),
        `${print.slug} ${shape} bottom`,
      );
      // Small products must not need a ppi exception.
      if (shape !== 'canvas')
        assert.equal(
          entry.verdict,
          'qualified',
          `${print.slug} ${shape} ${entry.ppi}`,
        );
    }
    const caseEntry = plan.shapes.find((entry) => entry.shape === 'case');
    const file = caseEntry.file;
    assert.ok(Math.abs(file.width - file.height * crops.CASE_FILE_ASPECT) <= 1);
    assert.ok(file.left >= 0 && file.left + file.width <= plan.size.width);
    assert.ok(
      file.left <= caseEntry.box.left &&
        file.left + file.width >= caseEntry.box.left + caseEntry.box.width,
    );
  }
});

test('a crop is the largest box of its aspect, tightened by zoom and kept inside', () => {
  const card = crops.cropBox(SIZE, spec(), 'card');
  // Landscape work, portrait card: the printed height bounds the box.
  assert.equal(card.height, 2400);
  assert.equal(card.width, Math.round(2400 * (1529 / 2161)));
  assert.equal(card.left, Math.round(2000 - card.width / 2));

  const zoomed = crops.cropBox(
    SIZE,
    spec({card: {cx: 0.5, cy: 0.5, zoom: 2}}),
    'card',
  );
  assert.equal(zoomed.height, 1200);

  // A centre near the edge slides the box in rather than cutting it.
  const edge = crops.cropBox(SIZE, spec({card: {cx: 0, cy: 0.5}}), 'card');
  assert.equal(edge.left, 80);

  // Canvas follows the work: 5:4 for this landscape work.
  const canvas = crops.cropBox(SIZE, spec(), 'canvas');
  assert.ok(Math.abs(canvas.width / canvas.height - 5 / 4) < 0.002);
  const portrait = crops.cropBox({height: 4000, width: 2500}, spec(), 'canvas');
  assert.ok(Math.abs(portrait.width / portrait.height - 4 / 5) < 0.002);
});

test('a portrait work’s phone-case crop leaves room for its 4:5 file', () => {
  const size = {height: 3800, width: 2600};
  const box = crops.cropBox(size, spec(), 'case');
  assert.ok(box.height <= size.width / crops.CASE_FILE_ASPECT);
  const file = crops.caseFileBox(size, box);
  assert.ok(file.width <= size.width);
  assert.equal(file.height, box.height);
});

test('the crop validator refuses unsafe data', () => {
  const [id] = Object.keys(crops.MUSEUM_CROPS.crops);
  const base = structuredClone(crops.MUSEUM_CROPS);
  const problems = (mutate) => {
    const data = structuredClone(base);
    mutate(data);
    return crops
      .validateMuseumCrops(data, registryModule.ART_REGISTRY)
      .join('\n');
  };
  assert.match(
    problems((d) => (d.crops[id].case.cx = 1.4)),
    /case needs cx and cy/,
  );
  assert.match(
    problems((d) => (d.crops[id].card.zoom = 4)),
    /card\.zoom must be between 1 and 3/,
  );
  assert.match(
    problems((d) => (d.crops[id].area.right = 0.3)),
    /area must be fractions/,
  );
  assert.match(
    problems((d) => (d.crops['met-0'] = d.crops[id])),
    /met-0: unknown artwork/,
  );
  assert.match(
    problems((d) => (d.approval = {approved: true})),
    /records who approved and when/,
  );
  assert.match(
    problems((d) => delete d.chosen),
    /who chose the crops/,
  );
});
