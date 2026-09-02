import {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {loadSkyCatalog, type SkyCatalog} from '~/lib/sky/catalog';
import {
  createSkyRenderKey,
  getSkyPreviewStatus,
  nextSkyPlaceIndex,
  nextSkyRequiredField,
  parseSkyDraft,
  serializeSkyDraft,
  buildSkyShareUrl,
  normaliseSkyPreset,
  parseSkySearch,
  SKY_DRAFT_STORAGE_KEY,
  SKY_PRESET_EVENT,
  type SkyPreviewStatus,
  type SkyRequiredField,
} from '~/lib/sky/configuratorState';
import {
  SKY_DEFAULT_TIME,
  SKY_MAX_YEAR,
  SKY_MIN_YEAR,
  SKY_THEME_IDS,
  SKY_THEME_LABELS,
  SKY_TITLE_MAX,
  unprintableCharacters,
  validateSkyParams,
  type SkyParams,
  type SkyThemeId,
} from '~/lib/sky/params';
import type {PlaceResult} from '~/lib/sky/places.server';
import {describeSkyScene} from '~/lib/sky/describe';
import {SKY_SIZES, type SkyFinish, type SkySizeKey} from '~/lib/sky/products';
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

/** An empty sage wall from the story page; the print is placed on it to scale. */
const WALL_ROOM_SRC = '/images/backdrops/our-story-light.jpg';

const PREVIEW_LABELS: Record<SkyPreviewStatus, string> = {
  example: 'Example',
  updating: 'Updating',
  ready: 'Ready to print',
  error: 'Preview unavailable',
};

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(timeout);
  }, [value, ms]);
  return debounced;
}

function formatLatLon(place: PlaceResult) {
  const lat = `${Math.abs(place.lat).toFixed(4)}° ${place.lat >= 0 ? 'N' : 'S'}`;
  const lon = `${Math.abs(place.lon).toFixed(4)}° ${place.lon >= 0 ? 'E' : 'W'}`;
  return `${lat}, ${lon} · ${place.tz.replace(/_/g, ' ')}`;
}

export type SkyConfiguratorStatus = {
  nextRequired: SkyRequiredField;
  params: SkyParams | null;
  preview: SkyPreviewStatus;
};

/**
 * Builds one exact artwork state from customer input. The PDP only receives
 * purchasable params after the current input and the rendered preview share
 * the same canonical key.
 */
export function SkyConfigurator({
  finish,
  initialTheme,
  size,
  onStatus,
}: {
  finish: SkyFinish;
  initialTheme: SkyThemeId;
  size: SkySizeKey;
  onStatus: (status: SkyConfiguratorStatus) => void;
}) {
  const [catalog, setCatalog] = useState<SkyCatalog | null>(null);
  const [catalogFailed, setCatalogFailed] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [placesOpen, setPlacesOpen] = useState(false);
  const [placesStatus, setPlacesStatus] = useState<
    'idle' | 'loading' | 'ready' | 'empty' | 'error'
  >('idle');
  const [activePlaceIndex, setActivePlaceIndex] = useState(-1);
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState(SKY_DEFAULT_TIME);
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState(initialTheme);
  const [touched, setTouched] = useState(false);
  const [placeBlurred, setPlaceBlurred] = useState(false);
  const [dateBlurred, setDateBlurred] = useState(false);
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [placesAttempt, setPlacesAttempt] = useState(0);
  const [renderAttempt, setRenderAttempt] = useState(0);
  const [restored, setRestored] = useState(false);
  const [compactPreview, setCompactPreview] = useState(false);
  const [view, setView] = useState<'print' | 'wall'>('print');
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const placesRequestRef = useRef(0);
  const listId = 'sky-place-results';
  const placeStatusId = 'sky-place-status';

  useEffect(() => {
    let alive = true;
    setCatalog(null);
    setCatalogFailed(false);
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
  }, [catalogAttempt]);

  useEffect(() => {
    const shared = parseSkySearch(window.location.search);
    if (shared) {
      const [name, ...rest] = shared.place.split(',');
      setPlace({
        name: name.trim(),
        country: rest.join(',').trim(),
        countryCode: '',
        lat: shared.lat,
        lon: shared.lon,
        tz: shared.tz,
        label: shared.place,
      });
      setPlaceQuery(shared.place);
      setDate(shared.date);
      setTime(shared.time);
      setTitle(shared.title);
      setTheme(shared.theme);
      setTouched(true);
      setRestored(true);
      return;
    }
    const restoredDraft = parseSkyDraft(
      window.sessionStorage.getItem(SKY_DRAFT_STORAGE_KEY),
      initialTheme,
    );
    if (restoredDraft) {
      setPlace(restoredDraft.place);
      setPlaceQuery(restoredDraft.place?.label ?? '');
      setDate(restoredDraft.date);
      setTime(restoredDraft.time);
      setTitle(restoredDraft.title);
      setTheme(restoredDraft.theme);
      setTouched(
        Boolean(
          restoredDraft.place || restoredDraft.date || restoredDraft.title,
        ),
      );
    }
    setRestored(true);
  }, [initialTheme]);

  useEffect(() => {
    if (!restored) return;
    if (
      !place &&
      !date &&
      !title &&
      time === SKY_DEFAULT_TIME &&
      theme === initialTheme
    ) {
      window.sessionStorage.removeItem(SKY_DRAFT_STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(
        SKY_DRAFT_STORAGE_KEY,
        serializeSkyDraft({place, date, time, title, theme}),
      );
    }
  }, [date, initialTheme, place, restored, theme, time, title]);

  useEffect(() => {
    function applyPreset(event: Event) {
      const preset = normaliseSkyPreset((event as CustomEvent).detail);
      if (!preset) return;
      setTitle(preset.title);
      setTime(preset.time);
      setTouched(true);
      window.setTimeout(() => {
        document.getElementById('sky-place')?.focus({preventScroll: true});
      }, 350);
    }
    window.addEventListener(SKY_PRESET_EVENT, applyPreset);
    return () => window.removeEventListener(SKY_PRESET_EVENT, applyPreset);
  }, []);

  // On narrow screens the preview sticks below the header while the form
  // is filled in. Once it is actually pinned (its top edge sits at the
  // sticky offset) it collapses to a strip so the inputs stay visible.
  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    const narrow = window.matchMedia('(max-width: 767px)');
    let timer = 0;
    const measure = () => {
      timer = 0;
      if (!narrow.matches) {
        setCompactPreview(false);
        return;
      }
      const stickyTop = parseFloat(getComputedStyle(preview).top) || 0;
      const pinned = preview.getBoundingClientRect().top <= stickyTop + 1;
      setCompactPreview(pinned && window.scrollY > 0);
    };
    const schedule = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(measure, 60);
    };
    measure();
    window.addEventListener('scroll', schedule, {passive: true});
    window.addEventListener('resize', schedule);
    narrow.addEventListener('change', schedule);
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      narrow.removeEventListener('change', schedule);
    };
  }, []);

  const debouncedQuery = useDebounced(placeQuery, 200);
  useEffect(() => {
    abortRef.current?.abort();
    const requestId = ++placesRequestRef.current;
    const query = debouncedQuery.trim();
    if (query.length < 2 || place?.label === debouncedQuery) {
      setPlaceResults([]);
      setPlacesStatus('idle');
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setPlacesStatus('loading');
    fetch(`/api/places?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Place search failed: ${response.status}`);
        }
        return response.json() as Promise<{results: PlaceResult[]}>;
      })
      .then(({results}) => {
        if (requestId !== placesRequestRef.current) return;
        setPlaceResults(results);
        setActivePlaceIndex(-1);
        setPlacesOpen(true);
        setPlacesStatus(results.length > 0 ? 'ready' : 'empty');
      })
      .catch((error: unknown) => {
        if (
          controller.signal.aborted ||
          requestId !== placesRequestRef.current
        ) {
          return;
        }
        console.error('Place search failed', error);
        setPlaceResults([]);
        setPlacesStatus('error');
        setPlacesOpen(true);
      });
    return () => controller.abort();
  }, [debouncedQuery, place?.label, placesAttempt]);

  function selectPlace(result: PlaceResult) {
    setPlace(result);
    setPlaceQuery(result.label);
    setPlaceResults([]);
    setPlacesOpen(false);
    setPlacesStatus('idle');
    setActivePlaceIndex(-1);
    setPlaceBlurred(false);
    setTouched(true);
  }

  function clearPlace() {
    abortRef.current?.abort();
    placesRequestRef.current += 1;
    setPlace(null);
    setPlaceQuery('');
    setPlaceResults([]);
    setPlacesOpen(false);
    setPlacesStatus('idle');
    setActivePlaceIndex(-1);
    setPlaceBlurred(false);
  }

  function resetConfigurator() {
    abortRef.current?.abort();
    placesRequestRef.current += 1;
    setPlace(null);
    setPlaceQuery('');
    setPlaceResults([]);
    setPlacesOpen(false);
    setPlacesStatus('idle');
    setActivePlaceIndex(-1);
    setDate('');
    setTime(SKY_DEFAULT_TIME);
    setTitle('');
    setTheme(initialTheme);
    setTouched(false);
    setPlaceBlurred(false);
    setDateBlurred(false);
    window.sessionStorage.removeItem(SKY_DRAFT_STORAGE_KEY);
  }

  function handlePlaceKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!placesOpen || placeResults.length === 0) {
      if (event.key === 'Escape') setPlacesOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction =
        event.key === 'ArrowDown' ? 'ArrowDown' : 'ArrowUp';
      setActivePlaceIndex(
        (current) => nextSkyPlaceIndex(current, direction, placeResults.length),
      );
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setActivePlaceIndex(
        event.key === 'Home' ? 0 : placeResults.length - 1,
      );
    } else if (event.key === 'Enter' && activePlaceIndex >= 0) {
      event.preventDefault();
      selectPlace(placeResults[activePlaceIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setPlacesOpen(false);
      setActivePlaceIndex(-1);
    }
  }

  const previewInput = useMemo(() => {
    const previewPlace = place ?? EXAMPLE_PLACE;
    return {
      date: date || EXAMPLE.date,
      time: time || SKY_DEFAULT_TIME,
      lat: previewPlace.lat,
      lon: previewPlace.lon,
      tz: previewPlace.tz,
      place: previewPlace.label,
      title: touched ? title : EXAMPLE.title,
      theme,
    };
  }, [date, place, theme, time, title, touched]);
  const debouncedInput = useDebounced(previewInput, 150);
  const previewValidation = useMemo(
    () => validateSkyParams(debouncedInput),
    [debouncedInput],
  );
  const rendered = useMemo(() => {
    if (!catalog || !previewValidation.ok) {
      return {kind: 'empty'} as const;
    }
    try {
      return {
        kind: 'ready',
        attempt: renderAttempt,
        key: createSkyRenderKey(previewValidation.params, size),
        scene: computeSky({params: previewValidation.params, size, catalog}),
      } as const;
    } catch (error) {
      console.error('Sky preview failed to render', error);
      return {kind: 'error', attempt: renderAttempt} as const;
    }
  }, [catalog, previewValidation, renderAttempt, size]);

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
  const purchasableParams = purchasable?.ok ? purchasable.params : null;
  const currentRenderKey = purchasableParams
    ? createSkyRenderKey(purchasableParams, size)
    : null;
  const nextRequired = nextSkyRequiredField({place, date});
  const preview = getSkyPreviewStatus({
    failed: catalogFailed || rendered.kind === 'error',
    hasRequired: nextRequired === null,
    renderKey: currentRenderKey,
    sceneKey: rendered.kind === 'ready' ? rendered.key : null,
  });

  const badTitleCharacter = unprintableCharacters(title)[0] ?? null;
  const placeError =
    placeBlurred && !place ? 'Choose a place from the list.' : null;
  const dateError = dateBlurred && !date ? 'Choose a date.' : null;
  const titleError = badTitleCharacter
    ? `“${badTitleCharacter}” can’t be printed — please use letters, numbers and punctuation.`
    : null;
  const readyParams =
    preview === 'ready' && !titleError ? purchasableParams : null;
  function copyShareLink() {
    if (!readyParams) return;
    const url = buildSkyShareUrl(
      window.location.origin,
      window.location.pathname,
      readyParams,
      window.location.search,
    );
    const done = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    };
    const fallback = () => window.prompt('Copy this link to your sky', url);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(fallback);
    } else {
      fallback();
    }
  }

  const status = useMemo<SkyConfiguratorStatus>(
    () => ({nextRequired, params: readyParams, preview}),
    [nextRequired, preview, readyParams],
  );

  useEffect(() => {
    onStatus(status);
  }, [onStatus, status]);

  return (
    <div className="sky-configurator">
      <section
        aria-label="Your Sky artwork preview"
        className={compactPreview ? 'sky-preview sky-preview--compact' : 'sky-preview'}
        ref={previewRef}
        id="sky-preview"
        tabIndex={-1}
      >
        <div className="sky-preview-toolbar">
          <span
            aria-live="polite"
            className={`sky-preview-status is-${preview}`}
          >
            {PREVIEW_LABELS[preview]}
          </span>
          {readyParams && !compactPreview ? (
            <button
              className="sky-inline-action"
              onClick={copyShareLink}
              type="button"
            >
              {copied ? 'Link copied' : 'Copy link'}
            </button>
          ) : null}
          {catalogFailed || rendered.kind === 'error' ? (
            <button
              className="sky-inline-action"
              onClick={() => {
                if (catalogFailed) setCatalogAttempt((attempt) => attempt + 1);
                if (rendered.kind === 'error') {
                  setRenderAttempt((attempt) => attempt + 1);
                }
              }}
              type="button"
            >
              Try again
            </button>
          ) : null}
        </div>
        {rendered.kind === 'ready' ? (
          view === 'wall' && !compactPreview ? (
            <div className={`sky-wall sky-wall--${size} sky-wall--${finish}`}>
              <img
                alt=""
                className="sky-wall-room"
                decoding="async"
                height={1714}
                src={WALL_ROOM_SRC}
                width={2560}
              />
              <div className="sky-wall-print">
                <SkySvg
                  className="sky-wall-svg"
                  plateUrl={platePath(theme, 'preview')}
                  scene={rendered.scene}
                  theme={SKY_THEMES[theme]}
                />
              </div>
              <p className="sky-wall-note">
                {SKY_SIZES[size].label} · approximate scale
              </p>
            </div>
          ) : (
            <div className={`sky-preview-frame sky-preview-frame--${finish}`}>
              <SkySvg
                className="sky-preview-svg"
                plateUrl={platePath(theme, 'preview')}
                scene={rendered.scene}
                theme={SKY_THEMES[theme]}
              />
            </div>
          )
        ) : (
          <div className="sky-preview-loading">
            {preview === 'error' ? 'Preview unavailable' : 'Charting your sky…'}
          </div>
        )}
        {rendered.kind === 'ready' && !compactPreview ? (
          <div className="sky-preview-footer">
            <p className="sky-preview-facts">
              {describeSkyScene(rendered.scene, previewInput.lat)}
            </p>
            <div aria-label="Preview view" className="sky-view-toggle" role="group">
              <button
                aria-pressed={view === 'print'}
                onClick={() => setView('print')}
                type="button"
              >
                Print
              </button>
              <button
                aria-pressed={view === 'wall'}
                onClick={() => setView('wall')}
                type="button"
              >
                On the wall
              </button>
            </div>
          </div>
        ) : null}
        {preview === 'example' ? (
          <p className="sky-preview-hint">
            Showing an example — add your place and date to see your sky.
          </p>
        ) : null}
      </section>

      <form
        aria-label="Personalise your star map"
        className="sky-form"
        onSubmit={(event) => event.preventDefault()}
      >
        <p className="sky-stage-heading">
          <span>1</span> Personalise
        </p>

        <div className="sky-field">
          <div className="sky-field-meta">
            <label htmlFor="sky-place">Place</label>
            {place || placeQuery ? (
              <button
                className="sky-inline-action"
                onClick={clearPlace}
                type="button"
              >
                Clear
              </button>
            ) : null}
          </div>
          <input
            aria-activedescendant={
              placesOpen && activePlaceIndex >= 0
                ? `sky-place-option-${activePlaceIndex}`
                : undefined
            }
            aria-autocomplete="list"
            aria-controls={listId}
            aria-describedby={
              placeError
                ? `${placeStatusId} sky-place-error`
                : placeStatusId
            }
            aria-expanded={placesOpen && placeResults.length > 0}
            aria-invalid={Boolean(placeError)}
            autoComplete="off"
            id="sky-place"
            onBlur={() => {
              window.setTimeout(() => setPlacesOpen(false), 150);
              setPlaceBlurred(true);
            }}
            onChange={(event) => {
              setPlaceQuery(event.target.value);
              setPlace(null);
              setPlaceBlurred(false);
              setTouched(true);
            }}
            onFocus={() => {
              if (placeResults.length > 0) setPlacesOpen(true);
            }}
            onKeyDown={handlePlaceKeyDown}
            placeholder="City or town"
            role="combobox"
            type="text"
            value={placeQuery}
          />
          {placesOpen && placeResults.length > 0 ? (
            <ul className="sky-place-results" id={listId} role="listbox">
              {placeResults.map((result, index) => (
                <li
                  aria-selected={activePlaceIndex === index}
                  className={activePlaceIndex === index ? 'is-active' : ''}
                  id={`sky-place-option-${index}`}
                  key={`${result.name}-${result.lat}-${result.lon}`}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectPlace(result);
                  }}
                  role="option"
                >
                  <span>{result.name}</span>
                  <small>{result.country}</small>
                </li>
              ))}
            </ul>
          ) : null}
          <div
            aria-live="polite"
            className="sky-place-status"
            id={placeStatusId}
            role="status"
          >
            <span>
              {placesStatus === 'loading'
                ? 'Searching places…'
                : placesStatus === 'ready'
                  ? `${placeResults.length} place${placeResults.length === 1 ? '' : 's'} found`
                  : placesStatus === 'empty'
                    ? 'No places found'
                    : placesStatus === 'error'
                      ? 'Place search is unavailable.'
                      : place
                        ? formatLatLon(place)
                        : ''}
            </span>
            {placesStatus === 'error' ? (
              <button
                className="sky-inline-action"
                onClick={() => setPlacesAttempt((attempt) => attempt + 1)}
                type="button"
              >
                Try again
              </button>
            ) : null}
          </div>
          {placeError ? (
            <p className="sky-field-error" id="sky-place-error" role="alert">
              {placeError}
            </p>
          ) : null}
        </div>

        <div className="sky-field-row">
          <div className="sky-field">
            <label htmlFor="sky-date">Date</label>
            <input
              aria-describedby={dateError ? 'sky-date-error' : undefined}
              aria-invalid={Boolean(dateError)}
              id="sky-date"
              max={`${SKY_MAX_YEAR}-12-31`}
              min={`${SKY_MIN_YEAR}-01-01`}
              onBlur={() => setDateBlurred(true)}
              onChange={(event) => {
                setDate(event.target.value);
                setDateBlurred(false);
                setTouched(true);
              }}
              type="date"
              value={date}
            />
            {dateError ? (
              <p className="sky-field-error" id="sky-date-error" role="alert">
                {dateError}
              </p>
            ) : null}
          </div>
          <div className="sky-field">
            <label htmlFor="sky-time">
              Time <em>(local)</em>
            </label>
            <input
              id="sky-time"
              onChange={(event) =>
                setTime(event.target.value || SKY_DEFAULT_TIME)
              }
              type="time"
              value={time}
            />
          </div>
        </div>

        <div className="sky-field">
          <div className="sky-field-meta">
            <label htmlFor="sky-title">Title (optional)</label>
            <span className="sky-character-count">
              {title.length}/{SKY_TITLE_MAX}
            </span>
          </div>
          <input
            aria-describedby={titleError ? 'sky-title-error' : undefined}
            aria-invalid={Boolean(titleError)}
            id="sky-title"
            maxLength={SKY_TITLE_MAX}
            onChange={(event) => {
              setTitle(event.target.value);
              setTouched(true);
            }}
            placeholder={EXAMPLE.title}
            type="text"
            value={title}
          />
          {titleError ? (
            <p className="sky-field-error" id="sky-title-error" role="alert">
              {titleError}
            </p>
          ) : null}
        </div>

        <div className="sky-form-footer">
          <p className="sky-form-note">
            Leave the time at 22:00 for the evening sky, or set the exact local
            hour. Stars are shown as they stood above the horizon, even by day.
          </p>
          <button
            className="sky-reset-button"
            onClick={resetConfigurator}
            type="button"
          >
            Reset
          </button>
        </div>
      </form>

      <fieldset aria-label="Choose the artwork style" className="sky-theme-picker">
        <legend>
          <span>2</span> Style
        </legend>
        <div className="sky-theme-options">
          {SKY_THEME_IDS.map((id) => (
            <button
              aria-pressed={theme === id}
              className={theme === id ? 'is-selected' : ''}
              key={id}
              onClick={() => {
                setTheme(id);
                setTouched(true);
              }}
              type="button"
            >
              <img
                alt=""
                aria-hidden="true"
                height={400}
                loading="lazy"
                src={`/images/your-sky/style-${id}.webp`}
                width={320}
              />
              <span>{SKY_THEME_LABELS[id]}</span>
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
