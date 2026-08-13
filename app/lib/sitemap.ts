// Relative imports keep this module loadable by the plain-Node test runner,
// which cannot resolve the Vite "~" alias.
import {
  EXTENSION_COLLECTION_HANDLE,
  hasReleasedExtensions,
  isOffThemeCollectionHandle,
  isOffThemeProductHandle,
  isUnreleasedExtensionHandle,
  ORIGINAL_ART_COLLECTIONS,
} from './catalogFilters.ts';
import {STOREFRONT_ORIGIN} from './storefrontBasics.ts';

/**
 * Storefront routes that Shopify's generated sitemaps cannot know about.
 * Served as the `custom` sitemap type referenced from the sitemap index.
 * The five capsule landing pages are storefront-rendered from capsule tags
 * (no Shopify collection required), so they are listed here rather than in
 * Shopify's collections sitemap.
 */
export const CUSTOM_SITEMAP_PATHS: readonly string[] = [
  '/',
  '/collections/all',
  ...ORIGINAL_ART_COLLECTIONS.map(
    (collection) => `/collections/${collection.handle}`,
  ),
  '/our-story',
  '/contact',
  '/policies',
  '/policies/refund-policy',
  '/policies/privacy-policy',
  '/policies/shipping-policy',
  '/policies/terms-of-service',
];

/**
 * Shopify resources excluded from the sitemap: `/pages/contact` permanently
 * redirects to the custom `/contact` route, and the `news` blog is empty
 * until the journal launches (its route is noindexed for the same reason).
 */
const EXCLUDED_RESOURCE_PATHS = new Set(['pages/contact', 'blogs/news']);

export function removeExcludedSitemapEntries(xml: string) {
  return xml.replace(/<url>[\s\S]*?<\/url>/g, (entry) => {
    const loc = entry.match(/<loc>(.*?)<\/loc>/)?.[1] ?? '';
    const match = loc.match(/\/(products|collections|pages|blogs)\/([^/<]+)$/);
    if (!match) return entry;

    const [, type, handle] = match;
    if (EXCLUDED_RESOURCE_PATHS.has(`${type}/${handle}`)) return '';
    if (type === 'products' && isOffThemeProductHandle(handle)) return '';
    if (type === 'products' && isUnreleasedExtensionHandle(handle)) return '';
    if (type === 'collections' && isOffThemeCollectionHandle(handle)) return '';
    if (
      type === 'collections' &&
      handle === EXTENSION_COLLECTION_HANDLE &&
      !hasReleasedExtensions()
    ) {
      return '';
    }

    return entry;
  });
}

export function buildCustomRoutesSitemapXml() {
  const urls = CUSTOM_SITEMAP_PATHS.map(
    (path) =>
      `  <url><loc>${STOREFRONT_ORIGIN}${path === '/' ? '' : path}</loc><changefreq>weekly</changefreq></url>`,
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

/**
 * Appends the custom-routes child sitemap to Shopify's generated sitemap
 * index so bespoke storefront and policy routes are discoverable by crawlers.
 */
export function injectCustomSitemapEntry(indexXml: string, origin: string) {
  const entry = `<sitemap><loc>${origin}/sitemap/custom/1.xml</loc></sitemap>`;
  if (indexXml.includes(entry)) return indexXml;

  return indexXml.replace(
    /<\/sitemapindex>/,
    `${entry}\n</sitemapindex>`,
  );
}
