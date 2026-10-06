/**
 * Where a product line ships (mirrors its Shopify shipping profile):
 * `worldwide` — the EU plus the International market; `selected` — the EU
 * plus the non-EU countries whose shipping cost stays within the rate
 * (canvas, framed pieces); `eu` — the EU only (letter-post cards).
 */
export type ShippingReach = 'worldwide' | 'selected' | 'eu';

type ProductShippingTextProps = {
  curatedShipping?: string | null;
  isPlantPot: boolean;
  reach?: ShippingReach;
  dispatchWindow: string;
  deliveryWindow: string;
  internationalDeliveryWindow: string;
};

export function ProductShippingText({
  curatedShipping,
  isPlantPot,
  reach = 'worldwide',
  dispatchWindow,
  deliveryWindow,
  internationalDeliveryWindow,
}: ProductShippingTextProps) {
  if (curatedShipping) return <>{curatedShipping}</>;

  const elsewhere =
    reach === 'eu'
      ? '. We currently ship this item within the EU only.'
      : ` and ${internationalDeliveryWindow} business days elsewhere${
          reach === 'selected'
            ? '; outside the EU it ships to selected countries, and checkout confirms your address.'
            : '.'
        }`;
  // Pots come from the UK, so import charges can apply inside the EU too.
  const importNote = isPlantPot
    ? ' Import taxes, duties and carrier fees may be payable on delivery, in the EU too, and are not included.'
    : reach === 'eu'
      ? ''
      : ' Outside the EU, import taxes, duties and carrier fees may be payable on delivery and are not included.';

  return (
    <>
      {isPlantPot ? (
        <>
          Pot-only orders: EUR 6.99 shipping across the EU and EUR 11.99 to
          most other countries (not the US), by untracked post from the UK.
          Mixed orders may combine shipping charges at checkout.{' '}
        </>
      ) : null}
      Printed to order and dispatched within {dispatchWindow} business days.
      After dispatch, delivery is estimated at {deliveryWindow} business days
      across the EU{elsewhere} Delivery updates are emailed when available.
      {importNote}
    </>
  );
}
