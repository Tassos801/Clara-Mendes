import assert from 'node:assert/strict';
import test from 'node:test';
import * as registryModule from '../app/lib/artRegistry.ts';
import * as shops from '../app/lib/artistShops.ts';
import {shopCapsuleDescription} from '../app/lib/capsules.ts';
import {catalogCounts} from '../app/lib/catalogSummary.ts';
import {computeSellableHandles} from '../app/lib/catalogFilters.ts';
import * as prints from '../app/lib/printCatalog.ts';
import {CUSTOM_SITEMAP_PATHS} from '../app/lib/sitemap.ts';
import sharp from 'sharp';
import path from 'node:path';
import {
  buildProductSetInput,
  MUSEUM_TAG,
  PENDING_TAGS,
  REPO_ROOT,
} from './lib/product-pipeline.mjs';
import {
  roomArtworkRelativePath,
  roomMediaPlan,
} from './lib/print-room-scenes.mjs';
import {stagedArtProducts, stagedPrintCatalog} from './lib/staged-fixtures.mjs';

const WAVE_HANDLE = 'the-great-wave-off-kanagawa-art-print';
/** The Great Wave impression the catalog sells (the owner's pick). */
const WAVE_ID = prints.PRINT_CATALOG.collections
  .find((c) => c.slug === 'floating-world')
  .prints.find((p) => p.slug === 'the-great-wave-off-kanagawa').artworkId;
const WAVE = registryModule.findArtwork(WAVE_ID);
const REVIEWED = {
  at: '2026-10-09T12:00:00.000Z',
  by: 'Owner',
  status: 'cleared',
};

/**
 * The shipped data with every museum print and family product staged, then
 * Hokusai approved, the Great Wave's reviews cleared and its print released —
 * the state a real release would reach. Each part can be turned off whatever
 * the shipped data currently records.
 */
function releasedFixture({approve = true, clear = true, release = true} = {}) {
  const registry = structuredClone(registryModule.ART_REGISTRY);
  const catalog = stagedPrintCatalog();
  const artProducts = stagedArtProducts();
  const hokusai = registry.artists.find((a) => a.id === 'katsushika-hokusai');
  hokusai.approval = approve
    ? {approved: true, at: REVIEWED.at, by: 'Owner'}
    : {approved: false};
  const wave = registry.artworks.find((a) => a.id === WAVE_ID);
  wave.reviews = clear
    ? {master: {...REVIEWED}, rights: {...REVIEWED}}
    : {master: {status: 'pending'}, rights: {status: 'pending'}};
  const print = floatingWorld(catalog).prints[0];
  if (release) {
    print.released = true;
    print.releasedSizes = ['8x10'];
    print.shopify = {productId: 'gid://p', variantIds: {'8x10': 'gid://v'}};
    print.prodigi = {'8x10': {channelProductId: '1', verified: true}};
  }
  return {artProducts, catalog, registry};
}

function floatingWorld(catalog) {
  return catalog.collections.find((c) => c.slug === 'floating-world');
}

test('the shipped catalog and registry link up cleanly', () => {
  assert.deepEqual(shops.validateArtistLinks(), []);
  assert.deepEqual(prints.validatePrintCatalog(), []);
});

test('nothing is public until an approved artist has a released product', () => {
  // Everything staged, with the shipped artist approvals.
  const staged = {
    artProducts: stagedArtProducts(),
    catalog: stagedPrintCatalog(),
  };
  assert.deepEqual(shops.publicArtists(staged), []);
  assert.equal(shops.productArtworkCredit(WAVE_HANDLE, staged), null);
  assert.ok(
    !computeSellableHandles(
      undefined,
      undefined,
      staged.catalog,
      undefined,
      undefined,
      staged.artProducts,
    ).has(WAVE_HANDLE),
  );
  // The sitemap lists exactly the public artists, and nothing while none is.
  const publicPaths = shops
    .publicArtists()
    .map(({artist}) => shops.artistPath(artist));
  assert.deepEqual(
    CUSTOM_SITEMAP_PATHS.filter((path) => path.startsWith('/artists')),
    publicPaths.length ? ['/artists', ...publicPaths] : [],
  );

  // Approved but unreleased, or released but unapproved: still not public.
  assert.deepEqual(shops.publicArtists(releasedFixture({release: false})), []);
  assert.deepEqual(shops.publicArtists(releasedFixture({approve: false})), []);
});

test('a released print appears on its approved artist shop automatically', () => {
  const sources = releasedFixture();
  assert.deepEqual(shops.validateArtistLinks(sources), []);
  const [entry] = shops.publicArtists(sources);
  assert.equal(entry.artist.id, 'katsushika-hokusai');
  assert.deepEqual(
    entry.products.map((product) => product.handle),
    [WAVE_HANDLE],
  );
  assert.equal(entry.products[0].artworkId, WAVE_ID);
  assert.equal(
    shops.publicArtistBySlug('HOKUSAI', sources)?.artist.slug,
    'hokusai',
  );
  assert.equal(shops.publicArtistBySlug('hiroshige', sources), null);
  assert.equal(
    shops.artistProductsQuery(entry.products),
    'tag:"Floating World"',
  );
  assert.deepEqual(shops.artistFamilies(entry.products), ['Prints']);
  assert.deepEqual(
    shops.artistArtworks(entry.products, sources.registry).map((a) => a.id),
    [WAVE_ID],
  );
  assert.ok(
    computeSellableHandles(undefined, undefined, sources.catalog).has(
      WAVE_HANDLE,
    ),
  );
});

test('artist search matches names, aliases and word prefixes of public artists', () => {
  const sources = releasedFixture();
  for (const term of [
    'Hokusai',
    'hoku',
    'katsushika hokusai',
    '葛飾北斎',
    'HOKUSAI ',
  ]) {
    assert.deepEqual(
      shops.searchArtists(term, sources).map((artist) => artist.id),
      ['katsushika-hokusai'],
      term,
    );
  }
  for (const term of ['wave', 'hiroshige', '', 'sai']) {
    assert.deepEqual(shops.searchArtists(term, sources), [], term);
  }
  assert.deepEqual(
    shops.searchArtists('hokusai', releasedFixture({release: false})),
    [],
  );
});

test('a product page credits the museum work and links a public artist', () => {
  const credit = shops.productArtworkCredit(WAVE_HANDLE, releasedFixture());
  assert.equal(credit.artist.name, 'Katsushika Hokusai');
  assert.equal(credit.artist.dates, '1760–1849');
  assert.equal(credit.artist.path, '/artists/hokusai');
  assert.equal(credit.artwork.date, 'ca. 1830–32');
  assert.equal(
    credit.artwork.credit,
    `Source: The Metropolitan Museum of Art, ${WAVE.source.creditLine}. Public domain: The Met Open Access (CC0). Object ${WAVE.source.objectId}.`,
  );
  assert.equal(
    credit.artwork.objectUrl,
    `https://www.metmuseum.org/art/collection/search/${WAVE.source.objectId}`,
  );

  // A museum print keeps its credit before its artist is approved.
  const unapproved = shops.productArtworkCredit(
    WAVE_HANDLE,
    releasedFixture({approve: false}),
  );
  assert.equal(unapproved.artist.path, null);
  assert.ok(unapproved.artwork);
});

test('releasing a museum print needs both owner reviews', () => {
  const problems = shops
    .validateArtistLinks(releasedFixture({clear: false}))
    .join('\n');
  assert.match(problems, /released without a cleared rights review/);
  assert.match(problems, /released without a cleared master review/);
});

test('museum prints keep the artwork whole, once per artwork', () => {
  const sources = releasedFixture({release: false});
  const collection = floatingWorld(sources.catalog);
  collection.prints[0].orientation = 'portrait';
  assert.match(
    shops.validateArtistLinks(sources).join('\n'),
    new RegExp(`orientation must be landscape to keep ${WAVE_ID} whole`),
  );

  const twice = releasedFixture({release: false});
  const copy = structuredClone(floatingWorld(twice.catalog).prints[0]);
  floatingWorld(twice.catalog).prints.push({
    ...copy,
    sequence: 2,
    slug: 'wave-again',
  });
  assert.match(
    shops.validateArtistLinks(twice).join('\n'),
    new RegExp(
      `${WAVE_ID} is already sold as floating-world/the-great-wave-off-kanagawa`,
    ),
  );

  const unknown = releasedFixture({release: false});
  floatingWorld(unknown.catalog).prints[0].artworkId = 'met-1';
  assert.match(
    shops.validateArtistLinks(unknown).join('\n'),
    /unknown artwork met-1/,
  );
});

test('studio collections name a studio artist; museum collections never do', () => {
  const sources = releasedFixture({release: false});
  const studio = sources.catalog.collections.find(
    (c) => c.slug === 'light-and-silence',
  );
  studio.artistId = 'clara-mendes-studio';
  sources.registry.artists.find(
    (a) => a.id === 'clara-mendes-studio',
  ).approval = {
    approved: true,
    at: REVIEWED.at,
    by: 'Owner',
  };
  const [entry] = shops.publicArtists(sources);
  assert.equal(entry.artist.id, 'clara-mendes-studio');
  assert.equal(entry.products.length, studio.prints.length);
  assert.equal(
    shops.productArtworkCredit(entry.products[0].handle, sources).artwork,
    null,
  );

  studio.artistId = 'katsushika-hokusai';
  assert.match(
    shops.validateArtistLinks(sources).join('\n'),
    /artistId is for studio artists/,
  );
  floatingWorld(sources.catalog).artistId = 'katsushika-hokusai';
  assert.match(
    prints.validatePrintCatalog(sources.catalog).join('\n'),
    /museum collections take each artist from the print's artwork/,
  );
});

test('the print catalog enforces museum fields and paper-shaped room boxes', () => {
  const catalog = structuredClone(prints.PRINT_CATALOG);
  const museum = floatingWorld(catalog);
  delete museum.prints[0].artworkId;
  catalog.collections[0].prints[0].artworkId = WAVE_ID;
  museum.prints[0].rooms[0].placement = {
    height: 300,
    left: 1,
    top: 1,
    width: 240,
  };
  const problems = prints.validatePrintCatalog(catalog).join('\n');
  assert.match(
    problems,
    /floating-world\/the-great-wave-off-kanagawa: museum prints need an artworkId/,
  );
  assert.match(
    problems,
    /scifi-cinema\/orbital-silence: only museum collections reproduce registry artworks/,
  );
  assert.match(problems, /living-room: placement must be 5:4 landscape/);
});

test('museum rooms frame the bordered paper sheet in its own orientation', async () => {
  const collection = floatingWorld(prints.PRINT_CATALOG);
  const [wave] = collection.prints;
  assert.equal(roomMediaPlan(collection, wave).length, 4);
  const sheet = roomArtworkRelativePath(collection, wave);
  assert.equal(
    sheet,
    'images/product-art/floating-world/the-great-wave-off-kanagawa.sheet.webp',
  );
  const {height, width} = await sharp(
    path.join(REPO_ROOT, 'public', sheet),
  ).metadata();
  assert.equal(width / height, 1.25);
  for (const room of wave.rooms)
    assert.ok(
      Math.abs(room.placement.width / room.placement.height - 1.25) < 0.016,
    );

  const studio = prints.PRINT_CATALOG.collections[0];
  assert.equal(
    roomArtworkRelativePath(studio, studio.prints[0]),
    `images/product-art/${studio.slug}/${studio.prints[0].slug}.webp`,
  );
  const portraitRooms = structuredClone(wave);
  portraitRooms.orientation = 'portrait';
  assert.throws(
    () => roomMediaPlan(collection, portraitRooms),
    /placement must be 4:5 portrait/,
  );
});

test('museum collections are never described or counted as Clara Mendes originals', () => {
  const description = shopCapsuleDescription({
    handles: ['a', 'b'],
    image: '',
    kind: 'museum',
    note: 'Edo-period landscapes',
    sizeLabels: ['8 × 10 in'],
    slug: 'floating-world',
    title: 'Floating World',
  });
  assert.doesNotMatch(description, /original/i);
  assert.match(description, /public-domain works from museum collections/);

  const {catalog} = releasedFixture();
  assert.deepEqual(catalogCounts(catalog), catalogCounts(prints.PRINT_CATALOG));
});

test('a museum Draft carries museum copy, credit and tags, never "original"', () => {
  const {catalog, registry} = releasedFixture({release: false});
  const collection = floatingWorld(catalog);
  const input = buildProductSetInput(collection, collection.prints[0], {
    registry,
  });
  assert.equal(input.handle, WAVE_HANDLE);
  assert.equal(input.status, 'DRAFT');
  assert.deepEqual(input.tags, [
    MUSEUM_TAG,
    'Wall Art',
    'Art Print',
    'Floating World',
    'Katsushika Hokusai',
    ...PENDING_TAGS,
  ]);
  assert.equal(
    input.seo.title,
    'The Great Wave off Kanagawa Art Print by Katsushika Hokusai | Clara Mendes',
  );
  assert.match(
    input.descriptionHtml,
    /Katsushika Hokusai \(1760–1849\), <em>Under the Wave off Kanagawa/,
  );
  assert.match(
    input.descriptionHtml,
    /Unframed landscape print in 8 × 10, 16 × 20, and 20 × 24 inch sizes, the full composition on a white border/,
  );
  assert.ok(
    input.descriptionHtml.includes(
      `href="https://www.metmuseum.org/art/collection/search/${WAVE.source.objectId}"`,
    ),
  );
  assert.match(
    input.descriptionHtml,
    /not affiliated with or endorsed by the museum/,
  );
  assert.doesNotMatch(
    input.descriptionHtml,
    /Clara Mendes composition|original/i,
  );
  assert.ok(!input.tags.includes('Clara Mendes Original'));
  assert.ok(!input.tags.includes('4:5 Ratio'));
});

/** Every Floating World print, as the artist shops would list them. */
function floatingWorldProducts(artistId) {
  return shops
    .artistProducts()
    .filter((product) => product.collectionTag === 'Floating World')
    .filter((product) => product.family === 'Prints')
    .filter((product) => !artistId || product.artistId === artistId);
}

test('artist shop Refine groups come from data, with counts per choice', () => {
  const hiroshige = floatingWorldProducts('utagawa-hiroshige');
  assert.equal(hiroshige.length, 4);
  const view = shops.artistShopView(hiroshige, new URLSearchParams());
  assert.deepEqual(
    view.groups.map((group) => group.key),
    ['type', 'series', 'orientation', 'collection'],
  );
  const series = view.groups.find((group) => group.key === 'series');
  // Quotes and the romanised original are trimmed; Nissaka has no series.
  assert.deepEqual(series.options, [
    {
      count: 3,
      label: 'One Hundred Famous Views of Edo',
      selected: false,
      value: 'one-hundred-famous-views-of-edo',
    },
  ]);
  const orientation = view.groups.find((group) => group.key === 'orientation');
  assert.deepEqual(
    orientation.options.map(({count, value}) => [value, count]),
    [
      ['landscape', 1],
      ['portrait', 3],
    ],
  );
  assert.equal(view.activeCount, 0);
  assert.equal(view.sort, 'featured');
  assert.deepEqual(view.products, hiroshige);
});

test('artist shop filters AND across groups, OR within one, and drop stale values', () => {
  const hiroshige = floatingWorldProducts('utagawa-hiroshige');
  const portrait = shops.artistShopView(
    hiroshige,
    new URLSearchParams('orientation=Portrait&series=no-such-series'),
  );
  assert.equal(portrait.activeCount, 1);
  assert.ok(
    portrait.products.every((product) => product.orientation === 'portrait'),
  );
  assert.equal(portrait.products.length, 3);
  // Counts in other groups follow the orientation choice.
  const type = portrait.groups.find((group) => group.key === 'type');
  assert.deepEqual(type.options, [
    {count: 3, label: 'Prints', selected: false, value: 'prints'},
  ]);
  const orientation = portrait.groups.find(
    (group) => group.key === 'orientation',
  );
  assert.deepEqual(
    orientation.options.map(({count, selected}) => [count, selected]),
    [
      [1, false],
      [3, true],
    ],
  );

  const both = shops.artistShopView(
    hiroshige,
    new URLSearchParams(
      'orientation=portrait&orientation=landscape&type=Prints',
    ),
  );
  assert.equal(both.products.length, 4);
  assert.equal(both.activeCount, 3);
  // The filter was labelled "Art prints"; links written from that label
  // still select the prints.
  for (const old of ['Art+prints', 'art-prints', 'ART%20PRINTS', 'prints']) {
    const view = shops.artistShopView(
      hiroshige,
      new URLSearchParams(`type=${old}`),
    );
    assert.equal(view.activeCount, 1, old);
    assert.equal(view.products.length, 4, old);
    assert.equal(
      view.groups.find((group) => group.key === 'type').options[0].selected,
      true,
      old,
    );
  }
  // The page's checkboxes compare URL values the same way.
  assert.equal(shops.artistFacetValue('type', ' Art prints '), 'prints');
  assert.equal(shops.artistFacetValue('type', 'Phone-Cases'), 'phone-cases');
  assert.equal(shops.artistFacetValue('series', 'art-prints'), 'art-prints');

  const none = shops.artistShopView(
    hiroshige,
    new URLSearchParams(
      'orientation=landscape&series=one-hundred-famous-views-of-edo',
    ),
  );
  assert.deepEqual(none.products, []);
});

test('artist shop sorts by title or by the artwork date, keeping ties in order', () => {
  const all = floatingWorldProducts();
  const titles = shops
    .artistShopView(all, new URLSearchParams('sort=title'))
    .products.map((product) => product.title);
  assert.deepEqual(
    titles,
    [...titles].sort((a, b) => a.localeCompare(b)),
  );

  const year = (product) =>
    Number(
      registryModule.findArtwork(product.artworkId).date.match(/\d{4}/)[0],
    );
  const oldest = shops.artistShopView(
    all,
    new URLSearchParams('sort=oldest'),
  ).products;
  assert.deepEqual(
    oldest.map(year),
    [...oldest.map(year)].sort((a, b) => a - b),
  );
  // The six Fuji views share a date, so they keep the catalog order.
  assert.deepEqual(
    oldest.slice(0, 6).map((product) => product.handle),
    all
      .filter((product) => year(product) === 1830)
      .map((product) => product.handle),
  );
  const newest = shops.artistShopView(
    all,
    new URLSearchParams('sort=NEWEST'),
  ).products;
  assert.equal(year(newest[0]), 1858);

  assert.equal(
    shops.artistShopView(all, new URLSearchParams('sort=price')).sort,
    'featured',
  );
});

test('artist shops point to the museums that hold the work', () => {
  const hokusai = registryModule.findArtist('katsushika-hokusai');
  const artworks = shops.artistArtworks(floatingWorldProducts(hokusai.id));
  assert.deepEqual(shops.artistElsewhere(hokusai, artworks), [
    {
      label: 'The Metropolitan Museum of Art',
      url: 'https://www.metmuseum.org/art/collection/search?q=Katsushika%20Hokusai',
    },
  ]);
  assert.deepEqual(shops.artistElsewhere(hokusai, []), []);
  assert.equal(
    shops.seriesLabel('"One Hundred Famous Views of Edo"'),
    'One Hundred Famous Views of Edo',
  );
  assert.equal(shops.seriesLabel(undefined), null);
});
