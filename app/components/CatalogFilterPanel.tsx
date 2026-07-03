import {useEffect, useState} from 'react';
import {useSearchParams} from 'react-router';
import {
  countActiveFacets,
  parseFacetSelection,
  type CatalogFacetOptions,
  type FacetOption,
} from '~/lib/catalogFacets';

/**
 * Faceted filter panel for collection pages. All state lives in the URL so
 * filtered views stay shareable and reset pagination correctly.
 */
export function CatalogFilterPanel({
  facets,
  open,
}: {
  facets: CatalogFacetOptions;
  open: boolean;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selection = parseFacetSelection(searchParams);
  const activeCount = countActiveFacets(selection);

  const [minInput, setMinInput] = useState(
    selection.priceMin != null ? String(selection.priceMin) : '',
  );
  const [maxInput, setMaxInput] = useState(
    selection.priceMax != null ? String(selection.priceMax) : '',
  );

  useEffect(() => {
    setMinInput(selection.priceMin != null ? String(selection.priceMin) : '');
    setMaxInput(selection.priceMax != null ? String(selection.priceMax) : '');
  }, [selection.priceMin, selection.priceMax]);

  const update = (mutate: (params: URLSearchParams) => void) => {
    void setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        // A new filter restarts pagination from the first page
        next.delete('cursor');
        next.delete('direction');
        mutate(next);
        return next;
      },
      {preventScrollReset: true},
    );
  };

  const toggleAvailable = () => {
    update((params) => {
      if (selection.available) {
        params.delete('available');
      } else {
        params.set('available', '1');
      }
    });
  };

  const toggleValue = (key: 'type' | 'vendor', value: string) => {
    update((params) => {
      const values = params.getAll(key);
      params.delete(key);
      for (const existing of values) {
        if (existing !== value) params.append(key, existing);
      }
      if (!values.includes(value)) params.append(key, value);
    });
  };

  const applyPrice = () => {
    update((params) => {
      params.delete('min');
      params.delete('max');
      const min = minInput.trim();
      const max = maxInput.trim();
      if (min !== '' && Number.isFinite(Number(min)) && Number(min) >= 0) {
        params.set('min', min);
      }
      if (max !== '' && Number.isFinite(Number(max)) && Number(max) >= 0) {
        params.set('max', max);
      }
    });
  };

  const clearAll = () => {
    update((params) => {
      params.delete('available');
      params.delete('min');
      params.delete('max');
      params.delete('type');
      params.delete('vendor');
    });
  };

  if (!open) return null;

  return (
    <div className="cv-facets" aria-label="Product filters">
      <div className="cv-facet-group">
        <p className="cv-facet-title">Availability</p>
        <label className="cv-facet-check">
          <input
            type="checkbox"
            checked={selection.available}
            onChange={toggleAvailable}
          />
          <span>In stock only</span>
        </label>
      </div>

      <div className="cv-facet-group">
        <p className="cv-facet-title">Price</p>
        <form
          className="cv-facet-price"
          onSubmit={(event) => {
            event.preventDefault();
            applyPrice();
          }}
        >
          <input
            aria-label="Minimum price"
            className="cv-facet-input"
            inputMode="decimal"
            min="0"
            placeholder="Min"
            type="number"
            value={minInput}
            onChange={(event) => setMinInput(event.target.value)}
          />
          <span className="cv-facet-dash" aria-hidden>
            –
          </span>
          <input
            aria-label="Maximum price"
            className="cv-facet-input"
            inputMode="decimal"
            min="0"
            placeholder="Max"
            type="number"
            value={maxInput}
            onChange={(event) => setMaxInput(event.target.value)}
          />
          <button className="cv-facet-apply" type="submit">
            Apply
          </button>
        </form>
      </div>

      <FacetChipGroup
        options={facets.productTypes}
        selected={selection.productTypes}
        title="Type"
        onToggle={(value) => toggleValue('type', value)}
      />

      <FacetChipGroup
        options={facets.vendors}
        selected={selection.vendors}
        title="Maker"
        onToggle={(value) => toggleValue('vendor', value)}
      />

      {activeCount > 0 ? (
        <div className="cv-facet-group cv-facet-group--clear">
          <button className="cv-facet-clear" type="button" onClick={clearAll}>
            Clear all ({activeCount})
          </button>
        </div>
      ) : null}
    </div>
  );
}

function FacetChipGroup({
  onToggle,
  options,
  selected,
  title,
}: {
  onToggle: (value: string) => void;
  options: FacetOption[];
  selected: string[];
  title: string;
}) {
  if (options.length === 0) return null;

  return (
    <div className="cv-facet-group">
      <p className="cv-facet-title">{title}</p>
      <div className="cv-facet-chips">
        {options.map((option) => {
          const isActive = selected.includes(option.label);
          return (
            <button
              key={option.label}
              className={`cv-facet-chip${isActive ? ' is-active' : ''}`}
              type="button"
              aria-pressed={isActive}
              onClick={() => onToggle(option.label)}
            >
              {option.label}
              {option.count != null ? (
                <span className="cv-facet-chip-count"> {option.count}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
