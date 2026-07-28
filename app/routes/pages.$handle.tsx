import {redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/pages.$handle';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {buildSeoMeta} from '~/lib/seo';
import {STOREFRONT_ORIGIN} from '~/lib/storefrontBasics';

/**
 * Shopify pages that duplicate dedicated storefront routes. Requests are
 * permanently redirected so only the canonical route is served or indexed.
 */
const PAGE_REDIRECTS: Record<string, string> = {
  contact: '/contact',
};

export const meta: Route.MetaFunction = ({data}) => {
  const page = data?.page;

  return buildSeoMeta({
    description:
      page?.seo?.description ||
      `${page?.title ?? 'Information'} from Clara Mendes.`,
    // Pages without real content stay reachable but are kept out of the index
    noIndex: !data?.hasBodyContent,
    title: page?.seo?.title || page?.title || 'Page',
    url: `${STOREFRONT_ORIGIN}/pages/${page?.handle ?? ''}`,
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
  if (!params.handle) {
    throw new Error('Missing page handle');
  }

  const redirectTarget = PAGE_REDIRECTS[params.handle.toLowerCase()];
  if (redirectTarget) {
    throw redirect(redirectTarget, 301);
  }

  const [{page}] = await Promise.all([
    context.storefront.query(PAGE_QUERY, {
      variables: {
        handle: params.handle,
      },
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!page) {
    throw new Response('Not Found', {status: 404});
  }

  redirectIfHandleIsLocalized(request, {handle: params.handle, data: page});

  return {
    hasBodyContent: stripHtml(page.body).length > 0,
    page,
  };
}

function stripHtml(html?: string | null) {
  return (html ?? '').replace(/<[^>]*>/g, '').trim();
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

export default function Page() {
  const {page} = useLoaderData<typeof loader>();

  return (
    <div className="page">
      <header>
        <h1>{page.title}</h1>
      </header>
      <main dangerouslySetInnerHTML={{__html: page.body}} />
    </div>
  );
}

const PAGE_QUERY = `#graphql
  query Page(
    $language: LanguageCode,
    $country: CountryCode,
    $handle: String!
  )
  @inContext(language: $language, country: $country) {
    page(handle: $handle) {
      handle
      id
      title
      body
      seo {
        description
        title
      }
    }
  }
` as const;
