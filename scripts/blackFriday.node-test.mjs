import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  BLACK_FRIDAY_ANNOUNCEMENT,
  BLACK_FRIDAY_COPY,
  BLACK_FRIDAY_END,
  BLACK_FRIDAY_GROUPS,
  BLACK_FRIDAY_PATH,
  BLACK_FRIDAY_START,
  blackFridayDiscountPercent,
  blackFridayGroupLinks,
  blackFridayNow,
  blackFridayProductLine,
  blackFridayStatus,
  interleave,
  isBlackFridayWeek,
  productTypeQuery,
} from '../app/lib/blackFriday.ts';
import {normalizeSingleProductTypeSearch} from '../app/lib/catalogFacets.ts';
import {
  CUSTOM_SITEMAP_PATHS,
  seasonalSitemapPaths,
} from '../app/lib/sitemap.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(ROOT, file), 'utf8');

test('the window opens at 00:00 on 17 November in Nicosia (22:00 UTC the day before)', () => {
  assert.equal(BLACK_FRIDAY_START.toISOString(), '2026-11-16T22:00:00.000Z');
  assert.equal(isBlackFridayWeek(new Date('2026-11-16T21:59:59.999Z')), false);
  assert.equal(isBlackFridayWeek(new Date('2026-11-16T23:59:59+02:00')), false);
  assert.equal(isBlackFridayWeek(new Date('2026-11-17T00:00:00+02:00')), true);
  assert.equal(isBlackFridayWeek(new Date('2026-11-16T22:00:00Z')), true);
});

test('the window closes at the end of Monday 30 November in Nicosia', () => {
  assert.equal(BLACK_FRIDAY_END.toISOString(), '2026-11-30T22:00:00.000Z');
  assert.equal(
    isBlackFridayWeek(new Date('2026-11-30T23:59:59.999+02:00')),
    true,
  );
  assert.equal(isBlackFridayWeek(new Date('2026-11-30T21:59:59Z')), true);
  assert.equal(isBlackFridayWeek(new Date('2026-12-01T00:00:00+02:00')), false);
  assert.equal(isBlackFridayWeek(new Date('2026-11-30T22:00:00Z')), false);
  // Still 30 November in New York, but the sale ended in Nicosia.
  assert.equal(isBlackFridayWeek(new Date('2026-11-30T18:00:00-05:00')), false);
});

test('status is before, open or ended', () => {
  assert.equal(blackFridayStatus(new Date('2026-11-16T12:00:00Z')), 'before');
  assert.equal(blackFridayStatus(new Date('2026-11-25T12:00:00Z')), 'open');
  assert.equal(
    blackFridayStatus(new Date('2026-12-01T00:00:00+02:00')),
    'ended',
  );
  assert.equal(blackFridayStatus(new Date('2027-11-26T12:00:00Z')), 'ended');
});

test('a ?today= preview is judged at noon in Nicosia on that day', () => {
  const now = new Date('2026-11-17T09:00:00Z');
  const at = (query) =>
    blackFridayNow(new Request(`https://example.com/${query}`), now);
  assert.equal(at('').getTime(), now.getTime());
  assert.equal(
    at('?today=2026-11-20').toISOString(),
    '2026-11-20T10:00:00.000Z',
  );
  assert.equal(isBlackFridayWeek(at('?today=2026-11-20')), true);
  assert.equal(isBlackFridayWeek(at('?today=2026-11-30')), true);
  assert.equal(isBlackFridayWeek(at('?today=2026-12-01')), false);
  assert.equal(isBlackFridayWeek(at('?today=2026-11-16')), false);
  assert.equal(isBlackFridayWeek(at('?today=2026-11-17')), true);
  // Malformed or impossible dates fall back to the real time.
  assert.equal(at('?today=2026-11-31').getTime(), now.getTime());
  assert.equal(at('?today=soon').getTime(), now.getTime());
});

test('20% types take 20% on every variant', () => {
  for (const type of [
    'Blankets',
    'Cushions',
    'Mugs',
    'Phone Cases',
    'Plant Pots',
    'Hanger Prints',
  ]) {
    assert.equal(blackFridayDiscountPercent(type, null), 20, type);
    assert.equal(
      blackFridayDiscountPercent(type, 'Anything / at all'),
      20,
      type,
    );
  }
  assert.equal(blackFridayDiscountPercent(' blankets ', '50 × 60 in'), 20);
  assert.equal(
    blackFridayDiscountPercent('Cushions', '18 × 18 in / With insert'),
    20,
  );
});

test('10% types take 10% on every variant', () => {
  for (const type of [
    'Hoodies',
    'T-Shirts',
    'Sweatshirts',
    'Long Sleeve Shirts',
    'Tote Bags',
    'Yoga Leggings',
    'Sports Bra',
    'Biker Shorts',
    'Studio Top',
    'Canvas Art',
    'Framed Art',
  ]) {
    assert.equal(blackFridayDiscountPercent(type, 'Black / M'), 10, type);
  }
  assert.equal(blackFridayDiscountPercent('Framed Art', '16 × 20 in'), 10);
});

test('premium hoodies are left out by handle; other hoodies stay in', () => {
  for (const handle of [
    'counter-diagonal-premium-hoodie',
    'free-abyss-premium-hoodie',
    'circle-rhythm-premium-hoodie',
  ]) {
    assert.equal(
      blackFridayDiscountPercent('Hoodies', 'Black / M', handle),
      null,
      handle,
    );
  }
  assert.equal(
    blackFridayDiscountPercent(
      'Hoodies',
      'Dust / M',
      'counter-diagonal-heavyweight-hoodie',
    ),
    10,
  );
});

test('excluded types get nothing', () => {
  for (const type of [
    'Hats',
    'Cards',
    'Postcards',
    'Book Nooks',
    'Acrylic Prints',
    'Metal Prints',
    '',
    null,
    undefined,
    'Gift Cards',
  ]) {
    assert.equal(
      blackFridayDiscountPercent(type, '5 × 7 in'),
      null,
      String(type),
    );
  }
});

test('art prints: unframed variants 20%, framed variants nothing', () => {
  for (const size of ['8 × 10 in', '16 × 20 in', '20 × 24 in']) {
    assert.equal(
      blackFridayDiscountPercent('Art Prints', `${size} / Unframed`),
      20,
    );
    for (const frame of ['Black frame', 'White frame', 'Natural frame']) {
      assert.equal(
        blackFridayDiscountPercent('Art Prints', `${size} / ${frame}`),
        null,
        `${size} / ${frame}`,
      );
    }
  }
  // No variant to judge: no promise.
  assert.equal(blackFridayDiscountPercent('Art Prints', null), null);
  assert.equal(blackFridayDiscountPercent('Art Prints', ''), null);
});

test('personalised art: everything but the framed 20 × 24 in', () => {
  assert.equal(
    blackFridayDiscountPercent('Personalised Art', '8 × 10 in / Unframed'),
    20,
  );
  assert.equal(
    blackFridayDiscountPercent('Personalised Art', '8 × 10 in / Natural frame'),
    20,
  );
  assert.equal(
    blackFridayDiscountPercent('Personalised Art', '8 × 10 in / Black frame'),
    20,
  );
  assert.equal(
    blackFridayDiscountPercent('Personalised Art', '20 × 24 in / Unframed'),
    20,
  );
  assert.equal(
    blackFridayDiscountPercent(
      'Personalised Art',
      '20 × 24 in / Natural frame',
    ),
    null,
  );
  assert.equal(
    blackFridayDiscountPercent('Personalised Art', '20 × 24 in / Black frame'),
    null,
  );
  assert.equal(
    blackFridayDiscountPercent('Personalised Art', '20 x 24 in / Black frame'),
    null,
  );
  assert.equal(blackFridayDiscountPercent('Personalised Art', null), null);
});

test('the product-page line and the announcement say what was approved', () => {
  assert.equal(
    blackFridayProductLine(20),
    'Black Friday week: 20% off, taken off in your cart.',
  );
  assert.equal(
    blackFridayProductLine(10),
    'Black Friday week: 10% off, taken off in your cart.',
  );
  assert.equal(
    BLACK_FRIDAY_ANNOUNCEMENT,
    'Black Friday week: 20% off blankets, cushions, mugs and prints, 10% off clothing. Taken off in your cart. Ends Monday 30 November.',
  );
  assert.equal(BLACK_FRIDAY_PATH, '/black-friday');
});

test('the page groups lead with blankets and agree with the discount rules', () => {
  assert.equal(BLACK_FRIDAY_GROUPS[0].key, 'blankets');
  for (const group of BLACK_FRIDAY_GROUPS) {
    for (const type of group.productTypes) {
      const percent =
        type === 'Art Prints'
          ? blackFridayDiscountPercent(type, '8 × 10 in / Unframed')
          : blackFridayDiscountPercent(type, 'Any');
      assert.equal(percent, group.percent, `${group.key}: ${type}`);
    }
  }
  assert.equal(productTypeQuery('Art Prints'), 'product_type:"Art Prints"');
});

test('the root loader decides at request time and nothing permanent links the page', () => {
  const root = read('app/root.tsx');
  assert.match(
    root,
    /blackFridayWeek: isBlackFridayWeek\(blackFridayNow\(request\)\)/,
  );
  // No document cache header that could keep the line after the end.
  for (const file of [
    'app/root.tsx',
    'app/routes/_index.tsx',
    'app/routes/products.$handle.tsx',
    'app/routes/black-friday.tsx',
  ]) {
    assert.doesNotMatch(
      read(file),
      /export (const|function|async function) headers/,
      file,
    );
  }
  // The sitemap names the page only through a dated rule (tested in
  // sitemap.node-test.mjs): never in the permanent list, never as a literal
  // path, and never at or after the end, so nothing needs removing later.
  assert.doesNotMatch(read('app/lib/sitemap.ts'), /['"`]\/black-friday/);
  assert.ok(!CUSTOM_SITEMAP_PATHS.includes(BLACK_FRIDAY_PATH));
  assert.deepEqual(seasonalSitemapPaths(BLACK_FRIDAY_END), []);
  assert.deepEqual(
    seasonalSitemapPaths(new Date(BLACK_FRIDAY_END.getTime() - 1)),
    [],
  );
  assert.doesNotMatch(read('app/lib/navLinks.ts'), /black-friday|blackFriday/i);
  const route = read('app/routes/black-friday.tsx');
  assert.match(route, /noIndex: data\?\.status !== 'open'/);
});

test('the sale lines stop at the end even in a tab left open', () => {
  // The root loader's answer is kept across client-side navigations, so
  // everything that speaks of the sale also reads the browser's clock.
  const hook = read('app/lib/useBlackFridayWeek.ts');
  assert.ok(
    hook.includes('useSyncExternalStore(atTheEnd, hasEnded, notEnded)'),
  );
  assert.ok(hook.includes("blackFridayStatus(new Date()) === 'ended'"));
  assert.ok(hook.includes('Boolean(root?.blackFridayWeek) && !ended'));
  for (const file of [
    'app/components/ClaraProductCard.tsx',
    'app/components/BlackFridayProductLine.tsx',
    'app/components/BlackFridayAnnouncement.tsx',
  ]) {
    const source = read(file);
    assert.ok(source.includes('useBlackFridayWeek()'), file);
    assert.ok(!source.includes('root?.blackFridayWeek'), file);
  }
  // The moment after the last one of the sale counts as ended.
  assert.equal(blackFridayStatus(BLACK_FRIDAY_END), 'ended');
  assert.equal(
    blackFridayStatus(new Date(BLACK_FRIDAY_END.getTime() - 1)),
    'open',
  );
});

test('the product page line never changes the shown price', () => {
  const line = read('app/components/BlackFridayProductLine.tsx');
  assert.doesNotMatch(line, /ProductPrice|compareAt|<s>/);
});

test('every "See all" link names one product type at most, so the shop keeps the filter', () => {
  const shop = '/collections/all';
  const shopTypes = BLACK_FRIDAY_GROUPS.flatMap((group) => group.productTypes);
  for (const group of BLACK_FRIDAY_GROUPS) {
    const links = blackFridayGroupLinks(group, shop);
    assert.ok(links.length > 0, group.key);
    for (const link of links) {
      const [pathname, query = ''] = link.url.split('?');
      if (pathname !== shop) {
        assert.equal(link.url, group.allPath, group.key);
        continue;
      }
      // The shop sends a request it does not show (several types) to the
      // whole catalogue; null means it keeps this one as it is.
      const params = new URLSearchParams(query);
      assert.equal(params.getAll('type').length, 1, link.url);
      assert.equal(
        normalizeSingleProductTypeSearch(params, shopTypes),
        null,
        link.url,
      );
    }
  }

  const group = (key) => BLACK_FRIDAY_GROUPS.find((item) => item.key === key);
  assert.deepEqual(blackFridayGroupLinks(group('mugs'), shop), [
    {label: 'See all', url: '/collections/all?type=Mugs'},
  ]);
  assert.deepEqual(blackFridayGroupLinks(group('prints'), shop), [
    {label: 'All art prints', url: '/collections/all?type=Art+Prints'},
    {label: 'All hanger prints', url: '/collections/all?type=Hanger+Prints'},
  ]);
  assert.deepEqual(blackFridayGroupLinks(group('wall-art'), shop), [
    {label: 'All canvas art', url: '/collections/all?type=Canvas+Art'},
    {label: 'All framed art', url: '/collections/all?type=Framed+Art'},
  ]);
  // Clothing has a page of its own.
  assert.deepEqual(blackFridayGroupLinks(group('clothing'), shop), [
    {label: 'See all', url: '/clothing'},
  ]);
  // A type with nothing to show gets no link.
  assert.deepEqual(
    blackFridayGroupLinks(group('prints'), shop, ['Hanger Prints']),
    [{label: 'All hanger prints', url: '/collections/all?type=Hanger+Prints'}],
  );
  assert.match(
    read('app/routes/black-friday.tsx'),
    /allLinks: blackFridayGroupLinks\(/,
  );
});

test('the page copy does not exclude what the 10% tier includes', () => {
  assert.equal(blackFridayDiscountPercent('Framed Art', 'Any'), 10);
  assert.match(BLACK_FRIDAY_COPY.ten, /framed art/);
  assert.doesNotMatch(BLACK_FRIDAY_COPY.excluded, /framed/i);
});

test('a group of several types takes from each in turn', () => {
  assert.deepEqual(interleave([['a1', 'a2', 'a3'], ['b1'], ['c1', 'c2']], 5), [
    'a1',
    'b1',
    'c1',
    'a2',
    'c2',
  ]);
  assert.deepEqual(interleave([['a1', 'a2', 'a3']], 2), ['a1', 'a2']);
  assert.deepEqual(interleave([[], []], 8), []);
  assert.deepEqual(interleave([['a1'], ['b1', 'b2']], 8), ['a1', 'b1', 'b2']);
});
