import {isClothingProduct} from './clothing.ts';
import {formatMoney} from './money.ts';
import {PRINTFUL_SHIPPING_FEES} from './printfulShippingFees.ts';
import {
  APPAREL_PRODUCT_TYPES,
  isQuietCurrentProduct,
} from './storefrontBasics.ts';

/**
 * Shipping fees for the pieces Printful makes (clothing, and the museum
 * mugs, blankets and cushions), shown on the product page without touching
 * a cart. Printful's Shopify app files these products into its own shipping
 * profiles, one flat rate per profile and destination zone (set from
 * Printful's USD rates, so the EUR amounts move a cent or two as the
 * exchange rate does). The fee therefore depends on the product group and
 * the region, never on the variant or on the EU country.
 *
 * The amounts live in `printfulShippingFees.ts`, written by
 * `npm run shipping-fees` from real checkout quotes (one cart per probe
 * country, see scripts/build-shipping-fees.mjs). A page view never creates a
 * cart: Shopify counts every cart as a visit that added to cart, which is
 * what the old per-view quote did to the store's analytics.
 */
export type ShippingFee = {
  amount: string;
  currencyCode: string;
  /** True when the amount moves with an exchange rate between rebuilds. */
  about?: boolean;
};

/**
 * Pieces that pay the same fee everywhere share a group. Found by quoting
 * every Printful product in nine countries (2026-11-12): hoodies and
 * crewnecks; tees and long sleeves; caps; "light" pieces (beanies, totes,
 * activewear, cushion covers); mugs; blankets; cushions with an insert.
 * The rebuild quotes every product again and stops if a group splits.
 */
export const PRINTFUL_SHIPPING_GROUPS = [
  'hoodie',
  'tee',
  'cap',
  'light',
  'mug',
  'blanket',
  'cushion-insert',
] as const;
export type PrintfulShippingGroup = (typeof PRINTFUL_SHIPPING_GROUPS)[number];

// prettier-ignore
const EU = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
  'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES',
  'SE',
] as const;

/**
 * Destination regions and the countries the rebuild quotes for each. Every
 * EU country pays the same Printful fee, so the EU is one region, checked
 * in three countries on every rebuild (the rebuild stops if they differ).
 * Elsewhere a region is just the country quoted. A country in no region
 * shows no fee line; checkout still prices it.
 */
export const PRINTFUL_FEE_REGIONS = {
  EU: {countries: EU, probes: ['CY', 'DE', 'SK']},
  US: {countries: ['US'], probes: ['US']},
  CH: {countries: ['CH'], probes: ['CH']},
  NO: {countries: ['NO'], probes: ['NO']},
  CA: {countries: ['CA'], probes: ['CA']},
  AU: {countries: ['AU'], probes: ['AU']},
  JP: {countries: ['JP'], probes: ['JP']},
} as const satisfies Record<
  string,
  {countries: readonly string[]; probes: readonly string[]}
>;
export type PrintfulFeeRegion = keyof typeof PRINTFUL_FEE_REGIONS;

export function printfulFeeRegion(
  country: string | null | undefined,
): PrintfulFeeRegion | null {
  const code = country?.toUpperCase();
  if (!code) return null;
  for (const [region, {countries}] of Object.entries(PRINTFUL_FEE_REGIONS)) {
    if ((countries as readonly string[]).includes(code))
      return region as PrintfulFeeRegion;
  }
  return null;
}

type GroupProduct = {
  handle?: string | null;
  productType?: string | null;
  tags?: string[] | null;
};
type SelectedOption = {name: string; value: string};

const CLOTHING_GROUPS: Record<string, PrintfulShippingGroup> = {
  Hoodies: 'hoodie',
  Sweatshirts: 'hoodie',
  'T-Shirts': 'tee',
  'Long Sleeve Shirts': 'tee',
  'Tote Bags': 'light',
  ...Object.fromEntries(
    APPAREL_PRODUCT_TYPES.map((type) => [type, 'light' as const]),
  ),
};

/**
 * The Printful shipping group of one variant, or null for anything else
 * (Prodigi lines, Quiet Current, a garment type the table has not been
 * built for): those pages show no fee line from this table.
 */
export function printfulShippingGroup(
  product: GroupProduct,
  selectedOptions: readonly SelectedOption[] = [],
): PrintfulShippingGroup | null {
  const type = product.productType?.trim() ?? '';
  if (type === 'Mugs') return 'mug';
  if (type === 'Blankets') return 'blanket';
  if (type === 'Cushions') {
    const filling = selectedOptions.find((o) => o.name === 'Filling')?.value;
    return filling === 'With insert' ? 'cushion-insert' : 'light';
  }
  if (!isClothingProduct(product) || isQuietCurrentProduct(product.handle))
    return null;
  if (type === 'Hats') {
    return product.handle?.endsWith('-cap') ? 'cap' : 'light';
  }
  return CLOTHING_GROUPS[type] ?? null;
}

/**
 * Checkout's standard fee for one of this variant to the buyer's country,
 * from the checked-in table. Null when the piece does not ship there (the
 * variant is not for sale in the buyer's market or the zone has no rate),
 * when the table has no row for it, or when the table's currency is not
 * the one the buyer pays in.
 */
export function printfulShippingFee(
  product: GroupProduct,
  variant:
    | {
        selectedOptions?: readonly SelectedOption[] | null;
        price?: {currencyCode: string} | null;
      }
    | null
    | undefined,
  country: string | null | undefined,
  {ships = true}: {ships?: boolean} = {},
): ShippingFee | null {
  if (!variant || !ships) return null;
  const group = printfulShippingGroup(product, variant.selectedOptions ?? []);
  const region = printfulFeeRegion(country);
  if (!group || !region) return null;
  const fee: ShippingFee | undefined = (
    PRINTFUL_SHIPPING_FEES as Partial<
      Record<string, Partial<Record<string, ShippingFee>>>
    >
  )[group]?.[region];
  if (!fee) return null;
  if (variant.price && variant.price.currencyCode !== fee.currencyCode)
    return null;
  // Printful's dollar rates are fixed, so a USD fee is exact; the EUR
  // amounts follow the dollar by a cent or two between rebuilds.
  return fee.currencyCode === 'USD' ? fee : {...fee, about: true};
}

/** The fee as the page writes it: "about €6.53" when it can drift. */
export function shippingFeeText(fee: ShippingFee) {
  const money = formatMoney(fee);
  return fee.about ? `about ${money}` : money;
}
