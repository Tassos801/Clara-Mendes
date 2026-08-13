import type {PolicyName} from './policyContent.ts';

export const POLICY_META_DESCRIPTIONS: Record<PolicyName, string> = {
  privacyPolicy:
    'Learn how Clara Mendes collects, uses, and protects customer information.',
  refundPolicy:
    'Read the Clara Mendes 30-day returns, refund, and damaged-order policy.',
  shippingPolicy:
    'Review Clara Mendes delivery estimates, shipping charges, tracking, and customs information.',
  termsOfService:
    'Read the terms that apply when browsing or ordering from Clara Mendes.',
};

export const POLICY_HANDLES = [
  'privacy-policy',
  'refund-policy',
  'shipping-policy',
  'terms-of-service',
] as const;

export type PolicyHandle = (typeof POLICY_HANDLES)[number];

export function policyCanonicalPath(handle: string) {
  return POLICY_HANDLES.includes(handle as PolicyHandle)
    ? `/policies/${handle}`
    : null;
}
