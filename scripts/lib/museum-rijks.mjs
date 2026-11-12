/**
 * The Rijksmuseum's Linked Art records (data.rijksmuseum.nl), as pure
 * functions over their JSON so the tests cover them without the network.
 * The image's DigitalObject names its rights: the Public Domain Mark or CC0
 * (Information and Data Policy, s. 3.7.1). Images come from the museum's
 * IIIF server (iiif.micr.io), which serves `full/max` up to an area limit
 * stated only in the image's info.json; when a work is larger, what is
 * served is the largest single file available.
 *
 * Works are identified by object number (`rijks-SK-A-2344`). The record
 * lives at an id.rijksmuseum.nl URL found through the collection search.
 */

export const RIJKS_SEARCH = 'https://data.rijksmuseum.nl/search/collection';
export const RIJKS_RIGHTS_EVIDENCE_URL =
  'https://data.rijksmuseum.nl/policy/information-and-data-policy';
const PUBLIC_DOMAIN = new Set([
  'https://creativecommons.org/publicdomain/mark/1.0/',
  'https://creativecommons.org/publicdomain/zero/1.0/',
]);
const ENGLISH = 'http://vocab.getty.edu/aat/300388277';
const AAT = (id) => `http://vocab.getty.edu/aat/${id}`;
const PREFERRED = AAT('300404670');
const CREDIT = AAT('300026687');
const MEDIUM = AAT('300435429');
const DIMENSIONS = AAT('300435430');

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const has = (entry, id) =>
  (entry?.classified_as ?? []).some((type) => type?.id === id);
const english = (entry) =>
  (entry?.language ?? []).some((language) => language?.id === ENGLISH);

function statement(record, type) {
  const entries = (record?.referred_to_by ?? []).filter((entry) =>
    has(entry, type),
  );
  return text((entries.find(english) ?? entries[0])?.content);
}

export function rijksSearchUrl(objectNumber) {
  return `${RIJKS_SEARCH}?objectNumber=${encodeURIComponent(objectNumber)}`;
}

/** The record URL from a search page; null unless exactly one. */
export function rijksRecordFromSearch(json) {
  const items = json?.orderedItems ?? [];
  return items.length === 1 ? text(items[0]?.id) || null : null;
}

/** The image DigitalObject: its IIIF base and its rights URL. */
function digitalImage(record) {
  for (const subject of record?.subject_of ?? [])
    for (const carrier of subject?.digitally_carried_by ?? []) {
      const access = text(carrier?.access_point?.[0]?.id);
      if (!access.startsWith('https://iiif.micr.io/')) continue;
      return {
        base: access.replace(/\/full\/.*$/, ''),
        rights: text(carrier?.referred_to_by?.[0]?.content),
      };
    }
  return {base: '', rights: ''};
}

/** A Rijksmuseum Linked Art object record as a candidate. */
export function normalizeRijksArtwork(record) {
  const identifiers = record?.identified_by ?? [];
  const objectNumber = text(
    identifiers.find((entry) => entry?.type === 'Identifier')?.content,
  );
  const names = identifiers.filter((entry) => entry?.type === 'Name');
  const title = text(
    (
      names.find((entry) => english(entry) && has(entry, PREFERRED)) ??
      names.find(english) ??
      names[0]
    )?.content,
  );
  const parts = record?.produced_by?.part ?? [record?.produced_by];
  const artists = parts
    .flatMap((part) => part?.carried_out_by ?? [])
    .map((person) => {
      const notation = person?.notation ?? [];
      return text(
        (notation.find((entry) => entry?.['@language'] === 'en') ??
          notation[0])?.['@value'],
      );
    })
    .filter(Boolean);
  const image = digitalImage(record);
  return {
    accessionNumber: objectNumber,
    apiUrl: text(record?.id),
    artistDisplayName: artists[0] ?? '',
    artistPrefix: '',
    artists,
    copyright: '',
    creditLine: statement(record, CREDIT),
    date: text(record?.produced_by?.timespan?.identified_by?.[0]?.content),
    dimensions: statement(record, DIMENSIONS),
    imageUrl: image.base ? `${image.base}/full/max/0/default.jpg` : '',
    medium: (() => {
      const value = statement(record, MEDIUM);
      return value ? value[0].toUpperCase() + value.slice(1) : value;
    })(),
    museum: 'rijks',
    objectId: objectNumber,
    objectUrl: `https://www.rijksmuseum.nl/en/collection/${objectNumber}`,
    proposedShortTitle: title,
    publicDomain: PUBLIC_DOMAIN.has(image.rights),
    rightsEvidenceUrl: RIJKS_RIGHTS_EVIDENCE_URL,
    series: '',
    title,
  };
}

/** The Rijksmuseum behind `npm run museum` (`rijks-<object number>`). */
export const RIJKS_SOURCE = {
  key: 'rijks',
  label: 'Rijksmuseum',
  idPattern: /^[A-Z]{1,3}(?:-[A-Z0-9]+)+$/,
  request: {headers: {Accept: 'application/ld+json'}, minGapMs: 500},
  searchUrl: () => {
    throw new Error(
      'search is not available for the Rijksmuseum; fetch rijks-<object number> (e.g. rijks-SK-A-2344)',
    );
  },
  searchPage: () => ({records: [], total: 0}),
  objectUrl: rijksSearchUrl,
  /** Object number → record URL, through the collection search. */
  async resolveObjectUrl(objectNumber, getJson) {
    const {json} = await getJson(rijksSearchUrl(objectNumber));
    const url = rijksRecordFromSearch(json);
    if (!url)
      throw new Error(`the Rijksmuseum has no single object ${objectNumber}`);
    return url;
  },
  normalize: normalizeRijksArtwork,
  proposeShortTitle: text,
  evidenceObjectId: (json) => normalizeRijksArtwork(json).objectId,
  sizeFromRecord: () => null,
};
