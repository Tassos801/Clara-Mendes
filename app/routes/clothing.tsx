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
import {loadClothingProducts} from '~/lib/clothing.server';
import {clothingCategories, clothingCapsules} from '~/lib/clothing';
import {
  CLOTHING_SORTS,
  allMadeToOrder,
  clothingDisplayImage,
  clothingDisplayTitle,
  clothingFilterUrl,
  clothingLooks,
  clothingProductUrl,
  clothingSizeRange,
  selectClothing,
  showClothingTools,
} from '~/lib/clothingPresentation';
import {
  CLOTHING_HERO_ACCENT,
  capsuleStory,
  lookAccent,
} from '~/lib/clothingEditorial';
import {isOffThemeCollectionHandle} from '~/lib/catalogFilters';
import {
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

const DESCRIPTION =
  'Clara Mendes Clothing: watercolour paintings printed on clothing for movement and everyday wear.';

export const meta: Route.MetaFunction = ({data}) =>
  buildSeoMeta({
    title: 'Clothing | Clara Mendes',
    description: DESCRIPTION,
    url: data?.seoUrl || 'https://shopclaramendes.com/clothing',
    image: data?.heroProduct?.featuredImage?.url,
    noIndex: !data?.catalogTotal,
  });

export async function loader({context, request}: Route.LoaderArgs) {
  const products = await loadClothingProducts(context.storefront);
  const selection = selectClothing(products, new URL(request.url).searchParams);
  const capsules = clothingCapsules(products).filter(
    (capsule) => !isOffThemeCollectionHandle(capsule.handle),
  );
  const inCapsule = (handle: string) =>
    products.filter((product) =>
      product.collections.nodes.some(
        (collection) => collection.handle === handle,
      ),
    );
  // Products arrive newest first, so the capsule holding the newest piece
  // leads the page; a new capsule takes over without a code change.
  const featured =
    capsules.find((capsule) =>
      products[0]?.collections.nodes.some(
        (collection) => collection.handle === capsule.handle,
      ),
    ) ??
    capsules[0] ??
    null;
  const featuredProducts = featured ? inCapsule(featured.handle) : [];
  const story = capsuleStory(featured?.handle);
  // Verified shipping fees exist only for the released Quiet Current pieces.
  const knownShipping = products.every((product) =>
    isQuietCurrentProduct(product.handle),
  );
  return {
    ...selection,
    categories: clothingCategories(
      selection.capsule ? inCapsule(selection.capsule) : products,
    ),
    capsules,
    catalogTotal: products.length,
    featured,
    story,
    heroProduct: featuredProducts[0] ?? products[0] ?? null,
    looks: clothingLooks(featuredProducts.length ? featuredProducts : products),
    showTools: showClothingTools(products.length) || Boolean(selection.category),
    sizeRange: clothingSizeRange(products),
    madeToOrder: allMadeToOrder(products),
    shippingFrom: knownShipping ? APPAREL_SHIPPING_FROM_EUR : null,
    seoUrl: getCanonicalUrl(request, '/clothing'),
  };
}

export default function Clothing() {
  const data = useLoaderData<typeof loader>();
  const [params] = useSearchParams();
  const submit = useSubmit();
  const href = (key: 'category' | 'capsule', value: string) =>
    clothingFilterUrl(params, key, value);
  const heroImage = data.heroProduct
    ? clothingDisplayImage(data.heroProduct)
    : null;
  const looksImage = data.story?.looksImage;
  const more = new URLSearchParams(params);
  more.set('page', String(data.page + 1));
  const summary = [
    `${data.catalogTotal} ${data.catalogTotal === 1 ? 'piece' : 'pieces'}`,
    data.sizeRange ? `Sizes ${data.sizeRange}` : null,
    data.madeToOrder ? 'Made to order' : null,
  ].filter(Boolean);
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
            description: DESCRIPTION,
            products: data.products,
            title: 'Clara Mendes Clothing',
            url: data.seoUrl,
          }),
        ]}
      />
      <section className="clothing-hero" aria-labelledby="clothing-title">
        <div className="clothing-hero-copy">
          <nav className="clothing-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Clothing</span>
          </nav>
          <p className="clothing-eyebrow">Clara Mendes Clothing</p>
          <h1 id="clothing-title">
            Watercolour,
            <br />
            <em>worn.</em>
          </h1>
          <p className="clothing-hero-description">
            Clara Mendes paintings, printed on clothing for movement and
            everyday wear.
          </p>
          <a className="clothing-link" href="#pieces">
            Explore the collection <span aria-hidden="true">↘</span>
          </a>
          <img
            className="clothing-hero-botanical"
            src={CLOTHING_HERO_ACCENT}
            alt=""
            width="1536"
            height="1024"
          />
        </div>
        <div className="clothing-hero-visual">
          {looksImage && data.featured ? (
            <Link
              to={`/collections/${data.featured.handle}`}
              className="clothing-hero-photo"
              prefetch="intent"
            >
              <img
                src={looksImage.src}
                alt={looksImage.alt}
                width={looksImage.width}
                height={looksImage.height}
                fetchPriority="high"
              />
              <span>
                {data.featured.title} <span aria-hidden="true">↗</span>
              </span>
            </Link>
          ) : heroImage && data.heroProduct ? (
            <Link
              to={clothingProductUrl(data.heroProduct)}
              className="clothing-hero-photo"
              prefetch="intent"
            >
              <Image
                data={heroImage}
                alt={heroImage.altText || data.heroProduct.title}
                sizes="(min-width: 600px) 50vw, 100vw"
                loading="eager"
              />
              <span>
                {clothingDisplayTitle(data.heroProduct)}{' '}
                <span aria-hidden="true">↗</span>
              </span>
            </Link>
          ) : (
            <div className="clothing-hero-art">
              <img
                src={CLOTHING_HERO_ACCENT}
                alt="An olive branch painted in moss green and soft mineral washes"
                width="1536"
                height="1024"
              />
            </div>
          )}
          <div className="clothing-hero-caption">
            <span>
              {data.featured
                ? [
                    data.story ? `Collection ${data.story.number}` : null,
                    data.featured.title,
                  ]
                    .filter(Boolean)
                    .join(' / ')
                : 'The clothing collection'}
            </span>
            {heroImage || looksImage ? <span>Digital mockups</span> : null}
          </div>
        </div>
      </section>

      <section
        id="pieces"
        className="clothing-shop"
        aria-labelledby="clothing-pieces-title"
      >
        <div className="clothing-section-heading">
          <div>
            <p className="clothing-eyebrow">All clothing</p>
            <h2 id="clothing-pieces-title">
              The <em>pieces.</em>
            </h2>
          </div>
          <p>{summary.join(' · ')}</p>
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
                All clothing <span>{data.catalogTotal}</span>
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
            <span>Collection</span>
            <Link
              to={href('capsule', '')}
              aria-current={!data.capsule ? 'page' : undefined}
            >
              All
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
            <p className="clothing-product-note">
              Images are supplier digital mockups, not photographs. Each
              product page has more views, the size guide, and fabric and care.
            </p>
            {data.hasMore ? (
              <Link
                className="clothing-load-more"
                to={`/clothing?${more}#pieces`}
                preventScrollReset
              >
                Show more pieces ({data.products.length} of {data.total}){' '}
                <span aria-hidden="true">↓</span>
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
              className="clothing-link"
              to={data.catalogTotal ? '/clothing#pieces' : '/collections/all'}
            >
              {data.catalogTotal ? 'See all clothing' : 'Explore the shop'}{' '}
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
        )}
      </section>

      {data.featured ? (
        <section
          className="clothing-capsule"
          aria-labelledby="clothing-capsule-title"
        >
          <div className="clothing-capsule-art">
            {data.story ? (
              <>
                <img
                  src={data.story.art.src}
                  alt={data.story.art.alt}
                  width={data.story.art.width}
                  height={data.story.art.height}
                  loading="lazy"
                />
                <span className="clothing-art-caption">
                  {data.story.art.caption}
                </span>
              </>
            ) : null}
          </div>
          <div className="clothing-capsule-copy">
            <p className="clothing-eyebrow">
              {data.story ? `Collection ${data.story.number} · ` : ''}
              {data.featured.count}{' '}
              {data.featured.count === 1 ? 'piece' : 'pieces'}
            </p>
            <h2 id="clothing-capsule-title">
              {data.featured.title.split(' ').slice(0, -1).join(' ')}
              {data.featured.title.includes(' ') ? <br /> : null}
              <em>{data.featured.title.split(' ').at(-1)}.</em>
            </h2>
            {data.story?.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <Link
              className="clothing-link"
              to={`/collections/${data.featured.handle}`}
              prefetch="intent"
            >
              Shop {data.featured.title} <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>
      ) : null}

      {data.looks.length ? (
        <section
          className="clothing-looks"
          aria-labelledby="clothing-looks-title"
        >
          <div className="clothing-section-heading">
            <div>
              <p className="clothing-eyebrow">Coordinated looks</p>
              <h2 id="clothing-looks-title">
                Wear it <em>together.</em>
              </h2>
            </div>
            <p>Choose a colourway and build the set.</p>
          </div>
          {data.looks.map((look) => {
            const accent = lookAccent(look.colour);
            const id = `look-${look.colour.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
            return (
              <article className="clothing-look" key={look.colour} aria-labelledby={id}>
                <header className="clothing-look-header">
                  {accent ? (
                    <img src={accent} alt="" loading="lazy" />
                  ) : null}
                  <h3 id={id}>{look.colour}</h3>
                  <span>
                    {look.pieces.length}{' '}
                    {look.pieces.length === 1 ? 'piece' : 'pieces'}
                  </span>
                </header>
                <ul className="clothing-look-pieces">
                  {look.pieces.map((piece) => (
                    <li key={piece.id}>
                      <Link to={piece.url} prefetch="intent">
                        {piece.image ? (
                          <Image
                            data={piece.image}
                            alt={`${piece.title} in ${look.colour}`}
                            sizes="(min-width: 800px) 18vw, 45vw"
                            loading="lazy"
                          />
                        ) : (
                          <span className="clothing-image-pending">
                            Image coming soon
                          </span>
                        )}
                        <span>
                          {piece.title} <span aria-hidden="true">↗</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </section>
      ) : null}

      <aside className="clothing-help" aria-label="Sizing, care and delivery">
        <div>
          <span>01</span>
          <h3>{data.sizeRange ? `Sizes ${data.sizeRange}` : 'Sizing'}</h3>
          <p>A size guide on each product page.</p>
        </div>
        <div>
          <span>02</span>
          <h3>{data.madeToOrder ? 'Made to order' : 'Fabric and care'}</h3>
          <p>
            {data.madeToOrder
              ? 'Printed, cut and sewn for you after you order. Fabric and care are listed on each piece.'
              : 'Fabric and care are listed on each product page.'}
          </p>
        </div>
        <div>
          <span>03</span>
          <h3>Shipping and returns</h3>
          <p>
            {data.shippingFrom
              ? `Shipping from €${data.shippingFrom}, one fee per order. `
              : 'Shipping is calculated at checkout. '}
            {RETURN_WINDOW_DAYS}-day returns.
          </p>
          <div className="clothing-help-links">
            <Link to="/policies/shipping-policy">Shipping</Link>
            <Link to="/policies/refund-policy">Returns</Link>
          </div>
        </div>
      </aside>
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <div className="clothing-page clothing-empty clothing-error">
      <p className="clothing-eyebrow">Clara Mendes Clothing</p>
      <h1>The clothing page did not load.</h1>
      <p>Please try again in a moment.</p>
      <a className="clothing-link" href="/clothing">
        Try again ↗
      </a>
      <Link to="/collections/all">Explore the shop</Link>
    </div>
  );
}
