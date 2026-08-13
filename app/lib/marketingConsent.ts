export type MarketingConsentState = 'denied' | 'granted' | 'unknown';

type CustomerPrivacyMarketing = {
  marketingAllowed: () => boolean;
};

export function marketingConsentStateFromCustomerPrivacy(
  customerPrivacy: CustomerPrivacyMarketing | null | undefined,
): MarketingConsentState {
  if (!customerPrivacy) return 'unknown';
  return customerPrivacy.marketingAllowed() ? 'granted' : 'denied';
}
