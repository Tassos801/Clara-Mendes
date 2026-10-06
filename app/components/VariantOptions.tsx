import {Link, useLocation} from 'react-router';
import {formatMoney} from '~/lib/money';
import {
  describeOptionValues,
  type OptionVariant,
  type PickerOption,
} from '~/lib/variantOptions';

export type VariantOptionsVariant = OptionVariant;
export type VariantOptionsProduct = {
  handle: string;
  productType?: string | null;
  options: PickerOption[];
  variants: {nodes: VariantOptionsVariant[]};
};

/**
 * Option pickers that keep the selection in the URL (`?Size=…&Finish=…`),
 * so deep links and the loader's `selectedOrFirstAvailableVariant` agree.
 * `basePath` defaults to the product URL; a feature page passes its own.
 *
 * Each legend repeats the current choice, so it stays readable when the
 * chips wrap on a phone, and a value shows its price when the values of
 * that option cost different amounts. A value that cannot be bought stays
 * selectable (to show it is sold out) and the purchase button disables.
 */
export function VariantOptions({
  basePath,
  product,
  selectedVariant,
}: {
  basePath?: string;
  product: VariantOptionsProduct;
  selectedVariant?: VariantOptionsVariant | null;
}) {
  const location = useLocation();
  const path = basePath ?? `/products/${product.handle}`;
  const selectedMap = new Map(
    selectedVariant?.selectedOptions.map((option) => [
      option.name,
      option.value,
    ]) ?? [],
  );
  // A picker with one value (e.g. "Finish: Unframed" on a print-catalog
  // print) offers no choice; the value still reaches the URL through the
  // other options' links, which carry every selected option.
  const visibleOptions = product.options.filter(
    (option) =>
      option.optionValues.length > 1 &&
      !(
        product.productType?.trim().toLowerCase() === 'art prints' &&
        option.name.trim().toLowerCase() === 'presentation'
      ),
  );

  if (!visibleOptions.length || product.variants.nodes.length <= 1) {
    return null;
  }

  return (
    <div className="product-options">
      {visibleOptions.map((option) => {
        const {showPrices, values} = describeOptionValues({
          option,
          selectedMap,
          variants: product.variants.nodes,
        });
        const selectedValue = selectedMap.get(option.name);

        return (
          <fieldset className="variant-fieldset" key={option.id || option.name}>
            <legend>
              {option.name}
              {selectedValue ? (
                <span className="variant-legend-value">
                  {' · '}
                  {selectedValue}
                </span>
              ) : null}
            </legend>
            <div
              className={`variant-options${
                showPrices ? ' variant-options--priced' : ''
              }`}
            >
              {values.map((value) => {
                const params = new URLSearchParams(location.search);
                value.targetOptions.forEach((selectedOption) => {
                  params.set(selectedOption.name, selectedOption.value);
                });
                const soldOut = value.available === false;

                return (
                  <Link
                    aria-current={value.selected ? 'true' : undefined}
                    aria-disabled={soldOut ? 'true' : undefined}
                    className={[
                      value.selected ? 'is-selected' : '',
                      soldOut ? 'is-unavailable' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    key={value.id}
                    preventScrollReset
                    replace
                    to={`${path}?${params.toString()}`}
                  >
                    <span className="variant-option-name">{value.name}</span>
                    {showPrices && value.price ? (
                      <span className="variant-option-price">
                        {formatMoney(value.price)}
                      </span>
                    ) : null}
                    {soldOut ? (
                      <span className="variant-option-status">Sold out</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
