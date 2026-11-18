import assert from 'node:assert/strict';
import test from 'node:test';
import {withPolicySections} from '../app/lib/policySections.ts';

const body = [
  '<h2>Printed products: processing time</h2><p>a</p>',
  '<h2>Shipping costs</h2><p>b</p>',
  '<h2 class="x">Import taxes &amp; duties</h2><p>c</p>',
  '<h2 id="us">Orders to the <strong>United States</strong></h2>',
  '<h2>Shipping costs</h2>',
].join('');

test('a long policy gets an id on every h2 and a matching section list', () => {
  const {body: html, sections} = withPolicySections(body);
  assert.deepEqual(sections, [
    {id: 'printed-products-processing-time', title: 'Printed products: processing time'},
    {id: 'shipping-costs', title: 'Shipping costs'},
    {id: 'import-taxes-duties', title: 'Import taxes & duties'},
    {id: 'us', title: 'Orders to the United States'},
    {id: 'shipping-costs-2', title: 'Shipping costs'},
  ]);
  for (const {id} of sections) {
    assert.equal(html.match(new RegExp(`id="${id}"`, 'g'))?.length, 1, id);
  }
  assert.match(html, /<h2 id="import-taxes-duties" class="x">/);
});

test('a short policy is left exactly as it was', () => {
  const short = '<h2>Returns</h2><p>x</p><h2>Refunds</h2>';
  assert.deepEqual(withPolicySections(short), {body: short, sections: []});
  assert.deepEqual(withPolicySections('<p><strong>Returns</strong></p>'), {
    body: '<p><strong>Returns</strong></p>',
    sections: [],
  });
});
