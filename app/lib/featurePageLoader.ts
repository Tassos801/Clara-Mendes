// The feature page's loader logic, kept free of framework imports (relative
// paths only) so the plain-Node test runner can exercise it with a product
// fixture. The route supplies the storefront call and the parsed URL options.
import {PERSONALISED_RELEASE_FLAGS} from './catalogFilters.ts';
import type {FeaturePage} from './featurePages.ts';
import {DEFAULT_SKY_THEME} from './sky/themes.ts';
import {STOREFRONT_ORIGIN} from './storefrontBasics.ts';

export type SelectedOption = {name: string; value: string};

export type FeatureProductVariables = {
  handle: string;
  selectedOptions: SelectedOption[];
};

export type LoadFeaturePageInput<TProduct> = {
  page: FeaturePage;
  env: {SKY_PREVIEW_UNLOCK?: string};
  selectedOptions: SelectedOption[];
  fetchProduct: (
    variables: FeatureProductVariables,
  ) => Promise<{product: TProduct | null | undefined}>;
  flags?: Record<string, boolean>;
};

/**
 * 404s while the page's product is dark (unless the preview environment
 * unlocks it, exactly as the product page does) or when Shopify has no such
 * product; otherwise resolves the product with the URL's selected variant.
 */
export async function loadFeaturePage<TProduct>({
  page,
  env,
  selectedOptions,
  fetchProduct,
  flags = PERSONALISED_RELEASE_FLAGS,
}: LoadFeaturePageInput<TProduct>) {
  const released = Boolean(flags[page.handle]);
  const previewUnlocked = env.SKY_PREVIEW_UNLOCK === 'true';
  if (!released && !previewUnlocked) {
    throw new Response('Not found', {status: 404});
  }
  const {product} = await fetchProduct({handle: page.handle, selectedOptions});
  if (!product) {
    throw new Response('Not found', {status: 404});
  }
  return {
    product,
    seoUrl: new URL(page.path, STOREFRONT_ORIGIN).toString(),
    skyTheme: DEFAULT_SKY_THEME,
  };
}
