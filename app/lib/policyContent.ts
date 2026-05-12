import {SUPPORT_EMAIL} from './storefrontBasics';

export type PolicyName =
  | 'privacyPolicy'
  | 'shippingPolicy'
  | 'termsOfService'
  | 'refundPolicy';

type PolicyContent = {
  body: string;
  handle: string;
  id: string;
  title: string;
  url?: string | null;
};

const TERMS_OF_SERVICE_BODY = `
  <h2>Overview</h2>
  <p>This website is operated by Clara Mendes. Throughout the site, the terms "we," "us," and "our" refer to Clara Mendes. By visiting our site and purchasing from us, you agree to the following terms and conditions.</p>

  <h2>Online store terms</h2>
  <p>By using this site, you confirm that you are at least the age of majority in your state or province of residence. You may not use our products for any illegal or unauthorized purpose, and your use of the site must comply with all applicable laws.</p>

  <h2>Products and pricing</h2>
  <p>We reserve the right to modify or discontinue any product at any time without notice. Prices are subject to change without notice. We make every effort to display product colors and details accurately, but we cannot guarantee that your device display will reflect exact colors.</p>

  <h2>Orders and payment</h2>
  <p>All orders are subject to availability. We reserve the right to refuse or cancel any order for any reason, including suspected fraud. Payment is processed securely through Shopify at the time of checkout. Taxes and shipping costs are calculated and displayed before you confirm your purchase.</p>

  <h2>Accuracy of information</h2>
  <p>We strive to keep all content on this site current and accurate. Occasionally, information may contain errors or omissions. We reserve the right to correct errors and update information at any time without prior notice.</p>

  <h2>Third-party links</h2>
  <p>Our site may contain links to third-party websites that are not operated by us. We are not responsible for the content, privacy policies, or practices of any third-party sites.</p>

  <h2>Limitation of liability</h2>
  <p>Clara Mendes shall not be liable for indirect, incidental, special, or consequential damages arising from your use of our site or products. Our total liability for any claim related to a purchase shall not exceed the amount you paid for the item in question.</p>

  <h2>Changes to these terms</h2>
  <p>We may update these terms from time to time. Changes take effect immediately upon posting to this page. Your continued use of the site after any changes constitutes acceptance of the updated terms.</p>

  <h2>Contact</h2>
  <p>Questions about these terms can be sent to <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
`;

export function cleanStorefrontPolicy<T extends PolicyContent>(
  policyName: PolicyName,
  policy: T | null | undefined,
) {
  if (!policy) return policy;
  if (!isRefundCopyInTerms(policyName, policy.body)) return policy;

  return {
    ...policy,
    body: TERMS_OF_SERVICE_BODY,
    handle: 'terms-of-service',
    title: 'Terms of Service',
  } as T;
}

function isRefundCopyInTerms(policyName: PolicyName, body: string) {
  if (policyName !== 'termsOfService') return false;

  const text = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  return (
    text.includes('refund policy') &&
    text.includes('we accept returns') &&
    !text.includes('online store terms')
  );
}
