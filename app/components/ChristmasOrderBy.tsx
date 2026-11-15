import {useRouteLoaderData} from 'react-router';
import type {loader} from '~/routes/products.$handle';
import {
  christmasLineFor,
  christmasNotice,
  christmasRegionFor,
  christmasRegionName,
  formatOrderByDate,
  type ChristmasLine,
  type ChristmasRegion,
  type IsoDate,
} from '~/lib/christmasDelivery';

type OrderByProps = {
  /** The fulfilment line (christmasLineFor); null when it has no date. */
  line: ChristmasLine | null;
  /** christmasRegionFor(the buyer's country). */
  region: ChristmasRegion | null;
  /** requestToday(request), from the route's loader. */
  today: IsoDate;
};

/**
 * One line on a product page: the Christmas order-by date for this
 * product's fulfilment line and the buyer's region (EU or US), while that
 * date is still ahead. Nothing shows for other countries, products that
 * don't ship to the buyer, after the date, or outside the season
 * (app/lib/christmasDelivery.ts). With no props it reads the product route's
 * own data; a page with its own loader (Your Sky, the art phone case) passes
 * the line, region and today, and passes a null line when the item doesn't
 * ship to the buyer.
 */
export function ChristmasOrderBy(props: Partial<OrderByProps>) {
  const data = useRouteLoaderData<typeof loader>('routes/products.$handle');
  if (props.today) {
    return (
      <OrderByLine
        line={props.line ?? null}
        region={props.region ?? null}
        today={props.today}
      />
    );
  }
  if (!data?.christmasToday) return null;
  const {artProduct, christmasToday, deliveryCountry, product} = data;
  const shipsToBuyer = product.variants.nodes.some(
    (variant) => variant.availableForSale,
  );
  if (!shipsToBuyer) return null;
  return (
    <OrderByLine
      line={christmasLineFor({
        productType: product.productType,
        handle: product.handle,
        tags: product.tags,
        printfulTechnique: artProduct?.printfulTechnique ?? null,
      })}
      region={christmasRegionFor(deliveryCountry.code)}
      today={christmasToday}
    />
  );
}

function OrderByLine({line, region, today}: OrderByProps) {
  const notice = christmasNotice(line, region, today);
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
