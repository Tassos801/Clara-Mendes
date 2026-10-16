/**
 * The Art Institute of Chicago public API, as pure functions over its JSON
 * so scripts/museumArt.node-test.mjs covers them without the network.
 * https://api.artic.edu/docs/ — artwork records with an object-level
 * `is_public_domain` flag; images from AIC's IIIF server, whose CC0 release
 * is stated at AIC_RIGHTS_EVIDENCE_URL.
 *
 * The image server caps the long side at 3000 px and refuses `full`/`max`,
 * so the original is the served file and `thumbnail.width/height` (the
 * museum's full resolution) is kept beside it, never mistaken for it. A
 * request never asks for more than the full resolution, so nothing is
 * upscaled; tiles are never stitched to get round the cap. Every request
 * carries `AIC-User-Agent` (Cloudflare answers 403 without it) and stays
 * within AIC's 60 requests per minute.
 */

export const AIC_API = 'https://api.artic.edu/api/v1';
export const AIC_IIIF = 'https://www.artic.edu/iiif/2';
export const AIC_RIGHTS_EVIDENCE_URL =
  'https://www.artic.edu/open-access/open-access-images';
export const AIC_USER_AGENT = 'Clara Mendes (https://shopclaramendes.com)';
/** Longest side the IIIF server returns. */
export const AIC_MAX_SIDE = 3000;
/**
 * The record fields read and committed as evidence. A fixed list keeps the
 * evidence (and its checksum) free of AIC's indexing timestamps.
 */
export const AIC_FIELDS = [
  'id',
  'title',
  'artist_title',
  'artist_titles',
  'artist_display',
  'date_display',
  'medium_display',
  'dimensions',
  'main_reference_number',
  'is_public_domain',
  'image_id',
  'credit_line',
  'thumbnail',
];

const text = (value) => (typeof value === 'string' ? value.trim() : '');

/**
 * Public-domain works with an image. `match`: "artist" matches the artist
 * title (the default), "title" the title, "anywhere" every text field; all
 * words must match.
 */
export function aicSearchUrl({limit = 100, match = 'artist', offset = 0, q}) {
  const params = new URLSearchParams();
  const must = 'query[bool][must][0]';
  if (match === 'anywhere') {
    params.set(`${must}[multi_match][query]`, q);
    params.set(`${must}[multi_match][operator]`, 'and');
  } else {
    const field = match === 'title' ? 'title' : 'artist_title';
    params.set(`${must}[match][${field}][query]`, q);
    params.set(`${must}[match][${field}][operator]`, 'and');
  }
  params.set('query[bool][filter][0][term][is_public_domain]', 'true');
  params.set('query[bool][filter][1][exists][field]', 'image_id');
  params.set('fields', AIC_FIELDS.join(','));
  params.set('limit', String(Math.min(limit, 100)));
  params.set('from', String(offset));
  return `${AIC_API}/artworks/search?${params}`;
}

export function aicObjectUrl(objectId) {
  return `${AIC_API}/artworks/${objectId}?fields=${AIC_FIELDS.join(',')}`;
}

/**
 * The largest image AIC serves for a work: `<width>,` capped at
 * AIC_MAX_SIDE and at the full-resolution width, so the server never
 * upscales. A portrait work comes back capped on its height.
 */
export function aicImageUrl(imageId, fullResolution) {
  const width = Math.min(AIC_MAX_SIDE, fullResolution.width);
  return `${AIC_IIIF}/${imageId}/full/${width},/0/default.jpg`;
}

/** AIC's requested credit: "Artist. Title, Date. The Art Institute of Chicago". */
export function aicCreditLine({artist, date, title}) {
  const work = [title, date].filter(Boolean).join(', ');
  return [artist, work, 'The Art Institute of Chicago']
    .filter(Boolean)
    .join('. ');
}

/**
 * A qualifier before the artist on the first line of `artist_display`
 * ("Circle of Vasily Kandinsky"); a first line without the artist title
 * is kept whole so the attribution screen stops it.
 */
function attributionQualifier(artistTitle, display) {
  const first = text(display).split('\n')[0].trim();
  if (!artistTitle || !first) return '';
  const at = first.indexOf(artistTitle);
  if (at < 0) return first;
  return first
    .slice(0, at)
    .replace(/[\s,:;-]+$/, '')
    .trim();
}

function pixels(width, height) {
  return Number.isInteger(width) &&
    Number.isInteger(height) &&
    width > 0 &&
    height > 0
    ? {height, width}
    : null;
}

/** An artwork record (the API envelope or a search hit) as a candidate. */
export function normalizeAicArtwork(raw) {
  const record = raw?.data ?? raw;
  const objectId = String(record?.id ?? '');
  const title = text(record?.title);
  const date = text(record?.date_display);
  const artistTitle = text(record?.artist_title);
  const artists = Array.isArray(record?.artist_titles)
    ? record.artist_titles.map(text).filter(Boolean)
    : artistTitle
      ? [artistTitle]
      : [];
  const fullResolution = pixels(
    record?.thumbnail?.width,
    record?.thumbnail?.height,
  );
  const imageId = text(record?.image_id);
  return {
    accessionNumber: text(record?.main_reference_number),
    apiUrl: `${AIC_API}/artworks/${objectId}`,
    artistDisplayName: artistTitle,
    artistPrefix: attributionQualifier(artistTitle, record?.artist_display),
    artists,
    creditLine: aicCreditLine({artist: artistTitle, date, title}),
    /** AIC's own credit line (the donor), kept for reference. */
    museumCreditLine: text(record?.credit_line),
    date,
    dimensions: text(record?.dimensions),
    ...(fullResolution ? {fullResolution} : {}),
    imageId,
    // Without the full resolution the request could be upscaled: no URL.
    imageUrl:
      imageId && fullResolution ? aicImageUrl(imageId, fullResolution) : '',
    medium: text(record?.medium_display),
    museum: 'aic',
    objectId,
    objectUrl: `https://www.artic.edu/artworks/${objectId}`,
    proposedShortTitle: title,
    publicDomain: record?.is_public_domain === true,
    rightsEvidenceUrl: AIC_RIGHTS_EVIDENCE_URL,
    series: '',
    title,
  };
}

/** The Art Institute of Chicago behind `npm run museum` (`aic-<id>`). */
export const AIC_SOURCE = {
  key: 'aic',
  label: 'The Art Institute of Chicago',
  idPattern: /^\d+$/,
  /** One request a second keeps within 60 per minute, images included. */
  request: {headers: {'AIC-User-Agent': AIC_USER_AGENT}, minGapMs: 1000},
  searchUrl: aicSearchUrl,
  searchPage: (json) => ({
    records: json?.data ?? [],
    total: json?.pagination?.total ?? 0,
  }),
  objectUrl: aicObjectUrl,
  normalize: normalizeAicArtwork,
  proposeShortTitle: text,
  evidenceObjectId: (json) => String(json?.data?.id ?? ''),
  /** The served size is read from the image's first bytes. */
  sizeFromRecord: () => null,
};
