import assert from 'node:assert/strict';
import {
  buildCustomRoutesSitemapXml,
  CUSTOM_SITEMAP_PATHS,
  injectCustomSitemapEntry,
  removeExcludedSitemapEntries,
} from '../app/lib/sitemap.ts';

const entry = (loc) =>
  `<url>\n  <loc>${loc}</loc>\n  <lastmod>2026-07-01</lastmod>\n</url>`;

// Obsolete duplicate page and empty blog are removed; real resources stay
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset>',
  entry('https://shopclaramendes.com/pages/contact'),
  entry('https://shopclaramendes.com/pages/data-sharing-opt-out'),
  entry('https://shopclaramendes.com/blogs/news'),
  entry('https://shopclaramendes.com/products/quiet-form-i-art-print'),
  entry('https://shopclaramendes.com/products/acne-cream'),
  entry('https://shopclaramendes.com/collections/snowboards'),
  entry('https://shopclaramendes.com/products/your-sky-star-map'),
  entry('https://shopclaramendes.com/products/first-light-birth-poster'),
  entry('https://shopclaramendes.com/products/fine-art-greeting-card'),
  entry('https://shopclaramendes.com/products/fine-art-postcard'),
  entry(
    'https://shopclaramendes.com/products/art-premium-fleece-blanket-30x40',
  ),
  entry('https://shopclaramendes.com/products/clara-mendes-art-calendar-2027'),
  entry('https://shopclaramendes.com/products/clara-mendes-art-calendar-2026'),
  entry('https://shopclaramendes.com/collections/clara-mendes-art-living'),
  '</urlset>',
].join('\n');

const filtered = removeExcludedSitemapEntries(xml);
assert.ok(!filtered.includes('/pages/contact'), 'obsolete contact page kept');
assert.ok(!filtered.includes('/blogs/news'), 'empty blog kept');
assert.ok(!filtered.includes('/products/acne-cream'), 'off-theme product kept');
assert.ok(
  !filtered.includes('/collections/snowboards'),
  'legacy collection kept',
);
assert.ok(
  !filtered.includes('/products/your-sky-star-map'),
  'the star map is sold on its feature page, not as a product URL',
);
assert.ok(
  !filtered.includes('/products/first-light-birth-poster'),
  'staged birth poster leaked into the sitemap',
);
// Released extension families are kept; every dark family is stripped —
// including the calendar's retired previous handle, which may still be the
// live Shopify handle until the in-place rename runs.
assert.ok(filtered.includes('/products/fine-art-greeting-card'));
assert.ok(filtered.includes('/products/fine-art-postcard'));
assert.ok(
  !filtered.includes('/products/art-premium-fleece-blanket-30x40'),
  'dark blanket leaked into the sitemap',
);
assert.ok(
  !filtered.includes('/products/clara-mendes-art-calendar-2027'),
  'dark calendar leaked into the sitemap',
);
assert.ok(
  !filtered.includes('/products/clara-mendes-art-calendar-2026'),
  'retired calendar handle leaked into the sitemap',
);
// The Everyday collection is a manual collection that is still empty (its
// route redirects), so its URL stays out until it is populated in Admin.
assert.ok(
  !filtered.includes('/collections/clara-mendes-art-living'),
  'empty Everyday collection leaked into the sitemap',
);
assert.ok(filtered.includes('/pages/data-sharing-opt-out'));
assert.ok(filtered.includes('/products/quiet-form-i-art-print'));

// Custom child sitemap covers the important storefront routes, including
// the five tag-backed capsule landing pages and the twelve curated gallery
// edits Shopify cannot know about
assert.deepEqual(
  [...CUSTOM_SITEMAP_PATHS],
  [
    '/',
    '/collections/all',
    '/collections/quiet-form',
    '/collections/patina-blue',
    '/collections/neo-deco',
    '/collections/midnight-garden',
    '/collections/sunlit-mosaic',
    '/collections/terracotta-wall-art',
    '/collections/blue-abstract-wall-art',
    '/collections/geometric-wall-art',
    '/collections/art-deco-prints',
    '/collections/dark-botanical-wall-art',
    '/collections/abstract-wall-art',
    '/collections/living-room-wall-art',
    '/collections/bedroom-wall-art',
    '/collections/wall-art-sets-of-3',
    '/collections/warm-minimalist-wall-art',
    '/collections/terracotta-gallery-wall',
    '/collections/ink-and-cream-gallery-wall',
    '/your-sky',
    '/our-story',
    '/contact',
    '/policies',
    '/policies/refund-policy',
    '/policies/privacy-policy',
    '/policies/shipping-policy',
    '/policies/terms-of-service',
  ],
);
const customXml = buildCustomRoutesSitemapXml();
assert.ok(customXml.startsWith('<?xml'));
assert.ok(customXml.includes('<loc>https://shopclaramendes.com</loc>'));
assert.ok(
  customXml.includes('<loc>https://shopclaramendes.com/collections/all</loc>'),
);
assert.ok(
  customXml.includes(
    '<loc>https://shopclaramendes.com/collections/quiet-form</loc>',
  ),
);
assert.ok(
  customXml.includes(
    '<loc>https://shopclaramendes.com/collections/midnight-garden</loc>',
  ),
);
assert.ok(
  customXml.includes('<loc>https://shopclaramendes.com/our-story</loc>'),
);
assert.ok(customXml.includes('<loc>https://shopclaramendes.com/contact</loc>'));
assert.ok(
  customXml.includes('<loc>https://shopclaramendes.com/policies</loc>'),
);
assert.ok(
  customXml.includes(
    '<loc>https://shopclaramendes.com/policies/refund-policy</loc>',
  ),
);
assert.ok(
  customXml.includes(
    '<loc>https://shopclaramendes.com/policies/privacy-policy</loc>',
  ),
);
assert.ok(
  customXml.includes(
    '<loc>https://shopclaramendes.com/policies/shipping-policy</loc>',
  ),
);
assert.ok(
  customXml.includes(
    '<loc>https://shopclaramendes.com/policies/terms-of-service</loc>',
  ),
);
assert.ok(!customXml.includes('/cart'));
assert.ok(!customXml.includes('/account'));
assert.ok(!customXml.includes('/search'));

// The custom child is appended to the index exactly once
const index = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<sitemapindex>',
  '<sitemap><loc>https://shopclaramendes.com/sitemap/products/1.xml</loc></sitemap>',
  '</sitemapindex>',
].join('\n');

const injected = injectCustomSitemapEntry(index, 'https://shopclaramendes.com');
assert.ok(
  injected.includes(
    '<sitemap><loc>https://shopclaramendes.com/sitemap/custom/1.xml</loc></sitemap>',
  ),
);
assert.ok(injected.trimEnd().endsWith('</sitemapindex>'));
assert.equal(
  injectCustomSitemapEntry(injected, 'https://shopclaramendes.com'),
  injected,
  'injection must be idempotent',
);
