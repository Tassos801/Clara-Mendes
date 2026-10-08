import {useEffect, useState} from 'react';
import {
  ClaraProductCard,
  type ClaraCardProduct,
} from '~/components/ClaraProductCard';
import {
  getRecentlyViewed,
  recentlyViewedProductIds,
} from '~/lib/recentlyViewed';

/**
 * "Recently viewed" rail rendered from the browsing history kept in
 * localStorage. Each render revalidates publication, approval and current
 * price with Storefront; a revoked product cannot survive as a saved snapshot.
 */
export function RecentlyViewed({
  excludeHandles = [],
}: {
  excludeHandles?: string[];
}) {
  const [products, setProducts] = useState<ClaraCardProduct[]>([]);
  const serializedExcludes = excludeHandles.join(',');

  useEffect(() => {
    const entries = getRecentlyViewed({
      excludeHandles: serializedExcludes.split(',').filter(Boolean),
      limit: 12,
    });
    const ids = recentlyViewedProductIds(entries.map(({id}) => id));
    const controller = new AbortController();
    setProducts([]);
    if (ids.length) {
      const params = new URLSearchParams(ids.map((id) => ['id', id]));
      void fetch(`/api/recently-viewed?${params}`, {signal: controller.signal})
        .then(async (response) =>
          response.ok
            ? (response.json() as Promise<{products: ClaraCardProduct[]}>)
            : null,
        )
        .then((result) => {
          if (!result || controller.signal.aborted) return;
          setProducts(
            ids
              .flatMap((id) =>
                result.products.filter((product) => product.id === id),
              )
              .slice(0, 3),
          );
        })
        .catch(() => {
          /* History is optional; network failures keep it hidden. */
        });
    }
    return () => controller.abort();
  }, [serializedExcludes]);

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
        {products.map((product) => (
          <ClaraProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
