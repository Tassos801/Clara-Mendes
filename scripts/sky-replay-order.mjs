#!/usr/bin/env node
/* eslint-disable no-console */
// Re-runs star-map fulfilment for one Shopify order, using exactly the same
// builder as the orders/paid webhook. Use it when the webhook logged
// "needs attention" or Prodigi was down for longer than Shopify's retries.
//
//   node scripts/sky-replay-order.mjs --order 5001 --dry-run
//   node scripts/sky-replay-order.mjs --order "#1042"
//
// Needs .env.shopify-admin.local (SHOPIFY_ADMIN_ACCESS_TOKEN) and
// .env.sky.local with SKY_SIGNING_SECRET, PRODIGI_API_KEY, PRODIGI_API_BASE.
import {parseArgs} from 'node:util';
import {
  envWithAdminDefaults,
  getRequiredEnv,
  loadLocalEnv,
  normalizeShopDomain,
} from './lib/env.mjs';
import {buildProdigiOrderFromShopify} from '../app/lib/sky/fulfilment.ts';
import {createProdigiClient} from '../app/lib/prodigi.server.ts';

const ADMIN_API_VERSION = '2025-01';
const ORIGIN = 'https://shopclaramendes.com';
const {values: args} = parseArgs({
  options: {
    order: {type: 'string'},
    'dry-run': {type: 'boolean', default: false},
  },
});
if (!args.order) {
  console.error('Usage: --order <numeric id | #name> [--dry-run]');
  process.exit(2);
}

const env = {
  ...envWithAdminDefaults(),
  ...loadLocalEnv('.env.sky.local'),
  ...process.env,
};
const shop = normalizeShopDomain(getRequiredEnv(env, 'PUBLIC_STORE_DOMAIN'));
const token = getRequiredEnv(env, 'SHOPIFY_ADMIN_ACCESS_TOKEN');

const res = await fetch(
  `https://${shop}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({
      query: `query($q: String!) {
        orders(first: 1, query: $q) {
          nodes {
            legacyResourceId name email phone
            shippingAddress { name address1 address2 city province zip countryCodeV2 phone }
            lineItems(first: 50) { nodes { id sku quantity customAttributes { key value } } }
          }
        }
      }`,
      variables: {
        q: args.order.startsWith('#') ? `name:${args.order}` : `id:${args.order}`,
      },
    }),
  },
);
const json = await res.json();
const node = json.data?.orders?.nodes?.[0];
if (!node) {
  console.error(`Order ${args.order} not found`, JSON.stringify(json.errors ?? json));
  process.exit(1);
}

const order = {
  id: Number(node.legacyResourceId),
  name: node.name,
  email: node.email,
  phone: node.phone,
  shipping_address: node.shippingAddress && {
    name: node.shippingAddress.name,
    address1: node.shippingAddress.address1,
    address2: node.shippingAddress.address2,
    city: node.shippingAddress.city,
    province: node.shippingAddress.province,
    zip: node.shippingAddress.zip,
    country_code: node.shippingAddress.countryCodeV2,
    phone: node.shippingAddress.phone,
  },
  line_items: node.lineItems.nodes.map((line) => ({
    id: Number(line.id.split('/').pop()),
    sku: line.sku,
    quantity: line.quantity,
    properties: line.customAttributes.map((attribute) => ({
      name: attribute.key,
      value: attribute.value,
    })),
  })),
};

const build = await buildProdigiOrderFromShopify(order, {
  secret: getRequiredEnv(env, 'SKY_SIGNING_SECRET'),
  origin: ORIGIN,
});
console.log(JSON.stringify(build, null, 2));
if (build.kind !== 'order') process.exit(1);
if (args['dry-run']) process.exit(0);

const prodigi = createProdigiClient(env);
const response = await prodigi.createOrder(build.payload);
console.log(
  `${prodigi.base}: ${response.outcome} ${response.order?.id ?? ''}`,
);
/* eslint-enable no-console */
