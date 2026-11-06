import {useEffect, useRef} from 'react';
import {
  Form,
  Link,
  useLoaderData,
  useSearchParams,
  useSubmit,
} from 'react-router';
import type {Route} from './+types/clothing';
import {ClothingProductCard} from '~/components/ClothingProductCard';
import {StructuredData} from '~/components/StructuredData';
import {
  loadCapsuleSummaries,
  loadClothingProducts,
} from '~/lib/clothing.server';
import {clothingCategories, clothingCapsules} from '~/lib/clothing';
import {
  CLOTHING_SORTS,
  allMadeToOrder,
  clothingFilterUrl,
  clothingGarmentPhrase,
  clothingLineChips,
  inClothingGroup,
  inClothingLine,
  selectClothing,
} from '~/lib/clothingPresentation';
import {
  CLOTHING_PAGE_HERO,
  capsuleStory,
  capsuleStoryData,
  clothingLinesHero,
  clothingPageHero,
  genericCapsuleStory,
  inspiredByName,
} from '~/lib/clothingEditorial';
import {isOffThemeCollectionHandle} from '~/lib/catalogFilters';
import {RETURN_WINDOW_DAYS} from '~/lib/storefrontBasics';
import {
  breadcrumbSchema,
  buildSeoMeta,
  collectionSchema,
  getCanonicalUrl,
} from '~/lib/seo';

const FALLBACK_DESCRIPTION = `Clara Mendes Clothing: ${CLOTHING_PAGE_HERO.text}`;

function listWords(words: readonly string[]) {
  if (words.length < 2) return words.join('');
  return `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;
}

/** Names the lines, their artists and only the garment kinds really listed. */
function clothingDescription(
  lines: Array<{title: string; credit: string | null}>,
  garments: string | null,
) {
  if (!lines.length) return FALLBACK_DESCRIPTION;
  const artists = lines.map((line) => inspiredByName(line.credit));
  const designs = lines.length === 1 ? 'an original design' : 'original designs';
  return `Clara Mendes Clothing: ${listWords(lines.map((line) => line.title))}, ${designs}${
    artists.every(Boolean)
      ? ` inspired by ${listWords(artists as string[])}`
      : ''
  }, on ${garments ?? 'clothing'}. Made to order.`;
}

/** A 1x1 transparent GIF. */
const BLANK_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export const meta: Route.MetaFunction = ({data}) =>
  buildSeoMeta({
    title: 'Clothing | Clara Mendes',
    description: data?.description || FALLBACK_DESCRIPTION,
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
  const featured = capsules[0] ?? null;
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
  // One compact tile per line, in page order.
  const lines = capsules.map((capsule) => {
    const story = storyOf(capsule.handle);
    return {
      handle: capsule.handle,
      title: capsule.title,
      count: capsule.count,
      credit: story?.credit ?? null,
      band: story?.band ?? null,
      looksImage: story?.looksImage ?? null,
    };
  });
  const leadStory = storyOf(featured?.handle);
  const madeToOrder = allMadeToOrder(products);
  const leadProducts = featured
    ? products.filter((product) => inClothingLine(product, featured.handle))
    : [];
  const hero =
    lines.length > 1
      ? clothingLinesHero(lines, madeToOrder)
      : clothingPageHero(
          featured?.handle,
          clothingGarmentPhrase(leadProducts),
          featured ? {title: featured.title, madeToOrder} : null,
        );
  return {
    ...selection,
    // Tabs count inside the chosen line, and line chips inside the chosen
    // tab, so the two filters narrow together.
    categories: clothingCategories(
      products.filter((product) => inClothingLine(product, selection.capsule)),
    ),
    lineChips: clothingLineChips(products, selection.category),
    lineTotal: products.filter((product) =>
      inClothingGroup(product, selection.category),
    ).length,
    categoryTotal: products.filter((product) =>
      inClothingLine(product, selection.capsule),
    ).length,
    lines,
    catalogTotal: products.length,
    description: clothingDescription(lines, clothingGarmentPhrase(products)),
    hero: {
      ...hero,
      looksImage: leadStory?.looksImage ?? null,
      // The lead line's emblem only while it is the only line.
      accent: lines.length === 1 ? (leadStory?.accent ?? null) : null,
    },
    madeToOrder,
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
  // On phones the line chips and tabs scroll sideways: bring the chosen ones
  // into view (a deep link to "Activewear" opens past the screen edge)
  // without moving the page.
  const filters = useRef<HTMLDivElement>(null);
  useEffect(() => {
    filters.current?.querySelectorAll('nav').forEach((nav) => {
      const current = nav.querySelector<HTMLElement>('a[aria-current]');
      if (!current || nav.scrollWidth <= nav.clientWidth) return;
      const offset =
        current.getBoundingClientRect().left - nav.getBoundingClientRect().left;
      nav.scrollLeft += offset - (nav.clientWidth - current.offsetWidth) / 2;
    });
  }, [data.capsule, data.category]);
  const more = new URLSearchParams(params);
  more.set('page', String(data.page + 1));
  const selectedLine = data.lines.find((line) => line.handle === data.capsule);
  const showLineChips = data.lineChips.length > 1 || Boolean(data.capsule);
  const showTabs = data.categories.length > 1 || Boolean(data.category);
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
          <h2 id="clothing-pieces-title">
            {selectedLine ? selectedLine.title : 'All clothing'}
          </h2>
          <p className="clothing-shop-count">
            {data.total} {data.total === 1 ? 'piece' : 'pieces'}
          </p>
          {data.total > 1 ? (
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
          ) : null}
        </div>
        {showLineChips || showTabs ? (
          <div className="clothing-filters" ref={filters}>
            {showLineChips ? (
              <nav aria-label="Clothing lines" className="clothing-chips">
                <Link
                  to={href('capsule', '')}
                  aria-current={!data.capsule ? 'page' : undefined}
                  preventScrollReset
                >
                  All lines <span>{data.lineTotal}</span>
                </Link>
                {data.lineChips.map((chip) => (
                  <Link
                    key={chip.handle}
                    to={href('capsule', chip.handle)}
                    aria-current={
                      data.capsule === chip.handle ? 'page' : undefined
                    }
                    preventScrollReset
                  >
                    {chip.title} <span>{chip.count}</span>
                  </Link>
                ))}
              </nav>
            ) : null}
            {showTabs ? (
              <nav
                aria-label="Clothing categories"
                className="clothing-chips clothing-chips--tabs"
              >
                <Link
                  to={href('category', '')}
                  aria-current={!data.category ? 'page' : undefined}
                  preventScrollReset
                >
                  All <span>{data.categoryTotal}</span>
                </Link>
                {data.categories.map((category) => (
                  <Link
                    key={category.slug}
                    to={href('category', category.slug)}
                    aria-current={
                      data.category === category.slug ? 'page' : undefined
                    }
                    preventScrollReset
                  >
                    {category.label} <span>{category.count}</span>
                  </Link>
                ))}
              </nav>
            ) : null}
          </div>
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
            {data.hasMore ? (
              <Link
                className="clothing-load-more"
                to={`/clothing?${more}#pieces`}
                preventScrollReset
              >
                Show more ({data.products.length} of {data.total})
              </Link>
            ) : null}
            <p className="clothing-note">
              Product images are digital mockups of the print, not photographs.
            </p>
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

      {data.lines.length ? (
        <section
          className="clothing-lines"
          aria-labelledby="clothing-lines-title"
        >
          <h2 id="clothing-lines-title">The lines</h2>
          <ul className="clothing-lines-list">
            {data.lines.map((line) => (
              <li className="clothing-line-tile" key={line.handle}>
                {line.looksImage ? (
                  <img
                    className="clothing-line-tile-image"
                    src={line.looksImage.src}
                    alt={line.looksImage.alt}
                    width={line.looksImage.width}
                    height={line.looksImage.height}
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
                {line.band ? (
                  <img
                    className="clothing-line-tile-band"
                    src={line.band.src}
                    width={line.band.width}
                    height={line.band.height}
                    style={
                      line.band.position
                        ? {objectPosition: line.band.position}
                        : undefined
                    }
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
                <div className="clothing-line-tile-copy">
                  <h3>{line.title}</h3>
                  {line.credit ? (
                    <p className="clothing-line-tile-credit">{line.credit}</p>
                  ) : null}
                  <p className="clothing-line-tile-links">
                    <Link
                      to={href('capsule', line.handle)}
                      preventScrollReset
                    >
                      Shop {line.count} {line.count === 1 ? 'piece' : 'pieces'}
                    </Link>
                    <Link to={`/collections/${line.handle}`} prefetch="intent">
                      About the line
                    </Link>
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="clothing-note">
            Line images are digital mockups.
          </p>
        </section>
      ) : null}

      {data.catalogTotal ? (
        <section
          className="clothing-help"
          aria-labelledby="clothing-help-title"
        >
          <h2 id="clothing-help-title">Before you order</h2>
          <dl>
            <div>
              <dt>Size and fit</dt>
              <dd>Each product page lists its sizes and a size guide.</dd>
            </div>
            <div>
              <dt>{data.madeToOrder ? 'Made to order' : 'Fabric and care'}</dt>
              <dd>
                {data.madeToOrder
                  ? 'Made for you after you order. Fabric and care are on each product page.'
                  : 'Fabric and care are on each product page.'}
              </dd>
            </div>
            <div>
              <dt>Shipping</dt>
              <dd>
                Each product page shows the fee for your country; checkout
                confirms it for your address.{' '}
                <Link to="/policies/shipping-policy">Shipping policy</Link>
              </dd>
            </div>
            <div>
              <dt>Returns</dt>
              <dd>
                Within {RETURN_WINDOW_DAYS} days of delivery, for unused items
                in their original packaging. Return postage is yours unless
                the item is faulty, damaged or wrong.{' '}
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
