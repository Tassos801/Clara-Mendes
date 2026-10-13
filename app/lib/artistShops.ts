// Relative imports keep this module loadable by the plain-Node test runner,
// which cannot resolve the Vite "~" alias.
import {
  ART_REGISTRY,
  artistNames,
  artworkCreditLine,
  findArtist,
  findArtwork,
  foldName,
  lifeDatesLabel,
  masterSize,
  orientationOf,
  screenArtworkRights,
  type ArtRegistry,
  type Artist,
  type Artwork,
  type Orientation,
} from './artRegistry.ts';
import {
  ART_PRODUCT_CATALOG,
  FAMILY_SPECS,
  reproductionSentence,
  type ArtProductCatalog,
} from './artProductCatalog.ts';
import {
  collectionKind,
  PRINT_CATALOG,
  printHandle,
  printImagePath,
  printOrientation,
  type PrintCatalog,
} from './printCatalog.ts';

/**
 * Dedicated artist shops (docs/artist-shops/brief.md §4), derived from the
 * same records as the rest of the shop. A product belongs to an artist
 * through data — a museum print's artwork, or a studio collection's artist —
 * so a newly released print appears on its artist's page with no page edit.
 *
 * Membership never widens visibility: only products that pass the existing
 * release gate (`released: true` here, Active + published in Shopify, and
 * `filterDemoProducts` in the route) are listed, and an artist is public only
 * once the owner approved them AND at least one of their products released.
 */

/**
 * Product families an artist shop can filter by, in display order: the
 * print catalog's prints, then the family products of
 * data/art-product-catalog.json (one per artwork per type).
 */
export const ARTIST_PRODUCT_FAMILIES = [
  'Prints',
  'Framed prints',
  'Canvas',
  'Cards',
  'Postcards',
  'Phone cases',
] as const;
export type ArtistProductFamily = (typeof ARTIST_PRODUCT_FAMILIES)[number];

export type ArtistProduct = {
  artistId: string;
  artworkId?: string;
  /** Shopify tag every product of this collection carries (its title). */
  collectionTag: string;
  family: ArtistProductFamily;
  handle: string;
  /** Committed web artwork, for the artists index. */
  image: string;
  orientation: Orientation;
  released: boolean;
  title: string;
};

type Sources = {
  artProducts?: ArtProductCatalog;
  catalog?: PrintCatalog;
  registry?: ArtRegistry;
};

/**
 * Every product that belongs to a registered artist: print-catalog prints,
 * then museum family products in catalog order. A family product shows its
 * print's committed web artwork on the artists index.
 */
export function artistProducts({
  artProducts = ART_PRODUCT_CATALOG,
  catalog = PRINT_CATALOG,
  registry = ART_REGISTRY,
}: Sources = {}): ArtistProduct[] {
  const prints = catalog.collections.flatMap((collection) =>
    collection.prints.flatMap((print) => {
      const artworkId = print.artworkId;
      const artistId = artworkId
        ? findArtwork(artworkId, registry)?.artistId
        : collection.artistId;
      if (!artistId || !findArtist(artistId, registry)) return [];
      return [
        {
          artistId,
          ...(artworkId ? {artworkId} : {}),
          collectionTag: collection.title,
          family: 'Prints' as const,
          handle: printHandle(print),
          image: printImagePath(collection, print),
          orientation: printOrientation(print),
          released: print.released === true,
          title: print.title,
        },
      ];
    }),
  );
  const families = artProducts.products.flatMap((product) => {
    const collection = catalog.collections.find(
      (entry) => entry.slug === product.collection,
    );
    const print = collection?.prints.find(
      (entry) => entry.slug === product.print,
    );
    const artistId = findArtwork(product.artworkId, registry)?.artistId;
    if (!collection || !print || !artistId || !findArtist(artistId, registry))
      return [];
    return [
      {
        artistId,
        artworkId: product.artworkId,
        collectionTag: collection.title,
        family: FAMILY_SPECS[product.family].artistFamily,
        handle: product.handle,
        image: printImagePath(collection, print),
        orientation: product.orientation,
        released: product.released === true,
        title: product.title,
      },
    ];
  });
  return [...prints, ...families];
}

export type PublicArtist = {
  artist: Artist;
  products: ArtistProduct[];
};

/**
 * Artists a shopper may see: owner-approved, with at least one released
 * product. Sorted by `sortName`, so "Hiroshige, Utagawa" precedes
 * "Hokusai, Katsushika".
 */
export function publicArtists(sources: Sources = {}): PublicArtist[] {
  const registry = sources.registry ?? ART_REGISTRY;
  const released = artistProducts(sources).filter(
    (product) => product.released,
  );
  return registry.artists
    .filter((artist) => artist.approval.approved)
    .map((artist) => ({
      artist,
      products: released.filter((product) => product.artistId === artist.id),
    }))
    .filter((entry) => entry.products.length > 0)
    .sort((a, b) => a.artist.sortName.localeCompare(b.artist.sortName));
}

export function publicArtistBySlug(
  slug: string | null | undefined,
  sources: Sources = {},
): PublicArtist | null {
  const key = slug?.trim().toLowerCase();
  if (!key) return null;
  return (
    publicArtists(sources).find((entry) => entry.artist.slug === key) ?? null
  );
}

export function artistPath(artist: Pick<Artist, 'slug'>) {
  return `/artists/${artist.slug}`;
}

/**
 * Storefront `products(query:)` clause for an artist's products. Handle is
 * not a supported search field, so this selects their collections by tag;
 * the route then keeps only the artist's exact handles.
 */
export function artistProductsQuery(products: ArtistProduct[]) {
  const tags = [...new Set(products.map((product) => product.collectionTag))];
  return tags.map((tag) => `tag:"${tag.replaceAll('"', '\\"')}"`).join(' OR ');
}

/** Distinct artworks behind an artist's products, in product order. */
export function artistArtworks(
  products: ArtistProduct[],
  registry: ArtRegistry = ART_REGISTRY,
): Artwork[] {
  const seen = new Set<string>();
  const artworks: Artwork[] = [];
  for (const product of products) {
    if (!product.artworkId || seen.has(product.artworkId)) continue;
    seen.add(product.artworkId);
    const artwork = findArtwork(product.artworkId, registry);
    if (artwork) artworks.push(artwork);
  }
  return artworks;
}

/** Families with at least one listed product — empty filters stay hidden. */
export function artistFamilies(products: Pick<ArtistProduct, 'family'>[]) {
  return ARTIST_PRODUCT_FAMILIES.filter((family) =>
    products.some((product) => product.family === family),
  );
}

/**
 * The Refine panel's groups, in display order. Values come from data, so a
 * group appears once one listed product has a value for it.
 */
export const ARTIST_FACETS = [
  {key: 'type', label: 'Product type'},
  {key: 'series', label: 'Series'},
  {key: 'orientation', label: 'Orientation'},
  {key: 'collection', label: 'Collection'},
] as const;
export type ArtistFacetKey = (typeof ARTIST_FACETS)[number]['key'];

export const ARTIST_SORTS = [
  {label: 'Featured', value: 'featured'},
  {label: 'Title, A–Z', value: 'title'},
  {label: 'Earliest work', value: 'oldest'},
  {label: 'Latest work', value: 'newest'},
] as const;
export type ArtistSort = (typeof ARTIST_SORTS)[number]['value'];

export type ArtistFacetOption = {
  /** Listed products with this value, given the other groups' choices. */
  count: number;
  label: string;
  selected: boolean;
  value: string;
};

export type ArtistFacetGroup = {
  key: ArtistFacetKey;
  label: string;
  options: ArtistFacetOption[];
};

const FAMILY_LABELS: Record<ArtistProductFamily, string> = {
  Prints: 'Art prints',
  'Framed prints': 'Framed prints',
  Canvas: 'Canvas',
  Cards: 'Cards',
  Postcards: 'Postcards',
  'Phone cases': 'Phone cases',
};

/**
 * A series name for display: the Met records some with a romanised
 * original in brackets or wrapped in quotes.
 */
export function seriesLabel(series: string | null | undefined) {
  const label = (series ?? '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/^["“”']+|["“”']+$/g, '')
    .trim();
  return label || null;
}

function facetSlug(label: string) {
  return foldName(label).replaceAll(' ', '-');
}

type FacetValue = {label: string; value: string};

function productFacets(
  product: ArtistProduct,
  registry: ArtRegistry,
): Record<ArtistFacetKey, FacetValue | null> {
  const artwork = product.artworkId
    ? findArtwork(product.artworkId, registry)
    : undefined;
  const series = seriesLabel(artwork?.series);
  return {
    collection: {
      label: product.collectionTag,
      value: facetSlug(product.collectionTag),
    },
    orientation: {
      label: product.orientation === 'landscape' ? 'Landscape' : 'Portrait',
      value: product.orientation,
    },
    series: series ? {label: series, value: facetSlug(series)} : null,
    // `prints` keeps the `?type=Prints` links of the first artist pages;
    // the others are `framed-prints`, `canvas`, `cards`, `postcards` and
    // `phone-cases`.
    type: {
      label: FAMILY_LABELS[product.family],
      value: facetSlug(product.family),
    },
  };
}

/** The first year in a museum date such as "ca. 1830–32". */
function artworkYear(product: ArtistProduct, registry: ArtRegistry) {
  const artwork = product.artworkId
    ? findArtwork(product.artworkId, registry)
    : undefined;
  const year = Number(artwork?.date.match(/\d{4}/)?.[0]);
  return Number.isFinite(year) && year > 0 ? year : null;
}

export type ArtistShopView = {
  /** Selected values across all groups that match at least one product. */
  activeCount: number;
  groups: ArtistFacetGroup[];
  products: ArtistProduct[];
  sort: ArtistSort;
};

/**
 * The filtered, sorted listing of an artist shop from its URL parameters
 * (`type`, `series`, `orientation`, `collection`, each repeatable, and
 * `sort`). Values match case-insensitively and unknown values are dropped,
 * so a stale link shows everything rather than nothing. Groups combine with
 * AND and values within a group with OR; each option's count applies the
 * other groups' choices.
 */
export function artistShopView(
  products: ArtistProduct[],
  params: URLSearchParams,
  registry: ArtRegistry = ART_REGISTRY,
): ArtistShopView {
  const rows = products.map((product, index) => ({
    facets: productFacets(product, registry),
    index,
    product,
    year: artworkYear(product, registry),
  }));
  type Row = (typeof rows)[number];
  const selected = new Map<ArtistFacetKey, Set<string>>();
  for (const {key} of ARTIST_FACETS) {
    const known = new Set(
      rows.flatMap((row) => (row.facets[key] ? [row.facets[key].value] : [])),
    );
    selected.set(
      key,
      new Set(
        params
          .getAll(key)
          .map((value) => value.trim().toLowerCase())
          .filter((value) => known.has(value)),
      ),
    );
  }
  const matches = (row: Row, except?: ArtistFacetKey) =>
    ARTIST_FACETS.every(({key}) => {
      const chosen = selected.get(key)!;
      if (key === except || !chosen.size) return true;
      const value = row.facets[key]?.value;
      return value != null && chosen.has(value);
    });

  const groups = ARTIST_FACETS.map(({key, label}) => {
    const options = new Map<string, ArtistFacetOption>();
    for (const row of rows) {
      const facet = row.facets[key];
      if (!facet) continue;
      const option = options.get(facet.value) ?? {
        count: 0,
        label: facet.label,
        selected: selected.get(key)!.has(facet.value),
        value: facet.value,
      };
      if (matches(row, key)) option.count += 1;
      options.set(facet.value, option);
    }
    return {key, label, options: [...options.values()]};
  }).filter((group) => group.options.length > 0);

  const requested = params.get('sort')?.trim().toLowerCase();
  const sort =
    ARTIST_SORTS.find((option) => option.value === requested)?.value ??
    'featured';
  const byYear = (direction: 1 | -1) => (a: Row, b: Row) => {
    if (a.year === b.year) return a.index - b.index;
    if (a.year == null) return 1;
    if (b.year == null) return -1;
    return (a.year - b.year) * direction;
  };
  const shown = rows.filter((row) => matches(row));
  if (sort === 'title')
    shown.sort(
      (a, b) =>
        a.product.title.localeCompare(b.product.title) || a.index - b.index,
    );
  else if (sort === 'oldest') shown.sort(byYear(1));
  else if (sort === 'newest') shown.sort(byYear(-1));

  return {
    activeCount: [...selected.values()].reduce((sum, set) => sum + set.size, 0),
    groups,
    products: shown.map((row) => row.product),
    sort,
  };
}

const MUSEUM_SEARCH: Record<string, (name: string) => string> = {
  met: (name) =>
    `https://www.metmuseum.org/art/collection/search?q=${encodeURIComponent(name)}`,
};

/**
 * Where else a shopper can see the artist's work: a collection search at
 * each museum our prints of them come from, in product order.
 */
export function artistElsewhere(
  artist: Pick<Artist, 'name'>,
  artworks: Artwork[],
) {
  const links: Array<{label: string; url: string}> = [];
  for (const artwork of artworks) {
    const search = MUSEUM_SEARCH[artwork.source.museum];
    const label = artwork.source.institution;
    if (!search || links.some((link) => link.label === label)) continue;
    links.push({label, url: search(artist.name)});
  }
  return links;
}

export type ProductArtworkCredit = {
  artist: {
    dates: string;
    name: string;
    /** The artist shop, only once the artist is public. */
    path: string | null;
  };
  artwork: {
    credit: string;
    date: string;
    medium: string;
    objectUrl: string;
    /** How the museum image became this product. */
    reproduction: string;
    title: string;
  } | null;
};

/**
 * Who made a released product and where a museum work comes from, as plain
 * data for the product page. A museum print always carries its credit; the
 * artist link appears only once the artist is public, and a studio product
 * shows nothing until then.
 */
export function productArtworkCredit(
  handle: string | null | undefined,
  sources: Sources = {},
): ProductArtworkCredit | null {
  const key = handle?.toLowerCase();
  if (!key) return null;
  const registry = sources.registry ?? ART_REGISTRY;
  const product = artistProducts(sources).find(
    (entry) => entry.handle === key && entry.released,
  );
  if (!product) return null;
  const artist = findArtist(product.artistId, registry);
  const artwork = product.artworkId
    ? findArtwork(product.artworkId, registry)
    : undefined;
  const isPublic = publicArtists(sources).some(
    (entry) => entry.artist.id === product.artistId,
  );
  if (!artist || (!artwork && !isPublic)) return null;
  return {
    artist: {
      dates: lifeDatesLabel(artist),
      name: artist.name,
      path: isPublic ? artistPath(artist) : null,
    },
    artwork: artwork
      ? {
          credit: artworkCreditLine(artwork),
          date: artwork.date,
          medium: artwork.medium,
          objectUrl: artwork.source.objectUrl,
          reproduction: reproductionSentence(
            product.handle,
            sources.artProducts,
          ),
          title: artwork.title,
        }
      : null,
  };
}

/**
 * Public artists a search term names: the whole term matches a name or alias,
 * or every word of the term starts a word of one ("hoku" → Hokusai).
 */
export function searchArtists(
  term: string | null | undefined,
  sources: Sources = {},
): Artist[] {
  const words = foldName(term ?? '')
    .split(' ')
    .filter(Boolean);
  if (!words.length) return [];
  return publicArtists(sources)
    .map((entry) => entry.artist)
    .filter((artist) =>
      artistNames(artist).some((name) => {
        const nameWords = foldName(name).split(' ');
        return words.every((word) =>
          nameWords.some((nameWord) => nameWord.startsWith(word)),
        );
      }),
    );
}

/**
 * Cross-file rules the single-file validators cannot see. Run by the test
 * suite on the shipped data and by the pipeline before any Shopify write.
 */
export function validateArtistLinks({
  artProducts = ART_PRODUCT_CATALOG,
  catalog = PRINT_CATALOG,
  registry = ART_REGISTRY,
}: Sources = {}): string[] {
  const problems: string[] = [];
  // One product per artwork per product type: an artwork may be a print
  // once and, separately, a framed print, a canvas, a card, a postcard and
  // a phone case (data/art-product-catalog.json enforces those).
  const used = new Map<string, string>();
  for (const collection of catalog.collections) {
    if (collection.artistId) {
      const artist = findArtist(collection.artistId, registry);
      if (!artist)
        problems.push(
          `collection ${collection.slug}: unknown artist ${collection.artistId}`,
        );
      else if (artist.kind !== 'studio')
        problems.push(
          `collection ${collection.slug}: artistId is for studio artists; museum prints name an artwork`,
        );
    }
    if (collectionKind(collection) !== 'museum') continue;
    for (const print of collection.prints) {
      const at = `${collection.slug}/${print.slug}`;
      if (!print.artworkId) continue;
      const artwork = findArtwork(print.artworkId, registry);
      if (!artwork) {
        problems.push(`${at}: unknown artwork ${print.artworkId}`);
        continue;
      }
      const key = `${artwork.id}:Prints`;
      const previous = used.get(key);
      if (previous)
        problems.push(
          `${at}: artwork ${artwork.id} is already sold as ${previous}`,
        );
      used.set(key, at);
      const master = masterSize(artwork);
      if (master && orientationOf(master) !== printOrientation(print))
        problems.push(
          `${at}: orientation must be ${orientationOf(master)} to keep ${artwork.id} whole`,
        );
      if (print.released !== true) continue;
      const artist = findArtist(artwork.artistId, registry);
      const screen = screenArtworkRights(artwork, artist, {
        year: Number(artwork.reviews.rights.at?.slice(0, 4)) || undefined,
      });
      if (artwork.reviews.rights.status !== 'cleared' || !screen.pass)
        problems.push(`${at}: released without a cleared rights review`);
      if (artwork.reviews.master.status !== 'cleared')
        problems.push(`${at}: released without a cleared master review`);
    }
  }
  for (const product of artProducts.products) {
    const at = `${product.collection}/${product.handle}`;
    const key = `${product.artworkId}:${product.family}`;
    const previous = used.get(key);
    if (previous)
      problems.push(
        `${at}: artwork ${product.artworkId} is already sold as ${previous}`,
      );
    used.set(key, at);
    if (!findArtwork(product.artworkId, registry))
      problems.push(`${at}: unknown artwork ${product.artworkId}`);
  }
  return problems;
}
