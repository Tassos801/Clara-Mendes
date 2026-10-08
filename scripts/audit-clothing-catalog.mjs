#!/usr/bin/env node
/* eslint-disable no-console */
/** Read-only: no publication, supplier, product or metafield mutations. */
import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {resolveAdminClient} from './lib/admin.mjs';
import {getRequiredEnv, loadLocalEnv, normalizeShopDomain} from './lib/env.mjs';
import {
  clothingCategories,
  clothingCapsules,
  isClothingProduct,
  hasClothingApprovals,
} from '../app/lib/clothing.ts';
import {isListedProduct} from '../app/lib/catalogFilters.ts';

const argument = (name) =>
  process.argv
    .find((value) => value.startsWith(`--${name}=`))
    ?.slice(name.length + 3);
if (process.argv.includes('--apply'))
  throw new Error('This audit is read-only; --apply is not supported.');
const envDir = resolve(argument('env-dir') ?? process.cwd());
const env = {
  ...loadLocalEnv('.env', envDir),
  ...loadLocalEnv('.env.shopify-admin.local', envDir),
  ...process.env,
};
// Shopify's write_products scope also grants reads; let the read-only query
// enforce access rather than requiring the narrower literal scope string.
const admin = await resolveAdminClient(env);
const fields = `id handle title vendor productType tags
  storefrontApproved: metafield(namespace: "custom", key: "storefront_approved") { type value }
  fulfillmentVerified: metafield(namespace: "custom", key: "fulfillment_verified") { type value }
  collections(first: 100) { nodes { handle title
    clothingKind: metafield(namespace: "custom", key: "collection_kind") { type value }
  } pageInfo { hasNextPage } }`;

const adminProducts = await readPages(async (cursor) => {
  const result = await admin(
    `query ClothingAdminAudit($cursor: String) {
    products(first: 50, after: $cursor) { nodes { ${fields} status category { id name fullName } } pageInfo { hasNextPage endCursor } }
  }`,
    {cursor},
  );
  return result.data.products;
});

const adminCollections = await readPages(async (cursor) => {
  const result = await admin(`query ClothingCollectionAudit($cursor: String) {
    collections(first: 100, after: $cursor) { nodes {
      id handle title
      clothingKind: metafield(namespace: "custom", key: "collection_kind") { type value }
      ruleSet { appliedDisjunctively rules { column relation condition } }
    } pageInfo { hasNextPage endCursor } }
  }`, {cursor});
  return result.data.collections;
});
for (const collection of adminCollections) {
  collection.products = await readPages(async (cursor) => {
    const result = await admin(`query ClothingCollectionMembers($id: ID!, $cursor: String) {
      collection(id: $id) {
        products(first: 100, after: $cursor) { nodes { id handle } pageInfo { hasNextPage endCursor } }
      }
    }`, {id: collection.id, cursor});
    return result.data.collection.products;
  });
}

const taxonomyCandidates = {};
for (const term of ['leggings', 'sports bras', 'bras', 'shorts', 'tank tops']) {
  const result = await admin(`query ClothingTaxonomyCandidates($search: String!) {
    taxonomy { categories(first: 25, search: $search) {
      nodes { id name fullName isLeaf isArchived }
    } }
  }`, {search: term});
  taxonomyCandidates[term] = result.data.taxonomy.categories.nodes;
}

const domain = normalizeShopDomain(getRequiredEnv(env, 'PUBLIC_STORE_DOMAIN'));
const token = getRequiredEnv(env, 'PUBLIC_STOREFRONT_API_TOKEN');
const apiVersion = env.SHOPIFY_STOREFRONT_API_VERSION || '2026-04';
async function storefront(query, variables) {
  const response = await fetch(
    `https://${domain}/api/${apiVersion}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': token,
      },
      body: JSON.stringify({query, variables}),
    },
  );
  const body = await response.json();
  if (!response.ok || body.errors)
    throw new Error(
      `Storefront audit failed: HTTP ${response.status}${body.errors ? ' (GraphQL errors)' : ''}`,
    );
  return body.data;
}

const storefrontProducts = await readPages(async (cursor) => {
  const result = await storefront(
    `query ClothingStorefrontAudit($cursor: String) {
    products(first: 50, after: $cursor) { nodes { ${fields} availableForSale
      priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
      options { name values }
    } pageInfo { hasNextPage endCursor } }
  }`,
    {cursor},
  );
  return result.products;
});
const visible = new Map(
  storefrontProducts.map((product) => [product.id, product]),
);
const eligibleClothing = storefrontProducts.filter(
  (product) => isClothingProduct(product) && isListedProduct(product),
);
const clothing = adminProducts.filter(isClothingProduct).map((product) => {
  const publicProduct = visible.get(product.id);
  return {
    ...product,
    storefrontVisible: Boolean(publicProduct),
    destinationEligible: Boolean(
      publicProduct && isListedProduct(publicProduct),
    ),
    strictApprovalsReadable: Boolean(
      publicProduct && hasClothingApprovals(publicProduct),
    ),
    storefrontApprovalFields: publicProduct
      ? {
          storefrontApproved: publicProduct.storefrontApproved,
          fulfillmentVerified: publicProduct.fulfillmentVerified,
        }
      : null,
    priceRange: publicProduct?.priceRange ?? null,
    options: publicProduct?.options ?? [],
    proposedCategory: clothingCategories([product])[0]?.label ?? null,
  };
});
const report = {
  capturedAt: new Date().toISOString(),
  readOnly: true,
  liveMutations: 0,
  counts: {
    adminProducts: adminProducts.length,
    storefrontProducts: storefrontProducts.length,
    classifiedClothing: clothing.length,
    eligibleClothing: eligibleClothing.length,
    adminCollections: adminCollections.length,
  },
  categories: clothingCategories(eligibleClothing),
  capsules: clothingCapsules(eligibleClothing),
  clothing,
  adminProducts: adminProducts.map((product) => ({
    ...product,
    storefrontVisible: visible.has(product.id),
    destinationEligible: Boolean(visible.has(product.id) && isListedProduct(visible.get(product.id))),
  })),
  adminCollections,
  taxonomyCandidates,
  notes: [
    'Eligibility uses channel-visible Storefront metadata. Admin values alone do not prove Storefront read access.',
    'Existing released handles retain their release path; future garments need both boolean approvals readable in Storefront.',
    'No supplier mapping, billing, shipping, physical quality or publication configuration was changed or reverified by this audit.',
  ],
};
const output = argument('output');
if (output) {
  const path = resolve(output);
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        output: path,
        counts: report.counts,
        categories: report.categories,
        capsules: report.capsules,
      },
      null,
      2,
    ),
  );
} else console.log(JSON.stringify(report, null, 2));

async function readPages(load) {
  const products = [];
  let cursor = null;
  do {
    const page = await load(cursor);
    products.push(...page.nodes);
    if (!page.pageInfo.hasNextPage) return products;
    if (!page.pageInfo.endCursor || page.pageInfo.endCursor === cursor)
      throw new Error('Catalog audit pagination did not advance.');
    cursor = page.pageInfo.endCursor;
  } while (cursor);
  return products;
}
