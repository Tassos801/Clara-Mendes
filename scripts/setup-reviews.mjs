#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Idempotent setup for the social product-reviews feature.
 *
 * Creates (if missing):
 *   1. Metaobject definition `product_review` (see app/lib/reviewTypes.ts for
 *      the authoritative contract).
 *   2. Product metafield definition `custom.reviews`
 *      (list.metaobject_reference validated to the product_review definition).
 *
 * Usage:
 *   node scripts/setup-reviews.mjs            # create/skip against the store
 *   node scripts/setup-reviews.mjs --dry-run  # print the exact definition
 *                                             # JSON that would be sent; no API
 *                                             # calls, no token required.
 *
 * Required Admin API access scopes:
 *   read_products, write_products,
 *   read_metaobjects, write_metaobjects,
 *   read_metaobject_definitions, write_metaobject_definitions,
 *   read_files, write_files
 */

import {
  envWithLocalDefaults,
  getRequiredEnv,
  normalizeShopDomain,
} from './lib/env.mjs';

// Kept in sync with app/lib/reviewTypes.ts (that file is the source of truth).
const REVIEW_METAOBJECT_TYPE = 'product_review';
const REVIEWS_METAFIELD_NAMESPACE = 'custom';
const REVIEWS_METAFIELD_KEY = 'reviews';

// --- Definition payloads -----------------------------------------------------

// Metaobject definition matching the reviewTypes.ts contract exactly.
const METAOBJECT_DEFINITION = {
  name: 'Product review',
  type: REVIEW_METAOBJECT_TYPE,
  displayNameKey: 'author_name',
  access: {
    // Editable under Shopify admin -> Content, readable by the Storefront API.
    admin: 'MERCHANT_READ_WRITE',
    storefront: 'PUBLIC_READ',
  },
  capabilities: {
    // New reviews start DRAFT (pending moderation); approving = set to Active.
    publishable: {enabled: true},
  },
  fieldDefinitions: [
    {
      name: 'Product',
      key: 'product',
      type: 'product_reference',
    },
    {
      name: 'Rating',
      key: 'rating',
      type: 'number_integer',
      validations: [
        {name: 'min', value: '1'},
        {name: 'max', value: '5'},
      ],
    },
    {
      name: 'Author name',
      key: 'author_name',
      type: 'single_line_text_field',
    },
    {
      name: 'Body',
      key: 'body',
      type: 'multi_line_text_field',
    },
    {
      name: 'Photos',
      key: 'photos',
      type: 'list.file_reference',
    },
    {
      name: 'Helpful count',
      key: 'helpful_count',
      type: 'number_integer',
    },
    {
      name: 'Submitted at',
      key: 'submitted_at',
      type: 'date_time',
    },
  ],
};

// Metafield definition; validation is filled in with the metaobject
// definition GID once it is known (created or already existing).
function buildMetafieldDefinition(metaobjectDefinitionId) {
  return {
    name: 'Reviews',
    namespace: REVIEWS_METAFIELD_NAMESPACE,
    key: REVIEWS_METAFIELD_KEY,
    type: 'list.metaobject_reference',
    ownerType: 'PRODUCT',
    access: {storefront: 'PUBLIC_READ'},
    validations: [
      {name: 'metaobject_definition_id', value: metaobjectDefinitionId},
    ],
  };
}

// --- GraphQL documents -------------------------------------------------------

const METAOBJECT_DEFINITION_BY_TYPE_QUERY = `#graphql
  query ReviewMetaobjectDefinition($type: String!) {
    metaobjectDefinitionByType(type: $type) {
      id
      type
      name
    }
  }
`;

const METAOBJECT_DEFINITION_CREATE_MUTATION = `#graphql
  mutation CreateReviewMetaobjectDefinition(
    $definition: MetaobjectDefinitionCreateInput!
  ) {
    metaobjectDefinitionCreate(definition: $definition) {
      metaobjectDefinition {
        id
        type
        name
        displayNameKey
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const METAFIELD_DEFINITION_QUERY = `#graphql
  query ReviewMetafieldDefinition(
    $ownerType: MetafieldOwnerType!
    $namespace: String!
    $key: String!
  ) {
    metafieldDefinition(
      identifier: {ownerType: $ownerType, namespace: $namespace, key: $key}
    ) {
      id
      namespace
      key
    }
  }
`;

const METAFIELD_DEFINITION_CREATE_MUTATION = `#graphql
  mutation CreateReviewMetafieldDefinition(
    $definition: MetafieldDefinitionInput!
  ) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition {
        id
        namespace
        key
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

// --- Admin client (matches scripts/unpublish-all-products.mjs house style) ---

function createAdminClient({endpoint, accessToken}) {
  return async function adminGraphql(query, variables = {}) {
    const response = await fetch(endpoint, {
      body: JSON.stringify({query, variables}),
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      method: 'POST',
    });

    const body = await response.json().catch(() => null);

    if (!response.ok || body?.errors) {
      throw new Error(
        `Admin API request failed: ${JSON.stringify(body?.errors || body)}`,
      );
    }

    return body;
  };
}

// --- Steps -------------------------------------------------------------------

async function ensureMetaobjectDefinition(adminGraphql) {
  const existing = await adminGraphql(METAOBJECT_DEFINITION_BY_TYPE_QUERY, {
    type: REVIEW_METAOBJECT_TYPE,
  });
  const found = existing.data?.metaobjectDefinitionByType;

  if (found?.id) {
    console.log(
      `SKIP  metaobject definition "${REVIEW_METAOBJECT_TYPE}" already exists (${found.id}).`,
    );
    return found.id;
  }

  const created = await adminGraphql(METAOBJECT_DEFINITION_CREATE_MUTATION, {
    definition: METAOBJECT_DEFINITION,
  });
  const result = created.data?.metaobjectDefinitionCreate;
  const userErrors = result?.userErrors ?? [];

  if (userErrors.length) {
    throw new Error(
      `metaobjectDefinitionCreate failed: ${JSON.stringify(userErrors)}`,
    );
  }

  const id = result?.metaobjectDefinition?.id;
  console.log(`CREATE metaobject definition "${REVIEW_METAOBJECT_TYPE}" (${id}).`);
  return id;
}

async function ensureMetafieldDefinition(adminGraphql, metaobjectDefinitionId) {
  const existing = await adminGraphql(METAFIELD_DEFINITION_QUERY, {
    ownerType: 'PRODUCT',
    namespace: REVIEWS_METAFIELD_NAMESPACE,
    key: REVIEWS_METAFIELD_KEY,
  });
  const found = existing.data?.metafieldDefinition;

  if (found?.id) {
    console.log(
      `SKIP  metafield definition "${REVIEWS_METAFIELD_NAMESPACE}.${REVIEWS_METAFIELD_KEY}" already exists (${found.id}).`,
    );
    return found.id;
  }

  const created = await adminGraphql(METAFIELD_DEFINITION_CREATE_MUTATION, {
    definition: buildMetafieldDefinition(metaobjectDefinitionId),
  });
  const result = created.data?.metafieldDefinitionCreate;
  const userErrors = result?.userErrors ?? [];

  if (userErrors.length) {
    throw new Error(
      `metafieldDefinitionCreate failed: ${JSON.stringify(userErrors)}`,
    );
  }

  const id = result?.createdDefinition?.id;
  console.log(
    `CREATE metafield definition "${REVIEWS_METAFIELD_NAMESPACE}.${REVIEWS_METAFIELD_KEY}" (${id}).`,
  );
  return id;
}

function printDryRun() {
  // --dry-run cannot call the API, so it prints the exact definition JSON that
  // would be sent. The metafield validation references the metaobject
  // definition GID, which is only known at runtime; a placeholder is shown.
  const metafieldDefinition = buildMetafieldDefinition(
    '<gid of the product_review metaobject definition, resolved at runtime>',
  );

  console.log('--dry-run: no API calls made. Definitions that WOULD be sent:\n');
  console.log('=== metaobjectDefinitionCreate.definition ===');
  console.log(JSON.stringify(METAOBJECT_DEFINITION, null, 2));
  console.log('\n=== metafieldDefinitionCreate.definition ===');
  console.log(JSON.stringify(metafieldDefinition, null, 2));
  console.log(
    '\n--dry-run complete. Nothing was queried or mutated. Run without --dry-run (and with SHOPIFY_ADMIN_ACCESS_TOKEN set) to apply.',
  );
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has('--dry-run');

  if (dryRun) {
    printDryRun();
    return;
  }

  const env = envWithLocalDefaults();
  const storeDomain = normalizeShopDomain(
    getRequiredEnv(env, 'PUBLIC_STORE_DOMAIN'),
  );
  const accessToken = getRequiredEnv(env, 'SHOPIFY_ADMIN_ACCESS_TOKEN');
  const apiVersion = env.SHOPIFY_ADMIN_API_VERSION || '2025-01';
  const endpoint = `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`;
  const adminGraphql = createAdminClient({endpoint, accessToken});

  console.log(`Setting up reviews on ${storeDomain} (Admin API ${apiVersion}).\n`);

  const metaobjectDefinitionId = await ensureMetaobjectDefinition(adminGraphql);
  await ensureMetafieldDefinition(adminGraphql, metaobjectDefinitionId);

  console.log('\nDone. Reviews storage is set up.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

/* eslint-enable no-console */
