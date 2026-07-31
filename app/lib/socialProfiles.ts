/**
 * The brand's claimed social profiles — the single source of truth for the
 * footer links and the Organization schema's `sameAs`, so search engines and
 * visitors are always pointed at the same set of accounts.
 *
 * Only list profiles that are claimed and carry the brand (an unclaimed
 * handle listed here would hand the link to whoever registers it). The
 * companion playbook lives in docs/social-media-kit.md.
 */
export type SocialProfile = {
  label: string;
  url: string;
};

export const SOCIAL_PROFILES: SocialProfile[] = [
  {label: 'Instagram', url: 'https://www.instagram.com/shopclaramendes/'},
  {label: 'Pinterest', url: 'https://www.pinterest.com/shopclaramendes/'},
  {label: 'Facebook', url: 'https://www.facebook.com/shopclaramendes'},
];
