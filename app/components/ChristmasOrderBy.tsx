import {useRouteLoaderData} from 'react-router';
import type {loader} from '~/routes/products.$handle';
import {
  christmasLineFor,
  christmasNotice,
  christmasRegionFor,
  christmasRegionName,
  formatOrderByDate,
} from '~/lib/christmasDelivery';

/**
 * One line on the product page: the Christmas order-by date for this
 * product's fulfilment line and the buyer's region (EU or US), while that
 * date is still ahead. Nothing shows for other countries, products that
 * don't ship to the buyer, after the date, or outside the season
 * (app/lib/christmasDelivery.ts). Reads the product route's own data.
 */
export function ChristmasOrderBy() {
  const data = useRouteLoaderData<typeof loader>('routes/products.$handle');
  if (!data?.christmasToday) return null;
  const {artProduct, christmasToday, deliveryCountry, product} = data;
  const shipsToBuyer = product.variants.nodes.some(
    (variant) => variant.availableForSale,
  );
  if (!shipsToBuyer) return null;
  const region = christmasRegionFor(deliveryCountry.code);
  const notice = christmasNotice(
    christmasLineFor({
      productType: product.productType,
      handle: product.handle,
      tags: product.tags,
      printfulTechnique: artProduct?.printfulTechnique ?? null,
    }),
    region,
    christmasToday,
  );
  if (!notice || !region) return null;
  return (
    <p className="product-christmas-line">
      For Christmas delivery in {christmasRegionName(region)}, order by{' '}
      {formatOrderByDate(notice.date)}.
      <style suppressHydrationWarning>{css}</style>
    </p>
  );
}

const css = `
.product-christmas-line {
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 10px 0 0;
}
`;
