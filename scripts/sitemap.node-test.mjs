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
  'staged star map leaked into the sitemap',
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
assert.ok(customXml.includes('<loc>https://shopclaramendes.com/our-story</loc>'));
assert.ok(customXml.includes('<loc>https://shopclaramendes.com/contact</loc>'));
assert.ok(customXml.includes('<loc>https://shopclaramendes.com/policies</loc>'));
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
