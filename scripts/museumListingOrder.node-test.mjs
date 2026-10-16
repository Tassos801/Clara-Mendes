import assert from 'node:assert/strict';
import test from 'node:test';
import * as shops from '../app/lib/artistShops.ts';
import {ART_PRODUCT_CATALOG} from '../app/lib/artProductCatalog.ts';
import {
  compareListingOrder,
  featuredMuseumClause,
  ListingCursorError,
  museumListingRanks,
  museumSearchQuery,
  museumTagClause,
  parseListingCursor,
  sortMuseumProducts,
  studioConnection,
  studioPageVariables,
  studioSearchQuery,
  studioThenMuseumPage,
} from '../app/lib/museumListingOrder.ts';
import {PRINT_CATALOG, printHandle} from '../app/lib/printCatalog.ts';

const FLOATING_WORLD = PRINT_CATALOG.collections.find(
  (collection) => collection.slug === 'floating-world',
);
/** Great Wave … Sudden Shower, the catalog's artwork sequence. */
const SEQUENCE = [...FLOATING_WORLD.prints]
  .sort((a, b) => a.sequence - b.sequence)
  .map((print) => print.slug);
const FAMILIES = [
  'art-print',
  'framed-print',
  'canvas',
  'greeting-card',
  'postcard',
  'phone-case',
];
/** Expected listing: every type in order, each in artwork sequence. */
const MUSEUM_ORDER = FAMILIES.flatMap((family) =>
  SEQUENCE.map((slug) => `${slug}-${family}`),
);

/** Shopify lists newest first: the release created prints, then families. */
const NEWEST_FIRST = [
  ...SEQUENCE.map((slug) => `${slug}-art-print`),
  ...ART_PRODUCT_CATALOG.products
    .filter((product) => product.collection === FLOATING_WORLD.slug)
    .map((product) => product.handle),
].reverse();
/** The catalog as it was with one museum collection. */
const FLOATING_WORLD_ONLY = {collections: [FLOATING_WORLD]};

const product = (handle) => ({handle});

test('the catalogs rank all 60 Floating World products, prints first', () => {
  const ranks = museumListingRanks();
  for (const handle of MUSEUM_ORDER) assert.ok(ranks.has(handle), handle);
  assert.ok(!ranks.has('quiet-form-i-art-print'));
  assert.ok(!ranks.has('art-tough-phone-case'));

  const sorted = sortMuseumProducts(NEWEST_FIRST.map(product)).map(
    (entry) => entry.handle,
  );
  assert.deepEqual(sorted, MUSEUM_ORDER);
  assert.equal(sorted[0], 'the-great-wave-off-kanagawa-art-print');
  assert.equal(
    sorted[9],
    'sudden-shower-over-shin-ohashi-bridge-and-atake-art-print',
  );
  assert.equal(sorted[10], 'the-great-wave-off-kanagawa-framed-print');
  assert.equal(
    sorted.at(-1),
    'sudden-shower-over-shin-ohashi-bridge-and-atake-phone-case',
  );
  // Products the catalogs do not rank keep their order after the ranked.
  assert.deepEqual(
    sortMuseumProducts(
      ['b-unknown', 'yoshida-on-the-tokaido-canvas', 'a-unknown'].map(product),
    ).map((entry) => entry.handle),
    ['yoshida-on-the-tokaido-canvas', 'b-unknown', 'a-unknown'],
  );
});

test('museum products split the shop by the museum collection tags', () => {
  assert.equal(
    museumTagClause(),
    '(tag:"Floating World" OR tag:"Line and Colour")',
  );
  assert.equal(museumTagClause(FLOATING_WORLD_ONLY), '(tag:"Floating World")');
  assert.equal(
    studioSearchQuery(null, '(tag:"Floating World")'),
    'NOT (tag:"Floating World")',
  );
  assert.equal(
    studioSearchQuery('(product_type:"Phone Cases")', '(tag:"Floating World")'),
    '((product_type:"Phone Cases")) NOT (tag:"Floating World")',
  );
  assert.equal(
    museumSearchQuery('tag:"Floating World"', '(tag:"Floating World")'),
    '(tag:"Floating World") (tag:"Floating World")',
  );
  assert.equal(museumTagClause({collections: []}), null);
});

test('explicit sorts keep Shopify order; only Featured reorders', () => {
  assert.equal(
    featuredMuseumClause('featured', FLOATING_WORLD_ONLY),
    '(tag:"Floating World")',
  );
  for (const sort of ['price-asc', 'price-desc', 'alpha-asc', 'alpha-desc'])
    assert.equal(featuredMuseumClause(sort), null, sort);
});

test('compareListingOrder keeps other products first, in their order', () => {
  const list = [
    'yoshida-on-the-tokaido-phone-case',
    'studio-b',
    'the-great-wave-off-kanagawa-art-print',
    'studio-a',
    'hodogaya-on-the-tokaido-art-print',
  ];
  assert.deepEqual([...list].sort(compareListingOrder), [
    'studio-b',
    'studio-a',
    'the-great-wave-off-kanagawa-art-print',
    'hodogaya-on-the-tokaido-art-print',
    'yoshida-on-the-tokaido-phone-case',
  ]);
});

/**
 * A fake Storefront `products` connection over a fixed list, as the API
 * behaves: first/after, last/before, `reverse`, cursors that page either
 * direction, and `last` without `before` refused. Requests from the listing
 * go through the same adapter as the route.
 */
function fakeStorefront(items) {
  const calls = [];
  const cursorOf = (item) => `sf${items.indexOf(item)}`;
  const query = (variables) => {
    if (variables.last != null && !variables.startCursor)
      throw new Error('using last without before is not supported');
    const list = variables.reverse ? [...items].reverse() : items;
    const indexOf = (cursor) => {
      const index = list.findIndex((item) => cursorOf(item) === cursor);
      if (index < 0) throw new Error(`bad storefront cursor ${cursor}`);
      return index;
    };
    let from;
    let to;
    if (variables.first != null) {
      from = variables.endCursor ? indexOf(variables.endCursor) + 1 : 0;
      to = Math.min(list.length, from + variables.first);
    } else {
      to = indexOf(variables.startCursor);
      from = Math.max(0, to - variables.last);
    }
    const nodes = list.slice(from, to);
    return {
      nodes,
      pageInfo: {
        endCursor: nodes.length ? cursorOf(nodes.at(-1)) : null,
        hasNextPage: to < list.length,
        hasPreviousPage: from > 0,
        startCursor: nodes.length ? cursorOf(nodes[0]) : null,
      },
    };
  };
  const studio = async (request) => {
    calls.push(request);
    const result = query(studioPageVariables(request, false));
    return studioConnection(request, result.nodes, result.pageInfo);
  };
  return {calls, studio};
}

const STUDIO = Array.from({length: 47}, (_, i) => product(`studio-${i}`));

function sources(studioItems, museumItems) {
  const fake = fakeStorefront(studioItems);
  let museumCalls = 0;
  return {
    get museumCalls() {
      return museumCalls;
    },
    museum: async () => {
      museumCalls += 1;
      return sortMuseumProducts(museumItems);
    },
    studio: fake.studio,
    studioCalls: fake.calls,
  };
}

async function walkForward(source, pageBy) {
  const pages = [];
  let cursor = null;
  for (;;) {
    const page = await studioThenMuseumPage(
      {endCursor: cursor, first: pageBy},
      source,
    );
    pages.push(page);
    if (!page.pageInfo.hasNextPage) return pages;
    cursor = page.pageInfo.endCursor;
  }
}

async function walkBackward(source, pageBy, startCursor) {
  const pages = [];
  let cursor = startCursor;
  for (;;) {
    const page = await studioThenMuseumPage(
      {last: pageBy, startCursor: cursor},
      source,
    );
    pages.unshift(page);
    if (!page.pageInfo.hasPreviousPage) return pages;
    cursor = page.pageInfo.startCursor;
  }
}

const handles = (pages) =>
  pages.flatMap((page) => page.nodes.map((node) => node.handle));

test('All products: studio first, then museum by type, no duplicates or gaps', async () => {
  const expected = [...STUDIO.map((entry) => entry.handle), ...MUSEUM_ORDER];
  for (const pageBy of [24, 7, 1, 107, 200]) {
    const source = sources(STUDIO, NEWEST_FIRST.map(product));
    const pages = await walkForward(source, pageBy);
    const seen = handles(pages);
    assert.deepEqual(seen, expected, `forward, ${pageBy} per page`);
    assert.equal(new Set(seen).size, seen.length);
    // Every page but the last is full, across the studio/museum seam too.
    for (const page of pages.slice(0, -1))
      assert.equal(page.nodes.length, pageBy);
    assert.equal(pages[0].pageInfo.hasPreviousPage, false);
    assert.ok(pages.slice(1).every((page) => page.pageInfo.hasPreviousPage));

    // "Load previous" from the last page, all the way back.
    const last = pages.at(-1);
    const back = await walkBackward(
      sources(STUDIO, NEWEST_FIRST.map(product)),
      pageBy,
      last.pageInfo.startCursor,
    );
    assert.deepEqual(
      [...handles(back), ...last.nodes.map((node) => node.handle)],
      expected,
      `backward, ${pageBy} per page`,
    );
  }

  // Page one of the shop never touches the museum set.
  const source = sources(STUDIO, NEWEST_FIRST.map(product));
  const first = await studioThenMuseumPage({first: 24}, source);
  assert.deepEqual(
    first.nodes.map((node) => node.handle),
    STUDIO.slice(0, 24).map((entry) => entry.handle),
  );
  assert.equal(source.museumCalls, 0);
  assert.equal(first.pageInfo.endCursor, 's.sf23');

  // Page two reaches the seam: 23 studio products, then the first print.
  const second = await studioThenMuseumPage(
    {endCursor: first.pageInfo.endCursor, first: 24},
    source,
  );
  assert.deepEqual(
    second.nodes.map((node) => node.handle),
    [
      ...STUDIO.slice(24).map((entry) => entry.handle),
      'the-great-wave-off-kanagawa-art-print',
    ],
  );
  assert.equal(second.pageInfo.startCursor, 's.sf24');
  assert.equal(second.pageInfo.endCursor, 'm.0');
  const third = await studioThenMuseumPage(
    {endCursor: second.pageInfo.endCursor, first: 24},
    source,
  );
  assert.deepEqual(
    third.nodes.map((node) => node.handle),
    MUSEUM_ORDER.slice(1, 25),
  );
});

test('a deep page loaded directly pages both ways without repeats', async () => {
  const expected = [...STUDIO.map((entry) => entry.handle), ...MUSEUM_ORDER];
  for (const cursor of ['m.5', 'm.30', 's.sf40', 'm.0', 's.sf46']) {
    const source = sources(STUDIO, NEWEST_FIRST.map(product));
    const landing = await studioThenMuseumPage(
      {endCursor: cursor, first: 24},
      source,
    );
    const before = await walkBackward(source, 24, landing.pageInfo.startCursor);
    const after = [];
    let next = landing;
    while (next.pageInfo.hasNextPage) {
      next = await studioThenMuseumPage(
        {endCursor: next.pageInfo.endCursor, first: 24},
        source,
      );
      after.push(next);
    }
    assert.deepEqual(
      [...handles(before), ...handles([landing]), ...handles(after)],
      expected,
      cursor,
    );
  }
});

test('the Floating World filter opens with its ten prints', async () => {
  const source = sources([], NEWEST_FIRST.map(product));
  const pages = await walkForward(source, 24);
  assert.deepEqual(handles(pages), MUSEUM_ORDER);
  assert.deepEqual(
    pages[0].nodes.slice(0, 10).map((node) => node.handle),
    SEQUENCE.map((slug) => printHandle({slug})),
  );
  assert.equal(pages[0].pageInfo.hasPreviousPage, false);
  assert.equal(pages[0].pageInfo.startCursor, 'm.0');
  assert.deepEqual(
    pages.map((page) => page.nodes.length),
    [24, 24, 12],
  );
  // And back from the end.
  const back = await walkBackward(
    sources([], NEWEST_FIRST.map(product)),
    24,
    pages.at(-1).pageInfo.startCursor,
  );
  assert.equal(back.length, 2);
  assert.equal(back[0].pageInfo.hasPreviousPage, false);
  assert.deepEqual(handles(back), MUSEUM_ORDER.slice(0, 48));
});

test('a studio-only search lists exactly as before', async () => {
  const source = sources(STUDIO, []);
  const pages = await walkForward(source, 24);
  assert.deepEqual(
    handles(pages),
    STUDIO.map((entry) => entry.handle),
  );
  assert.equal(pages.at(-1).pageInfo.hasNextPage, false);
  assert.equal(pages.at(-1).pageInfo.endCursor, 's.sf46');
});

test('the end of the studio set is read in reverse, as the API requires', () => {
  assert.deepEqual(studioPageVariables({before: null, last: 5}, false), {
    first: 5,
    reverse: true,
  });
  assert.deepEqual(studioPageVariables({before: 'c', last: 5}, false), {
    last: 5,
    reverse: false,
    startCursor: 'c',
  });
  assert.deepEqual(studioPageVariables({after: null, first: 5}, false), {
    endCursor: null,
    first: 5,
    reverse: false,
  });
  assert.deepEqual(
    studioConnection({before: null, last: 2}, ['z', 'y'], {
      endCursor: 'cy',
      hasNextPage: true,
      hasPreviousPage: false,
      startCursor: 'cz',
    }),
    {
      nodes: ['y', 'z'],
      pageInfo: {
        endCursor: 'cz',
        hasNextPage: false,
        hasPreviousPage: true,
        startCursor: 'cy',
      },
    },
  );
});

test('cursors this listing did not issue are rejected', async () => {
  assert.deepEqual(parseListingCursor('s.eyJsYXN0X2lkIjoxfQ=='), {
    cursor: 'eyJsYXN0X2lkIjoxfQ==',
    kind: 'studio',
  });
  assert.deepEqual(parseListingCursor('m.12'), {index: 12, kind: 'museum'});
  for (const bad of [
    'eyJsYXN0X2lkIjoxfQ==',
    'm.',
    'm.-1',
    'm.1e3',
    's.',
    'x.1',
  ])
    assert.throws(() => parseListingCursor(bad), ListingCursorError, bad);
  const source = sources(STUDIO, NEWEST_FIRST.map(product));
  await assert.rejects(
    studioThenMuseumPage({endCursor: 'm.60', first: 24}, source),
    ListingCursorError,
  );
  await assert.rejects(
    studioThenMuseumPage({last: 24, startCursor: 'm.61'}, source),
    ListingCursorError,
  );
});

test('artist shops list museum works by type, then artwork sequence', () => {
  const hokusai = shops
    .artistProducts()
    .filter((entry) => entry.artistId === 'katsushika-hokusai');
  assert.ok(hokusai.length >= 6);
  const expected = MUSEUM_ORDER.filter((handle) =>
    hokusai.some((entry) => entry.handle === handle),
  );
  // Whatever order the products arrive in, Featured shows the same list.
  for (const input of [hokusai, [...hokusai].reverse()]) {
    const view = shops.artistShopView(input, new URLSearchParams());
    assert.equal(view.sort, 'featured');
    assert.deepEqual(
      view.products.map((entry) => entry.handle),
      expected,
    );
  }
  // An explicit sort is unchanged: title order, ties in the given order.
  const titles = shops
    .artistShopView([...hokusai].reverse(), new URLSearchParams('sort=title'))
    .products.map((entry) => entry.title);
  assert.deepEqual(
    titles,
    [...titles].sort((a, b) => a.localeCompare(b)),
  );
});
