// Relative imports keep this module loadable by the plain-Node test runner.
import pastelPots from '../../data/pastel-plant-pots.json' with {type: 'json'};
import {publicArtists} from './artistShops.ts';
import {BOOK_NOOKS_PATH, releasedBookNooks} from './bookNooks.ts';
import {
  isReleasedProductHandle,
  PERSONALISED_RELEASE_FLAGS,
  PRODUCT_RELEASE_FLAGS,
  SKY_PRODUCT_HANDLE,
} from './catalogFilters.ts';
import {YOUR_SKY_PAGE} from './featurePages.ts';
import {TOUGH_CASE_HANDLE} from './toughCase.ts';

export type LineRailEntry = {
  key:
    | 'prints'
    | 'artists'
    | 'clothing'
    | 'book-nooks'
    | 'cases'
    | 'your-sky'
    | 'pots';
  label: string;
  href: string;
  image: {src: string; width: number; height: number};
  /** CSS object-position for the circular crop; centre when omitted. */
  objectPosition?: string;
};

export type LineRailGates = {
  /** Public artist shops; defaults to publicArtists().length. */
  artists?: number;
  /** Released nooks; defaults to releasedBookNooks().length. */
  bookNooks?: number;
  personalisedFlags?: Record<string, boolean>;
  productFlags?: Record<string, boolean>;
};

/** The Pastel Forms pots; the line shows once any one is released. */
const POT_HANDLES: readonly string[] = pastelPots.designs.map(
  (design) => design.handle,
);

/**
 * The released product lines, in rail order; an unreleased line never
 * appears. The homepage renders one circle per entry under the hero, so the
 * gates match the primary navigation's (app/lib/navLinks.ts).
 */
export function lineRailEntries(gates: LineRailGates = {}): LineRailEntry[] {
  const artists = gates.artists ?? publicArtists().length;
  const bookNooks = gates.bookNooks ?? releasedBookNooks().length;
  const personalisedFlags =
    gates.personalisedFlags ?? PERSONALISED_RELEASE_FLAGS;
  const productFlags = gates.productFlags ?? PRODUCT_RELEASE_FLAGS;

  const lines: Array<[released: boolean, entry: LineRailEntry]> = [
    [
      true,
      {
        key: 'prints',
        label: 'Prints',
        href: '/collections/all?type=Art+Prints',
        image: {
          src: '/images/line-rail/prints.jpg',
          width: 360,
          height: 450,
        },
      },
    ],
    [
      artists > 0,
      {
        key: 'artists',
        label: 'Artists',
        href: '/artists',
        image: {
          src: '/images/line-rail/artists.jpg',
          width: 450,
          height: 360,
        },
      },
    ],
    [
      true,
      {
        key: 'clothing',
        label: 'Clothing',
        href: '/clothing',
        image: {
          src: 'https://cdn.shopify.com/s/files/1/1027/6533/0766/files/01-moss-flat-front_e847210a-10f9-4c6c-b296-0eedb07b5afd.jpg?width=320',
          width: 320,
          height: 400,
        },
      },
    ],
    [
      bookNooks > 0,
      {
        key: 'book-nooks',
        label: 'Book Nooks',
        href: BOOK_NOOKS_PATH,
        image: {
          src: '/images/line-rail/book-nooks.jpg',
          width: 360,
          height: 450,
        },
      },
    ],
    [
      isReleasedProductHandle(TOUGH_CASE_HANDLE, productFlags),
      {
        key: 'cases',
        label: 'Cases',
        href: `/products/${TOUGH_CASE_HANDLE}`,
        image: {
          src: '/images/line-rail/cases.jpg',
          width: 360,
          height: 551,
        },
        objectPosition: '50% 40%',
      },
    ],
    [
      Boolean(personalisedFlags[SKY_PRODUCT_HANDLE]),
      {
        key: 'your-sky',
        label: 'Your Sky',
        href: YOUR_SKY_PAGE.path,
        image: {
          src: '/images/line-rail/your-sky.jpg',
          width: 360,
          height: 450,
        },
      },
    ],
    [
      POT_HANDLES.some((handle) =>
        isReleasedProductHandle(handle, productFlags),
      ),
      {
        key: 'pots',
        label: 'Pots',
        href: '/pastel-forms',
        image: {
          src: '/images/line-rail/pots.jpg',
          width: 360,
          height: 360,
        },
      },
    ],
  ];

  return lines.flatMap(([released, entry]) => (released ? [entry] : []));
}

export const LINE_RAIL_ENTRIES: readonly LineRailEntry[] = lineRailEntries();
