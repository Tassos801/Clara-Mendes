import {useEffect, useMemo, useState} from 'react';
import {
  ClaraProductCard,
  type ClaraCardProduct,
} from '~/components/ClaraProductCard';
import type {CardPricing} from '~/lib/productCardPricing';
import {
  getRecentlyViewed,
  isPriceRangeFlagFresh,
  type RecentlyViewedEntry,
} from '~/lib/recentlyViewed';

/**
 * "Recently viewed" rail rendered from the browsing history kept in
 * localStorage. Client-only: renders nothing on the server and on the
 * first client pass, then fills in after hydration.
 */
export function RecentlyViewed({
  excludeHandles = [],
}: {
  excludeHandles?: string[];
}) {
  const [entries, setEntries] = useState<RecentlyViewedEntry[]>([]);
  const serializedExcludes = excludeHandles.join(',');

  useEffect(() => {
    setEntries(
      getRecentlyViewed({
        excludeHandles: serializedExcludes.split(',').filter(Boolean),
        limit: 3,
      }),
    );
  }, [serializedExcludes]);

  const products = useMemo(() => entries.map(toCardProduct), [entries]);

  if (products.length === 0) return null;

  return (
    <section
      className="related-section recently-viewed-section"
      aria-labelledby="recently-viewed"
    >
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Pick up where you left off</p>
          <h2 id="recently-viewed">Recently viewed</h2>
        </div>
      </div>
      <div className="product-grid compact-grid">
        {products.map(({card, pricing}) => (
          <ClaraProductCard key={card.id} product={card} pricing={pricing} />
        ))}
      </div>
    </section>
  );
}

function toCardProduct(entry: RecentlyViewedEntry): {
  card: ClaraCardProduct;
  pricing: CardPricing;
} {
  const price =
    entry.amount && entry.currencyCode
      ? {amount: entry.amount, currencyCode: entry.currencyCode}
      : null;

  return {
    card: {
      id: entry.id,
      handle: entry.handle,
      title: entry.title,
      productType: entry.productType,
      featuredImage: entry.imageUrl
        ? {url: entry.imageUrl, altText: entry.imageAlt ?? entry.title}
        : null,
      priceRange: price ? {minVariantPrice: price} : undefined,
    },
    // Snapshots already store the released "From" floor (v3 semantics), so
    // the card must not re-derive pricing from the synthesized product. The
    // range flag ages out so a size paused after the visit cannot keep the
    // "From" prefix alive indefinitely.
    pricing: {price, hasRange: isPriceRangeFlagFresh(entry)},
  };
}
