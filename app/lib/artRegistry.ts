// Relative imports keep this module loadable by the plain-Node test runner
// and by scripts/museum.mjs, which cannot resolve the Vite "~" alias.
import artRegistry from '../../data/art-registry.json' with {type: 'json'};

/**
 * Artists and artworks behind the artist shops (docs/artist-shops/brief.md).
 * `data/art-registry.json` is the single source: stable ids are the
 * relationship keys, so a print-catalog entry points at an artwork id and the
 * artwork points at an artist id — never at a display name.
 *
 * Museum artworks are written by `npm run museum -- fetch` with the source
 * record, rights evidence and original-file checksum; people record the rights
 * and master reviews. Nothing here publishes anything: a product is visible
 * only through the existing release gate (printCatalog.ts), and an artist
 * page only lists those released products (artistShops.ts).
 */

export type ArtistKind = 'historical' | 'studio';

/** `display` keeps uncertainty ("ca. 1760") exactly as the source gives it. */
export type LifeDate = {display: string; year: number | null};

export type Approval = {approved: boolean; at?: string; by?: string};

export type Artist = {
  aliases: string[];
  /** Owner-reviewed name, dates, biography and note. Public pages need it. */
  approval: Approval;
  bio: string;
  bioSources: string[];
  born?: LifeDate;
  curatorNote: string;
  died?: LifeDate;
  id: string;
  kind: ArtistKind;
  /** Where the life dates come from (historical artists only). */
  lifeDatesSource?: string;
  name: string;
  nationality?: string;
  /** Artwork shown on the artists index; must belong to this artist. */
  representativeArtworkId?: string;
  slug: string;
  sortName: string;
  tags?: {country?: string; era?: string; movement?: string};
};

export type ReviewStatus = 'blocked' | 'cleared' | 'pending';

export type Review = {
  at?: string;
  by?: string;
  note?: string;
  status: ReviewStatus;
};

export type MuseumKey = 'met';

export type ArtworkSource = {
  apiUrl: string;
  accessionNumber?: string;
  /** Attribution exactly as the museum displays it, with any qualifier. */
  artistDisplayName: string;
  artistPrefix: string;
  creditLine: string;
  /** Committed raw API response, relative to the repository root. */
  evidenceFile: string;
  fetchedAt: string;
  imageUrl: string;
  institution: string;
  metadataSha256: string;
  museum: MuseumKey;
  objectId: string;
  objectUrl: string;
  rights: {
    designation: string;
    evidenceUrl: string;
    /** The museum's own object-level public-domain flag. */
    publicDomain: boolean;
  };
};

export type ArtworkOriginal = {
  bytes: number;
  contentType: string;
  fileName: string;
  height: number;
  sha256: string;
  width: number;
};

export type Artwork = {
  artistId: string;
  /** Source date text, never normalised into a false exact date. */
  date: string;
  dimensions?: string;
  id: string;
  medium: string;
  original?: ArtworkOriginal;
  reviews: {master: Review; rights: Review};
  series?: string;
  /** Customer-facing short title; `title` keeps the museum's full title. */
  shortTitle: string;
  source: ArtworkSource;
  title: string;
};

export type ArtRegistry = {artists: Artist[]; artworks: Artwork[]};

export const ART_REGISTRY = artRegistry as unknown as ArtRegistry;

export const MUSEUMS: Record<
  MuseumKey,
  {institution: string; shortName: string; rightsDesignation: string}
> = {
  met: {
    institution: 'The Metropolitan Museum of Art',
    shortName: 'The Met',
    rightsDesignation: 'Public domain: The Met Open Access (CC0)',
  },
};

/**
 * Ordinary EU term: life of the author plus 70 years, running to the end of
 * the calendar year (Directive 2006/116/EC, Articles 1 and 8). An artist who
 * died in `year - 71` or earlier clears this time screen in `year`. It is an
 * initial screen, not legal clearance.
 */
export function lifePlusSeventyCutoff(year: number) {
  return year - 71;
}

export type RightsScreen = {pass: boolean; reasons: string[]};

/**
 * The automated part of the release rules (brief §5). Passing it only makes
 * an artwork eligible for the human rights review; it never clears one.
 */
export function screenArtworkRights(
  artwork: Artwork,
  artist: Artist | undefined,
  {year = new Date().getUTCFullYear()}: {year?: number} = {},
): RightsScreen {
  const reasons: string[] = [];
  const {source} = artwork;
  if (!source.rights.publicDomain)
    reasons.push('the museum does not flag this object as public domain');
  if (!source.rights.designation.trim() || !source.rights.evidenceUrl.trim())
    reasons.push('missing rights designation or evidence URL');
  if (!artist) {
    reasons.push(`unknown artist ${artwork.artistId}`);
  } else {
    if (artist.kind !== 'historical')
      reasons.push(`${artist.name} is not a historical artist`);
    const died = artist.died?.year;
    if (typeof died !== 'number')
      reasons.push(`${artist.name} has no evidenced death year`);
    else if (died > lifePlusSeventyCutoff(year))
      reasons.push(
        `${artist.name} died in ${died}; life + 70 clears only deaths in ${lifePlusSeventyCutoff(year)} or earlier in ${year}`,
      );
    if (!matchesArtistName(artist, source.artistDisplayName))
      reasons.push(
        `museum attribution "${source.artistDisplayName}" does not match ${artist.name}`,
      );
  }
  if (source.artistPrefix.trim())
    reasons.push(
      `qualified attribution "${source.artistPrefix.trim()}" stays outside automated release`,
    );
  if (!artwork.date.trim()) reasons.push('missing source date');
  if (!source.creditLine.trim()) reasons.push('missing credit line');
  if (!source.imageUrl.trim()) reasons.push('missing original image URL');
  if (!artwork.original?.sha256) reasons.push('original file not fetched');
  return {pass: reasons.length === 0, reasons};
}

/** Lower-case, accent-free form for name and search matching. */
export function foldName(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function artistNames(artist: Pick<Artist, 'aliases' | 'name'>) {
  return [artist.name, ...artist.aliases];
}

export function matchesArtistName(
  artist: Pick<Artist, 'aliases' | 'name'>,
  name: string,
) {
  const folded = foldName(name);
  return Boolean(folded) && artistNames(artist).some((n) => foldName(n) === folded);
}

export function lifeDatesLabel(artist: Pick<Artist, 'born' | 'died'>) {
  if (!artist.born?.display && !artist.died?.display) return '';
  return `${artist.born?.display ?? ''}–${artist.died?.display ?? ''}`;
}

/** "Source: The Metropolitan Museum of Art, … Object 45434." */
export function artworkCreditLine(artwork: Pick<Artwork, 'source'>) {
  const {source} = artwork;
  return `Source: ${source.institution}, ${source.creditLine}. ${MUSEUMS[source.museum].rightsDesignation}. Object ${source.objectId}.`;
}

export function findArtist(id: string, registry: ArtRegistry = ART_REGISTRY) {
  return registry.artists.find((artist) => artist.id === id);
}

export function findArtwork(id: string, registry: ArtRegistry = ART_REGISTRY) {
  return registry.artworks.find((artwork) => artwork.id === id);
}

export function artworkId(museum: MuseumKey, objectId: string | number) {
  return `${museum}-${objectId}`;
}

export type Orientation = 'landscape' | 'portrait';

/** Paper orientation for a work; near-square works use portrait paper. */
export function orientationOf({
  height,
  width,
}: {
  height: number;
  width: number;
}): Orientation {
  return width > height * 1.02 ? 'landscape' : 'portrait';
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA256 = /^[a-f0-9]{64}$/;

/**
 * Everything that would make the registry unsafe to ship. Run by the test
 * suite and by every `museum` step.
 */
export function validateArtRegistry(
  registry: ArtRegistry = ART_REGISTRY,
): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const names = new Map<string, string>();

  for (const artist of registry.artists) {
    const at = `artist ${artist.id || '(no id)'}`;
    if (!SLUG.test(artist.id ?? '')) problems.push(`${at}: id must be kebab-case`);
    if (!SLUG.test(artist.slug ?? ''))
      problems.push(`${at}: slug must be kebab-case`);
    if (ids.has(artist.id)) problems.push(`${at}: duplicate id`);
    ids.add(artist.id);
    if (slugs.has(artist.slug)) problems.push(`${at}: duplicate slug`);
    slugs.add(artist.slug);
    for (const field of ['name', 'sortName'] as const)
      if (!artist[field]?.trim()) problems.push(`${at}: missing ${field}`);
    if (!['historical', 'studio'].includes(artist.kind))
      problems.push(`${at}: kind must be historical or studio`);
    if (!Array.isArray(artist.aliases))
      problems.push(`${at}: aliases must be a list`);
    for (const name of artistNames(artist)) {
      const folded = foldName(name ?? '');
      const owner = names.get(folded);
      if (owner && owner !== artist.id)
        problems.push(`${at}: name or alias "${name}" also belongs to ${owner}`);
      names.set(folded, artist.id);
    }
    if (typeof artist.approval?.approved !== 'boolean')
      problems.push(`${at}: approval.approved must be true or false`);
    if (artist.approval?.approved) {
      if (!artist.approval.by?.trim() || !artist.approval.at?.trim())
        problems.push(`${at}: an approval records who approved it and when`);
      if (!artist.bio?.trim()) problems.push(`${at}: approved without a bio`);
      if (!artist.curatorNote?.trim())
        problems.push(`${at}: approved without a curator's note`);
    }
    if (artist.kind === 'historical') {
      if (typeof artist.died?.year !== 'number' || !artist.died.display?.trim())
        problems.push(`${at}: historical artists need an evidenced death year`);
      if (!artist.born?.display?.trim())
        problems.push(`${at}: historical artists need a birth date display`);
      if (!artist.lifeDatesSource?.trim())
        problems.push(`${at}: historical artists need a life-dates source`);
      if (artist.bio?.trim() && !artist.bioSources?.length)
        problems.push(`${at}: a historical biography needs sources`);
    }
  }

  const artworkIds = new Set<string>();
  for (const artwork of registry.artworks) {
    const at = `artwork ${artwork.id || '(no id)'}`;
    const artist = registry.artists.find((a) => a.id === artwork.artistId);
    if (!artist) problems.push(`${at}: unknown artist ${artwork.artistId}`);
    if (artworkIds.has(artwork.id)) problems.push(`${at}: duplicate id`);
    artworkIds.add(artwork.id);
    const source = artwork.source;
    if (!source || !(source.museum in MUSEUMS)) {
      problems.push(`${at}: unknown museum`);
      continue;
    }
    if (artwork.id !== artworkId(source.museum, source.objectId))
      problems.push(`${at}: id must be ${artworkId(source.museum, source.objectId)}`);
    for (const field of ['title', 'shortTitle', 'date', 'medium'] as const)
      if (!artwork[field]?.trim()) problems.push(`${at}: missing ${field}`);
    for (const field of [
      'apiUrl',
      'objectUrl',
      'imageUrl',
      'creditLine',
      'evidenceFile',
      'fetchedAt',
      'institution',
    ] as const)
      if (!source[field]?.trim()) problems.push(`${at}: missing source.${field}`);
    if (!SHA256.test(source.metadataSha256 ?? ''))
      problems.push(`${at}: source.metadataSha256 must be a sha256`);
    if (artwork.original) {
      if (!SHA256.test(artwork.original.sha256 ?? ''))
        problems.push(`${at}: original.sha256 must be a sha256`);
      if (
        !Number.isInteger(artwork.original.width) ||
        !Number.isInteger(artwork.original.height) ||
        artwork.original.width < 1 ||
        artwork.original.height < 1
      )
        problems.push(`${at}: original needs pixel dimensions`);
    }
    for (const kind of ['rights', 'master'] as const) {
      const review = artwork.reviews?.[kind];
      if (!review || !['blocked', 'cleared', 'pending'].includes(review.status)) {
        problems.push(`${at}: ${kind} review status must be pending, cleared or blocked`);
        continue;
      }
      if (review.status !== 'pending' && (!review.by?.trim() || !review.at?.trim()))
        problems.push(`${at}: a ${kind} review records who decided it and when`);
    }
    // A cleared rights review must still pass the automated screen; the
    // screen year is the review year so a later year cannot un-clear it.
    if (artwork.reviews?.rights?.status === 'cleared') {
      const year = Number(artwork.reviews.rights.at?.slice(0, 4));
      const screen = screenArtworkRights(artwork, artist, {
        year: Number.isInteger(year) ? year : undefined,
      });
      if (!screen.pass)
        problems.push(`${at}: rights cleared but the screen fails: ${screen.reasons.join('; ')}`);
    }
    if (artwork.reviews?.master?.status === 'cleared' && !artwork.original)
      problems.push(`${at}: master cleared without a fetched original`);
  }

  for (const artist of registry.artists) {
    if (!artist.representativeArtworkId) continue;
    const artwork = registry.artworks.find(
      (a) => a.id === artist.representativeArtworkId,
    );
    if (!artwork || artwork.artistId !== artist.id)
      problems.push(
        `artist ${artist.id}: representative artwork must be one of their artworks`,
      );
  }

  return problems;
}
