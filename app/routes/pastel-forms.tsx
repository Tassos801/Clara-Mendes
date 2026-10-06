import {useState} from 'react';
import {Link, useLoaderData} from 'react-router';
import {Money} from '@shopify/hydrogen';
import type {Route} from './+types/pastel-forms';
import catalog from '../../data/pastel-plant-pots.json';
import {buildSeoMeta} from '~/lib/seo';
import {STOREFRONT_ORIGIN} from '~/lib/storefrontBasics';
import {isReleasedProductHandle} from '~/lib/catalogFilters';
import styles from '~/styles/pastel-forms.css?url';

export const links: Route.LinksFunction = () => [
  {rel: 'stylesheet', href: styles},
];
export const meta: Route.MetaFunction = () =>
  buildSeoMeta({
    title: 'Pastel Forms Ceramic Plant Pots | Clara Mendes',
    description:
      'Four minimal ceramic plant pot designs in blush, sage, powder blue and butter yellow. Discover the Pastel Forms series, printed to order.',
    url: `${STOREFRONT_ORIGIN}/pastel-forms`,
  });

export async function loader({context}: Route.LoaderArgs) {
  // Shopify returns null for Drafts and products unpublished from this channel.
  const data = await context.storefront.query(PASTEL_PRODUCTS_QUERY);
  return {
    products: [data.blush, data.sage, data.blue, data.butter].filter(
      (product) => product && isReleasedProductHandle(product.handle),
    ),
  };
}

export default function PastelForms() {
  const {products} = useLoaderData<typeof loader>();
  const [selected, setSelected] = useState(catalog.designs[0]);
  const product = products.find((item) => item?.handle === selected.handle);
  return (
    <div className="pastel-forms">
      <header className="pastel-forms__heading">
        <p className="eyebrow">Clara Mendes / Ceramic plant pots</p>
        <h1>Pastel Forms</h1>
        <p>Small pots. Soft colour. A little room to grow.</p>
      </header>
      <section
        className="pastel-forms__product"
        aria-labelledby="pastel-design-title"
      >
        <figure className="pastel-forms__image">
          <img
            src={`/images/pastel-plant-pots/${selected.id}.webp`}
            alt={`${selected.title} pastel ceramic plant pot design mockup`}
            width={1254}
            height={1254}
            fetchPriority="high"
          />
          <figcaption>
            Design mockup. Final printed colours may vary.
          </figcaption>
        </figure>
        <div className="pastel-forms__details">
          <p className="pastel-forms__availability">
            {product
              ? product.availableForSale
                ? 'Made to order'
                : 'Sold out'
              : 'Coming soon'}
          </p>
          <div aria-live="polite" aria-atomic="true">
            <h2 id="pastel-design-title">{selected.title}</h2>
            <p className="pastel-forms__story">{selected.story}</p>
          </div>
          <div
            className="pastel-forms__swatches"
            role="group"
            aria-label="Artwork"
          >
            {catalog.designs.map((design) => (
              <button
                key={design.id}
                type="button"
                title={design.title}
                aria-label={design.title}
                aria-pressed={selected.id === design.id}
                onClick={() => setSelected(design)}
                style={{
                  backgroundColor: design.background,
                  color: design.accent,
                }}
              >
                <span aria-hidden="true" />
              </button>
            ))}
          </div>
          <dl className="pastel-forms__specs">
            <div>
              <dt>Material</dt>
              <dd>Glossy ceramic</dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>9 cm diameter x 10.2 cm high</dd>
            </div>
            <div>
              <dt>Details</dt>
              <dd>Drainage hole, white rim and interior</dd>
            </div>
          </dl>
          <p className="pastel-forms__note">
            One pot. Plant and saucer not included.
          </p>
          {product ? (
            <>
              <p className="pastel-forms__price">
                <Money as="span" data={product.priceRange.minVariantPrice} />
              </p>
              <Link
                className="primary-button"
                to={`/products/${product.handle}`}
              >
                View {selected.title}
              </Link>
              <p className="pastel-forms__delivery">
                Pot-only orders: EUR 6.99 shipping across the EU and EUR 11.99
                to most other countries (not the US). Sent from the UK by
                untracked post. Import taxes, duties and carrier fees may be
                payable on delivery and are not included. Checkout may use the
                local-currency equivalent.
              </p>
            </>
          ) : (
            <Link className="text-link" to="/contact">
              Ask about availability
            </Link>
          )}
        </div>
      </section>
      <section
        className="pastel-forms__series"
        aria-labelledby="pastel-series-title"
      >
        <div className="section-heading-row">
          <h2 id="pastel-series-title">Four quiet characters</h2>
          <p>Blush, sage, blue and butter.</p>
        </div>
        <img
          src="/images/pastel-plant-pots/series.webp"
          alt="Design mockups of the four Pastel Forms ceramic plant pots"
          width={1536}
          height={1024}
          loading="lazy"
        />
        <p className="pastel-forms__caption">Pastel Forms / The series</p>
      </section>
    </div>
  );
}

const PASTEL_PRODUCTS_QUERY = `#graphql
  fragment PastelProduct on Product {
    handle
    availableForSale
    priceRange { minVariantPrice { amount currencyCode } }
  }
  query PastelProducts($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    blush: product(handle: "blush-arc-pastel-plant-pot") { ...PastelProduct }
    sage: product(handle: "sage-stem-pastel-plant-pot") { ...PastelProduct }
    blue: product(handle: "blue-drift-pastel-plant-pot") { ...PastelProduct }
    butter: product(handle: "butter-sun-pastel-plant-pot") { ...PastelProduct }
  }
` as const;
