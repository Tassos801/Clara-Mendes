import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/blogs.$blogHandle.$articleHandle';
import {Image} from '@shopify/hydrogen';
import {StructuredData} from '~/components/StructuredData';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {breadcrumbSchema, buildSeoMeta, SITE_NAME} from '~/lib/seo';
import {STOREFRONT_ORIGIN} from '~/lib/storefrontBasics';

export const meta: Route.MetaFunction = ({data, params}) => {
  return buildSeoMeta({
    description:
      data?.article.seo?.description ||
      `${data?.article.title ?? 'An issue'} — from Karina of Time, the ${SITE_NAME} journal.`,
    image: data?.article.image?.url,
    title: data?.article.seo?.title || data?.article.title || 'Journal',
    url: `${STOREFRONT_ORIGIN}/blogs/${params.blogHandle}/${params.articleHandle}`,
  });
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, request, params}: Route.LoaderArgs) {
  const {blogHandle, articleHandle} = params;

  if (!articleHandle || !blogHandle) {
    throw new Response('Not found', {status: 404});
  }

  const [{blog}] = await Promise.all([
    context.storefront.query(ARTICLE_QUERY, {
      variables: {blogHandle, articleHandle},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!blog?.articleByHandle) {
    throw new Response(null, {status: 404});
  }

  redirectIfHandleIsLocalized(
    request,
    {
      handle: articleHandle,
      data: blog.articleByHandle,
    },
    {
      handle: blogHandle,
      data: blog,
    },
  );

  const article = blog.articleByHandle;

  return {article, blogHandle: blog.handle, blogTitle: blog.title};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

export default function Article() {
  const {article, blogHandle, blogTitle} = useLoaderData<typeof loader>();
  const {title, image, contentHtml, author} = article;

  const publishedDate = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(article.publishedAt));

  const articleUrl = `${STOREFRONT_ORIGIN}/blogs/${blogHandle}/${article.handle}`;

  return (
    <div className="kot-article-root" data-chapter="linen">
      <style suppressHydrationWarning>{articleCss}</style>
      <StructuredData
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: title,
            datePublished: article.publishedAt,
            image: image?.url ? [image.url] : undefined,
            author: author?.name
              ? {'@type': 'Person', name: author.name}
              : {'@type': 'Organization', name: SITE_NAME},
            publisher: {'@type': 'Organization', name: SITE_NAME},
            url: articleUrl,
          },
          breadcrumbSchema({
            items: [
              {name: blogTitle, url: `${STOREFRONT_ORIGIN}/blogs/${blogHandle}`},
              {name: title, url: articleUrl},
            ],
          }),
        ]}
      />

      <article className="kot-article">
        <header className="kot-article-header" data-reveal>
          <p className="kot-article-eyebrow">
            <Link to={`/blogs/${blogHandle}`} prefetch="intent">
              {blogTitle}
            </Link>
          </p>
          <h1>{title}</h1>
          <p className="kot-article-byline">
            <time dateTime={article.publishedAt}>{publishedDate}</time>
            {author?.name ? <span> · {author.name}</span> : null}
          </p>
          <div className="kot-article-keel" aria-hidden />
        </header>

        {image && (
          <figure className="kot-article-cover" data-reveal>
            <Image data={image} sizes="(min-width: 900px) 840px, 94vw" loading="eager" />
          </figure>
        )}

        {/* Admin-authored HTML: hand-pasted <img> tags must use Shopify-hosted
            URLs — other hosts are blocked by the img-src allowlist in app/lib/csp.ts. */}
        <div
          dangerouslySetInnerHTML={{__html: contentHtml}}
          className="kot-article-body"
        />

        <footer className="kot-article-foot">
          <Link to={`/blogs/${blogHandle}`} prefetch="intent">
            ← All issues
          </Link>
        </footer>
      </article>
    </div>
  );
}

const articleCss = `
.kot-article-root {
  --kot-ink: #26231f;
  --kot-muted: #6f685e;
  --kot-hairline: rgba(38, 35, 31, 0.16);
  --kot-serif: Georgia, 'Times New Roman', serif;
  --kot-mono: 'Courier Prime', 'Courier New', ui-monospace, monospace;
  color: var(--kot-ink);
}

.kot-article {
  margin: 0 auto;
  max-width: 840px;
  padding: clamp(56px, 9vh, 104px) clamp(20px, 5vw, 70px) clamp(72px, 10vh, 120px);
}

.kot-article-header {
  text-align: center;
}

.kot-article-eyebrow {
  font-family: var(--kot-mono);
  font-size: 0.7rem;
  letter-spacing: 0.3em;
  margin: 0 0 20px;
  text-transform: uppercase;
}

.kot-article-eyebrow a {
  color: var(--kot-muted);
  text-decoration: none;
}

.kot-article-eyebrow a:hover {
  color: var(--kot-ink);
}

.kot-article h1 {
  font-family: var(--kot-serif);
  font-size: clamp(2rem, 4.6vw, 3.3rem);
  font-weight: 400;
  line-height: 1.1;
  margin: 0 0 18px;
  text-wrap: balance;
}

.kot-article-byline {
  color: var(--kot-muted);
  font-family: var(--kot-mono);
  font-size: 0.7rem;
  letter-spacing: 0.16em;
  margin: 0;
  text-transform: uppercase;
}

.kot-article-keel {
  background: var(--kot-hairline);
  height: 48px;
  margin: 30px auto 0;
  width: 1px;
}

.kot-article-cover {
  margin: clamp(28px, 5vh, 48px) 0 0;
}

.kot-article-cover img {
  background: #fff;
  box-shadow: 0 18px 44px rgba(38, 35, 31, 0.14);
  display: block;
  height: auto;
  padding: 8px;
  width: 100%;
}

.kot-article-body {
  font-size: 1.05rem;
  line-height: 1.85;
  margin: clamp(32px, 6vh, 56px) auto 0;
  max-width: 65ch;
}

.kot-article-body h2,
.kot-article-body h3 {
  font-family: var(--kot-serif);
  font-weight: 400;
  line-height: 1.2;
  margin: 2.2em 0 0.6em;
}

.kot-article-body h2 { font-size: 1.7rem; }
.kot-article-body h3 { font-size: 1.35rem; }

.kot-article-body p { margin: 0 0 1.4em; }

.kot-article-body a {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.kot-article-body img {
  height: auto;
  max-width: 100%;
}

.kot-article-body blockquote {
  border-left: 1px solid var(--kot-hairline);
  color: var(--kot-muted);
  font-family: var(--kot-serif);
  font-style: italic;
  margin: 1.8em 0;
  padding-left: 22px;
}

.kot-article-foot {
  border-top: 1px solid var(--kot-hairline);
  margin-top: clamp(48px, 7vh, 72px);
  padding-top: 26px;
  text-align: center;
}

.kot-article-foot a {
  color: var(--kot-muted);
  font-family: var(--kot-mono);
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  text-decoration: none;
  text-transform: uppercase;
}

.kot-article-foot a:hover {
  color: var(--kot-ink);
}
`;

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/blog#field-blog-articlebyhandle
const ARTICLE_QUERY = `#graphql
  query Article(
    $articleHandle: String!
    $blogHandle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    blog(handle: $blogHandle) {
      handle
      title
      articleByHandle(handle: $articleHandle) {
        handle
        title
        contentHtml
        publishedAt
        author: authorV2 {
          name
        }
        image {
          id
          altText
          url
          width
          height
        }
        seo {
          description
          title
        }
      }
    }
  }
` as const;
