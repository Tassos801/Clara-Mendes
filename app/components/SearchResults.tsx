import {Link} from 'react-router';
import {Image, Money, Pagination} from '@shopify/hydrogen';
import {urlWithTrackingParams, type RegularSearchReturn} from '~/lib/search';

type SearchItems = RegularSearchReturn['result']['items'];
type PartialSearchResult<ItemType extends keyof SearchItems> = Pick<
  SearchItems,
  ItemType
> &
  Pick<RegularSearchReturn, 'term'>;

type SearchResultsProps = RegularSearchReturn & {
  children: (args: SearchItems & {term: string}) => React.ReactNode;
};

export function SearchResults({
  term,
  result,
  children,
}: Omit<SearchResultsProps, 'error' | 'type'>) {
  if (!result?.total) {
    return null;
  }

  return children({...result.items, term});
}

SearchResults.Articles = SearchResultsArticles;
SearchResults.Pages = SearchResultsPages;
SearchResults.Products = SearchResultsProducts;
SearchResults.Empty = SearchResultsEmpty;

function SearchResultsArticles({
  term,
  articles,
}: PartialSearchResult<'articles'>) {
  if (!articles?.nodes.length) {
    return null;
  }

  return (
    <section className="search-result" aria-labelledby="search-articles">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Journal</p>
          <h2 id="search-articles">Articles</h2>
        </div>
      </div>
      <div className="search-link-rows">
        {articles?.nodes?.map((article) => {
          const articleUrl = urlWithTrackingParams({
            baseUrl: article.blog?.handle
              ? `/blogs/${article.blog.handle}/${article.handle}`
              : `/blogs/${article.handle}`,
            trackingParams: article.trackingParameters,
            term,
          });

          return (
            <Link
              className="search-link-row"
              key={article.id}
              prefetch="intent"
              to={articleUrl}
            >
              <span>{article.title}</span>
              <span aria-hidden="true">→</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function SearchResultsPages({term, pages}: PartialSearchResult<'pages'>) {
  if (!pages?.nodes.length) {
    return null;
  }

  return (
    <section className="search-result" aria-labelledby="search-pages">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Information</p>
          <h2 id="search-pages">Pages</h2>
        </div>
      </div>
      <div className="search-link-rows">
        {pages?.nodes?.map((page) => {
          const pageUrl = urlWithTrackingParams({
            baseUrl: `/pages/${page.handle}`,
            trackingParams: page.trackingParameters,
            term,
          });

          return (
            <Link
              className="search-link-row"
              key={page.id}
              prefetch="intent"
              to={pageUrl}
            >
              <span>{page.title}</span>
              <span aria-hidden="true">→</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function SearchResultsProducts({
  term,
  products,
}: PartialSearchResult<'products'>) {
  if (!products?.nodes.length) {
    return null;
  }

  return (
    <section className="search-result" aria-labelledby="search-products">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Results for &ldquo;{term}&rdquo;</p>
          <h2 id="search-products">Pieces</h2>
        </div>
      </div>
      <Pagination connection={products}>
        {({nodes, isLoading, NextLink, PreviousLink}) => (
          <>
            <div className="search-pagination search-pagination--top">
              <PreviousLink className="secondary-button">
                {isLoading ? 'Loading…' : 'Load previous'}
              </PreviousLink>
            </div>
            <div className="search-product-grid">
              {nodes.map((product) => {
                const productUrl = urlWithTrackingParams({
                  baseUrl: `/products/${product.handle}`,
                  trackingParams: product.trackingParameters,
                  term,
                });

                const price = product?.selectedOrFirstAvailableVariant?.price;
                const image = product?.selectedOrFirstAvailableVariant?.image;

                return (
                  <Link
                    className="search-product-card"
                    key={product.id}
                    prefetch="intent"
                    to={productUrl}
                  >
                    <span className="search-product-media">
                      {image ? (
                        <Image
                          data={image}
                          alt={product.title}
                          aspectRatio="1/1"
                          sizes="(min-width: 720px) 240px, 44vw"
                        />
                      ) : null}
                    </span>
                    <span className="search-product-title">
                      {product.title}
                    </span>
                    {price ? (
                      <span className="search-product-price">
                        <Money as="span" data={price} />
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
            <div className="search-pagination">
              <NextLink className="secondary-button">
                {isLoading ? 'Loading…' : 'Load more'}
              </NextLink>
            </div>
          </>
        )}
      </Pagination>
    </section>
  );
}

function SearchResultsEmpty({term}: {term?: string}) {
  return (
    <section className="empty-state compact search-empty">
      <p className="eyebrow">Search</p>
      <h2>
        {term
          ? `Nothing in the edit for “${term}” yet.`
          : 'What are you looking for?'}
      </h2>
      <p>
        Try a capsule name — Quiet Form, Patina Blue, Neo Deco, Midnight
        Garden, Sunlit Mosaic — or a mood like botanical print, neutral wall
        art, geometric art, or blue abstract print.
      </p>
      <Link className="primary-button" to="/collections/all">
        Shop all pieces
      </Link>
    </section>
  );
}
