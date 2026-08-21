/**
 * Offline place search over the bundled GeoNames list (cities ≥ 15k people,
 * CC BY 4.0). Rows are pre-sorted by population, so a linear scan yields the
 * best-known matches first.
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

type Row = [string, string, string, number, number, number, number];
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

// Built once per isolate: normalised name + ascii name per row.
let index: Array<[string, string]> | null = null;
function getIndex() {
  index ??= ROWS.map((r) => [normalizePlaceQuery(r[0]), normalizePlaceQuery(r[1])]);
  return index;
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
  const out: PlaceResult[] = [];
  for (let i = 0; i < ROWS.length && out.length < limit; i++) {
    const [n, a] = idx[i];
    if (n.startsWith(q) || a.startsWith(q) || n.includes(` ${q}`) || a.includes(` ${q}`)) {
      const r = ROWS[i];
      const country = countryName(r[2]);
      out.push({
        name: r[0],
        country,
        countryCode: r[2],
        lat: r[3],
        lon: r[4],
        tz: ZONES[r[5]],
        label: `${r[0]}, ${country}`,
      });
    }
  }
  return out;
}
