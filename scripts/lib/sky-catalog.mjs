// Synchronous catalogue loader for Node tests and scripts. The app itself
// uses the lazy `loadSkyCatalog()` in app/lib/sky/catalog.ts.
import {readFileSync} from 'node:fs';

const read = (file) =>
  JSON.parse(
    readFileSync(new URL(`../../app/data/sky/${file}`, import.meta.url), 'utf8'),
  ).data;

export function loadSkyCatalogSync() {
  return {stars: read('stars.json'), lines: read('constellations.json')};
}
