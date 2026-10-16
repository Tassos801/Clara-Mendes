import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import * as registry from '../app/lib/artRegistry.ts';
import * as aic from './lib/museum-aic.mjs';
import * as cma from './lib/museum-cma.mjs';
import {
  artworkRecord,
  attributionIssues,
  servedImageIssues,
} from './lib/museum-record.mjs';
import {
  evidenceObjectId,
  MUSEUM_SOURCES,
  museumSourceFor,
  parseArtworkRef,
} from './lib/museum-sources.mjs';
import {REPO_ROOT} from './lib/product-pipeline.mjs';

/** AIC's record of Kandinsky's Improvisation No. 30 (fields as fetched, 2026-10-14). */
const AIC_8991 = {
  data: {
    id: 8991,
    title: 'Improvisation No. 30 (Cannons)',
    thumbnail: {
      lqip: 'data:image/gif;base64,R0lG',
      width: 10199,
      height: 10244,
      alt_text: 'Abstract painting in various bright colors.',
    },
    main_reference_number: '1931.511',
    date_display: '1913',
    artist_display:
      'Vasily Kandinsky\nBorn Moscow (formerly Russian Empire, now Russia), 1866; died Neuilly-sur-Seine, France, 1944',
    dimensions: '111 × 111.3 cm (43 11/16 × 43 13/16 in.)',
    medium_display: 'Oil on canvas',
    credit_line: 'Arthur Jerome Eddy Memorial Collection',
    is_public_domain: true,
    artist_title: 'Vasily Kandinsky',
    artist_titles: ['Vasily Kandinsky'],
    image_id: 'b5bc6b66-9e6e-fe57-dcec-fc49e820e904',
  },
  info: {version: '1.16'},
  config: {iiif_url: 'https://www.artic.edu/iiif/2'},
};

/** Cleveland's record of Mondrian's 1967.215 (fields as fetched, 2026-10-14). */
const CMA_1967_215 = {
  data: {
    id: 143278,
    accession_number: '1967.215',
    share_license_status: 'CC0',
    title: 'Composition with Red, Yellow, and Blue',
    creation_date: '1927',
    technique: 'oil on canvas',
    measurements:
      'Framed: 62.2 x 62.6 x 10.8 cm (24 1/2 x 24 5/8 x 4 1/4 in.); Unframed: 49.5 x 49.5 cm (19 1/2 x 19 1/2 in.)',
    copyright: null,
    url: 'https://clevelandart.org/art/1967.215',
    images: {
      annotation: null,
      web: {
        url: 'https://openaccess-cdn.clevelandart.org/1967.215/1967.215_web.jpg',
        width: '887',
        height: '900',
      },
      full: {
        url: 'https://openaccess-cdn.clevelandart.org/1967.215/1967.215_full.tif',
        width: '9856',
        height: '9998',
        filesize: '295646980',
      },
    },
    creditline: 'Contemporary Collection of The Cleveland Museum of Art',
    creators: [
      {
        id: 3204,
        description: 'Piet Mondrian (Dutch, 1872–1944)',
        qualifier: null,
        role: 'artist',
        birth_year: '1872',
        death_year: '1944',
      },
    ],
  },
};

const ORIGINAL = {
  bytes: 1,
  contentType: 'image/jpeg',
  sha256: 'b'.repeat(64),
};

/** Test-only artist records; the shipped registry is not edited here. */
const historical = (id, name, born, died) => ({
  aliases: [],
  approval: {approved: false},
  bio: '',
  bioSources: [],
  born: {display: String(born), year: born},
  curatorNote: '',
  died: {display: String(died), year: died},
  id,
  kind: 'historical',
  lifeDatesSource: 'test fixture',
  name,
  slug: id,
  sortName: name,
});
const KANDINSKY = historical(
  'vasily-kandinsky',
  'Vasily Kandinsky',
  1866,
  1944,
);
const MONDRIAN = historical('piet-mondrian', 'Piet Mondrian', 1872, 1944);

function fetched(candidate, artistId, original) {
  return artworkRecord(candidate, {
    artistId,
    evidenceFile: `data/museum-evidence/${candidate.museum}-${candidate.objectId}.json`,
    fetchedAt: '2026-10-14T12:00:00.000Z',
    metadataSha256: 'a'.repeat(64),
    original,
  });
}

test('an AIC record normalises with its credit, rights flag and full resolution', () => {
  const candidate = aic.normalizeAicArtwork(AIC_8991);
  assert.equal(candidate.museum, 'aic');
  assert.equal(candidate.objectId, '8991');
  assert.equal(candidate.accessionNumber, '1931.511');
  assert.equal(candidate.publicDomain, true);
  assert.equal(candidate.artistDisplayName, 'Vasily Kandinsky');
  assert.equal(candidate.artistPrefix, '');
  assert.deepEqual(attributionIssues(candidate), []);
  assert.equal(candidate.medium, 'Oil on canvas');
  // The thumbnail size is the museum's master, kept apart from the file.
  assert.deepEqual(candidate.fullResolution, {height: 10244, width: 10199});
  assert.equal(
    candidate.creditLine,
    'Vasily Kandinsky. Improvisation No. 30 (Cannons), 1913. The Art Institute of Chicago',
  );
  assert.equal(
    candidate.museumCreditLine,
    'Arthur Jerome Eddy Memorial Collection',
  );
  assert.equal(candidate.objectUrl, 'https://www.artic.edu/artworks/8991');
  assert.equal(candidate.rightsEvidenceUrl, aic.AIC_RIGHTS_EVIDENCE_URL);
  // Modern titles keep their brackets: "(Cannons)" is part of the title.
  assert.equal(candidate.proposedShortTitle, 'Improvisation No. 30 (Cannons)');
  // A search hit is the bare record, without the envelope.
  assert.deepEqual(aic.normalizeAicArtwork(AIC_8991.data), candidate);
  assert.equal(
    aic.normalizeAicArtwork({...AIC_8991.data, is_public_domain: false})
      .publicDomain,
    false,
  );
});

test('AIC images are requested at the 3000 px cap and never above the full resolution', () => {
  const base = 'https://www.artic.edu/iiif/2/abc/full';
  assert.equal(
    aic.aicImageUrl('abc', {height: 10244, width: 10199}),
    `${base}/3000,/0/default.jpg`,
  );
  // A small master is asked for at its own width, so nothing is upscaled.
  assert.equal(
    aic.aicImageUrl('abc', {height: 2250, width: 2417}),
    `${base}/2417,/0/default.jpg`,
  );
  assert.equal(
    aic.normalizeAicArtwork(AIC_8991).imageUrl,
    'https://www.artic.edu/iiif/2/b5bc6b66-9e6e-fe57-dcec-fc49e820e904/full/3000,/0/default.jpg',
  );
  // Without the full resolution there is no safe request: no URL at all.
  const unknown = aic.normalizeAicArtwork({...AIC_8991.data, thumbnail: null});
  assert.equal(unknown.imageUrl, '');
  assert.equal(unknown.fullResolution, undefined);
  // The served file (2987×3000 for this work) is what gets recorded; a file
  // larger than the full resolution was upscaled and is refused.
  const candidate = aic.normalizeAicArtwork(AIC_8991);
  assert.deepEqual(
    servedImageIssues(candidate, {height: 3000, width: 2987}),
    [],
  );
  assert.match(
    servedImageIssues(
      {fullResolution: {height: 2250, width: 2417}},
      {height: 3000, width: 3223},
    )[0],
    /exceeds the museum's full resolution 2417×2250 \(upscaled\)/,
  );
});

test('AIC attribution qualifiers and shared works are flagged', () => {
  const circle = aic.normalizeAicArtwork({
    ...AIC_8991.data,
    artist_display: 'Circle of Vasily Kandinsky\nRussian, 1866–1944',
  });
  assert.equal(circle.artistPrefix, 'Circle of');
  assert.deepEqual(attributionIssues(circle), [
    'attribution qualifier "Circle of"',
  ]);
  const other = aic.normalizeAicArtwork({
    ...AIC_8991.data,
    artist_display: 'Unknown artist\nGermany',
  });
  assert.deepEqual(attributionIssues(other), [
    'attribution qualifier "Unknown artist"',
  ]);
  const pair = aic.normalizeAicArtwork({
    ...AIC_8991.data,
    artist_titles: ['Vasily Kandinsky', 'Gabriele Münter'],
  });
  assert.deepEqual(attributionIssues(pair), ['2 artist constituents']);
});

test('AIC search asks for public-domain works with images, 100 at most per page', () => {
  const url = new URL(
    aic.aicSearchUrl({limit: 500, offset: 20, q: 'kandinsky'}),
  );
  assert.equal(
    url.origin + url.pathname,
    'https://api.artic.edu/api/v1/artworks/search',
  );
  const params = Object.fromEntries(url.searchParams);
  assert.equal(
    params['query[bool][must][0][match][artist_title][query]'],
    'kandinsky',
  );
  assert.equal(
    params['query[bool][must][0][match][artist_title][operator]'],
    'and',
  );
  assert.equal(
    params['query[bool][filter][0][term][is_public_domain]'],
    'true',
  );
  assert.equal(params['query[bool][filter][1][exists][field]'], 'image_id');
  assert.equal(params.limit, '100');
  assert.equal(params.from, '20');
  assert.equal(params.fields, aic.AIC_FIELDS.join(','));
  const titles = new URL(aic.aicSearchUrl({match: 'title', q: 'Troika'}));
  assert.equal(
    titles.searchParams.get('query[bool][must][0][match][title][query]'),
    'Troika',
  );
  const anywhere = new URL(
    aic.aicSearchUrl({match: 'anywhere', q: 'mondrian lozenge'}),
  );
  assert.equal(
    anywhere.searchParams.get('query[bool][must][0][multi_match][query]'),
    'mondrian lozenge',
  );
  // The object request names the same fixed fields, so evidence is stable.
  assert.equal(
    aic.aicObjectUrl('8991'),
    `https://api.artic.edu/api/v1/artworks/8991?fields=${aic.AIC_FIELDS.join(',')}`,
  );
  assert.deepEqual(
    aic.AIC_SOURCE.searchPage({data: [{id: 1}], pagination: {total: 7}}),
    {
      records: [{id: 1}],
      total: 7,
    },
  );
});

test('every AIC request names Clara Mendes and stays within 60 per minute', () => {
  const {request} = aic.AIC_SOURCE;
  assert.equal(
    request.headers['AIC-User-Agent'],
    'Clara Mendes (https://shopclaramendes.com)',
  );
  assert.ok(request.minGapMs >= 1000, 'one request a second at most');
  assert.ok(60_000 / request.minGapMs <= 60);
  // The other museums send no AIC header.
  assert.deepEqual(MUSEUM_SOURCES.met.request.headers, {});
  assert.deepEqual(MUSEUM_SOURCES.cma.request.headers, {});
});

test('a Cleveland record normalises from its CC0 status, creators and full TIFF', () => {
  const candidate = cma.normalizeCmaArtwork(CMA_1967_215);
  assert.equal(candidate.museum, 'cma');
  assert.equal(candidate.objectId, '1967.215');
  assert.equal(candidate.accessionNumber, '1967.215');
  assert.equal(candidate.publicDomain, true);
  assert.equal(candidate.artistDisplayName, 'Piet Mondrian');
  assert.deepEqual(candidate.artists, ['Piet Mondrian']);
  assert.equal(candidate.artistPrefix, '');
  assert.deepEqual(attributionIssues(candidate), []);
  assert.equal(candidate.medium, 'Oil on canvas');
  assert.equal(candidate.date, '1927');
  assert.equal(
    candidate.creditLine,
    'Contemporary Collection of The Cleveland Museum of Art',
  );
  assert.equal(
    candidate.imageUrl,
    'https://openaccess-cdn.clevelandart.org/1967.215/1967.215_full.tif',
  );
  // Cleveland serves the full resolution: the record states the file's size.
  assert.deepEqual(candidate.pixels, {height: 9998, width: 9856});
  assert.equal(candidate.fullResolution, undefined);
  assert.deepEqual(cma.CMA_SOURCE.sizeFromRecord(candidate), {
    height: 9998,
    width: 9856,
  });
  assert.equal(candidate.objectUrl, 'https://clevelandart.org/art/1967.215');
  assert.deepEqual(cma.normalizeCmaArtwork(CMA_1967_215.data), candidate);

  const restricted = cma.normalizeCmaArtwork({
    ...CMA_1967_215.data,
    share_license_status: 'Copyrighted',
  });
  assert.equal(restricted.publicDomain, false);
  const attributed = cma.normalizeCmaArtwork({
    ...CMA_1967_215.data,
    creators: [
      {...CMA_1967_215.data.creators[0], qualifier: 'attributed to'},
      {description: 'Publisher (Dutch)', role: 'publisher'},
    ],
  });
  assert.deepEqual(attributionIssues(attributed), [
    'attribution qualifier "attributed to"',
  ]);
  assert.equal(
    cma.creatorName('Piet Mondrian (Dutch, 1872–1944)'),
    'Piet Mondrian',
  );
});

test('Cleveland search filters to CC0 works with images', () => {
  const url = new URL(
    cma.cmaSearchUrl({limit: 900, offset: 40, q: 'mondrian'}),
  );
  assert.equal(
    url.origin + url.pathname,
    'https://openaccess-api.clevelandart.org/api/artworks/',
  );
  assert.equal(url.searchParams.get('artists'), 'mondrian');
  assert.equal(url.searchParams.get('cc0'), '1');
  assert.equal(url.searchParams.get('has_image'), '1');
  assert.equal(url.searchParams.get('limit'), '100');
  assert.equal(url.searchParams.get('skip'), '40');
  assert.equal(url.searchParams.get('fields'), cma.CMA_FIELDS.join(','));
  assert.equal(
    new URL(
      cma.cmaSearchUrl({match: 'title', q: 'Chrysanthemum'}),
    ).searchParams.get('title'),
    'Chrysanthemum',
  );
  assert.equal(
    new URL(cma.cmaSearchUrl({match: 'anywhere', q: 'grid'})).searchParams.get(
      'q',
    ),
    'grid',
  );
  assert.equal(
    cma.cmaObjectUrl('1967.215'),
    `https://openaccess-api.clevelandart.org/api/artworks/1967.215?fields=${cma.CMA_FIELDS.join(',')}`,
  );
  assert.deepEqual(
    cma.CMA_SOURCE.searchPage({data: [{id: 1}], info: {total: 4}}),
    {
      records: [{id: 1}],
      total: 4,
    },
  );
});

test('artwork ids name their museum; bare numbers stay Met object ids', () => {
  const ref = (value) => {
    const {museum, objectId} = parseArtworkRef(value);
    return [museum, objectId];
  };
  assert.deepEqual(ref('aic-8991'), ['aic', '8991']);
  assert.deepEqual(ref('cma-1967.215'), ['cma', '1967.215']);
  assert.deepEqual(ref('met-45434'), ['met', '45434']);
  assert.deepEqual(ref('45434'), ['met', '45434']);
  assert.throws(() => parseArtworkRef('aic-abc'), /not an artwork id/);
  assert.throws(() => parseArtworkRef('kandinsky'), /not an artwork id/);
  assert.throws(() => museumSourceFor('louvre'), /Unknown museum "louvre"/);
  assert.equal(evidenceObjectId('aic', AIC_8991), '8991');
  assert.equal(evidenceObjectId('cma', CMA_1967_215), '1967.215');
  assert.equal(evidenceObjectId('met', {objectID: 45434}), '45434');
});

test('fetched AIC and Cleveland works are valid registry records that pass the rights screen', () => {
  const improvisation = fetched(
    aic.normalizeAicArtwork(AIC_8991),
    KANDINSKY.id,
    {
      ...ORIGINAL,
      fileName: 'aic-8991.jpg',
      height: 3000,
      width: 2987,
    },
  );
  const composition = fetched(
    cma.normalizeCmaArtwork(CMA_1967_215),
    MONDRIAN.id,
    {
      ...ORIGINAL,
      contentType: 'image/tiff',
      fileName: 'cma-1967.215.tif',
      height: 9998,
      width: 9856,
    },
  );
  assert.equal(improvisation.id, 'aic-8991');
  assert.equal(composition.id, 'cma-1967.215');
  assert.deepEqual(improvisation.source.fullResolution, {
    height: 10244,
    width: 10199,
  });
  assert.equal(improvisation.original.width, 2987);
  assert.equal(composition.source.fullResolution, undefined);
  assert.equal(
    improvisation.source.rights.evidenceUrl,
    aic.AIC_RIGHTS_EVIDENCE_URL,
  );
  assert.equal(
    composition.source.rights.evidenceUrl,
    cma.CMA_RIGHTS_EVIDENCE_URL,
  );
  assert.deepEqual(
    registry.validateArtRegistry({
      artists: [...registry.ART_REGISTRY.artists, KANDINSKY, MONDRIAN],
      artworks: [improvisation, composition],
    }),
    [],
  );
  for (const [artwork, artist] of [
    [improvisation, KANDINSKY],
    [composition, MONDRIAN],
  ])
    assert.deepEqual(
      registry.screenArtworkRights(artwork, artist, {year: 2026}),
      {pass: true, reasons: []},
      artwork.id,
    );
  // AIC's flag is the gate: a work it does not mark public domain fails.
  const flagged = fetched(
    aic.normalizeAicArtwork({...AIC_8991.data, is_public_domain: false}),
    KANDINSKY.id,
    {...ORIGINAL, fileName: 'aic-8991.jpg', height: 3000, width: 2987},
  );
  assert.ok(
    registry
      .screenArtworkRights(flagged, KANDINSKY, {year: 2026})
      .reasons.includes(
        'the museum does not flag this object as public domain',
      ),
  );
  // An unusable full-resolution size is a registry problem.
  assert.match(
    registry
      .validateArtRegistry({
        artists: [KANDINSKY],
        artworks: [
          {
            ...improvisation,
            source: {
              ...improvisation.source,
              fullResolution: {height: 0, width: 1},
            },
          },
        ],
      })
      .join('\n'),
    /source.fullResolution needs pixel dimensions/,
  );
});

test('credits follow each museum: AIC names itself, the others follow the institution', () => {
  const improvisation = fetched(
    aic.normalizeAicArtwork(AIC_8991),
    KANDINSKY.id,
  );
  const composition = fetched(
    cma.normalizeCmaArtwork(CMA_1967_215),
    MONDRIAN.id,
  );
  assert.equal(
    registry.artworkCreditLine(improvisation),
    'Source: Vasily Kandinsky. Improvisation No. 30 (Cannons), 1913. The Art Institute of Chicago. Public domain: The Art Institute of Chicago Open Access (CC0). Object 8991.',
  );
  assert.equal(
    registry.artworkCreditLine(composition),
    'Source: The Cleveland Museum of Art, Contemporary Collection of The Cleveland Museum of Art. Public domain: The Cleveland Museum of Art Open Access (CC0). Object 1967.215.',
  );
  const wave = registry.findArtwork('met-39799');
  assert.equal(
    registry.sourceCredit(wave.source),
    `The Metropolitan Museum of Art, ${wave.source.creditLine}`,
  );
});

test('re-reading committed evidence reproduces every registered record', () => {
  for (const artwork of registry.ART_REGISTRY.artworks) {
    const raw = readFileSync(
      path.join(REPO_ROOT, artwork.source.evidenceFile),
      'utf8',
    );
    const source = museumSourceFor(artwork.source.museum);
    const rebuilt = artworkRecord(source.normalize(JSON.parse(raw)), {
      artistId: artwork.artistId,
      evidenceFile: artwork.source.evidenceFile,
      fetchedAt: artwork.source.fetchedAt,
      metadataSha256: artwork.source.metadataSha256,
      original: artwork.original,
      previous: artwork,
    });
    assert.deepEqual(rebuilt, artwork, artwork.id);
  }
});
