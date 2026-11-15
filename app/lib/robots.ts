export function robotsTxtData({url}: {url?: string}) {
  const sitemapUrl = url ? `${url}/sitemap.xml` : undefined;

  return `
User-agent: Googlebot
${generalDisallowRules({sitemapUrl})}

User-agent: Googlebot-Image
Allow: /
Disallow: /print-files/
${sitemapUrl ? `Sitemap: ${sitemapUrl}` : ''}

User-agent: *
${generalDisallowRules({sitemapUrl})}

# Google adsbot ignores robots.txt unless specifically named!
User-agent: adsbot-google
Disallow: /cart
Disallow: /account
Disallow: /search
Allow: /search/
Disallow: /search/?*

User-agent: Nutch
Disallow: /

User-agent: AhrefsBot
Crawl-delay: 10
${generalDisallowRules({sitemapUrl})}

User-agent: AhrefsSiteAudit
Crawl-delay: 10
${generalDisallowRules({sitemapUrl})}

User-agent: MJ12bot
Crawl-Delay: 10
${generalDisallowRules({sitemapUrl})}

User-agent: Pinterest
Crawl-delay: 1
${generalDisallowRules({sitemapUrl})}
`.trim();
}

// A named group replaces the `*` group for that crawler, so every group
// above repeats the general rules.

/** Listing pages whose sort, facet and pagination URLs repeat the list. */
const LISTING_PATHS = ['/collections/', '/clothing', '/artists/'];

/**
 * The storefront's own sort, facet and cursor parameters (collectionSort.ts,
 * catalogFacets.ts, Hydrogen pagination). `?capsule=` stays crawlable: it is
 * a canonical, indexable shop view.
 */
const LISTING_PARAMS = [
  'sort',
  'type',
  'vendor',
  'min',
  'max',
  'available',
  'cursor',
];

function listingParamRules() {
  return LISTING_PATHS.flatMap((path) =>
    LISTING_PARAMS.flatMap((param) => [
      `Disallow: ${path}*?${param}=`,
      `Disallow: ${path}*&${param}=`,
    ]),
  ).join('\n');
}

/**
 * Generates disallow rules that generally follow Shopify's Online Store
 * defaults while leaving public policy pages indexable.
 */
function generalDisallowRules({sitemapUrl}: {sitemapUrl?: string}) {
  // Print files are fetched by the print lab, not meant for search.
  return `Disallow: /cart
Disallow: /account
Disallow: /print-files/
Disallow: /collections/*sort_by*
Disallow: /*/collections/*sort_by*
Disallow: /collections/*+*
Disallow: /collections/*%2B*
Disallow: /collections/*%2b*
Disallow: /*/collections/*+*
Disallow: /*/collections/*%2B*
Disallow: /*/collections/*%2b*
Disallow: /*/collections/*filter*&*filter*
${listingParamRules()}
Disallow: /blogs/*+*
Disallow: /blogs/*%2B*
Disallow: /blogs/*%2b*
Disallow: /*/blogs/*+*
Disallow: /*/blogs/*%2B*
Disallow: /*/blogs/*%2b*
Disallow: /search
Allow: /search/
Disallow: /search/?*
${sitemapUrl ? `Sitemap: ${sitemapUrl}` : ''}`;
}
