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

/**
 * The site's primary navigation, in order. The sticky header, the mobile
 * menu, the homepage hero header and the Our Story header all render this
 * list, so a page never shows a different set of links from the next.
 * Lines appear only once released (artists, book nooks, personalised
 * products); Your Sky is a feature page, not a product URL.
 */
export const NAV_LINKS: readonly NavLinkItem[] = [
  {to: '/collections/all', label: 'Shop'},
  ...(publicArtists().length > 0 ? [{to: '/artists', label: 'Artists'}] : []),
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
  {to: '/our-story', label: 'Our Story'},
  {to: '/blogs/karina-of-time', label: 'Journal'},
  {to: '/contact', label: 'Contact'},
  {to: '/search', label: 'Search'},
];
