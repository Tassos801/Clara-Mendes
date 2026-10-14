import {useId} from 'react';
import type {DeliveryCountryChoice} from '~/lib/deliveryReach';

/**
 * Under a purchase button disabled because the item doesn't ship to the
 * buyer's country (not because it sold out): says so, and lets a buyer
 * sending it elsewhere switch the delivery country. The /locale action
 * moves the cart to that country too and comes back to this page; a plain
 * form post works before hydration.
 */
export function DeliveryCountryNote({
  choices,
  countryCode,
  countryPhrase,
  redirectTo,
}: {
  choices: DeliveryCountryChoice[] | null;
  countryCode: string;
  countryPhrase: string;
  redirectTo: string;
}) {
  const selectId = useId();

  return (
    <div className="delivery-country-note">
      <p>
        We don&rsquo;t deliver this item to {countryPhrase}.
        {choices?.length ? ' Sending it to another country? Choose where:' : ''}
      </p>
      {choices?.length ? (
        <form action="/locale" className="delivery-country-form" method="post">
          <input name="redirectTo" type="hidden" value={redirectTo} />
          <label className="sr-only" htmlFor={selectId}>
            Delivery country
          </label>
          <select defaultValue={countryCode} id={selectId} name="country">
            {choices.map((choice) => (
              <option key={choice.code} value={choice.code}>
                {choice.name}
              </option>
            ))}
          </select>
          <button className="secondary-button" type="submit">
            Update
          </button>
        </form>
      ) : null}
    </div>
  );
}
