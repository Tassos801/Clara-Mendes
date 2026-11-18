// Relative imports keep this module loadable by the plain-Node test runner,
// which cannot resolve the Vite "~" alias.
import {
  ART_PRODUCT_CATALOG,
  artProductByHandle,
  type ArtProductCatalog,
} from './artProductCatalog.ts';
import {
  isEditionCollection,
  PRINT_CATALOG,
  type PrintCatalog,
} from './printCatalog.ts';

/**
 * Landing pages for edition lines (`/collections/<slug>`, the capsule-page
 * namespace), such as Art & Words. The copy is written by hand; the products
 * come from the catalog's `released` flags, so a newly released design
 * appears without a code edit and an unreleased one never shows. Shopify
 * tags every product of a catalog collection with the collection's title,
 * which is how the route selects them.
 */
type EditionPageContent = {
  /** Title tag (brand suffix added by buildSeoMeta). */
  seoTitle: string;
  /** Meta description, 120-155 characters. */
  metaDescription: string;
  eyebrow: string;
  subtitle: string;
  editorial: string[];
};

const EDITION_PAGE_CONTENT: Record<string, EditionPageContent> = {
  'art-and-words': {
    seoTitle: 'Art & Words — Museum Art Quote Blankets',
    metaDescription:
      'Public-domain museum works with a short line of the artist’s own words set on them, printed to order on a 50 × 60 in throw blanket.',
    eyebrow: 'A Clara Mendes edition',
    subtitle:
      'Museum works with a short line of the artist’s own words set on them.',
    editorial: [
      'Art & Words is a Clara Mendes edition of public-domain museum works. On each one, a short line of the artist’s own words, in our translation, is set on the work in small black type.',
      'Each design is printed to order on a soft silk-touch throw blanket, 50 × 60 in (127 × 152 cm), printed on one side with a white back.',
    ],
  },
};

export type EditionPage = EditionPageContent & {
  slug: string;
  title: string;
  /** Released product handles, in catalog order. */
  handles: string[];
};

type Sources = {artProducts?: ArtProductCatalog; catalog?: PrintCatalog};

/** The page for an edition collection with released products; else null. */
export function getEditionPage(
  slug?: string | null,
  {artProducts = ART_PRODUCT_CATALOG, catalog = PRINT_CATALOG}: Sources = {},
): EditionPage | null {
  const key = slug?.trim().toLowerCase();
  const content = key ? EDITION_PAGE_CONTENT[key] : undefined;
  const collection = catalog.collections.find((entry) => entry.slug === key);
  if (!key || !content || !collection || !isEditionCollection(collection))
    return null;
  const handles = artProducts.products
    .filter((product) => product.collection === key && product.released === true)
    .map((product) => product.handle);
  if (handles.length === 0) return null;
  return {...content, handles, slug: key, title: collection.title};
}

export function listEditionPages(sources: Sources = {}): EditionPage[] {
  return Object.keys(EDITION_PAGE_CONTENT)
    .map((slug) => getEditionPage(slug, sources))
    .filter((page): page is EditionPage => page !== null);
}

/** The edition page a released product belongs to, for its breadcrumb. */
export function editionPageForProduct(
  handle?: string | null,
  sources: Sources = {},
): EditionPage | null {
  const product = artProductByHandle(handle, sources.artProducts);
  return product?.released ? getEditionPage(product.collection, sources) : null;
}

export function editionPagePath(slug: string) {
  return `/collections/${slug}`;
}

/** Storefront `products(query:)` clause: the collection's title tag. */
export function editionTagQuery(page: Pick<EditionPage, 'title'>) {
  return `tag:"${page.title.replaceAll('"', '\\"')}"`;
}
