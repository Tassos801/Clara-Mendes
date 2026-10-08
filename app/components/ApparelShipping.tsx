import {APPAREL_SHIPPING_RATES} from '~/lib/storefrontBasics';

const RATES_ID = 'apparel-shipping-rates';

function rate(zone: string) {
  return APPAREL_SHIPPING_RATES.find((entry) => entry.zone === zone)?.eur;
}

/** Opens the Shipping accordion and brings the rate table into view. */
function openRates(event: React.MouseEvent<HTMLAnchorElement>) {
  const details = document.getElementById(RATES_ID);
  if (!(details instanceof HTMLDetailsElement)) return;
  event.preventDefault();
  details.open = true;
  details.scrollIntoView({behavior: 'smooth', block: 'start'});
}

/** One line beside the price: the common destinations and the per-order rule. */
export function ApparelShippingLine() {
  return (
    <p className="apparel-shipping-line">
      <span>
        Shipping €{rate('Cyprus')} to Cyprus, €{rate('Rest of the EU')} to the
        rest of the EU, the US and Japan, from €{rate('Canada')} elsewhere.
      </span>{' '}
      <span>One fee per order, however many pieces.</span>{' '}
      <a href={`#${RATES_ID}`} onClick={openRates} className="text-link">
        All rates
      </a>
    </p>
  );
}

export const APPAREL_SHIPPING_DETAIL_ID = RATES_ID;

/** Every destination zone with its flat Standard rate. */
export function ApparelShippingRates() {
  return (
    <div className="apparel-shipping">
      <table className="apparel-table apparel-table--rates">
        <caption className="sr-only">Shipping fee by destination</caption>
        <thead>
          <tr>
            <th scope="col">Destination</th>
            <th scope="col">Shipping</th>
          </tr>
        </thead>
        <tbody>
          {APPAREL_SHIPPING_RATES.map((entry) => (
            <tr key={entry.zone}>
              <th scope="row">
                {entry.zone}
                {'note' in entry ? <small>{entry.note}</small> : null}
              </th>
              <td>€{entry.eur}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Charged once per order for Quiet Current pieces, however many you
        choose. Other Clara Mendes items in the same order ship at their own
        rates. Checkout confirms the fee for your address.
      </p>
    </div>
  );
}
