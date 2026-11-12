/**
 * Yale University Art Gallery's IIIF manifests, as pure functions over their
 * JSON so the tests cover them without the network. Each object's manifest
 * (manifests.collections.yale.edu/yuag/obj/<id>) carries the catalogue
 * fields as metadata, a "Copyright Statement" of "Public domain" for
 * open-access works, and the image with its pixel size. The gallery's rights
 * page: "No permission to use images of public-domain works is required."
 *
 * Works are identified by the gallery's object id (`yale-12507`), the number
 * in its own URLs; the accession number is kept beside it.
 */

export const YALE_MANIFESTS = 'https://manifests.collections.yale.edu/yuag/obj';
export const YALE_RIGHTS_EVIDENCE_URL =
  'https://artgallery.yale.edu/using-collection/using-images/rights-and-reproductions';

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const first = (languageMap) =>
  text(Object.values(languageMap ?? {})[0]?.[0] ?? '');

function metadata(manifest) {
  const fields = new Map();
  for (const entry of manifest?.metadata ?? [])
    fields.set(first(entry?.label), first(entry?.value));
  return fields;
}

/** "Artist: Vincent van Gogh (Dutch, active France, 1853–1890)" → the name and any qualifier. */
export function yaleCreator(value) {
  const match = text(value).match(/^([^:]+):\s*(.+)$/);
  const role = match ? match[1].trim() : '';
  const name = (match ? match[2] : text(value))
    .replace(/\s*\([^()]*\)\s*$/, '')
    .trim();
  return {name, prefix: role && role !== 'Artist' ? role : ''};
}

/** A YUAG manifest as a candidate. */
export function normalizeYaleArtwork(manifest) {
  const fields = metadata(manifest);
  const objectId = text(manifest?.id).split('/').pop() ?? '';
  const creators = (fields.get('Creator(s)') ?? '')
    .split(/\s*\|\s*/)
    .filter(Boolean)
    .map(yaleCreator);
  const body = manifest?.items?.[0]?.items?.[0]?.items?.[0]?.body;
  const service = text(body?.service?.[0]?.['@id'] ?? body?.service?.[0]?.id);
  const width = Number(body?.width);
  const height = Number(body?.height);
  const title = fields.get('Title') ?? '';
  return {
    accessionNumber: fields.get('Object Number') ?? '',
    apiUrl: text(manifest?.id),
    artistDisplayName: creators[0]?.name ?? '',
    artistPrefix: creators[0]?.prefix ?? '',
    artists: creators.map((creator) => creator.name),
    copyright: '',
    creditLine: fields.get('Creditline') ?? '',
    date: fields.get('Date') ?? '',
    dimensions: fields.get('Dimensions') ?? '',
    imageUrl: service ? `${service}/full/full/0/default.jpg` : '',
    medium: fields.get('Medium') ?? '',
    museum: 'yale',
    objectId,
    objectUrl: `https://artgallery.yale.edu/collections/objects/${objectId}`,
    pixels:
      Number.isInteger(width) && Number.isInteger(height) && width > 0
        ? {height, width}
        : null,
    proposedShortTitle: title,
    publicDomain: fields.get('Copyright Statement') === 'Public domain',
    rightsEvidenceUrl: YALE_RIGHTS_EVIDENCE_URL,
    series: '',
    title,
  };
}

/** Yale University Art Gallery behind `npm run museum` (`yale-<object id>`). */
export const YALE_SOURCE = {
  key: 'yale',
  label: 'Yale University Art Gallery',
  idPattern: /^\d+$/,
  request: {headers: {}, minGapMs: 500},
  searchUrl: () => {
    throw new Error(
      'search is not available for Yale; fetch yale-<object id> (the number in artgallery.yale.edu/collections/objects/<id>)',
    );
  },
  searchPage: () => ({records: [], total: 0}),
  objectUrl: (objectId) => `${YALE_MANIFESTS}/${objectId}`,
  normalize: normalizeYaleArtwork,
  proposeShortTitle: text,
  evidenceObjectId: (json) => normalizeYaleArtwork(json).objectId,
  sizeFromRecord: (candidate) => candidate.pixels,
};
