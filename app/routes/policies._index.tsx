import {useLoaderData, Link} from 'react-router';
import type {Route} from './+types/policies._index';
import type {PoliciesQuery, PolicyItemFragment} from 'storefrontapi.generated';

export const meta: Route.MetaFunction = () => {
  return [{title: 'Clara Mendes | Policies'}];
};

const POLICY_DESCRIPTIONS: Record<string, string> = {
  'privacy-policy':
    'How we collect, use, and protect the details you share with us.',
  'shipping-policy':
    'Timelines, carriers, and the journey each object takes to your door.',
  'terms-of-service':
    'The quiet framework that governs our relationship with you.',
  'refund-policy':
    'Returns, exchanges, and how we resolve the rare piece that falls short.',
};

export async function loader({context}: Route.LoaderArgs) {
  const data: PoliciesQuery = await context.storefront.query(POLICIES_QUERY);

  const shopPolicies = data.shop;
  const policies: PolicyItemFragment[] = [
    shopPolicies?.privacyPolicy,
    shopPolicies?.shippingPolicy,
    shopPolicies?.termsOfService,
    shopPolicies?.refundPolicy,
  ].filter((policy): policy is PolicyItemFragment => policy != null);

  if (!policies.length) {
    throw new Response('No policies found', {status: 404});
  }

  return {policies};
}

export default function Policies() {
  const {policies} = useLoaderData<typeof loader>();

  return (
    <div className="policies-page">
      <header className="page-hero compact-hero">
        <p className="eyebrow">Transparency</p>
        <h1>
          The <i>fine print</i>, kept quiet.
        </h1>
        <p>
          The agreements and practices that shape every order — written plainly,
          so nothing gets in the way of the object.
        </p>
      </header>

      <ul className="policies-list" aria-label="Shop policies">
        {policies.map((policy, index) => (
          <li key={policy.id} className="policies-list-item">
            <Link to={`/policies/${policy.handle}`} className="policy-link">
              <span className="policy-index">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="policy-body">
                <span className="policy-title">{policy.title}</span>
                {POLICY_DESCRIPTIONS[policy.handle] ? (
                  <span className="policy-desc">
                    {POLICY_DESCRIPTIONS[policy.handle]}
                  </span>
                ) : null}
              </span>
              <span className="policy-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const POLICIES_QUERY = `#graphql
  fragment PolicyItem on ShopPolicy {
    id
    title
    handle
  }
  query Policies ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    shop {
      privacyPolicy {
        ...PolicyItem
      }
      shippingPolicy {
        ...PolicyItem
      }
      termsOfService {
        ...PolicyItem
      }
      refundPolicy {
        ...PolicyItem
      }
    }
  }
` as const;
