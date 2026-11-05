import type {Plugin} from 'vite';
import type {ArtProductCatalog} from './artProductCatalog.ts';

/**
 * What the browser needs of data/art-product-catalog.json: each product's
 * identity and release state, and its variants' options (a single-variant
 * product shows its one size). That is all the storefront reads to list,
 * rank and describe family products. The pipeline's records (SKUs, supplier
 * mappings, file provenance and hashes, Shopify ids, inventory, prices) stay
 * in the server bundle and the scripts; the orders/paid webhook, which reads
 * variant mappings, runs on the server only.
 * scripts/artProductCatalogForBrowser.node-test.mjs checks that every
 * storefront reader answers the same from both.
 */
export function artProductCatalogForBrowser(
  catalog: ArtProductCatalog,
): ArtProductCatalog {
  return {
    ...catalog,
    products: catalog.products.map((product) => ({
      artworkId: product.artworkId,
      collection: product.collection,
      family: product.family,
      handle: product.handle,
      orientation: product.orientation,
      print: product.print,
      released: product.released,
      title: product.title,
      variants: product.variants.map(({option}) => ({option})),
    })),
  } as unknown as ArtProductCatalog;
}

const CATALOG_FILE = '/data/art-product-catalog.json';

/**
 * Vite plugin: the client build imports `artProductCatalogForBrowser`'s view
 * of the catalog instead of the whole file (about 1 MB of JavaScript that
 * the root route made every page download). Server builds keep it whole.
 */
export function browserArtProductCatalog(): Plugin {
  return {
    name: 'clara:browser-art-product-catalog',
    // Before vite:json turns the file into a module.
    enforce: 'pre',
    transform(code, id, options) {
      const server =
        options?.ssr || this?.environment?.config.consumer === 'server';
      const file = id.split('?')[0].replaceAll('\\', '/');
      if (server || !file.endsWith(CATALOG_FILE)) return null;
      const catalog = JSON.parse(code) as ArtProductCatalog;
      return {code: JSON.stringify(artProductCatalogForBrowser(catalog)), map: null};
    },
  };
}
