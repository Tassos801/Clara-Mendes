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
import {christmasPicturesSeason, storeToday} from './christmasDelivery.ts';
import {YOUR_SKY_PAGE} from './featurePages.ts';
import {GIFTS_PATH} from './giftPage.ts';
import {TOUGH_CASE_HANDLE} from './toughCase.ts';

export type LineRailEntry = {
  key:
    | 'prints'
    | 'gifts'
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
  /** The store date (YYYY-MM-DD) that picks the pictures; defaults to today. */
  today?: string;
};

type RailPicture = Pick<LineRailEntry, 'image' | 'objectPosition'>;
const square = (src: string): RailPicture => ({
  image: {src, width: 360, height: 360},
});

/**
 * Each line's circle picture, the rest of the year and at Christmas (1
 * November to 6 January, christmasPicturesSeason; the homepage loader picks
 * per request). Files in public/ are cached by
 * browsers for a year, so a changed picture always gets a new file name.
 * The year-round entries are the ones live before the Christmas pictures
 * (lineRail.ts at commit 183134e).
 */
const PICTURES: Record<
  LineRailEntry['key'],
  {year: RailPicture; christmas: RailPicture}
> = {
  prints: {
    year: {
      image: {src: '/images/line-rail/prints.jpg', width: 360, height: 450},
    },
    christmas: square('/images/line-rail/prints-christmas.jpg'),
  },
  // The gift edit's circle shows Hiroshige's fireworks blanket (tied with a
  // bow at Christmas).
  gifts: {
    year: {
      image: {
        src: 'https://cdn.shopify.com/s/files/1/1027/6533/0766/files/cm-floating-world-fireworks-at-ryogoku-bridge-blanket.webp?v=1792155060&width=360',
        width: 360,
        height: 450,
      },
    },
    christmas: square('/images/line-rail/gifts-christmas.jpg'),
  },
  artists: {
    year: {
      image: {src: '/images/line-rail/artists.jpg', width: 450, height: 360},
    },
    christmas: square('/images/line-rail/artists-christmas.jpg'),
  },
  clothing: {
    year: {
      image: {
        src: 'https://cdn.shopify.com/s/files/1/1027/6533/0766/files/01-moss-flat-front_e847210a-10f9-4c6c-b296-0eedb07b5afd.jpg?width=320',
        width: 320,
        height: 400,
      },
    },
    christmas: square('/images/line-rail/clothing-christmas.jpg'),
  },
  'book-nooks': {
    year: {
      image: {src: '/images/line-rail/book-nooks.jpg', width: 360, height: 450},
    },
    christmas: square('/images/line-rail/book-nooks-christmas.jpg'),
  },
  cases: {
    year: {
      image: {src: '/images/line-rail/cases.jpg', width: 360, height: 551},
      objectPosition: '50% 40%',
    },
    christmas: square('/images/line-rail/cases-christmas.jpg'),
  },
  'your-sky': {
    year: {
      image: {src: '/images/line-rail/your-sky.jpg', width: 360, height: 450},
    },
    christmas: square('/images/line-rail/your-sky-christmas.jpg'),
  },
  pots: {
    year: square('/images/line-rail/pots.jpg'),
    christmas: square('/images/line-rail/pots-christmas.jpg'),
  },
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

  const season =
    christmasPicturesSeason(gates.today ?? storeToday()) === 'open'
      ? 'christmas'
      : 'year';

  const lines: Array<[released: boolean, entry: Omit<LineRailEntry, 'image'>]> =
    [
      [
        true,
        {
          key: 'prints',
          label: 'Prints',
          href: '/collections/all?type=Art+Prints',
        },
      ],
      // The gift edit (/gifts): museum art on blankets, mugs and more.
      [
        true,
        {
          key: 'gifts',
          label: 'Gifts',
          href: GIFTS_PATH,
        },
      ],
      [
        artists > 0,
        {
          key: 'artists',
          label: 'Artists',
          href: '/artists',
        },
      ],
      [
        true,
        {
          key: 'clothing',
          label: 'Clothing',
          href: '/clothing',
        },
      ],
      [
        bookNooks > 0,
        {
          key: 'book-nooks',
          label: 'Book Nooks',
          href: BOOK_NOOKS_PATH,
        },
      ],
      [
        isReleasedProductHandle(TOUGH_CASE_HANDLE, productFlags),
        {
          key: 'cases',
          label: 'Cases',
          href: `/products/${TOUGH_CASE_HANDLE}`,
        },
      ],
      [
        Boolean(personalisedFlags[SKY_PRODUCT_HANDLE]),
        {
          key: 'your-sky',
          label: 'Your Sky',
          href: YOUR_SKY_PAGE.path,
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
        },
      ],
    ];

  return lines.flatMap(([released, entry]) =>
    released ? [{...entry, ...PICTURES[entry.key][season]}] : [],
  );
}
