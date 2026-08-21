import {useEffect, useMemo, useRef, useState} from 'react';
import {loadSkyCatalog, type SkyCatalog} from '~/lib/sky/catalog';
import {
  SKY_DEFAULT_TIME,
  SKY_MAX_YEAR,
  SKY_MIN_YEAR,
  SKY_TITLE_MAX,
  validateSkyParams,
  type SkyParams,
  type SkyThemeId,
} from '~/lib/sky/params';
import type {PlaceResult} from '~/lib/sky/places.server';
import type {SkySizeKey} from '~/lib/sky/products';
import {computeSky} from '~/lib/sky/scene';
import {SkySvg} from '~/lib/sky/svg';
import {platePath, SKY_THEMES} from '~/lib/sky/themes';

const EXAMPLE = {
  date: '2019-06-14',
  time: SKY_DEFAULT_TIME,
  title: 'The night we met',
};
const EXAMPLE_PLACE: PlaceResult = {
  name: 'Paris',
  country: 'France',
  countryCode: 'FR',
  lat: 48.8566,
  lon: 2.3522,
  tz: 'Europe/Paris',
  label: 'Paris, France',
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
 * Place + date + time + title → live preview. Reports a complete, valid
 * parameter set to the PDP via `onChange` (null while incomplete) so the
 * add-to-cart button can carry it as line attributes.
 */
export function SkyConfigurator({
  size,
  theme,
  onChange,
}: {
  size: SkySizeKey;
  theme: SkyThemeId;
  onChange: (params: SkyParams | null) => void;
}) {
  const [catalog, setCatalog] = useState<SkyCatalog | null>(null);
  const [catalogFailed, setCatalogFailed] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [placesOpen, setPlacesOpen] = useState(false);
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState(SKY_DEFAULT_TIME);
  const [title, setTitle] = useState('');
  const [touched, setTouched] = useState(false);
  // Field-level hints only appear once the customer leaves a field, so they
  // are never scolded mid-typing.
  const [placeBlurred, setPlaceBlurred] = useState(false);
  const [dateBlurred, setDateBlurred] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listId = 'sky-place-results';

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

  // The preview shows the customer's sky once they have a place and date,
  // and the example sky until then, so the page never looks empty.
  const previewInput = useMemo(() => {
    const p = place ?? EXAMPLE_PLACE;
    return {
      date: date || EXAMPLE.date,
      time: time || SKY_DEFAULT_TIME,
      lat: p.lat,
      lon: p.lon,
      tz: p.tz,
      place: p.label,
      title: touched ? title : EXAMPLE.title,
      theme,
    };
  }, [date, place, theme, time, title, touched]);
  const debouncedInput = useDebounced(previewInput, 150);
  const previewValidation = useMemo(
    () => validateSkyParams(debouncedInput),
    [debouncedInput],
  );
  const scene = useMemo(
    () =>
      catalog && previewValidation.ok
        ? computeSky({params: previewValidation.params, size, catalog})
        : null,
    [catalog, previewValidation, size],
  );

  // Only a complete, customer-entered set is purchasable.
  const purchasable = useMemo(
    () =>
      place && date
        ? validateSkyParams({
            date,
            time,
            lat: place.lat,
            lon: place.lon,
            tz: place.tz,
            place: place.label,
            title,
            theme,
          })
        : null,
    [date, place, theme, time, title],
  );
  useEffect(() => {
    onChange(purchasable?.ok ? purchasable.params : null);
  }, [onChange, purchasable]);

  const error =
    purchasable && !purchasable.ok
      ? purchasable.error
      : placeBlurred && !place
        ? 'Choose a place from the list.'
        : dateBlurred && !date
          ? 'Choose a date.'
          : null;

  return (
    <div className="sky-configurator">
      <div className="sky-preview" aria-live="polite">
        {scene ? (
          <SkySvg
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
        {!place || !date ? (
          <p className="sky-preview-hint">
            Showing an example — add your place and date to see your sky.
          </p>
        ) : null}
      </div>

      <form
        className="sky-form"
        onSubmit={(event) => event.preventDefault()}
        aria-label="Personalise your star map"
      >
        <label className="sky-field">
          <span>Place</span>
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
            <span>Date</span>
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
              Time <em>(local)</em>
            </span>
            <input
              type="time"
              value={time}
              onChange={(event) =>
                setTime(event.target.value || SKY_DEFAULT_TIME)
              }
            />
          </label>
        </div>

        <label className="sky-field">
          <span>
            Title <em>(optional, up to {SKY_TITLE_MAX} characters)</em>
          </span>
          <input
            type="text"
            value={title}
            maxLength={SKY_TITLE_MAX}
            placeholder={EXAMPLE.title}
            onChange={(event) => {
              setTitle(event.target.value);
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
          Leave the time as it is for the evening sky, or set the exact hour.
          Stars are shown as they stood above the horizon, even by day.
        </p>
      </form>
    </div>
  );
}
