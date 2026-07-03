/**
 * Client-safe helpers for the social product-reviews feature.
 *
 * This module converts the Storefront API metafield response shape into the
 * shared `ProductReview[]` contract. It must NOT import server-only modules so
 * it can be used from both the loader and the browser bundle.
 */
import type {ProductReview, ReviewPhoto} from '~/lib/reviewTypes';

type MediaImageNode = {
  image?: {
    altText?: string | null;
    height?: number | null;
    url?: string | null;
    width?: number | null;
  } | null;
};

type MetaobjectFieldNode = {
  key?: string | null;
  value?: string | null;
  references?: {
    nodes?: Array<MediaImageNode | null> | null;
  } | null;
};

type MetaobjectNode = {
  id?: string | null;
  fields?: Array<MetaobjectFieldNode | null> | null;
};

/**
 * The Storefront API shape returned by the `custom.reviews` metafield query in
 * `products.$handle.tsx`. Null-tolerant on every level because draft/unresolved
 * references and unset fields come back as `null`.
 */
export type ReviewsMetafieldResponse = {
  references?: {
    nodes?: Array<MetaobjectNode | null> | null;
  } | null;
} | null;

function parsePhotos(field: MetaobjectFieldNode | undefined): ReviewPhoto[] {
  const nodes = field?.references?.nodes ?? [];
  const photos: ReviewPhoto[] = [];

  for (const node of nodes) {
    const image = node?.image;
    if (!image?.url) continue;
    photos.push({
      altText: image.altText ?? null,
      height: image.height ?? null,
      url: image.url,
      width: image.width ?? null,
    });
  }

  return photos;
}

function parseRating(value: string | null | undefined): number | null {
  if (value == null) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(5, Math.max(1, parsed));
}

function parseHelpfulCount(value: string | null | undefined): number {
  if (value == null) return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function parseSubmittedAt(value: string | null | undefined): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return value;
}

/**
 * Convert the Storefront API `custom.reviews` metafield response into a
 * newest-first `ProductReview[]`, skipping null/draft references and any entry
 * missing a required field (rating, author name, body, or a valid date).
 */
export function parseReviewsMetafield(
  metafield: ReviewsMetafieldResponse,
): ProductReview[] {
  const nodes = metafield?.references?.nodes ?? [];
  const reviews: ProductReview[] = [];

  for (const node of nodes) {
    if (!node?.id) continue;

    const fields = new Map<string, MetaobjectFieldNode>();
    for (const field of node.fields ?? []) {
      if (field?.key) fields.set(field.key, field);
    }

    const rating = parseRating(fields.get('rating')?.value);
    const authorName = fields.get('author_name')?.value?.trim() ?? '';
    const body = fields.get('body')?.value?.trim() ?? '';
    const submittedAt = parseSubmittedAt(fields.get('submitted_at')?.value);

    if (rating == null || !authorName || !body || !submittedAt) continue;

    reviews.push({
      authorName,
      body,
      helpfulCount: parseHelpfulCount(fields.get('helpful_count')?.value),
      id: node.id,
      photos: parsePhotos(fields.get('photos')),
      rating,
      submittedAt,
    });
  }

  reviews.sort(
    (a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt),
  );

  return reviews;
}
