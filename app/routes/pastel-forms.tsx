import {useState} from 'react';
import {Link} from 'react-router';
import type {Route} from './+types/pastel-forms';
import catalog from '../../data/pastel-plant-pots.json';
import {buildSeoMeta} from '~/lib/seo';
import {STOREFRONT_ORIGIN} from '~/lib/storefrontBasics';
import styles from '~/styles/pastel-forms.css?url';

export const links: Route.LinksFunction = () => [
  {rel: 'stylesheet', href: styles},
];
export const meta: Route.MetaFunction = () =>
  buildSeoMeta({
    title: 'Pastel Forms Ceramic Plant Pots | Clara Mendes',
    description:
      'Four minimal ceramic plant pot designs in blush, sage, powder blue and butter yellow. Preview the upcoming Pastel Forms series.',
    url: `${STOREFRONT_ORIGIN}/pastel-forms`,
  });

export default function PastelForms() {
  const [selected, setSelected] = useState(catalog.designs[0]);
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
          <p className="pastel-forms__availability">Coming soon</p>
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
          <Link className="text-link" to="/contact">
            Ask about availability
          </Link>
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
        <p className="pastel-forms__caption">
          Pastel Forms / Collection preview
        </p>
      </section>
    </div>
  );
}
