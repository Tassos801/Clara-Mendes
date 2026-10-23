// Relative imports keep this module loadable by the plain-Node test runner.
import {BOOK_NOOKS_PATH, releasedBookNooks} from './bookNooks.ts';
import {
  NATAL_PRODUCT_HANDLE,
  PERSONALISED_RELEASE_FLAGS,
  SKY_PRODUCT_HANDLE,
} from './catalogFilters.ts';
import {YOUR_SKY_PAGE} from './featurePages.ts';
import {publicArtists} from './artistShops.ts';

export type NavLinkItem = {label: string; to: string};

export const SHOP_PATH = '/collections/all';

const ARTISTS_LINK: NavLinkItem[] =
  publicArtists().length > 0 ? [{to: '/artists', label: 'Artists'}] : [];

/**
 * The lines under "Shop", in order. The desktop header shows them in the
 * Shop menu; the mobile menu lists them in full. Lines appear only once
 * released (book nooks, personalised products); Your Sky is a feature
 * page, not a product URL.
 */
export const SHOP_LINKS: readonly NavLinkItem[] = [
  {to: '/clothing', label: 'Clothing'},
  ...(releasedBookNooks().length > 0
    ? [{to: BOOK_NOOKS_PATH, label: 'Book Nooks'}]
    : []),
  ...(PERSONALISED_RELEASE_FLAGS[SKY_PRODUCT_HANDLE]
    ? [{to: YOUR_SKY_PAGE.path, label: YOUR_SKY_PAGE.navLabel}]
    : []),
  ...(PERSONALISED_RELEASE_FLAGS[NATAL_PRODUCT_HANDLE]
    ? [{to: `/products/${NATAL_PRODUCT_HANDLE}`, label: 'First Light'}]
    : []),
];

/**
 * The short desktop navigation: the sticky header, the homepage hero
 * header and the Our Story header all render this list, so a page never
 * shows a different set of links from the next. Search and the cart sit
 * beside it as icons; the journal and contact live in the footer.
 */
export const PRIMARY_LINKS: readonly NavLinkItem[] = [
  {to: SHOP_PATH, label: 'Shop'},
  ...ARTISTS_LINK,
  {to: '/our-story', label: 'Our Story'},
];

/** Every page in the menu, in order, for the mobile menu drawer. */
export const NAV_LINKS: readonly NavLinkItem[] = [
  {to: SHOP_PATH, label: 'Shop'},
  ...ARTISTS_LINK,
  ...SHOP_LINKS,
  {to: '/our-story', label: 'Our Story'},
  {to: '/blogs/karina-of-time', label: 'Journal'},
  {to: '/contact', label: 'Contact'},
  {to: '/search', label: 'Search'},
];
