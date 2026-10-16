/**
 * The museum adapters behind `npm run museum -- search|fetch`, by registry
 * key (app/lib/artRegistry.ts MUSEUMS). Each adapter (museum-<key>.mjs)
 * builds its URLs, its request policy and a normalised candidate from the
 * museum's JSON; scripts/museum.mjs does the requests.
 */

import {AIC_SOURCE} from './museum-aic.mjs';
import {CMA_SOURCE} from './museum-cma.mjs';
import {MET_SOURCE} from './museum-met.mjs';

export const MUSEUM_SOURCES = {
  met: MET_SOURCE,
  aic: AIC_SOURCE,
  cma: CMA_SOURCE,
};

export function museumSourceFor(key = 'met') {
  const source = MUSEUM_SOURCES[key];
  if (!source)
    throw new Error(
      `Unknown museum "${key}". Museums: ${Object.keys(MUSEUM_SOURCES).join(', ')}`,
    );
  return source;
}

/**
 * An artwork reference from the command line: `aic-8991`,
 * `cma-1967.215`, `met-45434`, or a bare Met object id as before.
 */
export function parseArtworkRef(ref) {
  const value = String(ref ?? '').trim();
  const prefixed = value.match(/^([a-z]+)-(.+)$/);
  const [museum, objectId] =
    prefixed && MUSEUM_SOURCES[prefixed[1]]
      ? [prefixed[1], prefixed[2]]
      : ['met', value];
  const source = MUSEUM_SOURCES[museum];
  if (!source.idPattern.test(objectId))
    throw new Error(
      `"${value}" is not an artwork id: use met-<object id>, aic-<artwork id> or cma-<accession number>`,
    );
  return {museum, objectId, source};
}

/** The object id a committed evidence file is the record of. */
export function evidenceObjectId(museum, json) {
  return museumSourceFor(museum).evidenceObjectId(json);
}
