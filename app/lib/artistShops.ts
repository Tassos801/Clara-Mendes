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
  orientationOf,
  screenArtworkRights,
  type ArtRegistry,
  type Artist,
  type Artwork,
} from './artRegistry.ts';
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

/** Product families an artist shop can filter by, in display order. */
export const ARTIST_PRODUCT_FAMILIES = ['Prints'] as const;
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
  released: boolean;
  title: string;
};

type Sources = {catalog?: PrintCatalog; registry?: ArtRegistry};

/** Every print-catalog product that belongs to a registered artist. */
export function artistProducts({
  catalog = PRINT_CATALOG,
  registry = ART_REGISTRY,
}: Sources = {}): ArtistProduct[] {
  return catalog.collections.flatMap((collection) =>
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
          released: print.released === true,
          title: print.title,
        },
      ];
    }),
  );
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
  const released = artistProducts(sources).filter((product) => product.released);
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
  return publicArtists(sources).find((entry) => entry.artist.slug === key) ?? null;
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
  const words = foldName(term ?? '').split(' ').filter(Boolean);
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
  catalog = PRINT_CATALOG,
  registry = ART_REGISTRY,
}: Sources = {}): string[] {
  const problems: string[] = [];
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
      const previous = used.get(artwork.id);
      if (previous)
        problems.push(`${at}: artwork ${artwork.id} is already sold as ${previous}`);
      used.set(artwork.id, at);
      if (
        artwork.original &&
        orientationOf(artwork.original) !== printOrientation(print)
      )
        problems.push(
          `${at}: orientation must be ${orientationOf(artwork.original)} to keep ${artwork.id} whole`,
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
  return problems;
}
