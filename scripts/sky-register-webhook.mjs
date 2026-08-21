#!/usr/bin/env node
/* eslint-disable no-console */
// Registers (or lists) the orders/paid webhook that feeds star-map
// fulfilment. Needs .env.shopify-admin.local with SHOPIFY_ADMIN_ACCESS_TOKEN
// (the custom app must have read_orders for ORDERS_PAID subscriptions).
//
//   node scripts/sky-register-webhook.mjs --list
//   node scripts/sky-register-webhook.mjs
//   node scripts/sky-register-webhook.mjs --url https://shopclaramendes.com/webhooks/orders-paid
import {parseArgs} from 'node:util';
import {
  envWithAdminDefaults,
  getRequiredEnv,
  normalizeShopDomain,
} from './lib/env.mjs';

const ADMIN_API_VERSION = '2025-01';
const {values: args} = parseArgs({
  options: {
    list: {type: 'boolean', default: false},
    url: {
      type: 'string',
      default: 'https://shopclaramendes.com/webhooks/orders-paid',
    },
  },
});

const env = envWithAdminDefaults();
const shop = normalizeShopDomain(getRequiredEnv(env, 'PUBLIC_STORE_DOMAIN'));
const token = getRequiredEnv(env, 'SHOPIFY_ADMIN_ACCESS_TOKEN');

async function gql(query, variables) {
  const res = await fetch(
    `https://${shop}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({query, variables}),
    },
  );
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2));
  return json.data;
}

const existing = await gql(`{
  webhookSubscriptions(first: 50, topics: [ORDERS_PAID]) {
    nodes {
      id
      endpoint { __typename ... on WebhookHttpEndpoint { callbackUrl } }
    }
  }
}`);
const rows = existing.webhookSubscriptions.nodes.map((node) => ({
  id: node.id,
  url: node.endpoint.callbackUrl ?? node.endpoint.__typename,
}));
console.table(rows);
if (args.list) process.exit(0);

if (rows.some((row) => row.url === args.url)) {
  console.log(`Already registered: ${args.url}`);
  process.exit(0);
}

const created = await gql(
  `mutation($url: URL!) {
    webhookSubscriptionCreate(
      topic: ORDERS_PAID
      webhookSubscription: {callbackUrl: $url, format: JSON}
    ) {
      webhookSubscription { id }
      userErrors { field message }
    }
  }`,
  {url: args.url},
);
console.log(JSON.stringify(created, null, 2));
if (created.webhookSubscriptionCreate.userErrors.length) process.exit(1);
/* eslint-enable no-console */
