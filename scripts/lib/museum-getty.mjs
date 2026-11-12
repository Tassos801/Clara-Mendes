/**
 * The J. Paul Getty Museum's Linked Art records, as pure functions over their
 * JSON so the tests cover them without the network.
 * https://data.getty.edu/museum/collection/ — one JSON-LD record per object.
 * Open Content objects carry a CC0 "Public Domain" right under `subject_to`;
 * the image is the Getty IIIF service named in `representation`, served at
 * full size (`full/max`). The object page states that these images "are
 * available under CC0 through Getty's Open Content Program".
 *
 * Works are identified by accession number (`getty-90.PA.20`). The record
 * lives at a UUID, so `resolveObjectUrl` asks the Getty's SPARQL endpoint
 * for it first.
 */

export const GETTY_API = 'https://data.getty.edu/museum/collection';
export const GETTY_RIGHTS_EVIDENCE_URL =
  'https://www.getty.edu/projects/open-content-program/';
const CC0 = 'http://creativecommons.org/publicdomain/zero/1.0/';

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const labels = (entry) =>
  (entry?.classified_as ?? []).map((type) => text(type?._label));

/** The SPARQL query whose single binding is the record of an accession number. */
export function gettySparqlUrl(accessionNumber) {
  const literal = JSON.stringify(String(accessionNumber));
  const query = `PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/> SELECT ?o WHERE { ?o crm:P1_is_identified_by ?i . ?i crm:P190_has_symbolic_content ${literal} . ?o crm:P2_has_type <http://vocab.getty.edu/aat/300033618> } LIMIT 2`;
  return `${GETTY_API}/sparql?query=${encodeURIComponent(query)}&format=json`;
}

/** The record URL from a SPARQL JSON result; null unless exactly one. */
export function gettyRecordFromSparql(json) {
  const bindings = json?.results?.bindings ?? [];
  const urls = [
    ...new Set(bindings.map((binding) => text(binding?.o?.value))),
  ].filter((url) => url.startsWith(`${GETTY_API}/object/`));
  return urls.length === 1 ? urls[0] : null;
}

function brief(record, label) {
  return text(
    (record?.referred_to_by ?? []).find((entry) =>
      labels(entry).includes(label),
    )?.content,
  );
}

function productionParts(record) {
  const production = record?.produced_by;
  return production?.part?.length ? production.part : [production];
}

/** A Getty Linked Art object record as a candidate. */
export function normalizeGettyArtwork(record) {
  const identifiers = record?.identified_by ?? [];
  const accession = text(
    identifiers.find((entry) => labels(entry).includes('Accession Number'))
      ?.content,
  );
  const title =
    text(
      identifiers.find(
        (entry) =>
          entry?.type === 'Name' && labels(entry).includes('Primary Title'),
      )?.content,
    ) ||
    text(identifiers.find((entry) => entry?.type === 'Name')?.content);
  const slug = text(
    identifiers
      .map((entry) => text(entry?.content))
      .find((content) => content.startsWith('urn:getty-local:idm:object:slug/')),
  ).replace('urn:getty-local:idm:object:slug/', '');
  const artists = productionParts(record)
    .flatMap((part) => part?.carried_out_by ?? [])
    .map((person) => text(person?._label))
    .filter(Boolean);
  const timespan =
    record?.produced_by?.timespan ?? productionParts(record)[0]?.timespan;
  const image = text(
    (record?.representation ?? []).find((entry) =>
      text(entry?.id).startsWith('https://media.getty.edu/iiif/image/'),
    )?.id,
  ).replace(/\/full\/full\/0\/default\.jpg$/, '/full/max/0/default.jpg');
  const publicDomain = (record?.subject_to ?? []).some((right) =>
    (right?.classified_as ?? []).some((type) => type?.id === CC0),
  );
  return {
    accessionNumber: accession,
    apiUrl: text(record?.id),
    artistDisplayName: artists[0] ?? '',
    artistPrefix: '',
    artists,
    copyright: '',
    creditLine: brief(record, 'Credit Line'),
    date: text(timespan?.identified_by?.[0]?.content),
    dimensions: brief(record, 'Dimensions Description'),
    imageUrl: image,
    medium: brief(record, 'Materials Description'),
    museum: 'getty',
    objectId: accession,
    objectUrl: slug
      ? `https://www.getty.edu/art/collection/object/${slug}`
      : text(record?.id),
    proposedShortTitle: title,
    publicDomain,
    rightsEvidenceUrl: GETTY_RIGHTS_EVIDENCE_URL,
    series: '',
    title,
  };
}

/** The J. Paul Getty Museum behind `npm run museum` (`getty-<accession>`). */
export const GETTY_SOURCE = {
  key: 'getty',
  label: 'The J. Paul Getty Museum',
  idPattern: /^[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*$/,
  request: {headers: {}, minGapMs: 500},
  searchUrl: () => {
    throw new Error(
      'search is not available for the Getty; find the accession number on getty.edu and fetch getty-<accession>',
    );
  },
  searchPage: () => ({records: [], total: 0}),
  objectUrl: (accessionNumber) => gettySparqlUrl(accessionNumber),
  /** Accession number → record URL, by SPARQL. */
  async resolveObjectUrl(accessionNumber, getJson) {
    const {json} = await getJson(gettySparqlUrl(accessionNumber));
    const url = gettyRecordFromSparql(json);
    if (!url)
      throw new Error(`the Getty has no single object ${accessionNumber}`);
    return url;
  },
  normalize: normalizeGettyArtwork,
  proposeShortTitle: text,
  evidenceObjectId: (json) => normalizeGettyArtwork(json).objectId,
  sizeFromRecord: () => null,
};
