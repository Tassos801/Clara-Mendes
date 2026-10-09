/**
 * The Metropolitan Museum of Art Collection API, as pure functions over its
 * JSON so scripts/museumArt.node-test.mjs covers them without the network.
 * https://metmuseum.github.io/ — v1.1 search (v1 search was retired on
 * 2026-10-01), object records with an object-level `isPublicDomain` flag and
 * full-resolution `primaryImage` JPEGs. Limit: 80 requests per second.
 */

import {artworkId, MUSEUMS} from '../../app/lib/artRegistry.ts';

export const MET_API = 'https://collectionapi.metmuseum.org/public/collection';

/**
 * The Met states that images of public-domain works are released under CC0
 * in its Open Access programme; the object record supplies the per-object flag.
 */
export const MET_RIGHTS_EVIDENCE_URL = 'https://github.com/metmuseum/openaccess';

/**
 * `match`: "artist" searches artist/culture fields (the default), "title"
 * searches titles, "anywhere" searches every field.
 */
export function metSearchUrl({
  hasImages = true,
  limit = 100,
  match = 'artist',
  offset = 0,
  q,
}) {
  const params = new URLSearchParams({q});
  if (match === 'artist') params.set('artistOrCulture', 'true');
  if (match === 'title') params.set('title', 'true');
  if (hasImages) params.set('hasImages', 'true');
  params.set('offset', String(offset));
  params.set('limit', String(Math.min(limit, 500)));
  return `${MET_API}/v1.1/search?${params}`;
}

export function metObjectUrl(objectId) {
  return `${MET_API}/v1/objects/${objectId}`;
}

const text = (value) => (typeof value === 'string' ? value.trim() : '');

/** "…, from the series Thirty-six Views of Mount Fuji (…)" → the series. */
export function seriesFromTitle(title) {
  return text(title).match(/,? from the series (.+)$/i)?.[1]?.trim() ?? '';
}

/**
 * A customer-facing default: the title before any series clause, alternate
 * title or romanised original in brackets. A person can override it.
 */
export function proposeShortTitle(title) {
  let short = text(title)
    .replace(/,? from the series .+$/i, '')
    .replace(/,? also known as .+$/i, '');
  short = short
    .replace(/\s*\([^)]*\)\s*$/, '')
    // The Met quotes series titles: “Umezawa Manor in Sagami Province,”
    .replace(/^[“"‘']+|[”"’',.;:\s]+$/g, '')
    .trim();
  return short || text(title);
}

export function normalizeMetObject(raw) {
  const objectId = String(raw?.objectID ?? '');
  return {
    accessionNumber: text(raw?.accessionNumber),
    apiUrl: metObjectUrl(objectId),
    artistDisplayName: text(raw?.artistDisplayName),
    artistPrefix: text(raw?.artistPrefix),
    artistUlanUrl: text(raw?.artistULAN_URL),
    artistWikidataUrl: text(raw?.artistWikidata_URL),
    /** Constituents whose role is "Artist" (publishers etc. are not). */
    artists: (raw?.constituents ?? [])
      .filter((constituent) => constituent?.role === 'Artist')
      .map((constituent) => text(constituent.name)),
    creditLine: text(raw?.creditLine),
    date: text(raw?.objectDate),
    department: text(raw?.department),
    dimensions: text(raw?.dimensions),
    imageUrl: text(raw?.primaryImage),
    imageUrlSmall: text(raw?.primaryImageSmall),
    medium: text(raw?.medium),
    museum: 'met',
    objectId,
    objectName: text(raw?.objectName),
    objectUrl:
      text(raw?.objectURL) ||
      `https://www.metmuseum.org/art/collection/search/${objectId}`,
    publicDomain: raw?.isPublicDomain === true,
    series: text(raw?.portfolio) || seriesFromTitle(raw?.title),
    title: text(raw?.title),
  };
}

const SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

/**
 * Pixel size from the start of a JPEG (its SOF segment), so search can show
 * which print sizes a candidate supports from a small range request instead
 * of downloading the original. Null when the bytes end before the SOF.
 */
export function jpegDimensions(bytes) {
  const data = Buffer.from(bytes);
  if (data[0] !== 0xff || data[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 4 <= data.length) {
    if (data[offset] !== 0xff) return null;
    const marker = data[offset + 1];
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    const length = data.readUInt16BE(offset + 2);
    if (SOF_MARKERS.has(marker)) {
      if (offset + 9 > data.length) return null;
      return {
        height: data.readUInt16BE(offset + 5),
        width: data.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  return null;
}

/**
 * Artist + short title, folded: equal keys flag possible other impressions
 * of the same design. Only a flag — impressions differ and are compared by
 * eye, never treated as interchangeable.
 */
export function impressionKey(candidate) {
  const fold = (value) =>
    value
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  return `${fold(candidate.artistDisplayName)}|${fold(proposeShortTitle(candidate.title))}`;
}

/**
 * Reasons a candidate cannot be attributed to one artist automatically.
 * Disputed or collaborative attributions stay outside automated release.
 */
export function attributionIssues(candidate) {
  const issues = [];
  if (candidate.artistPrefix)
    issues.push(`attribution qualifier "${candidate.artistPrefix}"`);
  if (candidate.artists.length > 1)
    issues.push(`${candidate.artists.length} artist constituents`);
  if (!candidate.artistDisplayName) issues.push('no artist name');
  return issues;
}

/**
 * The registry record for a fetched object. `previous` keeps the people's
 * decisions unless the evidence they were made on has changed.
 */
export function metArtworkRecord(
  candidate,
  {artistId, evidenceFile, fetchedAt, metadataSha256, original, previous, shortTitle},
) {
  const metadataChanged =
    previous && previous.source?.metadataSha256 !== metadataSha256;
  const imageChanged =
    previous?.original?.sha256 &&
    original?.sha256 &&
    previous.original.sha256 !== original.sha256;
  const reset = (review, reason) =>
    review && review.status !== 'pending'
      ? {note: `${reason} on ${fetchedAt.slice(0, 10)}; review again`, status: 'pending'}
      : (review ?? {status: 'pending'});
  return {
    id: artworkId('met', candidate.objectId),
    artistId,
    title: candidate.title,
    shortTitle: shortTitle || previous?.shortTitle || proposeShortTitle(candidate.title),
    date: candidate.date,
    medium: candidate.medium,
    ...(candidate.dimensions ? {dimensions: candidate.dimensions} : {}),
    ...(candidate.series ? {series: candidate.series} : {}),
    source: {
      museum: 'met',
      institution: MUSEUMS.met.institution,
      objectId: candidate.objectId,
      ...(candidate.accessionNumber
        ? {accessionNumber: candidate.accessionNumber}
        : {}),
      objectUrl: candidate.objectUrl,
      apiUrl: candidate.apiUrl,
      imageUrl: candidate.imageUrl,
      artistDisplayName: candidate.artistDisplayName,
      artistPrefix: candidate.artistPrefix,
      creditLine: candidate.creditLine,
      rights: {
        publicDomain: candidate.publicDomain,
        designation: MUSEUMS.met.rightsDesignation,
        evidenceUrl: MET_RIGHTS_EVIDENCE_URL,
      },
      evidenceFile,
      fetchedAt,
      metadataSha256,
    },
    ...(original ? {original} : {}),
    reviews: {
      rights: metadataChanged
        ? reset(previous.reviews?.rights, 'museum record changed')
        : (previous?.reviews?.rights ?? {status: 'pending'}),
      master:
        metadataChanged || imageChanged
          ? reset(previous.reviews?.master, 'museum image or record changed')
          : (previous?.reviews?.master ?? {status: 'pending'}),
    },
  };
}
