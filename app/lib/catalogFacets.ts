/**
 * Faceted catalog filtering shared by /collections/all and
 * /collections/$handle. Selections live in the URL so filtered views are
 * shareable and pagination-safe:
 *
 *   ?available=1&min=10&max=120&type=Ceramics&type=Lighting&vendor=Studio+X
 */

export type CatalogFacetSelection = {
  available: boolean;
  priceMin: number | null;
  priceMax: number | null;
  productTypes: string[];
  vendors: string[];
};

export type FacetOption = {
  count?: number;
  label: string;
};

export type CatalogFacetOptions = {
  productTypes: FacetOption[];
  vendors: FacetOption[];
};

export const EMPTY_FACET_OPTIONS: CatalogFacetOptions = {
  productTypes: [],
  vendors: [],
};

function parsePrice(value: string | null): number | null {
  if (value == null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function parseFacetSelection(
  searchParams: URLSearchParams,
): CatalogFacetSelection {
  return {
    available: searchParams.get('available') === '1',
    priceMin: parsePrice(searchParams.get('min')),
    priceMax: parsePrice(searchParams.get('max')),
    productTypes: searchParams.getAll('type').filter(Boolean),
    vendors: searchParams.getAll('vendor').filter(Boolean),
  };
}

export function countActiveFacets(selection: CatalogFacetSelection): number {
  return (
    (selection.available ? 1 : 0) +
    (selection.priceMin != null || selection.priceMax != null ? 1 : 0) +
    selection.productTypes.length +
    selection.vendors.length
  );
}

/**
 * Maps the selection to `collection.products(filters:)` inputs. Filters with
 * the same key are OR'd by Shopify; different keys are AND'd.
 */
export function buildCollectionProductFilters(
  selection: CatalogFacetSelection,
): Array<Record<string, unknown>> {
  const filters: Array<Record<string, unknown>> = [];

  if (selection.available) filters.push({available: true});

  if (selection.priceMin != null || selection.priceMax != null) {
    filters.push({
      price: {
        ...(selection.priceMin != null ? {min: selection.priceMin} : {}),
        ...(selection.priceMax != null ? {max: selection.priceMax} : {}),
      },
    });
  }

  for (const productType of selection.productTypes) {
    filters.push({productType});
  }

  for (const vendor of selection.vendors) {
    filters.push({productVendor: vendor});
  }

  return filters;
}

function quoteSearchValue(value: string): string {
  return `"${value.replace(/[\\"]/g, (char) => `\\${char}`)}"`;
}

/**
 * Maps the selection to the `products(query:)` search syntax used on
 * /collections/all, where the root connection has no `filters` argument.
 */
export function buildProductsSearchQuery(
  selection: CatalogFacetSelection,
): string | undefined {
  const parts: string[] = [];

  if (selection.available) parts.push('available_for_sale:true');
  if (selection.priceMin != null) {
    parts.push(`variants.price:>=${selection.priceMin}`);
  }
  if (selection.priceMax != null) {
    parts.push(`variants.price:<=${selection.priceMax}`);
  }
  if (selection.productTypes.length > 0) {
    parts.push(
      `(${selection.productTypes
        .map((type) => `product_type:${quoteSearchValue(type)}`)
        .join(' OR ')})`,
    );
  }
  if (selection.vendors.length > 0) {
    parts.push(
      `(${selection.vendors
        .map((vendor) => `vendor:${quoteSearchValue(vendor)}`)
        .join(' OR ')})`,
    );
  }

  return parts.length > 0 ? parts.join(' ') : undefined;
}

export type StorefrontFilterFacet = {
  id: string;
  label: string;
  values: Array<{count: number; label: string}>;
};

/**
 * Extracts product-type and vendor facet options from the `filters` field
 * returned on a collection's products connection. Facets appear only when
 * the corresponding filter is enabled in the Search & Discovery app.
 */
export function extractFacetOptions(
  facets: StorefrontFilterFacet[] | null | undefined,
): CatalogFacetOptions {
  const toOptions = (facet?: StorefrontFilterFacet): FacetOption[] =>
    (facet?.values ?? [])
      .filter((value) => Boolean(value.label))
      .map((value) => ({count: value.count, label: value.label}));

  return {
    productTypes: toOptions(
      facets?.find((facet) => facet.id.endsWith('product_type')),
    ),
    vendors: toOptions(facets?.find((facet) => facet.id.endsWith('vendor'))),
  };
}
