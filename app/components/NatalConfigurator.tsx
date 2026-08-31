import {useEffect, useMemo, useRef, useState} from 'react';
import {
  NATAL_DETAILS_MAX,
  NATAL_NAME_MAX,
  validateNatalParams,
  type NatalParams,
} from '~/lib/natal/params';
import type {NatalSizeKey} from '~/lib/natal/products';
import {computeNatal} from '~/lib/natal/scene';
import {NatalSvg} from '~/lib/natal/svg';
import {loadSkyCatalog, type SkyCatalog} from '~/lib/sky/catalog';
import {SKY_MAX_YEAR, SKY_MIN_YEAR, type SkyThemeId} from '~/lib/sky/params';
import type {PlaceResult} from '~/lib/sky/places.server';
import {platePath, SKY_THEMES} from '~/lib/sky/themes';

const EXAMPLE = {
  name: 'Amélie',
  date: '2026-05-14',
  time: '07:32',
  details: '3.4 kg · 51 cm',
};
const EXAMPLE_PLACE: PlaceResult = {
  name: 'Berlin',
  country: 'Germany',
  countryCode: 'DE',
  lat: 52.52,
  lon: 13.405,
  tz: 'Europe/Berlin',
  label: 'Berlin, Germany',
};

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function formatLatLon(place: PlaceResult) {
  const lat = `${Math.abs(place.lat).toFixed(4)}° ${place.lat >= 0 ? 'N' : 'S'}`;
  const lon = `${Math.abs(place.lon).toFixed(4)}° ${place.lon >= 0 ? 'E' : 'W'}`;
  return `${lat}, ${lon} · ${place.tz.replace(/_/g, ' ')}`;
}

/**
 * Name + birthplace + date (+ optional time and details) → live preview of
 * the birth poster. Reports a complete, valid parameter set to the PDP via
 * `onChange` (null while incomplete), exactly like the sky configurator.
 */
export function NatalConfigurator({
  size,
  theme,
  onChange,
}: {
  size: NatalSizeKey;
  theme: SkyThemeId;
  onChange: (params: NatalParams | null) => void;
}) {
  const [catalog, setCatalog] = useState<SkyCatalog | null>(null);
  const [catalogFailed, setCatalogFailed] = useState(false);
  const [name, setName] = useState('');
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [placesOpen, setPlacesOpen] = useState(false);
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [details, setDetails] = useState('');
  const [touched, setTouched] = useState(false);
  // Field-level hints only appear once the customer leaves a field.
  const [nameBlurred, setNameBlurred] = useState(false);
  const [placeBlurred, setPlaceBlurred] = useState(false);
  const [dateBlurred, setDateBlurred] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listId = 'natal-place-results';

  useEffect(() => {
    let alive = true;
    loadSkyCatalog()
      .then((loaded) => {
        if (alive) setCatalog(loaded);
      })
      .catch((error) => {
        console.error('Sky catalogue failed to load', error);
        if (alive) setCatalogFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const debouncedQuery = useDebounced(placeQuery, 200);
  useEffect(() => {
    abortRef.current?.abort();
    const query = debouncedQuery.trim();
    if (query.length < 2 || place?.label === debouncedQuery) {
      setPlaceResults([]);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    fetch(`/api/places?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then((response) =>
        response.ok
          ? (response.json() as Promise<{results: PlaceResult[]}>)
          : Promise.resolve({results: [] as PlaceResult[]}),
      )
      .then((json) => {
        setPlaceResults(json.results);
        setPlacesOpen(true);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [debouncedQuery, place?.label]);

  // The preview shows the customer's poster once they have a name, place
  // and date, and the example until then, so the page never looks empty.
  const previewInput = useMemo(() => {
    const p = place ?? EXAMPLE_PLACE;
    return {
      name: touched && name ? name : name || EXAMPLE.name,
      date: date || EXAMPLE.date,
      time: touched ? time : time || EXAMPLE.time,
      lat: p.lat,
      lon: p.lon,
      tz: p.tz,
      place: p.label,
      details: touched ? details : details || EXAMPLE.details,
      theme,
    };
  }, [date, details, name, place, theme, time, touched]);
  const debouncedInput = useDebounced(previewInput, 150);
  const previewValidation = useMemo(
    () => validateNatalParams(debouncedInput),
    [debouncedInput],
  );
  const scene = useMemo(
    () =>
      catalog && previewValidation.ok
        ? computeNatal({params: previewValidation.params, size, catalog})
        : null,
    [catalog, previewValidation, size],
  );

  // Only a complete, customer-entered set is purchasable.
  const purchasable = useMemo(
    () =>
      name.trim() && place && date
        ? validateNatalParams({
            name,
            date,
            time,
            lat: place.lat,
            lon: place.lon,
            tz: place.tz,
            place: place.label,
            details,
            theme,
          })
        : null,
    [date, details, name, place, theme, time],
  );
  useEffect(() => {
    onChange(purchasable?.ok ? purchasable.params : null);
  }, [onChange, purchasable]);

  const error =
    purchasable && !purchasable.ok
      ? purchasable.error
      : nameBlurred && !name.trim()
        ? 'Add the name to print.'
        : placeBlurred && !place
          ? 'Choose a place from the list.'
          : dateBlurred && !date
            ? 'Choose the birth date.'
            : null;

  return (
    <div className="sky-configurator">
      <div className="sky-preview" aria-live="polite">
        {scene ? (
          <NatalSvg
            scene={scene}
            theme={SKY_THEMES[theme]}
            plateUrl={platePath(theme, 'preview')}
            className="sky-preview-svg"
          />
        ) : (
          <div className="sky-preview-loading">
            {catalogFailed
              ? 'The preview could not load. Please refresh the page.'
              : 'Charting the sky…'}
          </div>
        )}
        {!name.trim() || !place || !date ? (
          <p className="sky-preview-hint">
            Showing an example — add the name, birthplace and date to see the
            poster.
          </p>
        ) : null}
      </div>

      <form
        className="sky-form"
        onSubmit={(event) => event.preventDefault()}
        aria-label="Personalise the birth poster"
      >
        <label className="sky-field">
          <span>Name</span>
          <input
            type="text"
            value={name}
            maxLength={NATAL_NAME_MAX}
            placeholder={EXAMPLE.name}
            onChange={(event) => {
              setName(event.target.value);
              setTouched(true);
            }}
            onBlur={() => setNameBlurred(true)}
          />
        </label>

        <label className="sky-field">
          <span>Birthplace</span>
          <input
            type="text"
            value={placeQuery}
            autoComplete="off"
            role="combobox"
            aria-expanded={placesOpen && placeResults.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            placeholder="City or town"
            onChange={(event) => {
              setPlaceQuery(event.target.value);
              setPlace(null);
              setTouched(true);
            }}
            onFocus={() => setPlacesOpen(true)}
            onBlur={() => {
              window.setTimeout(() => setPlacesOpen(false), 150);
              if (placeQuery.trim()) setPlaceBlurred(true);
            }}
          />
          {placesOpen && placeResults.length > 0 ? (
            <ul id={listId} className="sky-place-results" role="listbox">
              {placeResults.map((result) => (
                <li
                  key={`${result.name}-${result.lat}-${result.lon}`}
                  role="option"
                  aria-selected={place?.label === result.label}
                >
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setPlace(result);
                      setPlaceQuery(result.label);
                      setPlaceResults([]);
                      setPlacesOpen(false);
                    }}
                  >
                    {result.name}
                    <small>{result.country}</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {place ? (
            <small className="sky-field-note">{formatLatLon(place)}</small>
          ) : null}
        </label>

        <div className="sky-field-row">
          <label className="sky-field">
            <span>Date of birth</span>
            <input
              type="date"
              value={date}
              min={`${SKY_MIN_YEAR}-01-01`}
              max={`${SKY_MAX_YEAR}-12-31`}
              onChange={(event) => {
                setDate(event.target.value);
                setTouched(true);
              }}
              onBlur={() => setDateBlurred(true)}
            />
          </label>
          <label className="sky-field">
            <span>
              Time <em>(optional)</em>
            </span>
            <input
              type="time"
              value={time}
              onChange={(event) => {
                setTime(event.target.value);
                setTouched(true);
              }}
            />
          </label>
        </div>

        <label className="sky-field">
          <span>
            Details <em>(optional, up to {NATAL_DETAILS_MAX} characters)</em>
          </span>
          <input
            type="text"
            value={details}
            maxLength={NATAL_DETAILS_MAX}
            placeholder={EXAMPLE.details}
            onChange={(event) => {
              setDetails(event.target.value);
              setTouched(true);
            }}
          />
        </label>

        {error ? (
          <p className="sky-form-error" role="alert">
            {error}
          </p>
        ) : null}
        <p className="sky-form-note">
          The medallion shows the sky over the birthplace at that moment —
          leave the time blank and it is drawn for midday, with no time
          printed. We print exactly what the preview shows.
        </p>
      </form>
    </div>
  );
}
