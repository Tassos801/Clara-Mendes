import {
  canonicalSkyParams,
  SKY_DEFAULT_TIME,
  SKY_THEME_IDS,
  SKY_TITLE_MAX,
  validateSkyParams,
  type SkyParams,
  type SkyThemeId,
  unprintableCharacters,
} from './params.ts';
import type {PlaceResult} from './places.server.ts';
import type {SkySizeKey} from './products.ts';

/** Window event an occasion card dispatches to prefill the configurator. */
export const SKY_PRESET_EVENT = 'cm:sky-preset';

export type SkyPreset = {title: string; time: string};

/**
 * Validates an occasion preset before it touches the form: a printable
 * title within the title limit and a 24-hour local time, defaulting to
 * the evening sky when the preset carries no time.
 */
export function normaliseSkyPreset(input: unknown): SkyPreset | null {
  if (!input || typeof input !== 'object') return null;
  const candidate = input as {title?: unknown; time?: unknown};
  if (typeof candidate.title !== 'string') return null;
  const title = candidate.title.trim();
  if (!title || title.length > SKY_TITLE_MAX) return null;
  if (unprintableCharacters(title).length > 0) return null;
  const time = candidate.time === undefined ? SKY_DEFAULT_TIME : candidate.time;
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return null;
  }
  return {title, time};
}
export const SKY_DRAFT_STORAGE_KEY = 'cm:your-sky:draft:v1';

export type SkyDraft = {
  place: PlaceResult | null;
  date: string;
  time: string;
  title: string;
  theme: SkyThemeId;
};

export type SkyRequiredField = 'place' | 'date' | null;
export type SkyPreviewStatus = 'example' | 'updating' | 'ready' | 'error';

const FALLBACK_PLACE: PlaceResult = {
  name: 'Paris',
  country: 'France',
  countryCode: 'FR',
  lat: 48.8566,
  lon: 2.3522,
  tz: 'Europe/Paris',
  label: 'Paris, France',
};

export function nextSkyRequiredField(
  input: Pick<SkyDraft, 'place' | 'date'>,
): SkyRequiredField {
  if (!input.place) return 'place';
  if (!input.date) return 'date';
  return null;
}

export function nextSkyPlaceIndex(
  current: number,
  key: 'ArrowDown' | 'ArrowUp',
  count: number,
) {
  if (count <= 0) return -1;
  if (current < 0) return key === 'ArrowDown' ? 0 : count - 1;
  const delta = key === 'ArrowDown' ? 1 : -1;
  return (current + delta + count) % count;
}

export function serializeSkyDraft(draft: SkyDraft) {
  return JSON.stringify({v: 1, ...draft});
}

export function parseSkyDraft(
  raw: string | null,
  fallbackTheme: SkyThemeId,
): SkyDraft | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (value.v !== 1) return null;
    const theme = String(value.theme ?? fallbackTheme) as SkyThemeId;
    if (!SKY_THEME_IDS.includes(theme)) return null;
    const date = String(value.date ?? '');
    const time = String(value.time ?? SKY_DEFAULT_TIME);
    const title = String(value.title ?? '');
    if (title.length > SKY_TITLE_MAX) return null;
    const candidate = value.place as Partial<PlaceResult> | null | undefined;
    const place = candidate
      ? {
          name: String(candidate.name ?? ''),
          country: String(candidate.country ?? ''),
          countryCode: String(candidate.countryCode ?? ''),
          lat: Number(candidate.lat),
          lon: Number(candidate.lon),
          tz: String(candidate.tz ?? ''),
          label: String(candidate.label ?? ''),
        }
      : null;
    if (
      place &&
      (!place.name ||
        place.name.length > 100 ||
        !place.country ||
        place.country.length > 100 ||
        !/^[A-Z]{2}$/.test(place.countryCode))
    ) {
      return null;
    }
    const validationPlace = place ?? FALLBACK_PLACE;
    const validation = validateSkyParams({
      date: date || '2000-01-01',
      time,
      lat: validationPlace.lat,
      lon: validationPlace.lon,
      tz: validationPlace.tz,
      place: validationPlace.label,
      title,
      theme,
    });
    if (!validation.ok) return null;
    return {
      place: place
        ? {
            ...place,
            lat: validation.params.lat,
            lon: validation.params.lon,
            tz: validation.params.tz,
            label: validation.params.place,
          }
        : null,
      date,
      time: validation.params.time,
      title: validation.params.title,
      theme,
    };
  } catch {
    return null;
  }
}

export function createSkyRenderKey(params: SkyParams, size: SkySizeKey) {
  return `${canonicalSkyParams(params)}&size=${size}`;
}

export function getSkyPreviewStatus({
  failed,
  hasRequired,
  renderKey,
  sceneKey,
}: {
  failed: boolean;
  hasRequired: boolean;
  renderKey: string | null;
  sceneKey: string | null;
}): SkyPreviewStatus {
  if (failed) return 'error';
  if (!hasRequired) return 'example';
  return renderKey && renderKey === sceneKey ? 'ready' : 'updating';
}
