import {useId} from 'react';
import {useFetcher, useLocation} from 'react-router';
import {MARKET_COUNTRIES, type MarketCountryCode} from '~/lib/markets';

export function MarketCountrySelector({
  availableCountries,
  country,
}: {
  availableCountries: MarketCountryCode[];
  country: MarketCountryCode;
}) {
  const fetcher = useFetcher<{error?: string}>();
  const location = useLocation();
  const redirectTo = `${location.pathname}${location.search}${location.hash}`;
  const selectId = useId();
  const errorId = useId();
  const error = fetcher.data?.error;
  const isSubmitting = fetcher.state !== 'idle';

  const availableMarkets = MARKET_COUNTRIES.filter(
    (market) =>
      availableCountries.includes(market.code) || market.code === country,
  );

  return (
    <fetcher.Form
      aria-busy={isSubmitting}
      className="market-selector"
      method="post"
      action="/locale"
    >
      <label className="sr-only" htmlFor={selectId}>
        Delivery country and currency
      </label>
      <select
        aria-label="Delivery country and currency"
        aria-describedby={error ? errorId : undefined}
        disabled={isSubmitting}
        id={selectId}
        name="country"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        value={country}
      >
        {availableMarkets.map((market) => (
          <option key={market.code} value={market.code}>
            {market.code} · {market.currency} — {market.name}
          </option>
        ))}
      </select>
      <input name="redirectTo" type="hidden" value={redirectTo} />
      <button className="sr-only" type="submit">
        Update delivery country
      </button>
      {error ? (
        <span className="sr-only" id={errorId} role="alert">
          {error}
        </span>
      ) : null}
    </fetcher.Form>
  );
}
