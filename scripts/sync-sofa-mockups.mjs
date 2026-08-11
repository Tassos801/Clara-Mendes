#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Adds one 16 x 20 sofa-scale image to each ACTIVE original-art product and
 * moves it to media position 1. The flat artwork remains featured at position
 * 0. This script never changes product status, variants, prices, inventory,
 * copy, or existing media.
 *
 *   npm run catalog:art:sofa-mockups:dry-run
 *   npm run catalog:art:sofa-mockups:sync
 */

import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {resolveAdminClient} from './lib/admin.mjs';
import {envWithAdminDefaults} from './lib/env.mjs';
import {
  expectedSofaMockupAlt,
  resolveSofaMediaPlan,
  sofaMockupRelativePath,
} from './lib/sofa-mockup-scenes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const catalog = JSON.parse(
  readFileSync(
    path.join(repoRoot, 'data', 'original-art-catalog.json'),
    'utf8',
  ),
);
const apply = process.argv.slice(2).includes('--apply');
const sofaBaseUrl = (
  process.env.PRODUCT_ART_MOCKUP_BASE_URL ||
  'https://shopclaramendes.com/images/product-art-mockups'
).replace(/\/+$/, '');

const PRODUCT_MEDIA = `#graphql
  query SofaMockupProduct($handle: String!) {
    productByIdentifier(identifier: {handle: $handle}) {
      featuredMedia {
        id
      }
      id
      media(first: 12) {
        nodes {
          alt
          id
          mediaContentType
          preview {
            image {
              url
            }
          }
          status
          ... on MediaImage {
            image {
              url
            }
          }
        }
      }
      status
    }
  }
`;

const CREATE_MEDIA = `#graphql
  mutation AddSofaMockup(
    $product: ProductUpdateInput!
    $media: [CreateMediaInput!]
  ) {
    productUpdate(product: $product, media: $media) {
      product {
        id
        media(first: 12) {
          nodes {
            alt
            id
            mediaContentType
            status
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const REORDER_MEDIA = `#graphql
  mutation OrderSofaMockup($id: ID!, $moves: [MoveInput!]!) {
    productReorderMedia(id: $id, moves: $moves) {
      job {
        done
        id
      }
      mediaUserErrors {
        code
        field
        message
      }
    }
  }
`;

const JOB_STATUS = `#graphql
  query SofaMockupOrderJob($id: ID!) {
    node(id: $id) {
      ... on Job {
        done
        id
      }
    }
  }
`;

function plannedMediaFor(item) {
  const relativePath = sofaMockupRelativePath(item.image);
  return {
    alt: expectedSofaMockupAlt(item.shortTitle),
    localPath: path.join(
      repoRoot,
      'public',
      'images',
      'product-art-mockups',
      ...relativePath.split('/'),
    ),
    originalSource: `${sofaBaseUrl}/${relativePath}`,
  };
}

function validateLocalAssets() {
  const missing = catalog
    .map((item) => plannedMediaFor(item))
    .filter((media) => !existsSync(media.localPath));
  if (missing.length) {
    throw new Error(
      `Missing ${missing.length} sofa mockup(s). Run: npm run catalog:art:sofa-mockups\n${missing
        .map((media) => `  ${media.localPath}`)
        .join('\n')}`,
    );
  }
}

async function assertRemoteImage(url) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {Range: 'bytes=0-0'},
    redirect: 'follow',
  });
  if (!response.ok) {
    throw new Error(
      `Sofa mockup is not publicly reachable (${response.status}): ${url}`,
    );
  }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) {
    throw new Error(
      `Sofa mockup returned ${contentType || 'no content type'}: ${url}`,
    );
  }
  await response.body?.cancel();
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function readProduct(adminGraphql, handle) {
  const body = await adminGraphql(PRODUCT_MEDIA, {handle});
  return body.data?.productByIdentifier;
}

async function waitForMediaByAlt(adminGraphql, handle, alt) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const product = await readProduct(adminGraphql, handle);
    const media = product?.media?.nodes?.find((node) => node.alt === alt);
    if (media?.id) return media;
    await delay(1000);
  }
  throw new Error(`${handle}: timed out waiting for Shopify to attach sofa media`);
}

async function waitForJob(adminGraphql, job) {
  if (!job?.id || job.done) return;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await delay(1000);
    const body = await adminGraphql(JOB_STATUS, {id: job.id});
    if (body.data?.node?.done) return;
  }
  throw new Error(`Timed out waiting for Shopify media-order job ${job.id}`);
}

async function waitForVerifiedProduct(
  adminGraphql,
  item,
  sofaMediaId,
  originalFeaturedId,
) {
  for (let attempt = 0; attempt < 45; attempt += 1) {
    const product = await readProduct(adminGraphql, item.handle);
    const media = product?.media?.nodes ?? [];
    const sofaMedia = media.find((node) => node.id === sofaMediaId);
    if (
      product?.featuredMedia?.id === originalFeaturedId &&
      media.length === 8 &&
      media[0]?.id === originalFeaturedId &&
      media[1]?.id === sofaMediaId &&
      sofaMedia?.mediaContentType === 'IMAGE' &&
      sofaMedia?.status === 'READY'
    ) {
      return product;
    }
    await delay(1500);
  }
  throw new Error(
    `${item.handle}: timed out waiting for the verified 8-image gallery`,
  );
}

async function main() {
  validateLocalAssets();
  console.log(
    `${apply ? 'Applying' : 'Previewing'} sofa media for ${catalog.length} ACTIVE original-art products.`,
  );
  console.log(`Sofa mockup base URL: ${sofaBaseUrl}\n`);

  if (!apply) {
    for (const item of catalog) {
      const media = plannedMediaFor(item);
      console.log(`  ${item.handle}`);
      console.log(`    + position 1  ${media.originalSource}`);
      console.log(`      alt: ${media.alt}`);
    }
    console.log(
      '\nDry run complete. Deploy these assets before using --apply; exact alt matches are idempotently skipped.',
    );
    return;
  }

  const adminGraphql = await resolveAdminClient(envWithAdminDefaults(), {
    requiredScope: 'write_products',
  });
  let added = 0;
  let reused = 0;
  let reordered = 0;

  for (const item of catalog) {
    const planned = plannedMediaFor(item);
    let product = await readProduct(adminGraphql, item.handle);
    if (!product?.id) throw new Error(`${item.handle}: not found in Shopify`);
    if (product.status !== 'ACTIVE') {
      throw new Error(
        `${item.handle}: status is ${product.status}, expected ACTIVE`,
      );
    }
    const originalFeaturedId = product.featuredMedia?.id;
    const media = product.media?.nodes ?? [];
    if (!originalFeaturedId || media[0]?.id !== originalFeaturedId) {
      throw new Error(
        `${item.handle}: flat featured media is not at position 0`,
      );
    }

    const plan = resolveSofaMediaPlan(media, planned);
    if (plan.action === 'mismatch') {
      throw new Error(
        `${item.handle}: ${media.length} media present with a conflicting or missing sofa identity; refusing to append`,
      );
    }

    let sofaMediaId = plan.media?.id;
    if (plan.action === 'complete') {
      reused += 1;
    } else {
      await assertRemoteImage(planned.originalSource);
      const result = await adminGraphql(CREATE_MEDIA, {
        product: {id: product.id},
        media: [
          {
            alt: planned.alt,
            mediaContentType: 'IMAGE',
            originalSource: planned.originalSource,
          },
        ],
      });
      const errors = result.data?.productUpdate?.userErrors ?? [];
      if (errors.length) {
        throw new Error(`${item.handle}: ${JSON.stringify(errors, null, 2)}`);
      }
      sofaMediaId = result.data?.productUpdate?.product?.media?.nodes?.find(
        (node) => node.alt === planned.alt,
      )?.id;
      if (!sofaMediaId) {
        sofaMediaId = (
          await waitForMediaByAlt(adminGraphql, item.handle, planned.alt)
        ).id;
      }
      added += 1;
      product = await readProduct(adminGraphql, item.handle);
    }

    const currentPosition = product.media?.nodes?.findIndex(
      (node) => node.id === sofaMediaId,
    );
    if (currentPosition !== 1) {
      const result = await adminGraphql(REORDER_MEDIA, {
        id: product.id,
        moves: [{id: sofaMediaId, newPosition: '1'}],
      });
      const payload = result.data?.productReorderMedia;
      const errors = payload?.mediaUserErrors ?? [];
      if (errors.length) {
        throw new Error(`${item.handle}: ${JSON.stringify(errors, null, 2)}`);
      }
      await waitForJob(adminGraphql, payload?.job);
      reordered += 1;
    }

    await waitForVerifiedProduct(
      adminGraphql,
      item,
      sofaMediaId,
      originalFeaturedId,
    );
    console.log(
      `  VERIFIED ${item.handle} (flat first, sofa second, 8 READY images)`,
    );
  }

  console.log(
    `\nVerified all ${catalog.length} products: ${added} added, ${reused} reused, ${reordered} reordered.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

/* eslint-enable no-console */
