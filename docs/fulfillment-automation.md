# Fulfillment Automation

The storefront now has a server endpoint for paid-order fulfillment intake:

```text
POST /webhooks/orders-paid
```

Use it with Shopify's `orders/paid` webhook topic after the public Oxygen
domain is ready. The endpoint verifies Shopify's webhook HMAC before reading the
order payload.

## Current Behavior

- Rejects requests without a valid `X-Shopify-Hmac-Sha256` signature.
- Accepts only the `orders/paid` topic.
- Normalizes shippable line items into a fulfillment intake payload.
- Auto-maps line items whose Shopify SKU is a CJ SKU or starts with the
  configured store prefix, such as `CM-CJ...`.
- Logs missing supplier mappings by line item and Shopify variant ID.
- Stays in dry-run mode unless `FULFILLMENT_AUTO_SUBMIT=true`, CJ credentials,
  and the required shipping and logistics settings are configured.

The endpoint refuses to submit an order if any shippable line item is missing a
CJ SKU or CJ variant ID.

## Required Shopify Setup

Create a Shopify custom app or use an app with Admin API access, then subscribe
to the `orders/paid` webhook topic with this HTTPS URL:

```text
https://<public-storefront-domain>/webhooks/orders-paid
```

Set the webhook secret in Oxygen:

```text
SHOPIFY_WEBHOOK_SECRET=<app client secret used for Shopify webhook HMAC>
```

Shopify signs HTTPS webhooks with the app client secret and sends the signature
in `X-Shopify-Hmac-Sha256`.

After the custom app has a token with `read_orders`, the webhook subscription can
be registered from this repo:

```powershell
$env:SHOPIFY_ADMIN_ACCESS_TOKEN="<custom app Admin API access token>"
$env:SHOPIFY_WEBHOOK_CALLBACK_URL="https://<public-storefront-domain>/webhooks/orders-paid"
npm run fulfillment:register-webhook
```

Do not use the Admin API access token as `SHOPIFY_WEBHOOK_SECRET`. The webhook
secret should be the custom app client secret used by Shopify for webhook HMAC
signing.

## CJ Dry-Run To Auto-Submit

Set this while testing so paid-order webhooks are logged without creating CJ
orders:

```text
FULFILLMENT_AUTO_SUBMIT=false
```

When ready to submit mapped orders to CJ, set it to `true`, then configure:

```text
FULFILLMENT_AUTO_SUBMIT=true
CJ_API_KEY=<CJ API key>
CJ_ACCESS_TOKEN=<optional short-lived CJ access token>
CJ_PLATFORM_TOKEN=<optional CJ platform token>
CJ_DEFAULT_LOGISTIC_NAME=<CJ logistics method, for example PostNL>
CJ_FROM_COUNTRY_CODE=CN
CJ_SHOP_LOGISTICS_TYPE=2
CJ_STORE_NAME=Clara Mendes
CJ_AUTO_MAP_SKU=true
CJ_SHOPIFY_SKU_PREFIXES=CM-
```

`CJ_STORAGE_ID` is only needed for CJ logistics modes that require a storage ID.
`CJ_API_KEY` is preferred because the webhook can exchange it for a fresh CJ
access token automatically and reuse it in-process until shortly before expiry.
`CJ_ACCESS_TOKEN` is still supported, but CJ access tokens expire and must be
replaced when they do.
`CJ_AUTO_MAP_SKU` defaults to enabled. Set it to `false` if every product should
require an explicit `CJ_LINE_ITEM_MAP` entry.

## Line Item Mapping

CJ order creation requires a CJ variant ID (`vid`) or CJ variant SKU (`sku`) for
each line item. If a Shopify SKU already looks like `CJ...`, or like
`CM-CJ...`, the webhook automatically sends the CJ part as `sku`.

Use explicit mappings for products whose Shopify SKU does not contain the CJ SKU.
Keep those mappings private in Oxygen environment variables.

Use `CJ_LINE_ITEM_MAP` as JSON. Keys can be Shopify variant IDs, product IDs, or
SKUs. Prefixes are also supported for clarity.

```json
{
  "variant:1234567890": {
    "cjVid": "92511400-C758-4474-93CA-66D442F5F787"
  },
  "sku:CJYD205705801AZ-BEIGE": {
    "cjSku": "CJYD205705801AZ-BEIGE"
  }
}
```

Recommended mapping key: `variant:<shopify_variant_id>`.

Generate a template from the products currently published to the Headless
channel:

```powershell
npm run fulfillment:map-template
```

This writes `docs/cj-line-item-map.template.json`. Variants with `CM-CJ...`
SKUs are pre-filled. Fill `cjVid` or `cjSku` for any remaining blank Shopify
variant, then copy only the needed JSON into `CJ_LINE_ITEM_MAP` in Oxygen.

## What Still Needs To Be Done

1. Make the Oxygen storefront publicly accessible or attach the final domain.
2. Create/install the Shopify custom app that owns the webhook secret.
3. Subscribe `orders/paid` to `/webhooks/orders-paid`.
4. Add `SHOPIFY_WEBHOOK_SECRET` to the Oxygen production environment.
5. Run `npm run fulfillment:map-template` and fill any remaining blank CJ
   variant mappings.
6. Add `CJ_LINE_ITEM_MAP` to the Oxygen production environment.
7. Run a paid test order with `FULFILLMENT_AUTO_SUBMIT=false`.
8. Read logs and confirm all line items have mappings.
9. Choose the CJ logistics method and confirm destination-country handling.
10. Set `FULFILLMENT_AUTO_SUBMIT=true` only after the dry-run payloads are
    correct.

## Important Operational Notes

- Shopify may deliver duplicate webhook events. CJ `orderNumber` uses the
  Shopify order name so duplicate submissions should be visible, but a durable
  queue/database should be added before high-volume use.
- The current endpoint logs intake and can call CJ, but it does not yet write
  fulfillment/tracking back to Shopify.
- CJ's `getAccessToken` endpoint is rate-limited, so the webhook caches the
  access token in-process. A durable token store should be added before
  high-volume use.
- The next production-grade step is storing webhook event IDs and CJ order IDs,
  then syncing CJ tracking updates back to Shopify fulfillments through the
  Admin API.
