import assert from 'node:assert/strict';
import {featurePageRedirect, YOUR_SKY_PAGE} from '../app/lib/featurePages.ts';

assert.equal(YOUR_SKY_PAGE.path, '/your-sky');
assert.equal(YOUR_SKY_PAGE.handle, 'your-sky-star-map');
assert.equal(YOUR_SKY_PAGE.occasions.length, 3);
assert.equal(YOUR_SKY_PAGE.how.length, 3);
assert.equal(YOUR_SKY_PAGE.faq.length, 3);
for (const occasion of YOUR_SKY_PAGE.occasions) {
  assert.ok(occasion.image.startsWith('/images/your-sky/'));
}

// The old product URL redirects to the page, query string intact.
assert.equal(
  featurePageRedirect(
    'your-sky-star-map',
    '?Size=8+%C3%97+10+in&Finish=Natural+frame',
  ),
  '/your-sky?Size=8+%C3%97+10+in&Finish=Natural+frame',
);
assert.equal(featurePageRedirect('your-sky-star-map', ''), '/your-sky');
assert.equal(featurePageRedirect('YOUR-SKY-STAR-MAP', ''), '/your-sky');
// Other products never redirect; a dark feature page never redirects either.
assert.equal(featurePageRedirect('quiet-form-i-art-print', ''), null);
assert.equal(featurePageRedirect(null, ''), null);
assert.equal(
  featurePageRedirect('your-sky-star-map', '', {'your-sky-star-map': false}),
  null,
);

// The page loader: resolves the product with the URL's selected options,
// and 404s when the flag is off (without touching the storefront) or when
// the product is missing. The preview unlock mirrors the product page.
const {loadFeaturePage} = await import('../app/lib/featurePageLoader.ts');
const {DEFAULT_SKY_THEME} = await import('../app/lib/sky/themes.ts');
const selectedOptions = [
  {name: 'Size', value: '20 × 24 in'},
  {name: 'Finish', value: 'Natural frame'},
];
const fixture = {
  id: 'gid://shopify/Product/1',
  handle: 'your-sky-star-map',
  title: 'Your Sky',
  selectedOrFirstAvailableVariant: {id: 'v2', sku: 'CM-SKY-20X24-NAT'},
  variants: {nodes: [{id: 'v1', sku: 'CM-SKY-8X10-UNF'}]},
};
const calls = [];
const loaded = await loadFeaturePage({
  page: YOUR_SKY_PAGE,
  env: {},
  flags: {'your-sky-star-map': true},
  selectedOptions,
  fetchProduct: async (variables) => {
    calls.push(variables);
    return {product: fixture};
  },
});
assert.deepEqual(calls, [{handle: 'your-sky-star-map', selectedOptions}]);
assert.equal(
  loaded.product.selectedOrFirstAvailableVariant.sku,
  'CM-SKY-20X24-NAT',
);
assert.equal(loaded.seoUrl, 'https://shopclaramendes.com/your-sky');
assert.equal(loaded.skyTheme, DEFAULT_SKY_THEME);

const is404 = (error) => error instanceof Response && error.status === 404;
await assert.rejects(
  loadFeaturePage({
    page: YOUR_SKY_PAGE,
    env: {},
    flags: {'your-sky-star-map': false},
    selectedOptions: [],
    fetchProduct: async () => {
      throw new Error('a dark page must not query the storefront');
    },
  }),
  is404,
);
const unlocked = await loadFeaturePage({
  page: YOUR_SKY_PAGE,
  env: {SKY_PREVIEW_UNLOCK: 'true'},
  flags: {'your-sky-star-map': false},
  selectedOptions: [],
  fetchProduct: async () => ({product: fixture}),
});
assert.equal(unlocked.product.id, fixture.id);
await assert.rejects(
  loadFeaturePage({
    page: YOUR_SKY_PAGE,
    env: {},
    flags: {'your-sky-star-map': true},
    selectedOptions: [],
    fetchProduct: async () => ({product: null}),
  }),
  is404,
);
