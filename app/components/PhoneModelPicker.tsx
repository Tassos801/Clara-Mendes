import {Form} from 'react-router';
import type {ToughCasePhoneGroup} from '~/lib/toughCase';

export const PHONE_MODEL_PICKER_ID = 'tough-case-phone';

/**
 * The tough-case "Select your phone" picker: one grouped native select with
 * no model preselected, so the shopper must choose before the case can be
 * added. Without JavaScript it submits as a GET form (`?<name>=<model>`),
 * which is also the deep link the product loaders read.
 */
export function PhoneModelPicker({
  groups,
  hidden,
  name,
  onSelect,
  value,
}: {
  groups: ToughCasePhoneGroup[];
  /** Other selected options the form must carry, e.g. the artwork. */
  hidden?: Array<{name: string; value: string}>;
  name: string;
  onSelect: (model: string | null) => void;
  value: string | null;
}) {
  return (
    <Form
      className="variant-fieldset tough-case-phone"
      method="get"
      preventScrollReset
      replace
    >
      <label htmlFor={PHONE_MODEL_PICKER_ID}>Phone model</label>
      {hidden?.map((field) => (
        <input
          key={field.name}
          type="hidden"
          name={field.name}
          value={field.value}
        />
      ))}
      <select
        id={PHONE_MODEL_PICKER_ID}
        name={name}
        value={value ?? ''}
        onChange={(event) => onSelect(event.target.value || null)}
        required
      >
        <option value="" disabled>
          Select your phone
        </option>
        {groups.map(({brand, label, phones}) => (
          <optgroup key={brand} label={label}>
            {phones.map((phone) => (
              <option key={phone.code} value={phone.label}>
                {phone.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <noscript>
        <button className="secondary-button" type="submit">
          Choose
        </button>
      </noscript>
      <p className="tough-case-phone-help">
        Not sure? iPhone: Settings › General › About. Android: Settings › About
        phone.
      </p>
    </Form>
  );
}

/**
 * A <label> only focuses the select; on a phone the customer still has to
 * find and tap it. Bring it into view, focus it and, where the browser
 * allows, open the native picker straight away.
 */
export function focusPhoneModelPicker() {
  const select = document.getElementById(
    PHONE_MODEL_PICKER_ID,
  ) as HTMLSelectElement | null;
  if (!select) return;
  select.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth',
    block: 'center',
  });
  select.focus({preventScroll: true});
  try {
    select.showPicker?.();
  } catch {
    // Not supported for selects in this browser; focus is enough.
  }
}
