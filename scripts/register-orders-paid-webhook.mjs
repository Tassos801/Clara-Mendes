#!/usr/bin/env node

import {
  envWithLocalDefaults,
  getRequiredEnv,
  normalizeShopDomain,
} from './lib/env.mjs';

const CREATE_WEBHOOK_MUTATION = `#graphql
  mutation CreateOrdersPaidWebhook(
    $topic: WebhookSubscriptionTopic!
    $webhookSubscription: WebhookSubscriptionInput!
  ) {
    webhookSubscriptionCreate(
      topic: $topic
      webhookSubscription: $webhookSubscription
    ) {
      webhookSubscription {
        id
        topic
        uri
      }
      userErrors {
        field
        message
      }
    }
  }
`;

async function main() {
  const env = envWithLocalDefaults();
  const storeDomain = normalizeShopDomain(
    getRequiredEnv(env, 'PUBLIC_STORE_DOMAIN'),
  );
  const accessToken = getRequiredEnv(env, 'SHOPIFY_ADMIN_ACCESS_TOKEN');
  const callbackUrl = normalizeWebhookCallbackUrl(
    getRequiredEnv(env, 'SHOPIFY_WEBHOOK_CALLBACK_URL'),
  );
  const apiVersion = env.SHOPIFY_ADMIN_API_VERSION || '2026-04';
  const endpoint = `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`;
  const response = await fetch(endpoint, {
    body: JSON.stringify({
      query: CREATE_WEBHOOK_MUTATION,
      variables: {
        topic: 'ORDERS_PAID',
        webhookSubscription: {
          format: 'JSON',
          uri: callbackUrl,
        },
      },
    }),
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    method: 'POST',
  });
  const body = await response.json().catch(() => null);

  if (!response.ok || body?.errors) {
    throw new Error(
      `Admin API webhook registration failed: ${JSON.stringify(
        body?.errors || body,
      )}`,
    );
  }

  const result = body.data?.webhookSubscriptionCreate;
  if (result?.userErrors?.length) {
    throw new Error(
      `Shopify rejected the webhook subscription: ${JSON.stringify(
        result.userErrors,
      )}`,
    );
  }

  const subscription = result.webhookSubscription;
  console.warn(
    `Registered ${subscription.topic} webhook ${subscription.id} -> ${subscription.uri}`,
  );
  console.warn(
    'Set SHOPIFY_WEBHOOK_SECRET in Oxygen to this custom app client secret, not the Admin API access token.',
  );
}

function normalizeWebhookCallbackUrl(value) {
  const url = new URL(value);

  if (url.protocol !== 'https:') {
    throw new Error('SHOPIFY_WEBHOOK_CALLBACK_URL must use https://');
  }

  if (url.pathname === '/' || url.pathname === '') {
    url.pathname = '/webhooks/orders-paid';
  }

  if (url.pathname !== '/webhooks/orders-paid') {
    console.warn(
      `Using callback path ${url.pathname}; expected /webhooks/orders-paid.`,
    );
  }

  return url.toString();
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
