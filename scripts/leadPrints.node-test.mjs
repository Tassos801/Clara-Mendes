import assert from 'node:assert/strict';
import test from 'node:test';
import {catalogCounts} from '../app/lib/catalogSummary.ts';
import {LEAD_PRINTS, leadPrintsQuery} from '../app/lib/leadPrints.ts';

test('one lead print per studio capsule, founding capsules first', () => {
  assert.equal(LEAD_PRINTS.length, catalogCounts().capsules);
  assert.deepEqual(
    LEAD_PRINTS.slice(0, 5).map((p) => p.capsule),
    ['Quiet Form', 'Patina Blue', 'Neo Deco', 'Midnight Garden', 'Sunlit Mosaic'],
  );
  for (const print of LEAD_PRINTS) {
    assert.match(print.handle, /-art-print$/);
    assert.match(print.image, /^\/images\/product-art\//);
    assert.ok(print.shortTitle.length > 0);
    assert.ok(print.description.length > 0);
    assert.ok(print.alt.length > 0);
  }
  const scifi = LEAD_PRINTS.find((p) => p.capsule === 'Sci-fi & Cinema');
  assert.ok(scifi, 'Sci-fi & Cinema has a lead print');
  assert.equal(scifi.handle, 'orbital-silence-art-print');
  assert.equal(scifi.palette, null);
});

test('the lead-print query selects studio prints by capsule tag', () => {
  const query = leadPrintsQuery();
  assert.match(query, /tag:"Quiet Form"/);
  assert.match(query, /tag:"Sci-fi & Cinema"/);
  assert.doesNotMatch(query, /Floating World/);
  assert.match(query, /product_type:"Art Prints"/);
});
