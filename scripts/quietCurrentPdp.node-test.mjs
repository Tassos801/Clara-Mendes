import assert from 'node:assert/strict';
import test from 'node:test';

import {htmlToText, parseApparelDescription} from '../app/lib/apparelCopy.ts';
import {collectionHero} from '../app/lib/collectionHeroes.ts';
import {
  APPAREL_SHIPPING_FROM_EUR,
  APPAREL_SHIPPING_RATES,
} from '../app/lib/storefrontBasics.ts';

// The studio bra's live descriptionHtml (2026-10-07), trimmed to two sizes.
const BRA_HTML = `<p>A scoop-neck racerback in solid colour, with mist gathering softly at the sides and underband.</p>
<ul>
<li>Scoop neckline and racerback</li>
<li>Removable pads</li>
</ul>
<p>Shell: 84% polyester, 16% elastane; 230 g/m&sup2;.</p>
<p>Machine wash cold with similar colours.</p>
<h3>Body size guide</h3>
<table>
<thead><tr><th>Size</th><th>Chest (cm)</th><th>Underbust (cm)</th></tr></thead>
<tbody>
<tr><td>XS</td><td>84</td><td>70</td></tr>
<tr><td>S</td><td>88</td><td>74</td></tr>
</tbody>
</table>
<p>Use your chest and underbust measurements. Best suited to A&ndash;C cups.</p>
<p>Made to order: printed, cut and sewn for you.</p>`;

test('activewear HTML splits into lede, details, care, size guide and notes', () => {
  const copy = parseApparelDescription(BRA_HTML);
  assert.ok(copy);
  assert.match(copy.lede, /^A scoop-neck racerback/);
  assert.deepEqual(copy.features, [
    'Scoop neckline and racerback',
    'Removable pads',
  ]);
  assert.deepEqual(copy.fabricAndCare, [
    'Shell: 84% polyester, 16% elastane; 230 g/m².',
    'Machine wash cold with similar colours.',
  ]);
  assert.deepEqual(copy.sizeGuide, {
    headers: ['Size', 'Chest (cm)', 'Underbust (cm)'],
    rows: [
      ['XS', '84', '70'],
      ['S', '88', '74'],
    ],
  });
  assert.deepEqual(copy.fitNotes, [
    'Use your chest and underbust measurements. Best suited to A–C cups.',
  ]);
  assert.equal(
    copy.madeToOrder,
    'Made to order: printed, cut and sewn for you.',
  );
});

test('descriptions without an intro paragraph fall back to the plain text', () => {
  assert.equal(parseApparelDescription(''), null);
  assert.equal(parseApparelDescription(null), null);
  assert.equal(parseApparelDescription('<ul><li>Only a list</li></ul>'), null);
});

test('markup never survives into the parsed text', () => {
  assert.equal(
    htmlToText('<b>Bold</b> &amp; <script>x</script> &#8364;5&nbsp;off'),
    'Bold & x €5 off',
  );
});

test('activewear shipping lists every zone once, from €3.99 to Cyprus', () => {
  const zones = APPAREL_SHIPPING_RATES.map((rate) => rate.zone);
  assert.equal(new Set(zones).size, zones.length);
  assert.equal(zones.length, 9);
  for (const rate of APPAREL_SHIPPING_RATES) {
    assert.match(rate.eur, /^\d+\.\d{2}$/, rate.zone);
  }
  assert.equal(APPAREL_SHIPPING_FROM_EUR, '3.99');
  assert.equal(
    APPAREL_SHIPPING_RATES.find((rate) => rate.zone === 'Cyprus')?.eur,
    '3.99',
  );
});

test('only Quiet Current carries its own collection hero', () => {
  const hero = collectionHero('quiet-current');
  assert.ok(hero);
  assert.match(hero.subtitle ?? '', /Shipping from €3\.99, one fee per order/);
  assert.equal(collectionHero('Quiet-Current'), hero);
  assert.equal(collectionHero('all'), null);
  assert.equal(collectionHero(undefined), null);
});
