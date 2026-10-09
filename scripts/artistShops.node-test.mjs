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

const WAVE_HANDLE = 'the-great-wave-off-kanagawa-art-print';
const REVIEWED = {at: '2026-10-09T12:00:00.000Z', by: 'Owner', status: 'cleared'};

/**
 * The shipped data with Hokusai approved, the Great Wave's reviews cleared
 * and its print released — the state a real release would reach.
 */
function releasedFixture({approve = true, clear = true, release = true} = {}) {
  const registry = structuredClone(registryModule.ART_REGISTRY);
  const catalog = structuredClone(prints.PRINT_CATALOG);
  const hokusai = registry.artists.find((a) => a.id === 'katsushika-hokusai');
  if (approve) hokusai.approval = {approved: true, at: REVIEWED.at, by: 'Owner'};
  const wave = registry.artworks.find((a) => a.id === 'met-45434');
  if (clear) wave.reviews = {master: {...REVIEWED}, rights: {...REVIEWED}};
  const print = floatingWorld(catalog).prints[0];
  if (release) {
    print.released = true;
    print.releasedSizes = ['8x10'];
    print.shopify = {productId: 'gid://p', variantIds: {'8x10': 'gid://v'}};
    print.prodigi = {'8x10': {channelProductId: '1', verified: true}};
  }
  return {catalog, registry};
}

function floatingWorld(catalog) {
  return catalog.collections.find((c) => c.slug === 'floating-world');
}

test('the shipped catalog and registry link up cleanly', () => {
  assert.deepEqual(shops.validateArtistLinks(), []);
  assert.deepEqual(prints.validatePrintCatalog(), []);
});

test('nothing is public until an approved artist has a released product', () => {
  assert.deepEqual(shops.publicArtists(), []);
  assert.equal(shops.productArtworkCredit(WAVE_HANDLE), null);
  assert.ok(!CUSTOM_SITEMAP_PATHS.some((path) => path.startsWith('/artists')));
  assert.ok(!computeSellableHandles().has(WAVE_HANDLE));

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
  assert.equal(entry.products[0].artworkId, 'met-45434');
  assert.equal(shops.publicArtistBySlug('HOKUSAI', sources)?.artist.slug, 'hokusai');
  assert.equal(shops.publicArtistBySlug('hiroshige', sources), null);
  assert.equal(
    shops.artistProductsQuery(entry.products),
    'tag:"Floating World"',
  );
  assert.deepEqual(shops.artistFamilies(entry.products), ['Prints']);
  assert.deepEqual(
    shops.artistArtworks(entry.products, sources.registry).map((a) => a.id),
    ['met-45434'],
  );
  assert.ok(computeSellableHandles(undefined, undefined, sources.catalog).has(WAVE_HANDLE));
});

test('artist search matches names, aliases and word prefixes of public artists', () => {
  const sources = releasedFixture();
  for (const term of ['Hokusai', 'hoku', 'katsushika hokusai', '葛飾北斎', 'HOKUSAI ']) {
    assert.deepEqual(
      shops.searchArtists(term, sources).map((artist) => artist.id),
      ['katsushika-hokusai'],
      term,
    );
  }
  for (const term of ['wave', 'hiroshige', '', 'sai']) {
    assert.deepEqual(shops.searchArtists(term, sources), [], term);
  }
  assert.deepEqual(shops.searchArtists('hokusai'), []);
});

test('a product page credits the museum work and links a public artist', () => {
  const credit = shops.productArtworkCredit(WAVE_HANDLE, releasedFixture());
  assert.equal(credit.artist.name, 'Katsushika Hokusai');
  assert.equal(credit.artist.dates, '1760–1849');
  assert.equal(credit.artist.path, '/artists/hokusai');
  assert.equal(credit.artwork.date, 'ca. 1830–32');
  assert.match(
    credit.artwork.credit,
    /^Source: The Metropolitan Museum of Art, H\. O\. Havemeyer Collection.*Public domain: The Met Open Access \(CC0\)\. Object 45434\.$/,
  );
  assert.equal(
    credit.artwork.objectUrl,
    'https://www.metmuseum.org/art/collection/search/45434',
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
    /orientation must be landscape to keep met-45434 whole/,
  );

  const twice = releasedFixture({release: false});
  const copy = structuredClone(floatingWorld(twice.catalog).prints[0]);
  floatingWorld(twice.catalog).prints.push({...copy, sequence: 2, slug: 'wave-again'});
  assert.match(
    shops.validateArtistLinks(twice).join('\n'),
    /met-45434 is already sold as floating-world\/the-great-wave-off-kanagawa/,
  );

  const unknown = releasedFixture({release: false});
  floatingWorld(unknown.catalog).prints[0].artworkId = 'met-1';
  assert.match(shops.validateArtistLinks(unknown).join('\n'), /unknown artwork met-1/);
});

test('studio collections name a studio artist; museum collections never do', () => {
  const sources = releasedFixture({release: false});
  const studio = sources.catalog.collections.find((c) => c.slug === 'light-and-silence');
  studio.artistId = 'clara-mendes-studio';
  sources.registry.artists.find((a) => a.id === 'clara-mendes-studio').approval = {
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
  catalog.collections[0].prints[0].artworkId = 'met-45434';
  museum.prints[0].rooms[0].placement = {height: 300, left: 1, top: 1, width: 240};
  const problems = prints.validatePrintCatalog(catalog).join('\n');
  assert.match(problems, /floating-world\/the-great-wave-off-kanagawa: museum prints need an artworkId/);
  assert.match(problems, /scifi-cinema\/orbital-silence: only museum collections reproduce registry artworks/);
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
  const {height, width} = await sharp(path.join(REPO_ROOT, 'public', sheet)).metadata();
  assert.equal(width / height, 1.25);
  for (const room of wave.rooms)
    assert.ok(Math.abs(room.placement.width / room.placement.height - 1.25) < 0.016);

  const studio = prints.PRINT_CATALOG.collections[0];
  assert.equal(
    roomArtworkRelativePath(studio, studio.prints[0]),
    `images/product-art/${studio.slug}/${studio.prints[0].slug}.webp`,
  );
  const portraitRooms = structuredClone(wave);
  portraitRooms.orientation = 'portrait';
  assert.throws(() => roomMediaPlan(collection, portraitRooms), /placement must be 4:5 portrait/);
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
  const input = buildProductSetInput(collection, collection.prints[0], {registry});
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
  assert.match(input.descriptionHtml, /Katsushika Hokusai \(1760–1849\), <em>Under the Wave off Kanagawa/);
  assert.match(input.descriptionHtml, /Unframed 8 × 10 inch landscape print, the full composition on a white border/);
  assert.match(input.descriptionHtml, /href="https:\/\/www\.metmuseum\.org\/art\/collection\/search\/45434"/);
  assert.match(input.descriptionHtml, /not affiliated with or endorsed by the museum/);
  assert.doesNotMatch(input.descriptionHtml, /Clara Mendes composition|original/i);
  assert.ok(!input.tags.includes('Clara Mendes Original'));
  assert.ok(!input.tags.includes('4:5 Ratio'));
});
