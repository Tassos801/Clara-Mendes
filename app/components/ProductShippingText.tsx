type ProductShippingTextProps = {
  curatedShipping?: string | null;
  isPlantPot: boolean;
  dispatchWindow: string;
  deliveryWindow: string;
};

export function ProductShippingText({
  curatedShipping,
  isPlantPot,
  dispatchWindow,
  deliveryWindow,
}: ProductShippingTextProps) {
  if (curatedShipping) return <>{curatedShipping}</>;

  return (
    <>
      {isPlantPot ? (
        <>
          Pot-only orders: EUR 6.99 shipping across the EU, by untracked post
          from the UK. Mixed orders may combine shipping charges at checkout.
          Import taxes, duties and carrier fees may be payable on delivery and
          are not included.{' '}
        </>
      ) : null}
      Printed to order and dispatched within {dispatchWindow} business days.
      After dispatch, delivery is estimated at {deliveryWindow} business days
      across the EU. Delivery updates are emailed when available.
    </>
  );
}
