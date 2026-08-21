/**
 * Offline place search over the bundled GeoNames list (cities ≥ 15k people,
 * CC BY 4.0). Matches on the primary name rank above matches on native
 * alternate names ("Lisboa", "Wien", "Αθήνα"); ties break on population.
 */
import placesJson from '../../data/sky/places.json' with {type: 'json'};

export type PlaceResult = {
  name: string;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
  tz: string;
  label: string;
};

type Row = [
  string,
  string,
  string,
  number,
  number,
  number,
  number,
  string[],
];
const {tz: ZONES, data: ROWS} = placesJson as unknown as {
  tz: string[];
  data: Row[];
};
const regionNames = new Intl.DisplayNames(['en'], {type: 'region'});

export function normalizePlaceQuery(q: string) {
  return q
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

type IndexEntry = {primary: string[]; alternates: string[]};

// Built once per isolate.
let index: IndexEntry[] | null = null;
function getIndex() {
  index ??= ROWS.map((r) => {
    const primary = [...new Set([r[0], r[1]].map(normalizePlaceQuery))];
    const alternates = [
      ...new Set((r[7] ?? []).map(normalizePlaceQuery)),
    ].filter((n) => !primary.includes(n));
    return {primary, alternates};
  });
  return index;
}

/**
 * Lower is better: 0 exact primary name, 1 exact alternate, 2 primary
 * prefix, 3 alternate prefix, 4 later word of the primary name, 5 later word
 * of an alternate, -1 no match. Exact native names win ("roma" → Rome, not
 * Roman; "wien" → Vienna, not Wiener Neustadt); ties break on population.
 */
function matchScore(entry: IndexEntry, q: string) {
  let best = -1;
  const take = (score: number) => {
    best = best < 0 ? score : Math.min(best, score);
  };
  const consider = (names: string[], exact: number, prefix: number, word: number) => {
    for (const n of names) {
      if (n === q) take(exact);
      else if (n.startsWith(q)) take(prefix);
      else if (n.includes(` ${q}`)) take(word);
    }
  };
  consider(entry.primary, 0, 2, 4);
  if (best === 0) return 0;
  consider(entry.alternates, 1, 3, 5);
  return best;
}

function countryName(code: string) {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

export function searchPlaces(query: string, limit = 8): PlaceResult[] {
  const q = normalizePlaceQuery(query);
  if (q.length < 2 || q.length > 60) return [];
  const idx = getIndex();
  const hits: Array<{score: number; i: number}> = [];
  for (let i = 0; i < ROWS.length; i++) {
    const score = matchScore(idx[i], q);
    if (score >= 0) hits.push({score, i});
  }
  // Rows are pre-sorted by population, so ordering by (score, row index)
  // keeps the biggest city first within each tier.
  hits.sort((a, b) => a.score - b.score || a.i - b.i);
  return hits.slice(0, limit).map(({i}) => {
    const r = ROWS[i];
    const country = countryName(r[2]);
    return {
      name: r[0],
      country,
      countryCode: r[2],
      lat: r[3],
      lon: r[4],
      tz: ZONES[r[5]],
      label: `${r[0]}, ${country}`,
    };
  });
}
