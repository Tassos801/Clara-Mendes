export type CollectionSortValue =
  | 'featured'
  | 'price-asc'
  | 'price-desc'
  | 'alpha-asc'
  | 'alpha-desc';

export const COLLECTION_SORT_OPTIONS: Array<{
  label: string;
  value: CollectionSortValue;
}> = [
  {label: 'Featured', value: 'featured'},
  {label: 'Price: Low to High', value: 'price-asc'},
  {label: 'Price: High to Low', value: 'price-desc'},
  {label: 'A – Z', value: 'alpha-asc'},
  {label: 'Z – A', value: 'alpha-desc'},
];

export function getCollectionSortValue(
  searchParams: URLSearchParams,
): CollectionSortValue {
  const sort = searchParams.get('sort');
  return COLLECTION_SORT_OPTIONS.some((option) => option.value === sort)
    ? (sort as CollectionSortValue)
    : 'featured';
}

/**
 * Maps a sort value to the Storefront API `products(...)` connection
 * (ProductSortKeys) used on /collections/all.
 */
export function getProductsSortInput(sort: CollectionSortValue): {
  sortKey: 'BEST_SELLING' | 'PRICE' | 'TITLE';
  reverse: boolean;
} {
  switch (sort) {
    case 'price-asc':
      return {sortKey: 'PRICE', reverse: false};
    case 'price-desc':
      return {sortKey: 'PRICE', reverse: true};
    case 'alpha-asc':
      return {sortKey: 'TITLE', reverse: false};
    case 'alpha-desc':
      return {sortKey: 'TITLE', reverse: true};
    default:
      return {sortKey: 'BEST_SELLING', reverse: false};
  }
}

/**
 * Maps a sort value to the `collection.products(...)` connection
 * (ProductCollectionSortKeys) used on /collections/$handle.
 */
export function getCollectionProductsSortInput(sort: CollectionSortValue): {
  sortKey: 'COLLECTION_DEFAULT' | 'PRICE' | 'TITLE';
  reverse: boolean;
} {
  switch (sort) {
    case 'price-asc':
      return {sortKey: 'PRICE', reverse: false};
    case 'price-desc':
      return {sortKey: 'PRICE', reverse: true};
    case 'alpha-asc':
      return {sortKey: 'TITLE', reverse: false};
    case 'alpha-desc':
      return {sortKey: 'TITLE', reverse: true};
    default:
      return {sortKey: 'COLLECTION_DEFAULT', reverse: false};
  }
}
