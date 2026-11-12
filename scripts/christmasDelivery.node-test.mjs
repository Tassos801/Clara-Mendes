import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  CHRISTMAS_LINE_ORDER,
  CHRISTMAS_LINES,
  christmasLineFor,
  christmasLineLabel,
  christmasNotice,
  christmasNotices,
  christmasOrderBy,
  christmasRegionFor,
  christmasSeason,
  formatOrderByDate,
  PARTNER_DEADLINES,
  requestToday,
  storeToday,
  subtractBusinessDays,
} from '../app/lib/christmasDelivery.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGIONS = ['eu', 'us'];

function shiftDay(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// The 2026 table this branch ships (report and gift page).
const EXPECTED_2026 = {
  'printful-home': {eu: '2026-11-30', us: '2026-11-16'},
  'printful-cushions': {eu: '2026-11-26', us: '2026-11-12'},
  'prodigi-art': {eu: '2026-11-30', us: '2026-11-23'},
  'prodigi-cases': {eu: '2026-12-02', us: '2026-11-25'},
  'book-nooks': {eu: '2026-11-19', us: '2026-11-19'},
  'printful-apparel': {eu: '2026-11-30', us: '2026-11-23'},
  'printful-slow-apparel': {eu: '2026-11-26', us: '2026-11-19'},
};

test('business days skip weekends', () => {
  // Thu 24 Dec 2026 back 1 → Wed 23; back 4 → Fri 18; back 5 → Thu 17.
  assert.equal(subtractBusinessDays('2026-12-24', 1), '2026-12-23');
  assert.equal(subtractBusinessDays('2026-12-24', 4), '2026-12-18');
  assert.equal(subtractBusinessDays('2026-12-24', 5), '2026-12-17');
  assert.equal(subtractBusinessDays('2026-12-21', 1), '2026-12-18');
});

test('the 2026 order-by table', () => {
  for (const line of CHRISTMAS_LINE_ORDER) {
    for (const region of REGIONS) {
      const orderBy = christmasOrderBy(line, region, 2026);
      assert.equal(
        orderBy.date,
        EXPECTED_2026[line][region],
        `${line} ${region}`,
      );
    }
  }
});

test('every date is the earlier of computed and the partner deadline', () => {
  for (const line of CHRISTMAS_LINE_ORDER) {
    for (const region of REGIONS) {
      const orderBy = christmasOrderBy(line, region, 2026);
      const partner = PARTNER_DEADLINES[2026][line]?.[region];
      const earliest =
        partner && partner.date < orderBy.computed
          ? partner.date
          : orderBy.computed;
      assert.equal(orderBy.date, earliest, `${line} ${region}`);
      assert.equal(
        orderBy.source,
        earliest === orderBy.computed ? 'computed' : 'partner',
      );
    }
  }
});

test('a partner deadline earlier than the computed date wins', () => {
  const deadlines = {
    2026: {
      'printful-home': {
        eu: {date: '2026-11-20', url: 'x', note: 'test', coversLine: true},
      },
    },
  };
  const orderBy = christmasOrderBy('printful-home', 'eu', 2026, deadlines);
  assert.equal(orderBy.date, '2026-11-20');
  assert.equal(orderBy.source, 'partner');
});

test('no partner date: wider margin (4 business days, not 2)', () => {
  const covered = christmasOrderBy('printful-home', 'eu', 2026);
  const uncovered = christmasOrderBy('printful-home', 'eu', 2027);
  assert.equal(uncovered.partner, null);
  assert.equal(covered.daysBack + 2, uncovered.daysBack);
  // Prodigi prints have no published Standard date: wide margin in 2026 too.
  const prints = christmasOrderBy('prodigi-art', 'eu', 2026);
  assert.equal(prints.partner.coversLine, false);
  assert.equal(
    prints.daysBack,
    CHRISTMAS_LINES['prodigi-art'].dispatch + 10 + 4,
  );
});

test('computed dates come from the windows the product pages print', () => {
  // Prodigi dispatch 2–4, EU 5–10, US 7–15; Printful sublimation 3–6,
  // cut-and-sew 3–8; Printful museum products read the 7–20 non-EU window.
  assert.equal(CHRISTMAS_LINES['prodigi-art'].dispatch, 4);
  assert.deepEqual(CHRISTMAS_LINES['prodigi-art'].transit, {eu: 10, us: 15});
  assert.equal(CHRISTMAS_LINES['printful-home'].dispatch, 6);
  assert.deepEqual(CHRISTMAS_LINES['printful-home'].transit, {eu: 10, us: 20});
  assert.equal(CHRISTMAS_LINES['printful-cushions'].dispatch, 8);
  assert.equal(CHRISTMAS_LINES['printful-apparel'].dispatch, 6);
  assert.equal(CHRISTMAS_LINES['printful-slow-apparel'].dispatch, 8);
  assert.equal(CHRISTMAS_LINES['book-nooks'].unit, 'calendar');
});

test('cutoff: shown the day before and the day of, gone the day after', () => {
  for (const line of CHRISTMAS_LINE_ORDER) {
    for (const region of REGIONS) {
      const cutoff = EXPECTED_2026[line][region];
      const before = christmasNotice(line, region, shiftDay(cutoff, -1));
      const on = christmasNotice(line, region, cutoff);
      const after = christmasNotice(line, region, shiftDay(cutoff, 1));
      assert.equal(before?.date, cutoff, `${line} ${region} day before`);
      assert.equal(on?.date, cutoff, `${line} ${region} day of`);
      assert.equal(after, null, `${line} ${region} day after`);
    }
  }
});

test('the list drops each line after its cutoff', () => {
  assert.equal(christmasNotices('eu', '2026-11-12').length, 7);
  assert.deepEqual(
    christmasNotices('eu', '2026-11-27').map((n) => n.line),
    ['printful-home', 'prodigi-art', 'prodigi-cases', 'printful-apparel'],
  );
  assert.deepEqual(
    christmasNotices('eu', '2026-12-01').map((n) => n.line),
    ['prodigi-cases'],
  );
  assert.deepEqual(christmasNotices('eu', '2026-12-03'), []);
  assert.deepEqual(christmasNotices('us', '2026-11-26'), []);
});

test('nothing Christmas-related after 25 December or before November', () => {
  assert.equal(christmasSeason('2026-12-25'), 'open');
  assert.equal(christmasSeason('2026-12-26'), 'off');
  assert.equal(christmasSeason('2026-12-31'), 'off');
  assert.equal(christmasSeason('2027-01-05'), 'off');
  assert.equal(christmasSeason('2026-10-31'), 'off');
  assert.equal(christmasSeason('2026-11-01'), 'open');
  for (const today of [
    '2026-12-25',
    '2026-12-26',
    '2027-01-02',
    '2026-07-01',
  ]) {
    for (const region of REGIONS) {
      assert.deepEqual(
        christmasNotices(region, today),
        [],
        `${region} ${today}`,
      );
    }
  }
  // A line whose date is still ahead, asked about outside the season.
  assert.equal(christmasNotice('prodigi-cases', 'eu', '2026-10-15'), null);
});

test('regions: EU-27 and the US only', () => {
  assert.equal(christmasRegionFor('CY'), 'eu');
  assert.equal(christmasRegionFor('de'), 'eu');
  assert.equal(christmasRegionFor('US'), 'us');
  assert.equal(christmasRegionFor('CH'), null);
  assert.equal(christmasRegionFor('GB'), null);
  assert.equal(christmasRegionFor(null), null);
  assert.equal(christmasNotice('prodigi-art', null, '2026-11-12'), null);
});

test('product lines', () => {
  assert.equal(
    christmasLineFor({
      productType: 'Blankets',
      handle: 'the-great-wave-off-kanagawa-blanket',
      printfulTechnique: 'sublimation',
    }),
    'printful-home',
  );
  assert.equal(
    christmasLineFor({
      productType: 'Cushions',
      handle: 'x-cushion',
      printfulTechnique: 'cut-sew',
    }),
    'printful-cushions',
  );
  assert.equal(
    christmasLineFor({
      productType: 'Art Prints',
      handle: 'quiet-form-i-art-print',
    }),
    'prodigi-art',
  );
  assert.equal(
    christmasLineFor({productType: 'Framed Art', handle: 'x'}),
    'prodigi-art',
  );
  assert.equal(
    christmasLineFor({
      productType: 'Personalised Art',
      handle: 'your-sky-star-map',
    }),
    'prodigi-art',
  );
  assert.equal(
    christmasLineFor({productType: 'Phone Cases', handle: 'x'}),
    'prodigi-cases',
  );
  assert.equal(
    christmasLineFor({productType: 'Book Nooks', handle: 'x'}),
    'book-nooks',
  );
  assert.equal(
    christmasLineFor({
      productType: 'Hoodies',
      handle: 'counter-diagonal-hoodie',
    }),
    'printful-apparel',
  );
  assert.equal(
    christmasLineFor({productType: 'Hats', handle: 'counter-diagonal-cap'}),
    'printful-slow-apparel',
  );
  assert.equal(
    christmasLineFor({
      productType: 'Yoga Leggings',
      handle: 'free-abyss-high-waist-leggings',
    }),
    'printful-slow-apparel',
  );
  // Unknown supplier windows: no date rather than a guess.
  assert.equal(
    christmasLineFor({productType: 'Hoodies', handle: 'some-future-hoodie'}),
    null,
  );
  assert.equal(
    christmasLineFor({
      productType: 'Plant Pots',
      handle: 'blush-arc-pastel-plant-pot',
    }),
    null,
  );
  // Prodigi mugs are unreleased; a mug without a Printful technique gets none.
  assert.equal(christmasLineFor({productType: 'Mugs', handle: 'x-mug'}), null);
});

test('today comes from the request, in Nicosia', () => {
  const now = new Date('2026-11-12T23:30:00Z'); // 01:30 on 13 Nov in Nicosia
  assert.equal(storeToday(now), '2026-11-13');
  assert.equal(requestToday(new Request('https://x/gifts'), now), '2026-11-13');
  assert.equal(
    requestToday(new Request('https://x/gifts?today=2026-12-01'), now),
    '2026-12-01',
  );
  assert.equal(
    requestToday(new Request('https://x/gifts?today=2026-02-31'), now),
    '2026-11-13',
  );
  assert.equal(
    requestToday(new Request('https://x/gifts?today=soon'), now),
    '2026-11-13',
  );
});

test('dates read as weekday, day, month', () => {
  assert.equal(formatOrderByDate('2026-11-30'), 'Monday 30 November');
  assert.equal(formatOrderByDate('2026-12-02'), 'Wednesday 2 December');
});

test('the product page renders the line from one self-contained component', () => {
  const route = readFileSync(
    path.join(ROOT, 'app/routes/products.$handle.tsx'),
    'utf8',
  );
  assert.match(route, /<ChristmasOrderBy \/>/);
  assert.match(route, /christmasToday: requestToday\(request\)/);
});

test('US buyers are not told about framed prints or cards', () => {
  assert.match(christmasLineLabel('prodigi-art', 'eu'), /framed/);
  assert.doesNotMatch(christmasLineLabel('prodigi-art', 'us'), /framed|cards/);
  assert.equal(christmasLineLabel('printful-home', 'us'), 'Blankets and mugs');
});
