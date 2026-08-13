import {useId} from 'react';
import {Form, useLocation} from 'react-router';
import {MARKET_COUNTRIES, type MarketCountryCode} from '~/lib/markets';

export function MarketCountrySelector({country}: {country: MarketCountryCode}) {
  const location = useLocation();
  const redirectTo = `${location.pathname}${location.search}`;
  const selectId = useId();

  return (
    <Form className="market-selector" method="post" action="/locale">
      <label className="sr-only" htmlFor={selectId}>
        Delivery country and currency
      </label>
      <select
        aria-label="Delivery country and currency"
        id={selectId}
        name="country"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        value={country}
      >
        {MARKET_COUNTRIES.map((market) => (
          <option key={market.code} value={market.code}>
            {market.code} · {market.currency} — {market.name}
          </option>
        ))}
      </select>
      <input name="redirectTo" type="hidden" value={redirectTo} />
      <button className="sr-only" type="submit">
        Update delivery country
      </button>
    </Form>
  );
}
