/**
 * Email sign-up → Shopify customer with marketing consent, through the
 * Admin API. Server-only: never import from client code. Reuses the
 * reviews feature's Admin caller, so the same SHOPIFY_ADMIN_ACCESS_TOKEN
 * (now also needing read_customers + write_customers) powers both.
 */
import {
  createAdminClient,
  ReviewsNotConfiguredError,
  type AdminClient,
} from './reviews.server.ts';
import {
  buildConsentInput,
  NEWSLETTER_TAGS,
  normalizeEmail,
  type SubscribeStatus,
} from './newsletter.ts';

type UserError = {field?: string[] | null; message: string};

type CreateResult = {
  customerCreate: {customer: {id: string} | null; userErrors: UserError[]};
};
type LookupResult = {
  customers: {
    nodes: Array<{id: string; emailMarketingConsent?: {marketingState?: string | null} | null}>;
  };
};
type ConsentResult = {
  customerEmailMarketingConsentUpdate: {customer: {id: string} | null; userErrors: UserError[]};
};

const CREATE = `#graphql
  mutation NewsletterCustomerCreate($input: CustomerInput!) {
    customerCreate(input: $input) { customer { id } userErrors { field message } }
  }`;
const LOOKUP = `#graphql
  query NewsletterCustomerByEmail($query: String!) {
    customers(first: 1, query: $query) { nodes { id emailMarketingConsent { marketingState } } }
  }`;
const CONSENT = `#graphql
  mutation NewsletterConsent($input: CustomerEmailMarketingConsentUpdateInput!) {
    customerEmailMarketingConsentUpdate(input: $input) { customer { id } userErrors { field message } }
  }`;

function isTaken(errors: UserError[]) {
  return errors.some(
    (e) => (e.field ?? []).includes('email') && /taken|already/i.test(e.message),
  );
}

function raise(errors: UserError[], label: string): never {
  throw new Error(`${label}: ${errors.map((e) => e.message).join('; ')}`);
}

export async function subscribeEmail(
  env: Pick<Env, 'SHOPIFY_ADMIN_ACCESS_TOKEN' | 'PUBLIC_STORE_DOMAIN'>,
  {email: rawEmail}: {email: string},
  deps: {client?: AdminClient; now?: Date} = {},
): Promise<{status: SubscribeStatus}> {
  let client = deps.client;
  if (!client) {
    try {
      client = createAdminClient(env as Env);
    } catch (error) {
      if (error instanceof ReviewsNotConfiguredError) return {status: 'disabled'};
      throw error;
    }
  }
  const email = normalizeEmail(rawEmail);
  const emailMarketingConsent = buildConsentInput(deps.now);

  const created = await client<CreateResult>(CREATE, {
    input: {email, tags: NEWSLETTER_TAGS, emailMarketingConsent},
  });
  const createErrors = created.customerCreate.userErrors ?? [];
  if (!createErrors.length) return {status: 'subscribed'};
  if (!isTaken(createErrors)) raise(createErrors, 'customerCreate');

  const found = await client<LookupResult>(LOOKUP, {query: `email:${JSON.stringify(email)}`});
  const customer = found.customers.nodes[0];
  if (!customer) raise(createErrors, 'customerCreate (taken but not found)');
  if (customer.emailMarketingConsent?.marketingState === 'SUBSCRIBED') return {status: 'already'};

  const updated = await client<ConsentResult>(CONSENT, {
    input: {customerId: customer.id, emailMarketingConsent},
  });
  const consentErrors = updated.customerEmailMarketingConsentUpdate.userErrors ?? [];
  if (consentErrors.length) raise(consentErrors, 'customerEmailMarketingConsentUpdate');
  return {status: 'subscribed'};
}
