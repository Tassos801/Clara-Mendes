# Your Sky Feature Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the personalised star map its own night-editorial page at `/your-sky` — the only front door — while the product leaves the shop grid and every buying mechanism stays exactly as it is.

**Architecture:** One new route (`app/routes/your-sky.tsx`) renders a static hero, a `SkyStudio` block (the existing `SkyConfigurator` + the product page's buy panel lifted into shared components), and static story sections. A tiny "feature page" rule in `catalogFilters` keeps the product purchasable but unlisted; the product route 301-redirects the old URL; the sitemap/nav point at the page. Four static images are generated once from the real sky engine.

**Tech Stack:** Shopify Hydrogen (React Router 7, Storefront API), React, `sharp` + `esbuild` (already in `node_modules`) for the one-off image script, Node's built-in test runner (`npm test` runs `scripts/*.node-test.mjs`), Prettier + ESLint + `tsc`.

Spec: `docs/superpowers/specs/2026-09-02-your-sky-feature-page-design.md`. Branch: `fable/your-sky-feature-page` (stacked on `fable/review-fixes`, PR #66).

---

## File structure

**Create**
- `app/lib/featurePages.ts` — the page config (path, nav label, all copy) + `featurePageRedirect()`.
- `app/lib/money.ts` — `formatMoney()` (lifted from the product route).
- `app/lib/productVariantFragment.ts` — `PRODUCT_VARIANT_FRAGMENT` (lifted from the product route).
- `app/components/VariantOptions.tsx`, `app/components/ProductPrice.tsx` — lifted from the product route; `VariantOptions` gains a `basePath` prop.
- `app/components/SkyStudio.tsx` — configurator + buy panel + sticky bar.
- `app/routes/your-sky.tsx` — the page.
- `scripts/lib/your-sky-render.tsx` + `scripts/generate-your-sky-images.mjs` — image generation; outputs `public/images/your-sky/*.webp`.
- `scripts/featurePages.node-test.mjs`.

**Modify**
- `app/lib/catalogFilters.ts` — `FEATURE_PAGE_PATHS`, `isFeaturePageHandle`, `featurePagePath`, `isListedProduct`; `filterDemoProducts` becomes the listing filter.
- `app/lib/sitemap.ts`, `app/lib/recentlyViewed.ts`, `app/routes/search.tsx`, `app/routes/products.$handle.tsx`, `app/components/ClaraShell.tsx`, `app/styles/app.css`, `package.json`, `scripts/catalogFilters.node-test.mjs`, `scripts/sitemap.node-test.mjs`, `docs/your-sky-release.md`.

---

### Task 1: The feature-page catalog rule

**Files:**
- Modify: `app/lib/catalogFilters.ts`
- Test: `scripts/catalogFilters.node-test.mjs`

- [ ] **Step 1: Write the failing test** — append to `scripts/catalogFilters.node-test.mjs` (add `featurePagePath, filterDemoProducts, isFeaturePageHandle, isListedProduct, SKY_PRODUCT_HANDLE` to the import list):

```js
// A feature-page product is purchasable (PDP loader, cart) but never listed:
// grid, search, recommendations, recently viewed, products sitemap.
{
  const sky = {
    handle: SKY_PRODUCT_HANDLE,
    productType: 'Personalised Art',
    tags: ['Clara Mendes Original', 'personalised', 'gift'],
    title: 'Your Sky — a personalised star map',
    vendor: 'Clara Mendes',
  };
  assert.equal(isFeaturePageHandle(SKY_PRODUCT_HANDLE), true);
  assert.equal(isFeaturePageHandle('Your-Sky-Star-Map'), true);
  assert.equal(isFeaturePageHandle('quiet-form-i-art-print'), false);
  assert.equal(featurePagePath(SKY_PRODUCT_HANDLE), '/your-sky');
  assert.equal(featurePagePath('quiet-form-i-art-print'), null);
  assert.equal(isStoreThemeProduct(sky), true);
  assert.equal(isDemoProduct(sky), false);
  assert.equal(isListedProduct(sky), false);
  assert.equal(isListedProduct(print), true);
  assert.deepEqual(
    filterDemoProducts([print, sky, phoneCase]).map((p) => p.handle),
    [print.handle],
  );
}
```

- [ ] **Step 2: Run it** — `node scripts/catalogFilters.node-test.mjs` → FAIL: `SyntaxError: The requested module ... does not provide an export named 'isFeaturePageHandle'`.

- [ ] **Step 3: Implement** — in `app/lib/catalogFilters.ts`, directly after `export const NATAL_PRODUCT_HANDLE = ...`:

```ts
/**
 * Products sold only through a dedicated feature page. They stay
 * purchasable (the PDP loader admits them so the old URL can redirect, and
 * the cart never cares) but are excluded from every listing surface: shop
 * grid, search, recommendations, recently viewed, and the products sitemap.
 * The page itself is listed in the custom sitemap instead.
 */
export const FEATURE_PAGE_PATHS: Readonly<Record<string, string>> = {
  [SKY_PRODUCT_HANDLE]: '/your-sky',
};

export function featurePagePath(handle?: string | null) {
  const key = handle?.toLowerCase();
  return key ? (FEATURE_PAGE_PATHS[key] ?? null) : null;
}

export function isFeaturePageHandle(handle?: string | null) {
  return featurePagePath(handle) !== null;
}
```

and after `isStoreThemeProduct`:

```ts
/** Sellable AND allowed on listing surfaces (grid, search, rails, sitemap). */
export function isListedProduct(product: CatalogProductLike) {
  return isStoreThemeProduct(product) && !isFeaturePageHandle(product.handle);
}
```

then change `filterDemoProducts` to filter with `isListedProduct` and update its docblock:

```ts
/** Listing filter: every listing surface goes through this, so a feature-page
 * product never shows up next to the prints. */
export function filterDemoProducts<T extends CatalogProductLike>(
  products: T[],
) {
  return products.filter(isListedProduct);
}
```

- [ ] **Step 4: Run** — `node scripts/catalogFilters.node-test.mjs` → exit 0.
- [ ] **Step 5: Commit** — `git add app/lib/catalogFilters.ts scripts/catalogFilters.node-test.mjs && git commit -m "Add the feature-page catalog rule"`.

---

### Task 2: Sitemap, search, recently viewed

**Files:**
- Modify: `app/lib/sitemap.ts`, `app/routes/search.tsx`, `app/lib/recentlyViewed.ts`
- Test: `scripts/sitemap.node-test.mjs`

- [ ] **Step 1: Failing test** — in `scripts/sitemap.node-test.mjs`, the fixture already contains `/products/your-sky-star-map` and asserts it is KEPT. Flip that assertion and add the custom path:

```js
assert.ok(
  !filtered.includes('/products/your-sky-star-map'),
  'the star map is sold on its feature page, not as a product URL',
);
```

and in the `CUSTOM_SITEMAP_PATHS` deepEqual list insert `'/your-sky',` immediately after `'/collections/ink-and-cream-gallery-wall',`.

- [ ] **Step 2: Run** — `node scripts/sitemap.node-test.mjs` → FAIL on the first assertion.

- [ ] **Step 3: Implement** — `app/lib/sitemap.ts`: add `FEATURE_PAGE_PATHS, isFeaturePageHandle,` to the import from `./catalogFilters.ts`; in `CUSTOM_SITEMAP_PATHS` insert after the gallery pages spread:

```ts
  // Feature pages (e.g. /your-sky) replace their product URL.
  ...Object.values(FEATURE_PAGE_PATHS),
```

and in `removeExcludedSitemapEntries` after the `isUnreleasedExtensionHandle` line:

```ts
    if (type === 'products' && isFeaturePageHandle(handle)) return '';
```

`app/routes/search.tsx`: replace the `isDemoProduct` import with `isListedProduct` and both filters `(product) => !isDemoProduct(product)` with `(product) => isListedProduct(product)`.

`app/lib/recentlyViewed.ts`: import `{isFeaturePageHandle} from './catalogFilters.ts'` and in `getRecentlyViewed` change the filter to `.filter((entry) => !excluded.has(entry.handle) && !isFeaturePageHandle(entry.handle))`.

- [ ] **Step 4: Run** — `node scripts/sitemap.node-test.mjs` → exit 0; `npm run typecheck` → exit 0.
- [ ] **Step 5: Commit** — `git commit -am "Keep feature-page products out of sitemap, search and recently viewed"`.

---

### Task 3: Page config and redirect

**Files:**
- Create: `app/lib/featurePages.ts`, `scripts/featurePages.node-test.mjs`

- [ ] **Step 1: Failing test** — `scripts/featurePages.node-test.mjs`:

```js
import assert from 'node:assert/strict';
import {
  featurePageRedirect,
  YOUR_SKY_PAGE,
} from '../app/lib/featurePages.ts';

assert.equal(YOUR_SKY_PAGE.path, '/your-sky');
assert.equal(YOUR_SKY_PAGE.handle, 'your-sky-star-map');
assert.equal(YOUR_SKY_PAGE.occasions.length, 3);
assert.equal(YOUR_SKY_PAGE.faq.length, 3);

// The old product URL redirects to the page, query string intact.
assert.equal(
  featurePageRedirect('your-sky-star-map', '?Size=8+%C3%97+10+in&Finish=Natural+frame'),
  '/your-sky?Size=8+%C3%97+10+in&Finish=Natural+frame',
);
assert.equal(featurePageRedirect('your-sky-star-map', ''), '/your-sky');
assert.equal(featurePageRedirect('YOUR-SKY-STAR-MAP', ''), '/your-sky');
// Other products never redirect; a dark feature page never redirects either.
assert.equal(featurePageRedirect('quiet-form-i-art-print', ''), null);
assert.equal(
  featurePageRedirect('your-sky-star-map', '', {'your-sky-star-map': false}),
  null,
);
```

- [ ] **Step 2: Run** — `node scripts/featurePages.node-test.mjs` → FAIL (module not found).

- [ ] **Step 3: Implement** — `app/lib/featurePages.ts`:

```ts
// Relative imports keep this module loadable by the plain-Node test runner.
import {
  featurePagePath,
  PERSONALISED_RELEASE_FLAGS,
  SKY_PRODUCT_HANDLE,
} from './catalogFilters.ts';

export type FeaturePage = {
  handle: string;
  path: string;
  navLabel: string;
  title: string;
  description: string;
  hero: {
    eyebrow: string;
    headline: string;
    sub: string;
    priceLine: string;
    cta: string;
    image: {src: string; alt: string; width: number; height: number};
  };
  studio: {eyebrow: string; heading: string; note: string};
  occasions: Array<{title: string; line: string; image: string}>;
  how: Array<{title: string; body: string}>;
  faq: Array<{q: string; a: string}>;
  closing: string;
};

export const YOUR_SKY_PAGE: FeaturePage = {
  handle: SKY_PRODUCT_HANDLE,
  path: '/your-sky',
  navLabel: 'Your Sky',
  title: 'Your Sky — a personalised star map',
  description:
    'The real night sky over a place and a moment that matter, drawn as a fine-art print by Clara Mendes. Choose the place, date and title; printed to order in the EU.',
  hero: {
    eyebrow: 'A personalised star map',
    headline: 'The sky above you, the night it mattered.',
    sub: 'Every star as it truly stood over the place and the minute you choose — drawn as a Clara Mendes print, with your own title beneath it.',
    priceLine: 'From €39.99 · made to order in the EU · unframed or framed',
    cta: 'Design yours',
    image: {
      src: '/images/your-sky/hero-print.webp',
      alt: 'A framed Your Sky star map print — the linen edition in a natural frame on a dark wall',
      width: 2400,
      height: 1500,
    },
  },
  studio: {
    eyebrow: 'Your sky, your print',
    heading: 'Begin with a place and a date.',
    note: 'The map redraws as you type. Leave the time as it is for the evening sky, or set the exact hour.',
  },
  occasions: [
    {
      title: 'The night you met',
      line: 'The city, the date, the hour you still argue about.',
      image: '/images/your-sky/occasion-met.webp',
    },
    {
      title: 'The morning she was born',
      line: 'Her first sky, exactly as it stood over the hospital.',
      image: '/images/your-sky/occasion-born.webp',
    },
    {
      title: 'Where you said yes',
      line: 'The place, the evening, the stars that were watching.',
      image: '/images/your-sky/occasion-yes.webp',
    },
  ],
  how: [
    {
      title: 'Astronomically accurate',
      body: 'Star positions, the Moon and the visible planets are computed for your place and minute from the Hipparcos catalogue and astronomy-engine, then drawn above the true horizon.',
    },
    {
      title: 'Printed like the art',
      body: 'Giclée on 200gsm Enhanced Matte Art paper, unframed or in a natural or black classic frame — the same materials as every Clara Mendes print.',
    },
    {
      title: 'Made to order in the EU',
      body: 'Each map is printed for you after checkout, dispatched in 2–4 business days and delivered across the EU in 5–10.',
    },
  ],
  faq: [
    {
      q: 'Can I set an exact time?',
      a: 'Yes. The default is 22:00 local time — the evening sky — but any hour works, day or night; stars are shown as they stood above the horizon even by day.',
    },
    {
      q: 'Which finish should I choose?',
      a: 'Unframed if you already have a frame or want to choose one later; the natural or black classic frame arrives ready to hang.',
    },
    {
      q: 'Can it be a gift?',
      a: 'It usually is. Add the recipient’s address at checkout; the print ships in plain, white-label packaging with no price inside.',
    },
  ],
  closing: 'Begin with a place and a date.',
};

/**
 * Where a feature-page product's old product URL should go, query string
 * intact, or null when the handle has no page or the page is still dark.
 */
export function featurePageRedirect(
  handle: string | null | undefined,
  search: string,
  flags: Record<string, boolean> = PERSONALISED_RELEASE_FLAGS,
) {
  const path = featurePagePath(handle);
  if (!path || !handle || !flags[handle.toLowerCase()]) return null;
  return `${path}${search}`;
}
```

- [ ] **Step 4: Run** — `node scripts/featurePages.node-test.mjs` → exit 0.
- [ ] **Step 5: Commit** — `git add app/lib/featurePages.ts scripts/featurePages.node-test.mjs && git commit -m "Add the Your Sky page config and redirect rule"`.

---

### Task 4: Lift the buy-panel pieces out of the product route

**Files:**
- Create: `app/lib/money.ts`, `app/lib/productVariantFragment.ts`, `app/components/ProductPrice.tsx`, `app/components/VariantOptions.tsx`
- Modify: `app/routes/products.$handle.tsx`

No behaviour change; `npm run typecheck` and `npm test` are the test.

- [ ] **Step 1:** `app/lib/money.ts`:

```ts
export type MoneyAmount = {amount: string; currencyCode: string};

export function formatMoney(price: MoneyAmount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currencyCode,
  }).format(Number(price.amount));
}
```

- [ ] **Step 2:** `app/lib/productVariantFragment.ts` — move the `PRODUCT_VARIANT_FRAGMENT` constant from the product route verbatim and `export` it.

- [ ] **Step 3:** `app/components/ProductPrice.tsx`:

```tsx
import {formatMoney, type MoneyAmount} from '~/lib/money';

export function ProductPrice({
  compareAtPrice,
  price,
}: {
  compareAtPrice?: MoneyAmount | null;
  price: MoneyAmount;
}) {
  return (
    <div className="product-price">
      {compareAtPrice ? (
        <span className="product-price-on-sale">
          {formatMoney(price)} <s>{formatMoney(compareAtPrice)}</s>
        </span>
      ) : (
        formatMoney(price)
      )}
    </div>
  );
}
```

- [ ] **Step 4:** `app/components/VariantOptions.tsx` — the product route's `VariantOptions` + `findVariantForOption`, with structural types and a `basePath` prop:

```tsx
import {Link, useLocation} from 'react-router';

type SelectedOption = {name: string; value: string};
type OptionValue = {id?: string | null; name: string};
type ProductOption = {id?: string | null; name: string; optionValues: OptionValue[]};
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
```

- [ ] **Step 5:** In `app/routes/products.$handle.tsx`: delete the local `ProductPrice`, `VariantOptions`, `findVariantForOption`, `formatMoney`, `PRODUCT_VARIANT_FRAGMENT` and the local `MoneyAmount` type; add imports `import {formatMoney, type MoneyAmount} from '~/lib/money';`, `import {ProductPrice} from '~/components/ProductPrice';`, `import {VariantOptions} from '~/components/VariantOptions';`, `import {PRODUCT_VARIANT_FRAGMENT} from '~/lib/productVariantFragment';`. Every existing call site keeps working (`VariantOptions` without `basePath` defaults to the product URL).

- [ ] **Step 6: Run** — `npm run typecheck` → 0; `npm test` → all pass; `npm run lint` → 0 errors.
- [ ] **Step 7: Commit** — `git add -A app && git commit -m "Lift the buy-panel pieces into shared components"`.

---

### Task 5: Redirect the old product URL

**Files:**
- Modify: `app/routes/products.$handle.tsx` (loader top), `app/components/ClaraShell.tsx`

- [ ] **Step 1:** In the product loader, right after the `if (!handle) throw ...` guard:

```ts
  // Feature-page products (Your Sky) are sold on their own page; the old
  // product URL keeps working through a permanent redirect that preserves
  // the variant selection in the query string.
  const featureRedirect = featurePageRedirect(
    handle,
    new URL(request.url).search,
  );
  if (featureRedirect) {
    throw redirect(featureRedirect, 301);
  }
```

with `import {featurePageRedirect} from '~/lib/featurePages';`.

- [ ] **Step 2:** `app/components/ClaraShell.tsx` — replace the Your Sky nav entry so it uses the page:

```ts
  ...(PERSONALISED_RELEASE_FLAGS[SKY_PRODUCT_HANDLE]
    ? [{to: YOUR_SKY_PAGE.path, label: YOUR_SKY_PAGE.navLabel}]
    : []),
```

with `import {YOUR_SKY_PAGE} from '~/lib/featurePages';`.

- [ ] **Step 3: Run** — `npm run typecheck` → 0.
- [ ] **Step 4: Commit** — `git commit -am "Redirect the star-map product URL to its feature page"`.

---

### Task 6: The studio component

**Files:**
- Create: `app/components/SkyStudio.tsx`

- [ ] **Step 1:** `app/components/SkyStudio.tsx`:

```tsx
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AddToCartButton} from '~/components/AddToCartButton';
import {useAside} from '~/components/Aside';
import {ProductPrice} from '~/components/ProductPrice';
import {SkyConfigurator} from '~/components/SkyConfigurator';
import {
  VariantOptions,
  type VariantOptionsProduct,
} from '~/components/VariantOptions';
import {formatMoney, type MoneyAmount} from '~/lib/money';
import {toCartAttributes, type SkyParams, type SkyThemeId} from '~/lib/sky/params';
import {SKY_SIZES, skySizeFromOptions} from '~/lib/sky/products';

export type StudioVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  price: MoneyAmount;
  compareAtPrice?: MoneyAmount | null;
  selectedOptions: Array<{name: string; value: string}>;
  sku?: string | null;
  image?: {url: string; altText?: string | null} | null;
};

export type StudioProduct = VariantOptionsProduct & {
  id: string;
  title: string;
  vendor?: string | null;
  featuredImage?: {url: string; altText?: string | null} | null;
  variants: {nodes: StudioVariant[]};
};

/**
 * The buying half of the Your Sky page: the live configurator on one side,
 * size/finish, price and add-to-cart on the other. Owns the validated
 * personalisation exactly as the product page did; the cart line carries
 * the same signed attributes.
 */
export function SkyStudio({
  basePath,
  eyebrow,
  heading,
  note,
  product,
  selectedVariant,
  theme,
}: {
  basePath: string;
  eyebrow: string;
  heading: string;
  note: string;
  product: StudioProduct;
  selectedVariant: StudioVariant | null;
  theme: SkyThemeId;
}) {
  const {open} = useAside();
  const openCart = useCallback(() => open('cart'), [open]);
  const [skyParams, setSkyParams] = useState<SkyParams | null>(null);
  const atcRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);

  const skySize = skySizeFromOptions(selectedVariant?.selectedOptions);
  const attributes = skyParams ? toCartAttributes(skyParams) : undefined;
  const purchaseBlocked = !selectedVariant?.availableForSale || !skyParams;
  const price = selectedVariant ? formatMoney(selectedVariant.price) : null;
  const buttonLabel = !skyParams
    ? 'Add your place and date'
    : selectedVariant?.availableForSale && price
      ? `Add to cart · ${price}`
      : 'Unavailable';
  const stickyLabel = !skyParams
    ? 'Add your place and date'
    : selectedVariant?.availableForSale && price
      ? `Add · ${price}`
      : 'Unavailable';

  const lines = useMemo(
    () =>
      selectedVariant
        ? [
            {
              merchandiseId: selectedVariant.id,
              quantity: 1,
              selectedVariant,
              ...(attributes ? {attributes} : {}),
            },
          ]
        : [],
    [attributes, selectedVariant],
  );
  const analytics = useMemo(
    () => ({
      products: selectedVariant
        ? [
            {
              productGid: product.id,
              variantGid: selectedVariant.id,
              name: product.title,
              variantName: selectedVariant.title,
              brand: product.vendor || 'Clara Mendes',
              price: selectedVariant.price.amount,
              currency: selectedVariant.price.currencyCode,
              quantity: 1,
              category: product.productType || undefined,
              sku: selectedVariant.sku || undefined,
            },
          ]
        : [],
    }),
    [product.id, product.productType, product.title, product.vendor, selectedVariant],
  );

  useEffect(() => {
    const target = atcRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) =>
        setShowSticky(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      {threshold: 0},
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="your-sky-studio" id="design" aria-labelledby="your-sky-studio-heading">
      <div className="your-sky-studio-map">
        <SkyConfigurator size={skySize} theme={theme} onChange={setSkyParams} />
      </div>
      <div className="your-sky-studio-panel">
        <p className="eyebrow">{eyebrow}</p>
        <h2 id="your-sky-studio-heading">{heading}</h2>
        <p className="your-sky-studio-note">{note}</p>
        <VariantOptions
          basePath={basePath}
          product={product}
          selectedVariant={selectedVariant}
        />
        <p className="your-sky-studio-size">
          {SKY_SIZES[skySize].label} · giclée on 200gsm Enhanced Matte Art paper
        </p>
        {selectedVariant ? (
          <ProductPrice
            price={selectedVariant.price}
            compareAtPrice={selectedVariant.compareAtPrice}
          />
        ) : null}
        <div ref={atcRef} className="your-sky-studio-buy">
          <AddToCartButton
            analytics={analytics}
            className="primary-button full-width"
            disabled={purchaseBlocked}
            lines={lines}
            onSuccess={openCart}
            pendingChildren="Adding..."
          >
            {buttonLabel}
          </AddToCartButton>
        </div>
        <ul className="product-assurance-list" aria-label="Order reassurance">
          <li>
            <span aria-hidden />
            Printed to order; tracking details are emailed after dispatch.
          </li>
          <li>
            <span aria-hidden />
            Your place, date and title travel with the order and are checked before printing.
          </li>
        </ul>
      </div>

      <div className={`sticky-atc-bar ${showSticky ? 'is-visible' : ''}`}>
        <div className="sticky-atc-info">
          <div>
            <p className="sticky-atc-title">{product.title}</p>
            {price ? <p className="sticky-atc-price">{price}</p> : null}
          </div>
        </div>
        <AddToCartButton
          analytics={analytics}
          className="primary-button sticky-atc-button"
          disabled={purchaseBlocked}
          lines={lines}
          onSuccess={openCart}
        >
          {stickyLabel}
        </AddToCartButton>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Run** — `npm run typecheck` → 0 (the component is not yet mounted; the type contract is the check).
- [ ] **Step 3: Commit** — `git add app/components/SkyStudio.tsx && git commit -m "Add the Your Sky studio component"`.

---

### Task 7: The page route

**Files:**
- Create: `app/routes/your-sky.tsx`
- Modify: `app/styles/app.css`

- [ ] **Step 1:** `app/routes/your-sky.tsx`:

```tsx
import {getSelectedProductOptions} from '@shopify/hydrogen';
import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/your-sky';
import {SkyStudio, type StudioProduct} from '~/components/SkyStudio';
import {StructuredData} from '~/components/StructuredData';
import {PERSONALISED_RELEASE_FLAGS} from '~/lib/catalogFilters';
import {YOUR_SKY_PAGE} from '~/lib/featurePages';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/productCardFragment';
import {PRODUCT_VARIANT_FRAGMENT} from '~/lib/productVariantFragment';
import {breadcrumbSchema, buildSeoMeta, getCanonicalUrl, productSchema} from '~/lib/seo';
import {DEFAULT_SKY_THEME} from '~/lib/sky/themes';
import {STOREFRONT_ORIGIN} from '~/lib/storefrontBasics';

const page = YOUR_SKY_PAGE;

export const meta: Route.MetaFunction = ({data}) =>
  buildSeoMeta({
    description: page.description,
    image: `${STOREFRONT_ORIGIN}${page.hero.image.src}`,
    title: page.title,
    type: 'product',
    url: data?.seoUrl ?? `${STOREFRONT_ORIGIN}${page.path}`,
  });

export async function loader({context, request}: Route.LoaderArgs) {
  const released = PERSONALISED_RELEASE_FLAGS[page.handle];
  const previewUnlocked = context.env.SKY_PREVIEW_UNLOCK === 'true';
  if (!released && !previewUnlocked) {
    throw new Response('Not found', {status: 404});
  }
  const data = await context.storefront.query(FEATURE_PRODUCT_QUERY, {
    variables: {
      handle: page.handle,
      selectedOptions: getSelectedProductOptions(request),
    },
  });
  if (!data.product) {
    throw new Response('Not found', {status: 404});
  }
  return {
    product: data.product as StudioProduct & {
      description: string;
      selectedOrFirstAvailableVariant?: StudioProduct['variants']['nodes'][number] | null;
      priceRange?: {
        minVariantPrice?: {amount: string; currencyCode: string};
        maxVariantPrice?: {amount: string; currencyCode: string};
      };
    },
    seoUrl: getCanonicalUrl(request, page.path),
    skyTheme: DEFAULT_SKY_THEME,
  };
}

export default function YourSkyPage() {
  const {product, seoUrl, skyTheme} = useLoaderData<typeof loader>();
  const selectedVariant =
    product.selectedOrFirstAvailableVariant ?? product.variants.nodes[0] ?? null;

  return (
    <div className="your-sky-page">
      <StructuredData
        data={[
          productSchema({
            availableForSale: product.variants.nodes.some((v) => v.availableForSale),
            description: page.description,
            image: `${STOREFRONT_ORIGIN}${page.hero.image.src}`,
            priceRange: product.priceRange,
            productId: product.id,
            productType: product.productType,
            sku: selectedVariant?.sku,
            title: product.title,
            url: seoUrl,
            vendor: product.vendor,
            variants: product.variants.nodes,
          }),
          breadcrumbSchema({
            items: [
              {name: 'Home', url: `${STOREFRONT_ORIGIN}/`},
              {name: page.navLabel, url: seoUrl},
            ],
          }),
        ]}
      />

      <section className="your-sky-hero" aria-labelledby="your-sky-headline">
        <div className="your-sky-hero-copy">
          <p className="eyebrow">{page.hero.eyebrow}</p>
          <h1 id="your-sky-headline">{page.hero.headline}</h1>
          <p className="your-sky-hero-sub">{page.hero.sub}</p>
          <p className="your-sky-hero-price">{page.hero.priceLine}</p>
          <a className="primary-button your-sky-hero-cta" href="#design">
            {page.hero.cta}
          </a>
        </div>
        <figure className="your-sky-hero-figure">
          <img
            src={page.hero.image.src}
            alt={page.hero.image.alt}
            width={page.hero.image.width}
            height={page.hero.image.height}
            fetchPriority="high"
            decoding="async"
          />
        </figure>
      </section>

      <SkyStudio
        basePath={page.path}
        eyebrow={page.studio.eyebrow}
        heading={page.studio.heading}
        note={page.studio.note}
        product={product}
        selectedVariant={selectedVariant}
        theme={skyTheme}
      />

      <section className="your-sky-occasions" aria-label="Occasions">
        <p className="eyebrow">For the nights worth keeping</p>
        <ul>
          {page.occasions.map((occasion) => (
            <li key={occasion.title}>
              <a href="#design">
                <img src={occasion.image} alt="" width={800} height={1000} loading="lazy" decoding="async" />
                <h3>{occasion.title}</h3>
                <p>{occasion.line}</p>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="your-sky-how" aria-label="How it is made">
        <p className="eyebrow">How it is made</p>
        <dl>
          {page.how.map((item) => (
            <div key={item.title}>
              <dt>{item.title}</dt>
              <dd>{item.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="your-sky-faq" aria-label="Questions">
        <p className="eyebrow">Good to know</p>
        {page.faq.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </section>

      <section className="your-sky-closing">
        <h2>{page.closing}</h2>
        <a className="primary-button" href="#design">{page.hero.cta}</a>
        <p>
          Prefer the prints? <Link to="/collections/all">Browse the collection</Link>.
        </p>
      </section>
    </div>
  );
}

const FEATURE_PRODUCT_QUERY = `#graphql
  query FeaturePageProduct(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...ClaraProductCard
      description
      options {
        id
        name
        optionValues {
          id
          name
        }
      }
      selectedOrFirstAvailableVariant(
        selectedOptions: $selectedOptions
        ignoreUnknownOptions: true
        caseInsensitiveMatch: true
      ) {
        ...ClaraProductVariant
      }
      variants(first: 20) {
        nodes {
          ...ClaraProductVariant
        }
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;
```

- [ ] **Step 2:** Append to `app/styles/app.css` (night palette from `app/lib/sky/themes.ts`, store palette from `:root`):

```css
/* ---------- Your Sky feature page ---------- */
.your-sky-page {
  --night: #141b2b;
  --night-deep: #0c111c;
  --star: #f1e3b8;
  --bronze: #b08d57;
  --night-muted: #b7ad93;
  --night-title: #f4ecd8;
  margin-top: calc(-1 * var(--header-height, 76px));
}

.your-sky-hero {
  position: relative;
  display: grid;
  gap: clamp(24px, 4vw, 56px);
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  align-items: center;
  padding: calc(var(--header-height, 76px) + clamp(48px, 8vw, 112px)) clamp(20px, 6vw, 96px) clamp(48px, 8vw, 112px);
  background:
    radial-gradient(ellipse at 62% 48%, #22304a 0, var(--night) 48%, var(--night-deep) 100%);
  color: var(--night-title);
  overflow: hidden;
}

.your-sky-hero .eyebrow {
  color: var(--bronze);
}

.your-sky-hero h1 {
  margin: 0.4rem 0 1rem;
  font-family: var(--serif);
  font-weight: 400;
  font-size: clamp(2.4rem, 5.2vw, 4.4rem);
  line-height: 1.02;
  letter-spacing: -0.01em;
  color: var(--night-title);
  animation: your-sky-rise 900ms ease-out both;
}

.your-sky-hero-sub {
  max-width: 34rem;
  margin: 0 0 1.25rem;
  font-size: 1.05rem;
  line-height: 1.6;
  color: var(--night-muted);
  animation: your-sky-rise 900ms 120ms ease-out both;
}

.your-sky-hero-price {
  margin: 0 0 1.5rem;
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--star);
}

.your-sky-hero-cta {
  display: inline-block;
  text-decoration: none;
}

.your-sky-hero-figure {
  margin: 0;
  justify-self: center;
  width: min(100%, 640px);
  filter: drop-shadow(0 30px 60px rgba(0, 0, 0, 0.55));
}

.your-sky-hero-figure img {
  display: block;
  width: 100%;
  height: auto;
}

@keyframes your-sky-rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .your-sky-hero h1,
  .your-sky-hero-sub {
    animation: none;
  }
}

.your-sky-studio {
  position: relative;
  display: grid;
  gap: clamp(28px, 5vw, 72px);
  grid-template-columns: minmax(0, 1.08fr) minmax(340px, 0.72fr);
  padding: clamp(40px, 6vw, 88px) clamp(20px, 6vw, 96px);
  background: var(--night-deep);
  color: var(--night-title);
  scroll-margin-top: var(--header-height, 76px);
}

.your-sky-studio-map {
  min-width: 0;
}

.your-sky-studio .sky-configurator {
  color: var(--color-ink);
}

.your-sky-studio .sky-preview {
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
}

.your-sky-studio .sky-form {
  padding: 1.25rem;
  border-radius: 8px;
  background: rgba(244, 236, 216, 0.06);
  border: 1px solid rgba(176, 141, 87, 0.35);
}

.your-sky-studio .sky-field > span,
.your-sky-studio .sky-field-note,
.your-sky-studio .sky-form-note,
.your-sky-studio .sky-preview-hint {
  color: var(--night-muted);
}

.your-sky-studio .sky-field input {
  background: rgba(251, 250, 246, 0.96);
}

.your-sky-studio .sky-field input:focus {
  outline-color: var(--bronze);
}

.your-sky-studio-panel {
  align-self: start;
  position: sticky;
  top: calc(var(--header-height, 76px) + 16px);
  padding: 1.5rem;
  border-radius: 12px;
  background: rgba(244, 236, 216, 0.05);
  border: 1px solid rgba(176, 141, 87, 0.35);
}

.your-sky-studio-panel .eyebrow {
  color: var(--bronze);
}

.your-sky-studio-panel h2 {
  margin: 0.3rem 0 0.6rem;
  font-family: var(--serif);
  font-weight: 400;
  font-size: clamp(1.6rem, 2.6vw, 2.2rem);
  line-height: 1.1;
}

.your-sky-studio-note,
.your-sky-studio-size {
  margin: 0 0 1rem;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--night-muted);
}

.your-sky-studio-panel .variant-fieldset legend {
  color: var(--night-muted);
}

.your-sky-studio-panel .variant-options a {
  color: var(--night-title);
  border-color: rgba(244, 236, 216, 0.28);
}

.your-sky-studio-panel .variant-options a.is-selected {
  background: var(--star);
  border-color: var(--star);
  color: var(--night-deep);
}

.your-sky-studio-panel .product-price {
  color: var(--night-title);
}

.your-sky-studio-buy {
  margin: 1rem 0;
}

.your-sky-studio-panel .product-assurance-list li {
  color: var(--night-muted);
}

.your-sky-occasions,
.your-sky-how,
.your-sky-faq,
.your-sky-closing {
  padding: clamp(40px, 6vw, 88px) clamp(20px, 6vw, 96px);
}

.your-sky-occasions ul {
  display: grid;
  gap: clamp(16px, 3vw, 32px);
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
}

.your-sky-occasions a {
  display: block;
  color: inherit;
  text-decoration: none;
}

.your-sky-occasions img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 6px;
  box-shadow: 0 18px 48px rgba(55, 48, 39, 0.14);
}

.your-sky-occasions h3 {
  margin: 1rem 0 0.25rem;
  font-family: var(--serif);
  font-weight: 400;
  font-size: 1.35rem;
}

.your-sky-occasions p {
  margin: 0;
  color: var(--color-muted);
}

.your-sky-how dl {
  display: grid;
  gap: clamp(16px, 3vw, 32px);
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 1rem 0 0;
}

.your-sky-how dt {
  font-family: var(--serif);
  font-size: 1.3rem;
  margin-bottom: 0.4rem;
}

.your-sky-how dd {
  margin: 0;
  color: var(--color-muted);
  line-height: 1.6;
}

.your-sky-faq details {
  border-top: 1px solid var(--glass-border-ink);
  padding: 0.9rem 0;
}

.your-sky-faq summary {
  cursor: pointer;
  font-family: var(--serif);
  font-size: 1.15rem;
}

.your-sky-faq p {
  margin: 0.6rem 0 0;
  color: var(--color-muted);
  line-height: 1.6;
}

.your-sky-closing {
  text-align: center;
  background: var(--color-soft);
}

.your-sky-closing h2 {
  margin: 0 0 1rem;
  font-family: var(--serif);
  font-weight: 400;
  font-size: clamp(1.8rem, 3.4vw, 2.8rem);
}

.your-sky-closing p {
  margin-top: 1.25rem;
  color: var(--color-muted);
}

@media (max-width: 900px) {
  .your-sky-hero,
  .your-sky-studio {
    grid-template-columns: 1fr;
  }

  .your-sky-studio-panel {
    position: static;
  }

  .your-sky-occasions ul,
  .your-sky-how dl {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Run** — `npm run typecheck` (regenerates route types) → 0; `npm run lint` → 0 errors; `npm run build` → success.
- [ ] **Step 4: Commit** — `git add app/routes/your-sky.tsx app/styles/app.css && git commit -m "Add the Your Sky feature page"`.

---

### Task 8: Static images from the real engine

**Files:**
- Create: `scripts/lib/your-sky-render.tsx`, `scripts/generate-your-sky-images.mjs`, `public/images/your-sky/{hero-print,occasion-met,occasion-born,occasion-yes}.webp`
- Modify: `package.json` (script `sky:feature:images`)

- [ ] **Step 1:** `scripts/lib/your-sky-render.tsx` (bundled by esbuild at run time because Node cannot strip JSX):

```tsx
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {validateSkyParams, type SkyThemeId} from '../../app/lib/sky/params.ts';
import {computeSky} from '../../app/lib/sky/scene.ts';
import {SkySvg} from '../../app/lib/sky/svg.tsx';
import {SKY_THEMES} from '../../app/lib/sky/themes.ts';
import type {SkySizeKey} from '../../app/lib/sky/products.ts';
import type {SkyCatalog} from '../../app/lib/sky/catalog.ts';

export function renderSkySvg({
  catalog,
  params,
  plateDataUrl,
  size,
  theme = 'linen',
}: {
  catalog: SkyCatalog;
  params: Record<string, unknown>;
  plateDataUrl: string | null;
  size: SkySizeKey;
  theme?: SkyThemeId;
}) {
  const validated = validateSkyParams(params);
  if (!validated.ok) throw new Error(validated.error);
  const scene = computeSky({params: validated.params, size, catalog});
  const svg = renderToStaticMarkup(
    createElement(SkySvg, {
      scene,
      theme: SKY_THEMES[theme],
      plateUrl: plateDataUrl,
    }),
  );
  return {scene, svg};
}
```

- [ ] **Step 2:** `scripts/generate-your-sky-images.mjs`:

```js
#!/usr/bin/env node
/* eslint-disable no-console */
// Renders the four static images for /your-sky from the real sky engine:
// the hero (the linen print in a natural frame on a night wall, with faint
// constellation lines behind it) and three occasion skies. Deterministic;
// outputs are committed under public/images/your-sky/.
//
//   node scripts/generate-your-sky-images.mjs

import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import esbuild from 'esbuild';
import sharp from 'sharp';
import {loadSkyCatalogSync} from './lib/sky-catalog.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(repoRoot, 'public', 'images', 'your-sky');
const buildDir = path.join(repoRoot, 'output', 'your-sky');
mkdirSync(outDir, {recursive: true});
mkdirSync(buildDir, {recursive: true});

// Bundle the TSX renderer once (esbuild ships with vite).
const bundle = await esbuild.build({
  bundle: true,
  entryPoints: [path.join(repoRoot, 'scripts', 'lib', 'your-sky-render.tsx')],
  format: 'esm',
  jsx: 'automatic',
  packages: 'external',
  platform: 'node',
  target: 'node22',
  write: false,
});
const rendererPath = path.join(buildDir, 'render.mjs');
writeFileSync(rendererPath, bundle.outputFiles[0].text);
const {renderSkySvg} = await import(pathToFileURL(rendererPath).href);

const catalog = loadSkyCatalogSync();
const plate = readFileSync(path.join(repoRoot, 'public', 'sky', 'plates', 'linen-preview.jpg'));
const plateDataUrl = `data:image/jpeg;base64,${plate.toString('base64')}`;

const PARIS = {lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris', place: 'Paris, France'};
const LISBON = {lat: 38.7223, lon: -9.1393, tz: 'Europe/Lisbon', place: 'Lisbon, Portugal'};
const SANTORINI = {lat: 36.3932, lon: 25.4615, tz: 'Europe/Athens', place: 'Santorini, Greece'};

const SKIES = {
  hero: {...PARIS, date: '2019-06-14', time: '22:00', title: 'The night we met', theme: 'linen'},
  'occasion-met': {...PARIS, date: '2019-06-14', time: '22:00', title: 'The night we met', theme: 'linen'},
  'occasion-born': {...LISBON, date: '2023-03-02', time: '06:40', title: 'The morning she was born', theme: 'linen'},
  'occasion-yes': {...SANTORINI, date: '2021-09-18', time: '20:30', title: 'Where you said yes', theme: 'linen'},
};

async function printPng(key, width) {
  const {scene, svg} = renderSkySvg({catalog, params: SKIES[key], plateDataUrl, size: '8x10'});
  const png = await sharp(Buffer.from(svg), {density: 300}).resize({width}).png().toBuffer();
  return {png, scene};
}

// Occasion cards: the print itself, 800px wide.
for (const key of ['occasion-met', 'occasion-born', 'occasion-yes']) {
  const {png} = await printPng(key, 800);
  const out = path.join(outDir, `${key}.webp`);
  await sharp(png).webp({quality: 84}).toFile(out);
  console.log('wrote', path.relative(repoRoot, out));
}

// Hero: night gradient, faint constellation lines, framed print with shadow.
{
  const W = 2400;
  const H = 1500;
  const {png, scene} = await printPng('hero', 960);
  const meta = await sharp(png).metadata();
  const frame = 44;
  const framed = await sharp(png)
    .extend({top: frame, bottom: frame, left: frame, right: frame, background: '#c9a97c'})
    .extend({top: 3, bottom: 3, left: 3, right: 3, background: '#8d7150'})
    .png()
    .toBuffer();
  const framedMeta = await sharp(framed).metadata();
  const left = Math.round(W * 0.56 - framedMeta.width / 2 + 260);
  const top = Math.round((H - framedMeta.height) / 2);

  // Constellation lines from the same scene, scaled onto the canvas.
  const scale = (W * 0.9) / scene.width;
  const lines = scene.lines
    .map(
      (line) =>
        `<line x1="${(line.x1 * scale).toFixed(1)}" y1="${(line.y1 * scale + 40).toFixed(1)}" x2="${(line.x2 * scale).toFixed(1)}" y2="${(line.y2 * scale + 40).toFixed(1)}"/>`,
    )
    .join('');
  const background = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs>
        <radialGradient id="g" cx="62%" cy="48%" r="70%">
          <stop offset="0" stop-color="#22304a"/>
          <stop offset="0.48" stop-color="#141b2b"/>
          <stop offset="1" stop-color="#0c111c"/>
        </radialGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#g)"/>
      <g stroke="#b08d57" stroke-opacity="0.22" stroke-width="2" fill="none" transform="translate(${W * 0.05},0)">${lines}</g>
    </svg>`,
  );
  const shadow = await sharp({
    create: {width: framedMeta.width + 120, height: framedMeta.height + 120, channels: 4, background: {r: 0, g: 0, b: 0, alpha: 0}},
  })
    .composite([{input: {create: {width: framedMeta.width, height: framedMeta.height, channels: 4, background: {r: 0, g: 0, b: 0, alpha: 0.7}}}, left: 60, top: 80}])
    .blur(40)
    .png()
    .toBuffer();
  const out = path.join(outDir, 'hero-print.webp');
  await sharp(background)
    .composite([
      {input: shadow, left: left - 60, top: top - 60},
      {input: framed, left, top},
    ])
    .webp({quality: 82})
    .toFile(out);
  console.log('wrote', path.relative(repoRoot, out), `${meta.width}x${meta.height} print`);
}

/* eslint-enable no-console */
```

- [ ] **Step 3:** `package.json` scripts: add `"sky:feature:images": "node ./scripts/generate-your-sky-images.mjs",` after `"catalog:extensions:rename:calendar:apply"`.
- [ ] **Step 4: Run** — `npm run sky:feature:images` → four `wrote public/images/your-sky/...` lines; open each file and confirm the print reads (title, subtitle, horizon ring) and the hero shows the framed print on the night wall.
- [ ] **Step 5: Commit** — `git add scripts/lib/your-sky-render.tsx scripts/generate-your-sky-images.mjs public/images/your-sky package.json && git commit -m "Render the Your Sky page images from the sky engine"`.

---

### Task 9: Verify, document, ship

- [ ] **Step 1:** `npm run lint && npm run typecheck && npm test && npm run build` → all green.
- [ ] **Step 2:** Dev preview (`.claude/launch.json` entry `dev` → `npm run dev`, port 3000): open `/your-sky` desktop + mobile emulation; confirm hero, live map, Size/Finish links keep `?Size=…&Finish=…` and the configurator state survives, Add to cart enabled only after place + date, cart drawer shows the personalisation lines; `/products/your-sky-star-map?Size=20+%C3%97+24+in` → 301 to `/your-sky?Size=…`; `/collections/all` and `/search?q=sky` do not list the star map; `/sitemap/custom/1.xml` contains `/your-sky`. Screenshot desktop + mobile.
- [ ] **Step 3:** `docs/your-sky-release.md`: add a dated paragraph — the page is the front door, the product URL redirects, the product is unlisted, rollback = revert the PR.
- [ ] **Step 4:** Commit, push, open the PR (stacked on #66), run `/adversarial-verify`, fix anything it finds, report with screenshots.
