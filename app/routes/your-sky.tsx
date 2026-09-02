import {getSelectedProductOptions} from '@shopify/hydrogen';
import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/your-sky';
import {
  SkyStudio,
  type StudioProduct,
  type StudioVariant,
} from '~/components/SkyStudio';
import {StructuredData} from '~/components/StructuredData';
import {PERSONALISED_RELEASE_FLAGS} from '~/lib/catalogFilters';
import {YOUR_SKY_PAGE} from '~/lib/featurePages';
import type {MoneyAmount} from '~/lib/money';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/productCardFragment';
import {PRODUCT_VARIANT_FRAGMENT} from '~/lib/productVariantFragment';
import {
  breadcrumbSchema,
  buildSeoMeta,
  getCanonicalUrl,
  productSchema,
} from '~/lib/seo';
import {DEFAULT_SKY_THEME} from '~/lib/sky/themes';
import {STOREFRONT_ORIGIN} from '~/lib/storefrontBasics';

const page = YOUR_SKY_PAGE;

type FeatureProduct = StudioProduct & {
  description: string;
  selectedOrFirstAvailableVariant?: StudioVariant | null;
  priceRange?: {
    minVariantPrice?: MoneyAmount;
    maxVariantPrice?: MoneyAmount;
  };
};

export const meta: Route.MetaFunction = ({data}) =>
  buildSeoMeta({
    description: page.description,
    image: `${STOREFRONT_ORIGIN}${page.hero.image.src}`,
    title: page.title,
    type: 'product',
    url: data?.seoUrl ?? `${STOREFRONT_ORIGIN}${page.path}`,
  });

export async function loader({context, request}: Route.LoaderArgs) {
  // The page follows the product's release flag; the preview environment
  // may unlock it for end-to-end testing exactly as the product page does.
  const released = PERSONALISED_RELEASE_FLAGS[page.handle];
  const previewUnlocked = context.env.SKY_PREVIEW_UNLOCK === 'true';
  if (!released && !previewUnlocked) {
    throw new Response('Not found', {status: 404});
  }
  const data = await context.storefront.query(FEATURE_PRODUCT_QUERY, {
    variables: {
      handle: page.handle,
      selectedOptions: getSelectedProductOptions(request),
    },
  });
  if (!data.product) {
    throw new Response('Not found', {status: 404});
  }
  return {
    product: data.product as FeatureProduct,
    seoUrl: getCanonicalUrl(request, page.path),
    skyTheme: DEFAULT_SKY_THEME,
  };
}

export default function YourSkyPage() {
  const {product, seoUrl, skyTheme} = useLoaderData<typeof loader>();
  const selectedVariant =
    product.selectedOrFirstAvailableVariant ??
    product.variants.nodes[0] ??
    null;

  return (
    <div className="your-sky-page">
      <StructuredData
        data={[
          productSchema({
            availableForSale: product.variants.nodes.some(
              (variant) => variant.availableForSale,
            ),
            description: page.description,
            image: `${STOREFRONT_ORIGIN}${page.hero.image.src}`,
            priceRange: product.priceRange,
            productId: product.id,
            productType: product.productType,
            sku: selectedVariant?.sku,
            title: product.title,
            url: seoUrl,
            vendor: product.vendor,
            variants: product.variants.nodes,
          }),
          breadcrumbSchema({
            items: [
              {name: 'Home', url: `${STOREFRONT_ORIGIN}/`},
              {name: page.navLabel, url: seoUrl},
            ],
          }),
        ]}
      />

      <section className="your-sky-hero" aria-labelledby="your-sky-headline">
        <div className="your-sky-hero-copy">
          <p className="eyebrow">{page.hero.eyebrow}</p>
          <h1 id="your-sky-headline">{page.hero.headline}</h1>
          <p className="your-sky-hero-sub">{page.hero.sub}</p>
          <p className="your-sky-hero-price">{page.hero.priceLine}</p>
          <a className="primary-button your-sky-hero-cta" href="#design">
            {page.hero.cta}
          </a>
        </div>
        <figure className="your-sky-hero-figure">
          <img
            src={page.hero.image.src}
            alt={page.hero.image.alt}
            width={page.hero.image.width}
            height={page.hero.image.height}
            decoding="async"
            // React 18 only knows the lowercase DOM attribute.
            {...{fetchpriority: 'high'}}
          />
        </figure>
      </section>

      <SkyStudio
        basePath={page.path}
        eyebrow={page.studio.eyebrow}
        heading={page.studio.heading}
        note={page.studio.note}
        product={product}
        selectedVariant={selectedVariant}
        theme={skyTheme}
      />

      <section className="your-sky-occasions" aria-label="Occasions">
        <p className="eyebrow">For the nights worth keeping</p>
        <ul>
          {page.occasions.map((occasion) => (
            <li key={occasion.title}>
              <a href="#design">
                <img
                  src={occasion.image}
                  alt=""
                  width={800}
                  height={1000}
                  loading="lazy"
                  decoding="async"
                />
                <h3>{occasion.title}</h3>
                <p>{occasion.line}</p>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="your-sky-how" aria-label="How it is made">
        <p className="eyebrow">How it is made</p>
        <dl>
          {page.how.map((item) => (
            <div key={item.title}>
              <dt>{item.title}</dt>
              <dd>{item.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="your-sky-faq" aria-label="Questions">
        <p className="eyebrow">Good to know</p>
        {page.faq.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </section>

      <section className="your-sky-closing">
        <h2>{page.closing}</h2>
        <a className="primary-button" href="#design">
          {page.hero.cta}
        </a>
        <p>
          Prefer the prints?{' '}
          <Link to="/collections/all">Browse the collection</Link>.
        </p>
      </section>
    </div>
  );
}

const FEATURE_PRODUCT_QUERY = `#graphql
  query FeaturePageProduct(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...ClaraProductCard
      description
      options {
        id
        name
        optionValues {
          id
          name
        }
      }
      selectedOrFirstAvailableVariant(
        selectedOptions: $selectedOptions
        ignoreUnknownOptions: true
        caseInsensitiveMatch: true
      ) {
        ...ClaraProductVariant
      }
      variants(first: 20) {
        nodes {
          ...ClaraProductVariant
        }
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;
