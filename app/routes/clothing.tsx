import {
  Form,
  Link,
  useLoaderData,
  useSearchParams,
  useSubmit,
} from 'react-router';
import {Image} from '@shopify/hydrogen';
import type {Route} from './+types/clothing';
import {ClothingProductCard} from '~/components/ClothingProductCard';
import {StructuredData} from '~/components/StructuredData';
import {
  loadCapsuleSummaries,
  loadClothingProducts,
} from '~/lib/clothing.server';
import {quoteClothingShipping} from '~/lib/clothingShipping.server';
import {formatMoney} from '~/lib/money';
import {
  LEAD_CLOTHING_CAPSULE,
  clothingCategories,
  clothingCapsules,
} from '~/lib/clothing';
import {
  CLOTHING_SORTS,
  allMadeToOrder,
  clothingFilterUrl,
  clothingGarmentPhrase,
  clothingLooks,
  clothingSwatchBackground,
  selectClothing,
  showClothingTools,
} from '~/lib/clothingPresentation';
import {
  CLOTHING_PAGE_ACCENT,
  COLOURWAY_ACCENT_SIZE,
  capsuleStory,
  capsuleStoryData,
  clothingPageHero,
  genericCapsuleStory,
  lookAccent,
} from '~/lib/clothingEditorial';
import {isOffThemeCollectionHandle} from '~/lib/catalogFilters';
import {
  APPAREL_PRODUCTION_WINDOW_BUSINESS_DAYS,
  APPAREL_SHIPPING_FROM_EUR,
  isQuietCurrentProduct,
  RETURN_WINDOW_DAYS,
} from '~/lib/storefrontBasics';
import {
  breadcrumbSchema,
  buildSeoMeta,
  collectionSchema,
  getCanonicalUrl,
} from '~/lib/seo';

/** The page before Counter-Diagonal (and whenever it has nothing listed). */
const QUIET_CURRENT_DESCRIPTION =
  'Clara Mendes Clothing: leggings, a sports bra, biker shorts and a tank top with a watercolour-style print, made to order in Moss / Mist and Clay / Oat.';

/** Names only the garment kinds really listed. */
function clothingDescription(
  leadGarments: string | null,
  hasLead: boolean,
  hasQuietCurrent: boolean,
  otherLead?: string | null,
) {
  if (!hasLead && otherLead)
    return `Clara Mendes Clothing: ${otherLead} ${leadGarments ?? 'clothing'}${
      hasQuietCurrent
        ? ', and Quiet Current activewear with a watercolour-style print'
        : ''
    }. Made to order.`;
  if (!hasLead) return QUIET_CURRENT_DESCRIPTION;
  return `Clara Mendes Clothing: Counter-Diagonal ${leadGarments ?? 'clothing'} in one geometric design inspired by Theo van Doesburg${
    hasQuietCurrent
      ? ', and Quiet Current activewear with a watercolour-style print'
      : ''
  }. Made to order.`;
}

/** A 1x1 transparent GIF. */
const BLANK_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export const meta: Route.MetaFunction = ({data}) =>
  buildSeoMeta({
    title: 'Clothing | Clara Mendes',
    description: data?.description || QUIET_CURRENT_DESCRIPTION,
    url: data?.seoUrl || 'https://shopclaramendes.com/clothing',
    image: data?.products?.[0]?.featuredImage?.url,
    noIndex: !data?.catalogTotal,
  });

export async function loader({context, request}: Route.LoaderArgs) {
  const products = await loadClothingProducts(context.storefront);
  const selection = selectClothing(products, new URL(request.url).searchParams);
  // Counter-Diagonal first, then the other capsules (collections with
  // custom.collection_kind = capsule), newest piece first.
  const capsules = clothingCapsules(products).filter(
    (capsule) => !isOffThemeCollectionHandle(capsule.handle),
  );
  const inCapsule = (handle: string) =>
    products.filter((product) =>
      product.collections.nodes.some(
        (collection) => collection.handle === handle,
      ),
    );
  // Counter-Diagonal leads while it has a listed piece (the line advertised
  // in New York). Otherwise the capsule holding the newest piece leads, so
  // a new capsule takes over without a code change.
  const featured = capsules[0] ?? null;
  const featuredProducts = featured ? inCapsule(featured.handle) : [];
  const leadGarments = clothingGarmentPhrase(featuredProducts);
  // A capsule without an editorial entry gets a generic block from its
  // own Shopify collection (description and image).
  const summaries = await loadCapsuleSummaries(
    context.storefront,
    capsules
      .map((capsule) => capsule.handle)
      .filter((handle) => !capsuleStory(handle)),
  );
  const storyOf = (handle?: string | null) =>
    capsuleStoryData(handle) ??
    (handle ? genericCapsuleStory(summaries[handle]) : null);
  const heroStory = storyOf(featured?.handle);
  // One section per capsule, the featured one first.
  const collections = [
    ...(featured ? [featured] : []),
    ...capsules.filter((capsule) => capsule.handle !== featured?.handle),
  ].map((capsule) => {
    const pieces = inCapsule(capsule.handle);
    const story = storyOf(capsule.handle);
    const colourways =
      story?.colourwayChooser === false ? [] : clothingLooks(pieces);
    return {
      ...capsule,
      story,
      colourways,
      everyPieceInEveryColourway:
        pieces.length > 0 &&
        colourways.every((look) => look.pieces.length === pieces.length),
    };
  });
  // Verified processing times and shipping fees exist only for the released
  // Quiet Current pieces; anything else defers to the product page.
  const quietCurrentOnly =
    products.length > 0 &&
    products.every((product) => isQuietCurrentProduct(product.handle));
  // Quiet Current's "from" fee is in EUR; a US (USD) buyer reads checkout's
  // own fee for one piece instead, or no figure (docs/us-market, A3).
  const usQuote =
    quietCurrentOnly && context.storefront.i18n.country === 'US'
      ? await quoteClothingShipping(
          context.storefront,
          products[0]?.cardVariant?.nodes[0]?.id,
          'US',
          {waitUntil: context.waitUntil},
        )
      : null;
  return {
    ...selection,
    categories: clothingCategories(
      selection.capsule ? inCapsule(selection.capsule) : products,
    ),
    capsules,
    catalogTotal: products.length,
    collections,
    description: clothingDescription(
      leadGarments,
      featured?.handle === LEAD_CLOTHING_CAPSULE,
      capsules.some((capsule) => capsule.handle === 'quiet-current'),
      featured && featured.handle !== 'quiet-current' ? featured.title : null,
    ),
    hero: {
      ...clothingPageHero(
        featured?.handle,
        leadGarments,
        featured
          ? {title: featured.title, madeToOrder: allMadeToOrder(featuredProducts)}
          : null,
      ),
      looksImage: heroStory?.looksImage ?? null,
      // The olive watercolour belongs to Quiet Current; a generic capsule
      // gets no accent.
      accent:
        heroStory?.accent ??
        (featured && !capsuleStory(featured.handle)
          ? null
          : {...CLOTHING_PAGE_ACCENT, className: 'clothing-hero-art'}),
    },
    showTools: showClothingTools(products.length) || Boolean(selection.category),
    madeToOrder: allMadeToOrder(products),
    // Quiet Current is cut and sewn; DTG and embroidered pieces are not.
    cutAndSewn: quietCurrentOnly,
    processing: quietCurrentOnly ? APPAREL_PRODUCTION_WINDOW_BUSINESS_DAYS : null,
    shippingFrom: !quietCurrentOnly
      ? null
      : context.storefront.i18n.country === 'US'
        ? usQuote && formatMoney(usQuote)
        : `€${APPAREL_SHIPPING_FROM_EUR}`,
    seoUrl: getCanonicalUrl(request, '/clothing'),
  };
}

export default function Clothing() {
  const data = useLoaderData<typeof loader>();
  const [params] = useSearchParams();
  const submit = useSubmit();
  const href = (key: 'category' | 'capsule', value: string) =>
    clothingFilterUrl(params, key, value);
  const {hero} = data;
  const looksImage = hero.looksImage;
  const more = new URLSearchParams(params);
  more.set('page', String(data.page + 1));
  return (
    <div className="clothing-page">
      <StructuredData
        data={[
          breadcrumbSchema({
            items: [
              {name: 'Home', url: 'https://shopclaramendes.com/'},
              {name: 'Clothing', url: data.seoUrl},
            ],
          }),
          collectionSchema({
            description: data.description,
            products: data.products,
            title: 'Clara Mendes Clothing',
            url: data.seoUrl,
          }),
        ]}
      />

      <section
        className={`clothing-hero${looksImage ? '' : ' clothing-hero--text'}`}
        aria-labelledby="clothing-title"
      >
        <div className="clothing-hero-copy">
          <nav className="clothing-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Clothing</span>
          </nav>
          {hero.eyebrow ? (
            <p className="clothing-eyebrow">{hero.eyebrow}</p>
          ) : null}
          <h1 id="clothing-title">{hero.title}</h1>
          <p className="clothing-hero-text">{hero.text}</p>
          {data.catalogTotal ? (
            <a className="primary-button clothing-hero-cta" href="#pieces">
              {hero.cta}
            </a>
          ) : null}
          {hero.accent ? (
            <img
              className={hero.accent.className}
              src={hero.accent.src}
              width={hero.accent.width}
              height={hero.accent.height}
              alt=""
            />
          ) : null}
        </div>
        {looksImage ? (
          <figure className="clothing-hero-media">
            <picture>
              {/* Phones hide the figure (clothing.css), so they fetch a
                  blank pixel instead. */}
              <source media="(max-width: 699px)" srcSet={BLANK_PIXEL} />
              <img
                src={looksImage.src}
                alt={looksImage.alt}
                width={looksImage.width}
                height={looksImage.height}
                // React 18 drops camelCase fetchPriority; the lowercase
                // attribute reaches the HTML (as on /your-sky).
                {...{fetchpriority: 'high'}}
              />
            </picture>
            {looksImage.caption ? (
              <figcaption>{looksImage.caption}</figcaption>
            ) : null}
          </figure>
        ) : null}
      </section>

      <section
        id="pieces"
        className="clothing-shop"
        aria-labelledby="clothing-pieces-title"
      >
        <div className="clothing-shop-heading">
          <h2 id="clothing-pieces-title">All clothing</h2>
          <p>
            {data.total} {data.total === 1 ? 'piece' : 'pieces'}
          </p>
        </div>
        {data.showTools ? (
          <div className="clothing-toolbar">
            <nav
              aria-label="Clothing categories"
              className="clothing-categories"
            >
              <Link
                to={href('category', '')}
                aria-current={
                  !data.category && !data.capsule ? 'page' : undefined
                }
              >
                All <span>{data.catalogTotal}</span>
              </Link>
              {data.categories.map((category) => (
                <Link
                  key={category.slug}
                  to={href('category', category.slug)}
                  aria-current={
                    data.category === category.slug ? 'page' : undefined
                  }
                >
                  {category.label} <span>{category.count}</span>
                </Link>
              ))}
            </nav>
            <Form
              method="get"
              action="/clothing#pieces"
              className="clothing-sort"
              onChange={(event) =>
                void submit(event.currentTarget, {preventScrollReset: true})
              }
            >
              {data.category ? (
                <input type="hidden" name="category" value={data.category} />
              ) : null}
              {data.capsule ? (
                <input type="hidden" name="capsule" value={data.capsule} />
              ) : null}
              <label htmlFor="clothing-sort">Sort</label>
              <select
                id="clothing-sort"
                name="sort"
                defaultValue={data.sort}
                key={data.sort}
              >
                {CLOTHING_SORTS.map((sort) => (
                  <option key={sort.value} value={sort.value}>
                    {sort.label}
                  </option>
                ))}
              </select>
              <noscript>
                <button type="submit">Apply</button>
              </noscript>
            </Form>
          </div>
        ) : null}
        {data.capsules.length > 1 || data.capsule ? (
          <nav
            className="clothing-capsule-filter"
            aria-label="Clothing collections"
          >
            <Link
              to={href('capsule', '')}
              aria-current={!data.capsule ? 'page' : undefined}
            >
              All collections
            </Link>
            {data.capsules.map((capsule) => (
              <Link
                to={href('capsule', capsule.handle)}
                key={capsule.handle}
                aria-current={
                  data.capsule === capsule.handle ? 'page' : undefined
                }
              >
                {capsule.title}
              </Link>
            ))}
          </nav>
        ) : null}
        {data.products.length ? (
          <>
            <div className="clothing-grid">
              {data.products.map((product, index) => (
                <ClothingProductCard
                  key={product.id}
                  product={product}
                  eager={index < 2}
                />
              ))}
            </div>
            <p className="clothing-note">
              Product images are digital mockups of the print, not photographs.
            </p>
            {data.hasMore ? (
              <Link
                className="clothing-load-more"
                to={`/clothing?${more}#pieces`}
                preventScrollReset
              >
                Show more ({data.products.length} of {data.total})
              </Link>
            ) : null}
          </>
        ) : (
          <div className="clothing-empty">
            <h3>
              {data.catalogTotal
                ? 'Nothing matches this filter.'
                : 'Clothing is coming soon.'}
            </h3>
            <p>
              {data.catalogTotal
                ? 'Clear the filter to see all clothing.'
                : 'New pieces will appear here when they are ready.'}
            </p>
            <Link
              className="clothing-text-link"
              to={data.catalogTotal ? '/clothing#pieces' : '/collections/all'}
            >
              {data.catalogTotal ? 'See all clothing' : 'Explore the shop'}
            </Link>
          </div>
        )}
      </section>

      {data.collections.map((collection) => (
        <section
          key={collection.handle}
          className={`clothing-collection${collection.story?.band ? ' clothing-collection--band' : ''}`}
          aria-labelledby={`clothing-collection-${collection.handle}`}
        >
          {collection.story?.band ? (
            <img
              className="clothing-collection-band"
              src={collection.story.band.src}
              width={collection.story.band.width}
              height={collection.story.band.height}
              style={
                collection.story.band.position
                  ? {objectPosition: collection.story.band.position}
                  : undefined
              }
              alt=""
              loading="lazy"
            />
          ) : null}
          <div className="clothing-collection-copy">
            <p className="clothing-eyebrow">The collection</p>
            <h2 id={`clothing-collection-${collection.handle}`}>
              {collection.title}
            </h2>
            {collection.story?.credit ? (
              <p className="clothing-collection-credit">
                {collection.story.credit}
              </p>
            ) : null}
            {collection.story?.intro ? <p>{collection.story.intro}</p> : null}
            <Link
              className="clothing-text-link"
              to={`/collections/${collection.handle}`}
              prefetch="intent"
            >
              View the {collection.title} collection
            </Link>
          </div>
          {collection.colourways.length > 1 ? (
            <div className="clothing-colourways">
              <h3>Choose a colourway</h3>
              <p className="clothing-colourways-note">
                {collection.everyPieceInEveryColourway
                  ? `Every piece comes in ${collection.colourways.length === 2 ? 'both' : 'each'} colourway${collection.colourways.length === 2 ? 's' : ''} and is sold separately.`
                  : 'Pieces are sold separately.'}
              </p>
              {collection.colourways.map((look) => {
                const tone = clothingSwatchBackground(look.colour);
                const accent = lookAccent(look.colour);
                return (
                  <div className="clothing-colourway" key={look.colour}>
                    {accent ? (
                      <img
                        className="clothing-colourway-fern"
                        src={accent}
                        width={COLOURWAY_ACCENT_SIZE.width}
                        height={COLOURWAY_ACCENT_SIZE.height}
                        alt=""
                        loading="lazy"
                      />
                    ) : null}
                    <p className="clothing-colourway-name">
                      {tone ? (
                        <span
                          className="clothing-colourway-dot"
                          style={{background: tone}}
                          aria-hidden="true"
                        />
                      ) : null}
                      {look.colour}
                    </p>
                    <ul>
                      {look.pieces.map((piece) => (
                        <li key={piece.id}>
                          <Link
                            to={piece.url}
                            prefetch="intent"
                            aria-label={`${piece.title} in ${look.colour}`}
                            title={piece.title}
                          >
                            {piece.image ? (
                              <Image
                                data={piece.image}
                                alt=""
                                aspectRatio="4/5"
                                sizes="(min-width: 800px) 9vw, 22vw"
                                loading="lazy"
                              />
                            ) : (
                              <span className="clothing-image-pending">
                                {piece.title}
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>
      ))}

      {data.catalogTotal ? (
        <section
          className="clothing-help"
          aria-labelledby="clothing-help-title"
        >
          <h2 id="clothing-help-title">Before you order</h2>
          <dl>
            <div>
              <dt>Size and fit</dt>
              <dd>
                Each product page lists the sizes for that piece and has a
                size guide.
              </dd>
            </div>
            <div>
              <dt>{data.madeToOrder ? 'Made to order' : 'Fabric and care'}</dt>
              <dd>
                {data.madeToOrder
                  ? `${data.cutAndSewn ? 'Printed, cut and sewn' : 'Made for you'} after you order${
                      data.processing
                        ? `; processing takes ${data.processing} business days`
                        : ''
                    }. Fabric and care are on each product page.`
                  : 'Fabric and care are on each product page.'}
              </dd>
            </div>
            <div>
              <dt>Shipping</dt>
              <dd>
                {data.shippingFrom
                  ? `One clothing shipping fee per order, from ${data.shippingFrom}. Other items ship at their own rates. Checkout confirms the fee for your address.`
                  : 'Checkout confirms the shipping fee for your address.'}{' '}
                <Link to="/policies/shipping-policy">Shipping policy</Link>
              </dd>
            </div>
            <div>
              <dt>Returns</dt>
              <dd>
                Within {RETURN_WINDOW_DAYS} days of delivery, for unused items in
                their original packaging. Return postage is yours unless the
                item is faulty, damaged or wrong.{' '}
                <Link to="/policies/refund-policy">Returns policy</Link>
              </dd>
            </div>
          </dl>
        </section>
      ) : null}
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <div className="clothing-page clothing-empty clothing-error">
      <h1>The clothing page did not load.</h1>
      <p>Please try again in a moment.</p>
      <a className="clothing-text-link" href="/clothing">
        Try again
      </a>
    </div>
  );
}
