/**
 * Server-only helpers for submitting and moderating product reviews via the
 * Shopify Admin GraphQL API. See app/lib/reviewTypes.ts for the storage
 * contract and scripts/setup-reviews.mjs for the definitions this relies on.
 *
 * This module must never be imported into client code — it uses the Admin
 * access token. Runtime code degrades gracefully when the token is missing:
 * createAdminClient throws ReviewsNotConfiguredError, which routes translate
 * into a friendly 503 rather than crashing the page.
 */

import {
  MAX_REVIEW_PHOTOS,
  MAX_REVIEW_PHOTO_BYTES,
  REVIEW_METAOBJECT_TYPE,
  REVIEW_PHOTO_CONTENT_TYPES,
  REVIEWS_METAFIELD_KEY,
  REVIEWS_METAFIELD_NAMESPACE,
} from '~/lib/reviewTypes';

const ADMIN_API_VERSION = '2025-01';

/** Thrown when the Admin token is absent so reviews cannot be written. */
export class ReviewsNotConfiguredError extends Error {
  constructor(
    message = 'Reviews are not enabled yet: SHOPIFY_ADMIN_ACCESS_TOKEN is not set.',
  ) {
    super(message);
    this.name = 'ReviewsNotConfiguredError';
  }
}

/** Thrown for user-correctable validation problems (maps to HTTP 400). */
export class ReviewValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReviewValidationError';
  }
}

type AdminGraphqlVariables = Record<string, unknown>;

type AdminGraphqlResponse<T> = {
  data?: T;
  errors?: unknown;
};

export type AdminClient = <T = unknown>(
  query: string,
  variables?: AdminGraphqlVariables,
) => Promise<T>;

export type SubmitReviewInput = {
  authorName: string;
  body: string;
  photos: File[];
  productGid: string;
  rating: number;
};

/**
 * Build a small fetch-based Admin GraphQL caller. Throws
 * ReviewsNotConfiguredError if the token is missing so callers can degrade
 * gracefully.
 */
export function createAdminClient(env: Env): AdminClient {
  const accessToken = env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const storeDomain = env.PUBLIC_STORE_DOMAIN;

  if (!accessToken) {
    throw new ReviewsNotConfiguredError();
  }
  if (!storeDomain) {
    throw new ReviewsNotConfiguredError(
      'Reviews are not enabled yet: PUBLIC_STORE_DOMAIN is not set.',
    );
  }

  const endpoint = `https://${storeDomain}/admin/api/${ADMIN_API_VERSION}/graphql.json`;

  return async function adminGraphql<T = unknown>(
    query: string,
    variables: AdminGraphqlVariables = {},
  ): Promise<T> {
    const response = await fetch(endpoint, {
      body: JSON.stringify({query, variables}),
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      method: 'POST',
    });

    const result = (await response
      .json()
      .catch(() => null)) as AdminGraphqlResponse<T> | null;

    if (!response.ok || !result || result.errors) {
      throw new Error(
        `Admin API request failed: ${JSON.stringify(result?.errors ?? {status: response.status})}`,
      );
    }

    return result.data as T;
  };
}

// --- Validation --------------------------------------------------------------

function validateSubmitInput(input: SubmitReviewInput): void {
  const {rating, authorName, body, photos} = input;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ReviewValidationError('Rating must be a whole number from 1 to 5.');
  }

  const trimmedAuthor = authorName.trim();
  if (trimmedAuthor.length < 2 || trimmedAuthor.length > 60) {
    throw new ReviewValidationError(
      'Author name must be between 2 and 60 characters.',
    );
  }

  const trimmedBody = body.trim();
  if (trimmedBody.length < 10 || trimmedBody.length > 2000) {
    throw new ReviewValidationError(
      'Review must be between 10 and 2000 characters.',
    );
  }

  if (photos.length > MAX_REVIEW_PHOTOS) {
    throw new ReviewValidationError(
      `You can attach at most ${MAX_REVIEW_PHOTOS} photos.`,
    );
  }

  for (const photo of photos) {
    if (photo.size > MAX_REVIEW_PHOTO_BYTES) {
      throw new ReviewValidationError(
        `Each photo must be ${Math.round(MAX_REVIEW_PHOTO_BYTES / (1024 * 1024))}MB or smaller.`,
      );
    }
    if (!REVIEW_PHOTO_CONTENT_TYPES.includes(photo.type)) {
      throw new ReviewValidationError(
        `Photos must be one of: ${REVIEW_PHOTO_CONTENT_TYPES.join(', ')}.`,
      );
    }
  }
}

// --- GraphQL documents -------------------------------------------------------

const STAGED_UPLOADS_CREATE_MUTATION = `#graphql
  mutation ReviewStagedUploads($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        url
        resourceUrl
        parameters {
          name
          value
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const FILE_CREATE_MUTATION = `#graphql
  mutation ReviewFileCreate($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files {
        id
        fileStatus
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const METAOBJECT_CREATE_MUTATION = `#graphql
  mutation ReviewMetaobjectCreate($metaobject: MetaobjectCreateInput!) {
    metaobjectCreate(metaobject: $metaobject) {
      metaobject {
        id
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const PRODUCT_REVIEWS_METAFIELD_QUERY = `#graphql
  query ProductReviewsMetafield(
    $id: ID!
    $namespace: String!
    $key: String!
  ) {
    product(id: $id) {
      id
      metafield(namespace: $namespace, key: $key) {
        value
      }
    }
  }
`;

const METAFIELDS_SET_MUTATION = `#graphql
  mutation ReviewMetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const METAOBJECT_HELPFUL_QUERY = `#graphql
  query ReviewHelpfulCount($id: ID!) {
    metaobject(id: $id) {
      id
      field(key: "helpful_count") {
        value
      }
    }
  }
`;

const METAOBJECT_UPDATE_MUTATION = `#graphql
  mutation ReviewMetaobjectUpdate($id: ID!, $metaobject: MetaobjectUpdateInput!) {
    metaobjectUpdate(id: $id, metaobject: $metaobject) {
      metaobject {
        id
        field(key: "helpful_count") {
          value
        }
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

// --- GraphQL response shapes -------------------------------------------------

type StagedTarget = {
  url: string;
  resourceUrl: string;
  parameters: Array<{name: string; value: string}>;
};

type UserError = {field?: string[] | null; message: string};

function throwOnUserErrors(userErrors: UserError[] | undefined, label: string) {
  if (userErrors && userErrors.length > 0) {
    throw new Error(`${label} failed: ${JSON.stringify(userErrors)}`);
  }
}

// --- Photo upload ------------------------------------------------------------

/**
 * Upload one photo: create a staged target, POST the bytes to it, then create
 * the file record. Returns the resulting file GID.
 */
async function uploadPhoto(admin: AdminClient, photo: File): Promise<string> {
  const staged = await admin<{
    stagedUploadsCreate: {
      stagedTargets: StagedTarget[];
      userErrors: UserError[];
    };
  }>(STAGED_UPLOADS_CREATE_MUTATION, {
    input: [
      {
        filename: photo.name || 'review-photo',
        mimeType: photo.type,
        httpMethod: 'POST',
        resource: 'IMAGE',
        fileSize: String(photo.size),
      },
    ],
  });

  throwOnUserErrors(
    staged.stagedUploadsCreate.userErrors,
    'stagedUploadsCreate',
  );

  const target = staged.stagedUploadsCreate.stagedTargets[0];
  if (!target) {
    throw new Error('stagedUploadsCreate returned no target.');
  }

  // Upload the bytes to the staged target using the returned parameters.
  const form = new FormData();
  for (const {name, value} of target.parameters) {
    form.append(name, value);
  }
  // The file part must be appended last (after all signed parameters).
  form.append('file', photo, photo.name || 'review-photo');

  const uploadResponse = await fetch(target.url, {
    method: 'POST',
    body: form,
  });

  if (!uploadResponse.ok) {
    const text = await uploadResponse.text().catch(() => '');
    throw new Error(
      `Staged upload failed (${uploadResponse.status}): ${text.slice(0, 500)}`,
    );
  }

  // Create the Shopify file record from the staged resource URL.
  const created = await admin<{
    fileCreate: {
      files: Array<{id: string; fileStatus: string}>;
      userErrors: UserError[];
    };
  }>(FILE_CREATE_MUTATION, {
    files: [
      {
        alt: 'Customer review photo',
        contentType: 'IMAGE',
        originalSource: target.resourceUrl,
      },
    ],
  });

  throwOnUserErrors(created.fileCreate.userErrors, 'fileCreate');

  const fileId = created.fileCreate.files[0]?.id;
  if (!fileId) {
    throw new Error('fileCreate returned no file id.');
  }

  return fileId;
}

// --- Public API --------------------------------------------------------------

/**
 * Validate, upload photos, create a DRAFT (pending moderation) review
 * metaobject, and append its GID to the product's custom.reviews metafield.
 */
export async function submitReview(
  env: Env,
  input: SubmitReviewInput,
): Promise<{ok: true}> {
  validateSubmitInput(input);

  const admin = createAdminClient(env);

  // 1. Upload each photo and collect the resulting file GIDs.
  const photoGids: string[] = [];
  for (const photo of input.photos) {
    photoGids.push(await uploadPhoto(admin, photo));
  }

  // 2. Create the review metaobject (starts DRAFT = pending moderation).
  const created = await admin<{
    metaobjectCreate: {
      metaobject: {id: string} | null;
      userErrors: UserError[];
    };
  }>(METAOBJECT_CREATE_MUTATION, {
    metaobject: {
      type: REVIEW_METAOBJECT_TYPE,
      capabilities: {publishable: {status: 'DRAFT'}},
      fields: [
        {key: 'product', value: input.productGid},
        {key: 'rating', value: String(input.rating)},
        {key: 'author_name', value: input.authorName.trim()},
        {key: 'body', value: input.body.trim()},
        {key: 'photos', value: JSON.stringify(photoGids)},
        {key: 'helpful_count', value: '0'},
        {key: 'submitted_at', value: new Date().toISOString()},
      ],
    },
  });

  throwOnUserErrors(created.metaobjectCreate.userErrors, 'metaobjectCreate');

  const reviewGid = created.metaobjectCreate.metaobject?.id;
  if (!reviewGid) {
    throw new Error('metaobjectCreate returned no metaobject id.');
  }

  // 3. Append the review GID to the product's custom.reviews metafield.
  const current = await admin<{
    product: {metafield: {value: string} | null} | null;
  }>(PRODUCT_REVIEWS_METAFIELD_QUERY, {
    id: input.productGid,
    namespace: REVIEWS_METAFIELD_NAMESPACE,
    key: REVIEWS_METAFIELD_KEY,
  });

  const existingGids = parseGidList(current.product?.metafield?.value);
  const nextGids = [...existingGids, reviewGid];

  const set = await admin<{
    metafieldsSet: {
      metafields: Array<{id: string}>;
      userErrors: UserError[];
    };
  }>(METAFIELDS_SET_MUTATION, {
    metafields: [
      {
        ownerId: input.productGid,
        namespace: REVIEWS_METAFIELD_NAMESPACE,
        key: REVIEWS_METAFIELD_KEY,
        type: 'list.metaobject_reference',
        value: JSON.stringify(nextGids),
      },
    ],
  });

  throwOnUserErrors(set.metafieldsSet.userErrors, 'metafieldsSet');

  return {ok: true};
}

/**
 * Increment a review's helpful_count. Validates the GID format so this cannot
 * be pointed at arbitrary resources.
 */
export async function markReviewHelpful(
  env: Env,
  reviewGid: string,
): Promise<{ok: true; helpfulCount: number}> {
  if (!/^gid:\/\/shopify\/Metaobject\/\d+$/.test(reviewGid)) {
    throw new ReviewValidationError('Invalid review id.');
  }

  const admin = createAdminClient(env);

  const current = await admin<{
    metaobject: {field: {value: string | null} | null} | null;
  }>(METAOBJECT_HELPFUL_QUERY, {id: reviewGid});

  if (!current.metaobject) {
    throw new ReviewValidationError('Review not found.');
  }

  const previous = Number.parseInt(current.metaobject.field?.value ?? '0', 10);
  const next = (Number.isFinite(previous) ? previous : 0) + 1;

  const updated = await admin<{
    metaobjectUpdate: {
      metaobject: {field: {value: string | null} | null} | null;
      userErrors: UserError[];
    };
  }>(METAOBJECT_UPDATE_MUTATION, {
    id: reviewGid,
    metaobject: {
      fields: [{key: 'helpful_count', value: String(next)}],
    },
  });

  throwOnUserErrors(updated.metaobjectUpdate.userErrors, 'metaobjectUpdate');

  const stored = Number.parseInt(
    updated.metaobjectUpdate.metaobject?.field?.value ?? String(next),
    10,
  );

  return {ok: true, helpfulCount: Number.isFinite(stored) ? stored : next};
}

// --- Helpers -----------------------------------------------------------------

function parseGidList(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}
