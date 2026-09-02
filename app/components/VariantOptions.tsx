import {Link, useLocation} from 'react-router';

type SelectedOption = {name: string; value: string};
type OptionValue = {id?: string | null; name: string};
type ProductOption = {
  id?: string | null;
  name: string;
  optionValues: OptionValue[];
};
export type VariantOptionsVariant = {
  availableForSale: boolean;
  selectedOptions: SelectedOption[];
};
export type VariantOptionsProduct = {
  handle: string;
  productType?: string | null;
  options: ProductOption[];
  variants: {nodes: VariantOptionsVariant[]};
};

/**
 * Option pickers that keep the selection in the URL (`?Size=…&Finish=…`),
 * so deep links and the loader's `selectedOrFirstAvailableVariant` agree.
 * `basePath` defaults to the product URL; a feature page passes its own.
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
  const visibleOptions = product.options.filter(
    (option) =>
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
      {visibleOptions.map((option) => (
        <fieldset className="variant-fieldset" key={option.id || option.name}>
          <legend>{option.name}</legend>
          <div className="variant-options">
            {option.optionValues.map((value) => {
              const variant = findVariantForOption({
                optionName: option.name,
                optionValue: value.name,
                selectedMap,
                variants: product.variants.nodes,
              });
              const params = new URLSearchParams(location.search);
              const selected = selectedMap.get(option.name) === value.name;

              if (variant) {
                variant.selectedOptions.forEach((selectedOption) => {
                  params.set(selectedOption.name, selectedOption.value);
                });
              } else {
                params.set(option.name, value.name);
              }

              return (
                <Link
                  aria-current={selected ? 'true' : undefined}
                  aria-disabled={
                    variant?.availableForSale === false ? 'true' : undefined
                  }
                  className={[
                    selected ? 'is-selected' : '',
                    variant?.availableForSale === false ? 'is-unavailable' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  key={value.id || value.name}
                  preventScrollReset
                  replace
                  to={`${path}?${params.toString()}`}
                >
                  {value.name}
                </Link>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function findVariantForOption({
  optionName,
  optionValue,
  selectedMap,
  variants,
}: {
  optionName: string;
  optionValue: string;
  selectedMap: Map<string, string>;
  variants: VariantOptionsVariant[];
}) {
  return (
    variants.find((variant) =>
      variant.selectedOptions.every((option) => {
        if (option.name === optionName) return option.value === optionValue;
        const selected = selectedMap.get(option.name);
        return selected ? option.value === selected : true;
      }),
    ) ??
    variants.find((variant) =>
      variant.selectedOptions.some(
        (option) => option.name === optionName && option.value === optionValue,
      ),
    )
  );
}
