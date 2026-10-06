/**
 * Pure option-picker logic shared by `VariantOptions`: which variant each
 * option value leads to, whether it can be bought, and what it costs. Kept
 * out of the component so the node tests can pin it.
 */

type SelectedOption = {name: string; value: string};
type Money = {amount: string; currencyCode: string};

export type OptionVariant = {
  availableForSale: boolean;
  price?: Money | null;
  selectedOptions: SelectedOption[];
};

export type PickerOption = {
  id?: string | null;
  name: string;
  optionValues: Array<{id?: string | null; name: string}>;
};

export type PickerValue = {
  available: boolean | null;
  id: string;
  name: string;
  price: Money | null;
  selected: boolean;
  /** Every option of the variant this value leads to, for its URL. */
  targetOptions: SelectedOption[];
};

/**
 * The variant a value leads to: the one that keeps every other current
 * selection, or failing that any variant with this value.
 */
export function findVariantForOption<V extends OptionVariant>({
  optionName,
  optionValue,
  selectedMap,
  variants,
}: {
  optionName: string;
  optionValue: string;
  selectedMap: Map<string, string>;
  variants: readonly V[];
}): V | undefined {
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

/**
 * The values to render for one option. `showPrices` is true only when the
 * values lead to different prices, so a picker never repeats one price on
 * every chip.
 */
export function describeOptionValues<V extends OptionVariant>({
  option,
  selectedMap,
  variants,
}: {
  option: PickerOption;
  selectedMap: Map<string, string>;
  variants: readonly V[];
}): {showPrices: boolean; values: PickerValue[]} {
  const values = option.optionValues.map((value) => {
    const variant = findVariantForOption({
      optionName: option.name,
      optionValue: value.name,
      selectedMap,
      variants,
    });
    return {
      available: variant ? variant.availableForSale : null,
      id: value.id || value.name,
      name: value.name,
      price: variant?.price ?? null,
      selected: selectedMap.get(option.name) === value.name,
      targetOptions: variant
        ? variant.selectedOptions
        : [{name: option.name, value: value.name}],
    };
  });
  const prices = new Set(
    values
      .map((value) =>
        value.price ? `${value.price.amount} ${value.price.currencyCode}` : '',
      )
      .filter(Boolean),
  );
  return {
    showPrices: prices.size > 1 && values.every((value) => value.price),
    values,
  };
}

/** "8 × 10 in · 16 × 20 in" style summary of a variant's chosen options. */
export function selectedOptionsSummary(
  options: readonly SelectedOption[] | null | undefined,
  hiddenNames: readonly string[] = [],
) {
  const hidden = new Set(hiddenNames.map((name) => name.toLowerCase()));
  return (options ?? [])
    .filter(
      (option) =>
        option.value &&
        !hidden.has(option.name.toLowerCase()) &&
        !(option.name === 'Title' && option.value === 'Default Title'),
    )
    .map((option) => option.value)
    .join(' · ');
}
