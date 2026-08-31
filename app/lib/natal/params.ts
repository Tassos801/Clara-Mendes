/**
 * The personalisation a customer enters for a First Light birth poster.
 * Same contract as the sky's params: the fields travel as cart line
 * attributes, get signed server-side, and fully determine the rendered
 * artwork. A `_kind: natal` attribute distinguishes these lines from sky
 * lines (which carry `_v` alone), so each product's codec stays closed.
 */
import {
  isValidTimeZone,
  sanitizeText,
  unprintableCharacters,
  type CartAttribute,
  SKY_MIN_YEAR,
  SKY_MAX_YEAR,
  SKY_PLACE_MAX,
  SKY_THEME_IDS,
  type SkyThemeId,
} from '../sky/params.ts';

export type NatalParams = {
  v: 1;
  /** The child's name as it should print. */
  name: string;
  /** YYYY-MM-DD, local calendar date at the place. */
  date: string;
  /** HH:MM local wall-clock time, or '' when the customer left it blank. */
  time: string;
  /** Degrees, 4 dp. */
  lat: number;
  /** Degrees, 4 dp. */
  lon: number;
  /** IANA zone id. */
  tz: string;
  /** Display label, e.g. "Berlin, Germany". */
  place: string;
  /** Optional free-text line: weight, length, a welcome. '' when unused. */
  details: string;
  theme: SkyThemeId;
};

export type NatalParamsInput = Partial<
  Record<keyof Omit<NatalParams, 'v'>, unknown>
>;

export type NatalValidation =
  | {ok: true; params: NatalParams}
  | {ok: false; error: string};

export const NATAL_NAME_MAX = 40;
export const NATAL_DETAILS_MAX = 60;
/** The chart time used for astronomy when the customer gives no time. */
export const NATAL_DEFAULT_ASTRO_TIME = '12:00';
export const NATAL_KIND = 'natal';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const round4 = (n: number) => Math.round(n * 1e4) / 1e4;

export function validateNatalParams(input: NatalParamsInput): NatalValidation {
  const name = sanitizeText(input.name);
  if (!name) return {ok: false, error: 'Add the name to print.'};
  if (name.length > NATAL_NAME_MAX) {
    return {ok: false, error: `Keep the name to ${NATAL_NAME_MAX} characters.`};
  }
  const nameUnprintable = unprintableCharacters(name);
  if (nameUnprintable.length > 0) {
    return {
      ok: false,
      error: `“${nameUnprintable[0]}” can’t be printed — please use letters, numbers and punctuation.`,
    };
  }

  const date = String(input.date ?? '');
  const match = date.match(DATE_RE);
  if (!match) return {ok: false, error: 'Choose the birth date.'};
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    year < SKY_MIN_YEAR ||
    year > SKY_MAX_YEAR ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return {
      ok: false,
      error: `Choose a date between ${SKY_MIN_YEAR} and ${SKY_MAX_YEAR}.`,
    };
  }

  const time =
    input.time == null || input.time === '' ? '' : String(input.time);
  if (time !== '' && !TIME_RE.test(time)) {
    return {ok: false, error: 'Enter a time such as 07:32, or leave it blank.'};
  }

  const lat = Number(input.lat);
  const lon = Number(input.lon);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  ) {
    return {ok: false, error: 'Choose a place from the list.'};
  }

  const tz = String(input.tz ?? '');
  if (!tz || tz.length > 64 || !isValidTimeZone(tz)) {
    return {ok: false, error: 'Choose a place from the list.'};
  }

  const place = sanitizeText(input.place);
  if (
    !place ||
    place.length > SKY_PLACE_MAX ||
    unprintableCharacters(place).length > 0
  ) {
    return {ok: false, error: 'Choose a place from the list.'};
  }

  const details = sanitizeText(input.details);
  if (details.length > NATAL_DETAILS_MAX) {
    return {
      ok: false,
      error: `Keep the details line to ${NATAL_DETAILS_MAX} characters.`,
    };
  }
  const detailsUnprintable = unprintableCharacters(details);
  if (detailsUnprintable.length > 0) {
    return {
      ok: false,
      error: `“${detailsUnprintable[0]}” can’t be printed — please use letters, numbers and punctuation.`,
    };
  }

  const theme = String(input.theme ?? 'linen') as SkyThemeId;
  if (!SKY_THEME_IDS.includes(theme)) {
    return {ok: false, error: 'Unknown style.'};
  }

  return {
    ok: true,
    params: {
      v: 1,
      name,
      date,
      time,
      lat: round4(lat),
      lon: round4(lon),
      tz,
      place,
      details,
      theme,
    },
  };
}

/** Fixed key order; this exact string is what gets signed. */
export function canonicalNatalParams(p: NatalParams) {
  return [
    `v=${p.v}`,
    `name=${encodeURIComponent(p.name)}`,
    `date=${p.date}`,
    `time=${p.time}`,
    `lat=${p.lat}`,
    `lon=${p.lon}`,
    `tz=${encodeURIComponent(p.tz)}`,
    `place=${encodeURIComponent(p.place)}`,
    `details=${encodeURIComponent(p.details)}`,
    `theme=${p.theme}`,
  ].join('&');
}

export function parseCanonicalNatalParams(canonical: string): NatalValidation {
  const entries = new URLSearchParams(canonical);
  return validateNatalParams({
    name: entries.get('name'),
    date: entries.get('date'),
    time: entries.get('time') ?? '',
    lat: entries.get('lat'),
    lon: entries.get('lon'),
    tz: entries.get('tz'),
    place: entries.get('place'),
    details: entries.get('details') ?? '',
    theme: entries.get('theme'),
  });
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "14 May 2026" or "14 May 2026, 07:32" — the customer's confirmed line. */
export function formatNatalBorn(p: Pick<NatalParams, 'date' | 'time'>) {
  const [y, m, d] = p.date.split('-').map(Number);
  const dateText = `${d} ${MONTHS[m - 1]} ${y}`;
  return p.time ? `${dateText}, ${p.time}` : dateText;
}

/**
 * Cart line attributes. Keys starting with `_` are hidden by Shopify; the
 * visible ones are what the customer sees confirmed in cart and checkout.
 */
export function toNatalCartAttributes(
  p: NatalParams,
  sig?: string,
): CartAttribute[] {
  const attrs: CartAttribute[] = [
    {key: 'Name', value: p.name},
    {key: 'Born', value: formatNatalBorn(p)},
    {key: 'Place', value: p.place},
    ...(p.details ? [{key: 'Details', value: p.details}] : []),
    {key: '_kind', value: NATAL_KIND},
    {key: '_v', value: String(p.v)},
    {key: '_date', value: p.date},
    {key: '_time', value: p.time},
    {key: '_lat', value: String(p.lat)},
    {key: '_lon', value: String(p.lon)},
    {key: '_tz', value: p.tz},
    {key: '_details', value: p.details},
    {key: '_theme', value: p.theme},
  ];
  if (sig) attrs.push({key: '_sig', value: sig});
  return attrs;
}

export type NatalAttributesDecode =
  | {ok: true; params: NatalParams; sig: string | null}
  | {ok: false; error: string};

export function fromNatalCartAttributes(
  attrs:
    | ReadonlyArray<{key: string; value?: string | null}>
    | null
    | undefined,
): NatalAttributesDecode {
  const map = new Map((attrs ?? []).map((a) => [a.key, a.value ?? '']));
  if (map.get('_kind') !== NATAL_KIND || map.get('_v') !== '1') {
    return {ok: false, error: 'Not a birth-poster line.'};
  }
  const result = validateNatalParams({
    name: map.get('Name'),
    date: map.get('_date'),
    time: map.get('_time') ?? '',
    lat: map.get('_lat'),
    lon: map.get('_lon'),
    tz: map.get('_tz'),
    place: map.get('Place'),
    details: map.get('_details') ?? '',
    theme: map.get('_theme'),
  });
  if (!result.ok) return result;
  return {ok: true, params: result.params, sig: map.get('_sig') ?? null};
}

export function isNatalCartLine(
  attrs: ReadonlyArray<{key: string; value?: string | null}> | null | undefined,
) {
  return Boolean(
    attrs?.some((a) => a.key === '_kind' && (a.value ?? '') === NATAL_KIND),
  );
}
