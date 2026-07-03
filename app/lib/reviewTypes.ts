/**
 * Shared contract for the social product-reviews feature.
 *
 * Storage model (created by scripts/setup-reviews.mjs):
 * - Metaobject type `product_review` with fields:
 *   product (product_reference), rating (number_integer 1–5),
 *   author_name (single_line_text_field), body (multi_line_text_field),
 *   photos (list.file_reference, max 3), helpful_count (number_integer),
 *   submitted_at (date_time).
 *   Capabilities: publishable (new reviews start DRAFT = pending moderation;
 *   approving = setting the entry to Active in Shopify admin → Content).
 *   Storefront access: PUBLIC_READ.
 * - Product metafield `custom.reviews` (list.metaobject_reference) holding
 *   the review entries for that product; appended on submission. The
 *   Storefront API only resolves ACTIVE (approved) entries from it.
 */

export type ReviewPhoto = {
  altText?: string | null;
  height?: number | null;
  url: string;
  width?: number | null;
};

export type ProductReview = {
  authorName: string;
  body: string;
  helpfulCount: number;
  /** Metaobject GID, e.g. gid://shopify/Metaobject/123 */
  id: string;
  photos: ReviewPhoto[];
  /** 1–5 */
  rating: number;
  /** ISO 8601 */
  submittedAt: string;
};

export type ReviewsSummary = {
  /** 0 when there are no reviews */
  average: number;
  /** Counts for 1★..5★ (index 0 = 1 star) */
  histogram: [number, number, number, number, number];
  total: number;
};

export type ProductReviewsData = {
  reviews: ProductReview[];
  summary: ReviewsSummary;
};

export const REVIEW_METAOBJECT_TYPE = 'product_review';
export const REVIEWS_METAFIELD_NAMESPACE = 'custom';
export const REVIEWS_METAFIELD_KEY = 'reviews';
export const MAX_REVIEW_PHOTOS = 3;
export const MAX_REVIEW_PHOTO_BYTES = 8 * 1024 * 1024;
export const REVIEW_PHOTO_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export function summarizeReviews(reviews: ProductReview[]): ReviewsSummary {
  const histogram: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let sum = 0;

  for (const review of reviews) {
    const rating = Math.min(5, Math.max(1, Math.round(review.rating)));
    histogram[rating - 1] += 1;
    sum += rating;
  }

  return {
    average: reviews.length > 0 ? Math.round((sum / reviews.length) * 10) / 10 : 0,
    histogram,
    total: reviews.length,
  };
}
