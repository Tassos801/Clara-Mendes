/**
 * The Cleveland Museum of Art Open Access API, as pure functions over its
 * JSON so scripts/museumArt.node-test.mjs covers them without the network.
 * https://openaccess-api.clevelandart.org/ — artwork records with a
 * `share_license_status` of "CC0" for open-access works and the
 * full-resolution TIFF under `images.full` (Mondrian 1967.215 is
 * 9856×9998). CC0 needs no attribution; the credit follows the Met's form.
 *
 * Works are identified by accession number (`cma-1967.215`), the number in
 * the museum's own URLs and image paths.
 */

export const CMA_API = 'https://openaccess-api.clevelandart.org/api';
export const CMA_RIGHTS_EVIDENCE_URL =
  'https://www.clevelandart.org/open-access';
/**
 * The record fields read and committed as evidence. A fixed list keeps the
 * evidence (and its checksum) free of gallery locations and update stamps.
 */
export const CMA_FIELDS = [
  'id',
  'accession_number',
  'title',
  'creation_date',
  'creators',
  'technique',
  'measurements',
  'creditline',
  'share_license_status',
  'copyright',
  'url',
  'images',
];

const text = (value) =>
  typeof value === 'string'
    ? value.trim()
    : typeof value === 'number'
      ? String(value)
      : '';

/**
 * CC0 works with an image. `match`: "artist" searches artist names (the
 * default), "title" titles, "anywhere" every field.
 */
export function cmaSearchUrl({limit = 100, match = 'artist', offset = 0, q}) {
  const params = new URLSearchParams();
  if (match === 'title') params.set('title', q);
  else if (match === 'anywhere') params.set('q', q);
  else params.set('artists', q);
  params.set('cc0', '1');
  params.set('has_image', '1');
  params.set('fields', CMA_FIELDS.join(','));
  params.set('limit', String(Math.min(limit, 100)));
  params.set('skip', String(offset));
  return `${CMA_API}/artworks/?${params}`;
}

export function cmaObjectUrl(accessionNumber) {
  return `${CMA_API}/artworks/${encodeURIComponent(accessionNumber)}?fields=${CMA_FIELDS.join(',')}`;
}

/** "Piet Mondrian (Dutch, 1872–1944)" → "Piet Mondrian". */
export function creatorName(description) {
  return text(description)
    .replace(/\s*\([^()]*\)\s*$/, '')
    .trim();
}

/** Cleveland writes media in lower case ("oil on canvas"); copy starts a sentence with it. */
function sentenceCase(value) {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

function pixels(image) {
  const width = Number(image?.width);
  const height = Number(image?.height);
  return Number.isInteger(width) &&
    Number.isInteger(height) &&
    width > 0 &&
    height > 0
    ? {height, width}
    : null;
}

/** An artwork record (the API envelope or a search hit) as a candidate. */
export function normalizeCmaArtwork(raw) {
  const record = raw?.data ?? raw;
  const objectId = text(record?.accession_number);
  const artists = (record?.creators ?? []).filter(
    (creator) => text(creator?.role).toLowerCase() === 'artist',
  );
  const [first] = artists;
  const full = record?.images?.full;
  const title = text(record?.title);
  return {
    accessionNumber: objectId,
    apiUrl: `${CMA_API}/artworks/${objectId}`,
    artistDisplayName: creatorName(first?.description),
    artistPrefix: text(first?.qualifier),
    artists: artists.map((creator) => creatorName(creator?.description)),
    /** Copyright text on a CC0 record; shown, never silently dropped. */
    copyright: text(record?.copyright),
    creditLine: text(record?.creditline),
    date: text(record?.creation_date),
    dimensions: text(record?.measurements),
    imageUrl: text(full?.url),
    medium: sentenceCase(text(record?.technique)),
    museum: 'cma',
    objectId,
    objectUrl: text(record?.url) || `https://clevelandart.org/art/${objectId}`,
    /** Cleveland serves the full resolution, so the record states the file's size. */
    pixels: pixels(full),
    proposedShortTitle: title,
    publicDomain: text(record?.share_license_status) === 'CC0',
    rightsEvidenceUrl: CMA_RIGHTS_EVIDENCE_URL,
    series: '',
    title,
  };
}

/** The Cleveland Museum of Art behind `npm run museum` (`cma-<accession>`). */
export const CMA_SOURCE = {
  key: 'cma',
  label: 'The Cleveland Museum of Art',
  idPattern: /^[A-Za-z0-9]+(?:[.-][A-Za-z0-9]+)*$/,
  /** No published limit; four requests a second is polite. */
  request: {headers: {}, minGapMs: 250},
  searchUrl: cmaSearchUrl,
  searchPage: (json) => ({
    records: json?.data ?? [],
    total: json?.info?.total ?? 0,
  }),
  objectUrl: cmaObjectUrl,
  normalize: normalizeCmaArtwork,
  proposeShortTitle: text,
  evidenceObjectId: (json) => text(json?.data?.accession_number),
  sizeFromRecord: (candidate) => candidate.pixels,
};
