#!/usr/bin/env node

import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {
  envWithLocalDefaults,
  getRequiredEnv,
  normalizeShopDomain,
} from './lib/env.mjs';

const PRODUCT_VARIANTS_QUERY = `#graphql
  query FulfillmentProductVariants($cursor: String) {
    products(first: 100, after: $cursor) {
      edges {
        cursor
        node {
          id
          handle
          title
          variants(first: 100) {
            edges {
              node {
                id
                sku
                title
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

async function main() {
  const env = envWithLocalDefaults();
  const storeDomain = normalizeShopDomain(
    getRequiredEnv(env, 'PUBLIC_STORE_DOMAIN'),
  );
  const token = getRequiredEnv(env, 'PUBLIC_STOREFRONT_API_TOKEN');
  const apiVersion = env.SHOPIFY_STOREFRONT_API_VERSION || '2026-04';
  const endpoint = `https://${storeDomain}/api/${apiVersion}/graphql.json`;
  const outputPath = resolve(
    process.cwd(),
    env.CJ_LINE_ITEM_MAP_TEMPLATE_PATH || 'docs/cj-line-item-map.template.json',
  );
  const products = await fetchAllProducts({endpoint, token});
  const template = buildTemplate({
    products,
    skuPrefixes: env.CJ_SHOPIFY_SKU_PREFIXES || 'CM-',
    storeDomain,
  });

  mkdirSync(dirname(outputPath), {recursive: true});
  writeFileSync(outputPath, `${JSON.stringify(template, null, 2)}\n`);

  console.warn(
    `Wrote ${Object.keys(template).length - 2} variant mappings to ${outputPath}`,
  );
}

async function fetchAllProducts({endpoint, token}) {
  const products = [];
  let cursor = null;

  do {
    const response = await fetch(endpoint, {
      body: JSON.stringify({
        query: PRODUCT_VARIANTS_QUERY,
        variables: {cursor},
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': token,
      },
      method: 'POST',
    });
    const body = await response.json().catch(() => null);

    if (!response.ok || body?.errors) {
      throw new Error(
        `Storefront API product query failed: ${JSON.stringify(
          body?.errors || body,
        )}`,
      );
    }

    const connection = body.data?.products;
    products.push(...connection.edges.map((edge) => edge.node));
    cursor = connection.pageInfo.hasNextPage
      ? connection.pageInfo.endCursor
      : null;
  } while (cursor);

  return products;
}

function buildTemplate({products, skuPrefixes, storeDomain}) {
  const template = {
    _instructions:
      'Fill cjVid or cjSku for each variant, then copy this JSON into CJ_LINE_ITEM_MAP in Oxygen. Metadata fields are ignored by the webhook.',
    _storeDomain: storeDomain,
  };

  for (const product of products) {
    for (const {node: variant} of product.variants.edges) {
      const variantId = extractShopifyId(variant.id);
      const productId = extractShopifyId(product.id);
      const optionLabel = variant.selectedOptions
        .map((option) => `${option.name}: ${option.value}`)
        .join(', ');

      template[`variant:${variantId}`] = {
        cjSku: deriveCjSkuFromShopifySku(variant.sku, skuPrefixes) || '',
        cjVid: '',
        shopifyHandle: product.handle,
        shopifyProduct: product.title,
        shopifyProductId: productId,
        shopifySku: variant.sku || '',
        shopifyVariant: variant.title,
        shopifyVariantId: variantId,
        shopifyVariantOptions: optionLabel,
      };
    }
  }

  return sortObject(template);
}

function extractShopifyId(gid) {
  return String(gid).split('/').pop();
}

function deriveCjSkuFromShopifySku(sku, skuPrefixes) {
  if (!sku) return '';

  const trimmed = sku.trim();
  const candidates = [trimmed];
  const prefixes = skuPrefixes
    .split(',')
    .map((prefix) => prefix.trim())
    .filter(Boolean);

  for (const prefix of prefixes) {
    if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) {
      candidates.push(trimmed.slice(prefix.length).trim());
    }
  }

  return candidates.find(isLikelyCjSku) || '';
}

function isLikelyCjSku(value) {
  return /^CJ[A-Z0-9]+(?:-[A-Z0-9]+)*$/i.test(value);
}

function sortObject(value) {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => {
      if (left.startsWith('_') && !right.startsWith('_')) return -1;
      if (!left.startsWith('_') && right.startsWith('_')) return 1;
      return left.localeCompare(right);
    }),
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
