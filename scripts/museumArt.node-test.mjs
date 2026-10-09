import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import * as registry from '../app/lib/artRegistry.ts';
import * as layout from './lib/museum-layout.mjs';
import * as met from './lib/museum-met.mjs';
import {REPO_ROOT} from './lib/product-pipeline.mjs';

const GREAT_WAVE_RAW = readFileSync(
  path.join(REPO_ROOT, 'data/museum-evidence/met-45434.json'),
  'utf8',
);
const GREAT_WAVE = JSON.parse(GREAT_WAVE_RAW);

const hokusai = () =>
  structuredClone(registry.findArtist('katsushika-hokusai'));

/** A registered artwork built from the committed Met record. */
function waveRecord(overrides = {}) {
  return met.metArtworkRecord(met.normalizeMetObject(GREAT_WAVE), {
    artistId: 'katsushika-hokusai',
    evidenceFile: 'data/museum-evidence/met-45434.json',
    fetchedAt: '2026-10-09T13:00:00.000Z',
    metadataSha256: 'a'.repeat(64),
    original: {
      bytes: 1,
      contentType: 'image/jpeg',
      fileName: 'met-45434.jpg',
      height: 2594,
      sha256: 'b'.repeat(64),
      width: 3859,
    },
    ...overrides,
  });
}

test('the shipped art registry is valid', () => {
  assert.deepEqual(registry.validateArtRegistry(), []);
});

test('committed museum evidence matches the checksum the registry records', () => {
  for (const artwork of registry.ART_REGISTRY.artworks) {
    const raw = readFileSync(
      path.join(REPO_ROOT, artwork.source.evidenceFile),
      'utf8',
    );
    assert.equal(
      createHash('sha256').update(raw).digest('hex'),
      artwork.source.metadataSha256,
      artwork.id,
    );
    assert.equal(String(JSON.parse(raw).objectID), artwork.source.objectId);
  }
});

test('life + 70 clears deaths in 1955 or earlier during 2026', () => {
  assert.equal(registry.lifePlusSeventyCutoff(2026), 1955);
  const artist = hokusai();
  artist.died = {display: '1955', year: 1955};
  assert.equal(
    registry.screenArtworkRights(waveRecord(), artist, {year: 2026}).pass,
    true,
  );
  artist.died = {display: '1956', year: 1956};
  const screen = registry.screenArtworkRights(waveRecord(), artist, {
    year: 2026,
  });
  assert.equal(screen.pass, false);
  assert.match(screen.reasons.join(), /died in 1956/);
});

test('the rights screen blocks anything short of explicit evidence', () => {
  assert.equal(
    registry.screenArtworkRights(waveRecord(), hokusai(), {year: 2026}).pass,
    true,
  );

  const notPublic = waveRecord();
  notPublic.source.rights.publicDomain = false;
  assert.match(
    registry.screenArtworkRights(notPublic, hokusai()).reasons.join(),
    /not flag this object as public domain/,
  );

  const qualified = waveRecord();
  qualified.source.artistPrefix = 'Attributed to';
  assert.match(
    registry.screenArtworkRights(qualified, hokusai()).reasons.join(),
    /qualified attribution "Attributed to"/,
  );

  const mismatch = waveRecord();
  mismatch.source.artistDisplayName = 'Utagawa Hiroshige';
  assert.match(
    registry.screenArtworkRights(mismatch, hokusai()).reasons.join(),
    /does not match Katsushika Hokusai/,
  );

  const unfetched = waveRecord({original: undefined});
  assert.match(
    registry.screenArtworkRights(unfetched, hokusai()).reasons.join(),
    /original file not fetched/,
  );

  const studio = registry.findArtist('clara-mendes-studio');
  assert.match(
    registry.screenArtworkRights(waveRecord(), studio).reasons.join(),
    /not a historical artist/,
  );
});

test('artist names match across case, accents and aliases', () => {
  const artist = hokusai();
  assert.ok(registry.matchesArtistName(artist, 'katsushika hokusai'));
  assert.ok(registry.matchesArtistName(artist, 'HOKUSAI'));
  assert.ok(registry.matchesArtistName(artist, '葛飾北斎'));
  // The Met writes some records with the name in both scripts.
  assert.ok(registry.matchesArtistName(artist, 'Katsushika Hokusai 葛飾北斎'));
  assert.ok(!registry.matchesArtistName(artist, 'Hokusai school'));
  assert.equal(registry.foldName('Tōkaidō'), 'tokaido');
});

test('the registry validator refuses unsafe records', () => {
  const broken = structuredClone(registry.ART_REGISTRY);
  broken.artworks.push(waveRecord());
  const wave = broken.artworks.at(-1);
  wave.id = 'met-1';
  broken.artists[1].aliases.push('Hokusai');
  broken.artists[0].approval = {approved: true};
  wave.reviews.rights = {status: 'cleared'};
  const problems = registry.validateArtRegistry(broken).join('\n');
  assert.match(problems, /artwork met-1: id must be met-45434/);
  assert.match(problems, /alias "Hokusai" also belongs to katsushika-hokusai/);
  assert.match(problems, /an approval records who approved it and when/);
  assert.match(problems, /a rights review records who decided it and when/);

  const cleared = structuredClone(registry.ART_REGISTRY);
  cleared.artworks = [waveRecord()];
  cleared.artworks[0].source.rights.publicDomain = false;
  cleared.artworks[0].reviews.rights = {
    at: '2026-10-09T13:00:00.000Z',
    by: 'Owner',
    status: 'cleared',
  };
  assert.match(
    registry.validateArtRegistry(cleared).join('\n'),
    /rights cleared but the screen fails/,
  );
});

test('a Met object record normalises with its attribution and series', () => {
  const candidate = met.normalizeMetObject(GREAT_WAVE);
  assert.equal(candidate.objectId, '45434');
  assert.equal(candidate.publicDomain, true);
  assert.deepEqual(candidate.artists, ['Katsushika Hokusai']);
  assert.equal(candidate.artistPrefix, '');
  assert.equal(
    candidate.series,
    'Thirty-six Views of Mount Fuji (Fugaku sanjūrokkei)',
  );
  assert.match(candidate.imageUrl, /\/original\/DP130155\.jpg$/);
  assert.deepEqual(met.attributionIssues(candidate), []);

  const shared = met.normalizeMetObject({
    ...GREAT_WAVE,
    artistPrefix: 'Workshop of',
    constituents: [
      {name: 'A', role: 'Artist'},
      {name: 'B', role: 'Artist'},
      {name: 'Publisher', role: 'Publisher'},
    ],
  });
  assert.deepEqual(met.attributionIssues(shared), [
    'attribution qualifier "Workshop of"',
    '2 artist constituents',
  ]);
});

test('short titles drop series clauses, alternate titles and romanisation', () => {
  assert.equal(
    met.proposeShortTitle(GREAT_WAVE.title),
    'Under the Wave off Kanagawa',
  );
  assert.equal(
    met.proposeShortTitle(
      'Sudden Shower over Shin-Ōhashi Bridge and Atake (Ōhashi Atake no yūdachi), from the series One Hundred Famous Views of Edo (Meisho Edo hyakkei)',
    ),
    'Sudden Shower over Shin-Ōhashi Bridge and Atake',
  );
  assert.equal(met.proposeShortTitle('Evening Cherries'), 'Evening Cherries');
  assert.equal(
    met.proposeShortTitle(
      '“Umezawa Manor in Sagami Province,” from the series Thirty-six Views of Mount Fuji (Fugaku sanjūrokkei, Sōshū Umezawa zai)',
    ),
    'Umezawa Manor in Sagami Province',
  );
});

test('other impressions of one design share a flag key, other designs do not', () => {
  const storm = (title) => ({artistDisplayName: 'Katsushika Hokusai', title});
  assert.equal(
    met.impressionKey(
      storm('Storm below Mount Fuji (Sanka no haku u), from the series Thirty-six Views of Mount Fuji'),
    ),
    met.impressionKey(storm('Storm below Mount Fuji, from the series Thirty-six Views of Mount Fuji')),
  );
  assert.notEqual(
    met.impressionKey(storm('Storm below Mount Fuji')),
    met.impressionKey(storm('Noboto Bay (Noboto no ura)')),
  );
  // The Met titles one Great Wave impression "…, or The Great Wave".
  assert.equal(
    met.impressionKey(
      storm('Under the Wave off Kanagawa (Kanagawa oki nami ura), or The Great Wave, from the series Thirty-six Views of Mount Fuji (Fugaku sanjūrokkei)'),
    ),
    met.impressionKey(storm(GREAT_WAVE.title)),
  );
});

test('a refetch keeps decisions unless the evidence behind them changed', () => {
  const decided = waveRecord();
  decided.reviews = {
    master: {at: '2026-10-09', by: 'Owner', status: 'cleared'},
    rights: {at: '2026-10-09', by: 'Owner', status: 'cleared'},
  };
  const same = waveRecord({previous: decided});
  assert.deepEqual(same.reviews, decided.reviews);
  assert.equal(same.shortTitle, decided.shortTitle);

  const newImage = waveRecord({
    original: {...decided.original, sha256: 'c'.repeat(64)},
    previous: decided,
  });
  assert.equal(newImage.reviews.rights.status, 'cleared');
  assert.equal(newImage.reviews.master.status, 'pending');
  assert.match(newImage.reviews.master.note, /museum image or record changed/);

  const newRecord = waveRecord({
    metadataSha256: 'd'.repeat(64),
    previous: decided,
  });
  assert.equal(newRecord.reviews.rights.status, 'pending');
  assert.equal(newRecord.reviews.master.status, 'pending');
});

test('a JPEG header gives the pixel size without the whole file', async () => {
  const jpeg = await sharp({
    create: {background: '#335577', channels: 3, height: 210, width: 377},
  })
    .withIccProfile('srgb')
    .jpeg()
    .toBuffer();
  const start = jpeg.indexOf(Buffer.from([0xff, 0xc0]));
  assert.ok(start > 100, 'the ICC profile sits before the frame header');
  assert.deepEqual(met.jpegDimensions(jpeg.subarray(0, start + 9)), {
    height: 210,
    width: 377,
  });
  assert.equal(met.jpegDimensions(jpeg.subarray(0, start)), null);
  assert.equal(met.jpegDimensions(Buffer.from('not a jpeg')), null);
});

test('Met search uses the paginated v1.1 endpoint', () => {
  const url = new URL(met.metSearchUrl({limit: 900, offset: 20, q: 'Hokusai'}));
  assert.equal(url.pathname, '/public/collection/v1.1/search');
  assert.equal(url.searchParams.get('limit'), '500');
  assert.equal(url.searchParams.get('offset'), '20');
  assert.equal(url.searchParams.get('artistOrCulture'), 'true');
  assert.equal(url.searchParams.get('hasImages'), 'true');
  const titles = new URL(met.metSearchUrl({match: 'title', q: 'Fuji'}));
  assert.equal(titles.searchParams.get('title'), 'true');
  assert.equal(titles.searchParams.has('artistOrCulture'), false);
});

test('a landscape woodblock print sits whole on landscape paper', () => {
  const original = {height: 2594, width: 3859};
  const small = layout.borderedLayout(original, '8x10');
  assert.equal(small.orientation, 'landscape');
  assert.deepEqual(small.paper, {height: 2400, width: 3000});
  assert.equal(small.borderPx, 144);
  const {image} = small;
  assert.ok(image.left >= small.borderPx && image.top >= small.borderPx);
  assert.ok(image.left + image.width <= 3000 - small.borderPx);
  assert.ok(image.top + image.height <= 2400 - small.borderPx);
  // Centred, and the aspect ratio is kept to within one pixel.
  assert.ok(Math.abs(image.left * 2 + image.width - 3000) <= 1);
  assert.ok(Math.abs(image.top * 2 + image.height - 2400) <= 1);
  assert.ok(Math.abs(image.height - (image.width * 2594) / 3859) <= 1);
  assert.equal(small.verdict, 'qualified');

  const large = layout.borderedLayout(original, '16x20');
  assert.equal(large.verdict, 'exception-required');
  assert.ok(large.nativePpi < 300 && large.nativePpi >= 150);
  assert.equal(
    layout.borderedLayout({height: 1000, width: 1300}, '20x24').verdict,
    'unsupported',
  );
});

test('portrait and near-square works use portrait paper', () => {
  assert.equal(layout.orientationOf({height: 3000, width: 2000}), 'portrait');
  assert.equal(layout.orientationOf({height: 2000, width: 2030}), 'portrait');
  assert.deepEqual(layout.paperPixels('20x24', 'portrait'), {
    height: 7200,
    width: 6000,
  });
  const tall = layout.borderedLayout({height: 5400, width: 3700}, '8x10');
  assert.equal(tall.orientation, 'portrait');
  assert.ok(tall.image.height <= 3000 - 2 * tall.borderPx);
});
