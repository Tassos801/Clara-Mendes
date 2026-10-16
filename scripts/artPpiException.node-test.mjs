import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import * as family from '../app/lib/artProductCatalog.ts';
import {PRINT_CATALOG} from '../app/lib/printCatalog.ts';
import {assetIssues, familyAssetPlan} from './lib/art-product-pipeline.mjs';

const FLOATING_WORLD = PRINT_CATALOG.collections.find(
  (collection) => collection.slug === 'floating-world',
);
const WAVE = FLOATING_WORLD.prints.find(
  (print) => print.slug === 'the-great-wave-off-kanagawa',
);
const FUJI = FLOATING_WORLD.prints.find((print) => print.slug !== WAVE.slug);
const LAUNCH = path.join('X:', 'launches');
const caseOf = (catalog, print) =>
  catalog.products.find(
    (product) =>
      product.print === print.slug && product.family === 'phone-case',
  );
/** What the owner would record for one work; never granted in the data. */
const EXCEPTION = {
  at: '2026-10-15',
  by: 'Owner',
  minPpi: 286,
  note: 'AIC serves 3000 px; owner accepts the case at 286 ppi',
};

function withException(exception = EXCEPTION, artworkId = WAVE.artworkId) {
  const catalog = structuredClone(family.ART_PRODUCT_CATALOG);
  catalog.collections.find((entry) => entry.slug === 'floating-world').families[
    'phone-case'
  ].ppiExceptions = {[artworkId]: exception};
  return catalog;
}

test('no ppi exception is granted in the shipped data', () => {
  for (const collection of family.ART_PRODUCT_CATALOG.collections)
    for (const [kind, config] of Object.entries(collection.families))
      assert.equal(
        config.ppiExceptions,
        undefined,
        `${collection.slug} ${kind}`,
      );
  assert.equal(family.FAMILY_SPECS['phone-case'].minPpi, 300);
});

test('a case below 300 ppi is refused unless the owner accepted that one work', () => {
  const plan = (catalog, print) =>
    familyAssetPlan(caseOf(catalog, print), {
      artCatalog: catalog,
      collection: FLOATING_WORLD,
      launchRoot: LAUNCH,
    });
  const issue = (entry) =>
    assetIssues(
      {...entry, ppi: 288},
      {
        dpi: entry.output.dpi,
        height: entry.output.height,
        width: entry.output.width,
      },
    );

  const shipped = plan(family.ART_PRODUCT_CATALOG, WAVE);
  assert.equal(shipped.minPpi, 300);
  assert.equal(shipped.ppiException, null);
  assert.deepEqual(issue(shipped), [
    'the-great-wave-off-kanagawa-phone-case: 288 ppi native is below the accepted 300; only the owner can accept less (ppiExceptions in data/art-product-catalog.json)',
  ]);

  const granted = withException();
  const wave = plan(granted, WAVE);
  assert.equal(wave.minPpi, 286);
  assert.deepEqual(wave.ppiException, EXCEPTION);
  assert.deepEqual(issue(wave), []);
  // The exception is for that work only: the others still need 300.
  assert.equal(plan(granted, FUJI).minPpi, 300);
  assert.equal(issue(plan(granted, FUJI)).length, 1);
  // And for that family only.
  assert.equal(
    family.familyPpiFloor(
      {...caseOf(granted, WAVE), family: 'postcard'},
      granted,
    ).minPpi,
    300,
  );
});

test('an exception records who, when and why, and stays above the 150 ppi floor', () => {
  assert.deepEqual(family.validateArtProductCatalog(withException()), []);
  const problems = (exception, artworkId) =>
    family
      .validateArtProductCatalog(withException(exception, artworkId))
      .join('\n');
  assert.match(
    problems({...EXCEPTION, by: ''}),
    /phone-case ppi exception for met-39799: records who granted it, when and why/,
  );
  assert.match(problems({...EXCEPTION, note: ' '}), /when and why/);
  assert.match(
    problems({...EXCEPTION, minPpi: 120}),
    /minPpi must be at least 150 and below the family's 300/,
  );
  // An "exception" at or above the floor is no exception.
  assert.match(problems({...EXCEPTION, minPpi: 300}), /below the family's 300/);
  assert.match(
    problems(EXCEPTION, 'aic-8991'),
    /ppi exception for aic-8991: not an artwork of this collection/,
  );
});

test('release stops when a file sits below its floor, and an exception lifts only that', () => {
  const catalog = structuredClone(family.ART_PRODUCT_CATALOG);
  const wave = caseOf(catalog, WAVE);
  assert.deepEqual(family.familyReleaseIssues(wave, {catalog}), []);
  wave.assets.ppi = 288;
  assert.deepEqual(family.familyReleaseIssues(wave, {catalog}), [
    'native ppi at its floor or an owner ppi exception',
  ]);
  const granted = withException();
  caseOf(granted, WAVE).assets.ppi = 288;
  assert.deepEqual(
    family.familyReleaseIssues(caseOf(granted, WAVE), {catalog: granted}),
    [],
  );
  // The validator reports a released product sitting below its floor.
  assert.match(
    family.validateArtProductCatalog(catalog).join('\n'),
    /the-great-wave-off-kanagawa-phone-case: released without native ppi at its floor/,
  );
});
