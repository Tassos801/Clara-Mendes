/**
 * The personalisation a customer enters for a star map. These parameters
 * travel as cart line attributes, get signed server-side, and fully
 * determine the rendered artwork — the print file is regenerated from them.
 */
import {FONT_COVERAGE_RANGES} from './fontCoverage.ts';

export type SkyThemeId = 'linen' | 'midnight-garden' | 'quiet-form';
export const SKY_THEME_IDS: SkyThemeId[] = [
  'linen',
  'midnight-garden',
  'quiet-form',
];
export const SKY_THEME_LABELS: Record<SkyThemeId, string> = {
  linen: 'Linen',
  'midnight-garden': 'Midnight Garden',
  'quiet-form': 'Quiet Form',
};

export type SkyParams = {
  v: 1;
  /** YYYY-MM-DD, local calendar date at the place. */
  date: string;
  /** HH:MM, local wall-clock time at the place. */
  time: string;
  /** Degrees, 4 dp. */
  lat: number;
  /** Degrees, 4 dp. */
  lon: number;
  /** IANA zone id, e.g. Europe/Paris. */
  tz: string;
  /** Display label, e.g. "Paris, France". */
  place: string;
  /** Customer title line, may be empty. */
  title: string;
  theme: SkyThemeId;
};

export type SkyParamsInput = Partial<
  Record<keyof Omit<SkyParams, 'v'>, unknown>
>;

export type SkyValidation =
  | {ok: true; params: SkyParams}
  | {ok: false; error: string};

export const SKY_TITLE_MAX = 40;
export const SKY_PLACE_MAX = 80;
export const SKY_MIN_YEAR = 1900;
export const SKY_MAX_YEAR = 2100;
export const SKY_DEFAULT_TIME = '22:00';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u001f\u007f-\u009f]/g;

const round4 = (n: number) => Math.round(n * 1e4) / 1e4;

export function isValidTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat('en-US', {timeZone: tz});
    return true;
  } catch {
    return false;
  }
}

function isPrintableCodePoint(cp: number) {
  let lo = 0;
  let hi = FONT_COVERAGE_RANGES.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [start, end] = FONT_COVERAGE_RANGES[mid];
    if (cp < start) hi = mid - 1;
    else if (cp > end) lo = mid + 1;
    else return true;
  }
  return false;
}

/**
 * Characters the print font cannot set (emoji, CJK, Arabic, …). The preview
 * and the PDF share this rule, so nothing is silently dropped on paper.
 */
export function unprintableCharacters(text: string) {
  const bad: string[] = [];
  for (const ch of text) {
    if (ch === ' ') continue;
    const cp = ch.codePointAt(0) ?? 0;
    if (!isPrintableCodePoint(cp) && !bad.includes(ch)) bad.push(ch);
  }
  return bad;
}

export function sanitizeText(value: unknown) {
  return String(value ?? '')
    .replace(CONTROL_RE, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function validateSkyParams(input: SkyParamsInput): SkyValidation {
  const date = String(input.date ?? '');
  const match = date.match(DATE_RE);
  if (!match) return {ok: false, error: 'Choose a date.'};
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
    input.time == null || input.time === ''
      ? SKY_DEFAULT_TIME
      : String(input.time);
  if (!TIME_RE.test(time)) {
    return {ok: false, error: 'Choose a time such as 22:00.'};
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

  const title = sanitizeText(input.title);
  if (title.length > SKY_TITLE_MAX) {
    return {
      ok: false,
      error: `Keep the title to ${SKY_TITLE_MAX} characters.`,
    };
  }
  const unprintable = unprintableCharacters(title);
  if (unprintable.length > 0) {
    return {
      ok: false,
      error: `“${unprintable[0]}” can’t be printed — please use letters, numbers and punctuation.`,
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
      date,
      time,
      lat: round4(lat),
      lon: round4(lon),
      tz,
      place,
      title,
      theme,
    },
  };
}

/** Fixed key order; this exact string is what gets signed. */
export function canonicalSkyParams(p: SkyParams) {
  return [
    `v=${p.v}`,
    `date=${p.date}`,
    `time=${p.time}`,
    `lat=${p.lat}`,
    `lon=${p.lon}`,
    `tz=${encodeURIComponent(p.tz)}`,
    `place=${encodeURIComponent(p.place)}`,
    `title=${encodeURIComponent(p.title)}`,
    `theme=${p.theme}`,
  ].join('&');
}

export function parseCanonicalSkyParams(canonical: string): SkyValidation {
  const entries = new URLSearchParams(canonical);
  return validateSkyParams({
    date: entries.get('date'),
    time: entries.get('time'),
    lat: entries.get('lat'),
    lon: entries.get('lon'),
    tz: entries.get('tz'),
    place: entries.get('place'),
    title: entries.get('title') ?? '',
    theme: entries.get('theme'),
  });
}

export type CartAttribute = {key: string; value: string};

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

export function formatSkyDate(p: Pick<SkyParams, 'date' | 'time'>) {
  const [y, m, d] = p.date.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}, ${p.time}`;
}

export function formatCoordinates(lat: number, lon: number) {
  const f = (n: number, pos: string, neg: string) =>
    `${Math.abs(n).toFixed(4)}° ${n >= 0 ? pos : neg}`;
  return `${f(lat, 'N', 'S')}, ${f(lon, 'E', 'W')}`;
}

/**
 * Cart line attributes. Keys starting with `_` are hidden by Shopify in the
 * cart, checkout and notifications; visible attributes are what the customer
 * sees confirmed.
 */
export function toCartAttributes(p: SkyParams, sig?: string): CartAttribute[] {
  const attrs: CartAttribute[] = [
    ...(p.title ? [{key: 'Title', value: p.title}] : []),
    {key: 'Style', value: SKY_THEME_LABELS[p.theme]},
    {key: 'Place', value: p.place},
    {key: 'Date', value: formatSkyDate(p)},
    {key: '_v', value: String(p.v)},
    {key: '_date', value: p.date},
    {key: '_time', value: p.time},
    {key: '_lat', value: String(p.lat)},
    {key: '_lon', value: String(p.lon)},
    {key: '_tz', value: p.tz},
    {key: '_theme', value: p.theme},
  ];
  if (sig) attrs.push({key: '_sig', value: sig});
  return attrs;
}

export type CartAttributesDecode =
  | {ok: true; params: SkyParams; sig: string | null}
  | {ok: false; error: string};

export function fromCartAttributes(
  attrs:
    | ReadonlyArray<{key: string; value?: string | null}>
    | null
    | undefined,
): CartAttributesDecode {
  const map = new Map((attrs ?? []).map((a) => [a.key, a.value ?? '']));
  if (map.get('_v') !== '1' || map.has('_kind')) {
    return {ok: false, error: 'Not a sky line.'};
  }
  const result = validateSkyParams({
    date: map.get('_date'),
    time: map.get('_time'),
    lat: map.get('_lat'),
    lon: map.get('_lon'),
    tz: map.get('_tz'),
    place: map.get('Place'),
    title: map.get('Title') ?? '',
    theme: map.get('_theme'),
  });
  if (!result.ok) return result;
  return {ok: true, params: result.params, sig: map.get('_sig') ?? null};
}

export function isSkyCartLine(
  attrs: ReadonlyArray<{key: string}> | null | undefined,
) {
  // `_v` alone marks a sky line; other personalised products (the birth
  // poster) also carry `_v` but add a `_kind` discriminator, so its
  // absence is part of the sky contract.
  return Boolean(
    attrs?.some((a) => a.key === '_v') &&
      !attrs?.some((a) => a.key === '_kind'),
  );
}
