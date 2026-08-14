export const SUPPORT_EMAIL = 'hello@shopclaramendes.com';
export const STOREFRONT_ORIGIN = 'https://shopclaramendes.com';
export const RETURN_WINDOW_DAYS = 30;

// Prodigi Standard windows (docs/first-order-runbook.md): a 24-hour
// auto-release hold precedes the 1–3 business-day production window, so
// dispatch lands 2–4 business days from order; delivery estimates count
// from dispatch. Changing these means re-pasting the shipping policy
// (docs/shopify-policies-drafts.md) and re-checking runbook step 5.
export const PRODUCTION_WINDOW_BUSINESS_DAYS = '1–3';
export const DISPATCH_WINDOW_BUSINESS_DAYS = '2–4';
export const DELIVERY_EU_BUSINESS_DAYS = '5–10';
export const DELIVERY_US_BUSINESS_DAYS = '7–15';
