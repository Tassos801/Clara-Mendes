/**
 * The Metropolitan Museum of Art Collection API, as pure functions over its
 * JSON so scripts/museumArt.node-test.mjs covers them without the network.
 * https://metmuseum.github.io/ — v1.1 search (v1 search was retired on
 * 2026-10-01), object records with an object-level `isPublicDomain` flag and
 * full-resolution `primaryImage` JPEGs. Limit: 80 requests per second.
 * The shared candidate → record helpers are in museum-record.mjs.
 */

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
    .replace(/,? also known as .+$/i, '')
    // "… (Kanagawa oki nami ura), or The Great Wave": an alternate title.
    .replace(/(\)),? or .+$/i, '$1');
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
    proposedShortTitle: proposeShortTitle(raw?.title),
    publicDomain: raw?.isPublicDomain === true,
    rightsEvidenceUrl: MET_RIGHTS_EVIDENCE_URL,
    series: text(raw?.portfolio) || seriesFromTitle(raw?.title),
    title: text(raw?.title),
  };
}

/**
 * The Met behind `npm run museum` (scripts/lib/museum-sources.mjs): bare
 * object ids and `met-<id>`; search lists ids, then reads each record.
 */
export const MET_SOURCE = {
  key: 'met',
  label: 'The Met',
  idPattern: /^\d+$/,
  /** Well under The Met's 80 requests per second. */
  request: {headers: {}, minGapMs: 150},
  searchUrl: metSearchUrl,
  searchPage: (json) => ({
    ids: (json?.objectIDs ?? []).map(String),
    total: json?.total ?? 0,
  }),
  objectUrl: metObjectUrl,
  normalize: normalizeMetObject,
  proposeShortTitle,
  evidenceObjectId: (json) => String(json?.objectID ?? ''),
  /** Read from the image's first bytes (the record has no pixel size). */
  sizeFromRecord: () => null,
};
