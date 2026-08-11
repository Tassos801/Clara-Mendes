#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Migrates every ACTIVE original-art product from the text-heavy 16 x 20 sofa
 * image to three clean, size-specific sofa images. The new images are uploaded
 * and verified before the old overlay is removed. Each offered Size variant is
 * associated with its matching sofa image, while the flat artwork remains the
 * product-level featured media for collection cards and social sharing.
 *
 *   npm run catalog:art:sofa-mockups:dry-run
 *   npm run catalog:art:sofa-mockups:sync
 */

import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {resolveAdminClient} from './lib/admin.mjs';
import {envWithAdminDefaults} from './lib/env.mjs';
import {ALL_SIZES, variantForSize} from './lib/original-art-size-plan.mjs';
import {
  SOFA_SCENES,
  mediaMatchesPlannedSource,
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
const argumentsList = process.argv.slice(2);
const apply = argumentsList.includes('--apply');
const preflightOnly = argumentsList.includes('--preflight');
const sofaBaseUrl = (
  process.env.PRODUCT_ART_MOCKUP_BASE_URL ||
  'https://shopclaramendes.com/images/product-art-mockups'
).replace(/\/+$/, '');
// The 16 x 20 paths previously served text-heavy artwork. Keep the public paths
// stable while forcing Shopify and the storefront CDN to fetch this clean set.
const sofaAssetVersion = '20260811-clean';
const sizeByKey = new Map(ALL_SIZES.map((size) => [size.key, size]));

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
      variants(first: 10) {
        nodes {
          id
          media(first: 10) {
            nodes {
              alt
              id
              mediaContentType
              status
            }
          }
          selectedOptions {
            name
            value
          }
        }
      }
    }
  }
`;

const CREATE_MEDIA = `#graphql
  mutation AddCleanSofaMockups(
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
  mutation OrderCleanSofaMockups($id: ID!, $moves: [MoveInput!]!) {
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

const ATTACH_VARIANT_MEDIA = `#graphql
  mutation AttachCleanSofaMockupsToVariants(
    $productId: ID!
    $variants: [ProductVariantsBulkInput!]!
  ) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants {
        id
        media(first: 10) {
          nodes {
            alt
            id
            mediaContentType
            preview {
              status
            }
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

const DETACH_EXTRA_VARIANT_MEDIA = `#graphql
  mutation DetachExtraVariantMedia(
    $productId: ID!
    $variantMedia: [ProductVariantDetachMediaInput!]!
  ) {
    productVariantDetachMedia(
      productId: $productId
      variantMedia: $variantMedia
    ) {
      product {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const DELETE_LEGACY_MEDIA = `#graphql
  mutation DeleteLegacySofaMockup($productId: ID!, $mediaIds: [ID!]!) {
    productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
      deletedMediaIds
      mediaUserErrors {
        field
        message
      }
    }
  }
`;

const JOB_STATUS = `#graphql
  query SofaMockupOrderJob($id: ID!) {
    job(id: $id) {
      done
      id
    }
  }
`;

function plannedMediaFor(item) {
  return SOFA_SCENES.map((scene) => {
    const relativePath = sofaMockupRelativePath(item.image, scene);
    return {
      alt: scene.altFor(item.shortTitle),
      localPath: path.join(
        repoRoot,
        'public',
        'images',
        'product-art-mockups',
        ...relativePath.split('/'),
      ),
      originalSource: `${sofaBaseUrl}/${relativePath}?v=${sofaAssetVersion}`,
      scene,
    };
  });
}

function validateLocalAssets() {
  const missing = catalog
    .flatMap((item) => plannedMediaFor(item))
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

function mediaByAlt(product, planned) {
  const nodes = product?.media?.nodes ?? [];
  const byAlt = new Map();
  for (const media of planned) {
    const matches = nodes.filter((node) => node.alt === media.alt);
    if (matches.length > 1) {
      throw new Error(`Duplicate Shopify media uses planned alt: ${media.alt}`);
    }
    if (matches[0]?.id) byAlt.set(media.alt, matches[0]);
  }
  return byAlt;
}

function variantsForScenes(product, item) {
  return SOFA_SCENES.map((scene) => {
    const size = sizeByKey.get(scene.sizeKey);
    const variant = size ? variantForSize(product, size.label) : null;
    if (!variant?.id) {
      throw new Error(
        `${item.handle}: missing ${size?.label || scene.sizeKey} variant`,
      );
    }
    return {scene, size, variant};
  });
}

function assertExactVariantSet(product, item) {
  const variants = product?.variants?.nodes ?? [];
  if (variants.length !== SOFA_SCENES.length) {
    throw new Error(
      `${item.handle}: ${variants.length} variants present, expected exactly ${SOFA_SCENES.length}`,
    );
  }
  const actualLabels = variants.map(
    (variant) =>
      variant.selectedOptions?.find(
        (option) => option.name.toLowerCase() === 'size',
      )?.value,
  );
  const expectedLabels = SOFA_SCENES.map(
    (scene) => sizeByKey.get(scene.sizeKey)?.label,
  );
  if (
    actualLabels.some((label) => !label) ||
    new Set(actualLabels).size !== expectedLabels.length ||
    expectedLabels.some((label) => !actualLabels.includes(label))
  ) {
    throw new Error(
      `${item.handle}: Size variants are ${actualLabels.join(', ')}, expected exactly ${expectedLabels.join(', ')}`,
    );
  }
}

async function waitForReadyMedia(adminGraphql, item, planned) {
  for (let attempt = 0; attempt < 45; attempt += 1) {
    const product = await readProduct(adminGraphql, item.handle);
    const byAlt = mediaByAlt(product, planned);
    const ready = planned.every((media) => {
      const node = byAlt.get(media.alt);
      if (node?.status === 'FAILED') {
        throw new Error(
          `${item.handle}: Shopify failed to process ${media.alt}`,
        );
      }
      if (node?.status === 'READY' && !mediaMatchesPlannedSource(node, media)) {
        throw new Error(
          `${item.handle}: planned alt resolves to the wrong Shopify image: ${media.alt}`,
        );
      }
      return (
        node?.mediaContentType === 'IMAGE' &&
        node?.status === 'READY' &&
        mediaMatchesPlannedSource(node, media)
      );
    });
    if (ready) return {byAlt, product};
    await delay(1500);
  }
  throw new Error(
    `${item.handle}: timed out waiting for three READY clean sofa images`,
  );
}

async function waitForJob(adminGraphql, job) {
  if (!job?.id || job.done) return;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await delay(1000);
    const body = await adminGraphql(JOB_STATUS, {id: job.id});
    if (body.data?.job?.done) return;
  }
  throw new Error(`Timed out waiting for Shopify media-order job ${job.id}`);
}

function hasExactVariantMedia(variant, mediaId) {
  const nodes = variant.media?.nodes ?? [];
  return nodes.length === 1 && nodes[0]?.id === mediaId;
}

function assertSafeVariantMedia(product, item, cleanByAlt, originalFeaturedId) {
  for (const {scene, size, variant} of variantsForScenes(product, item)) {
    const nodes = variant.media?.nodes ?? [];
    const cleanId = cleanByAlt.get(scene.altFor(item.shortTitle))?.id;
    const isExpectedClean = cleanId && hasExactVariantMedia(variant, cleanId);
    const isCurrentBase =
      scene.sizeKey === '8x10' &&
      hasExactVariantMedia(variant, originalFeaturedId);
    if (nodes.length && !isExpectedClean && !isCurrentBase) {
      throw new Error(
        `${item.handle}: ${size.label} variant has a crossed or extra media association; refusing to replace it`,
      );
    }
  }
}

function validateProductForMigration(product, item, planned) {
  if (!product?.id) throw new Error(`${item.handle}: not found in Shopify`);
  if (product.status !== 'ACTIVE') {
    throw new Error(
      `${item.handle}: status is ${product.status}, expected ACTIVE`,
    );
  }
  assertExactVariantSet(product, item);
  variantsForScenes(product, item);
  const originalFeaturedId = product.featuredMedia?.id;
  const media = product.media?.nodes ?? [];
  if (!originalFeaturedId || media[0]?.id !== originalFeaturedId) {
    throw new Error(`${item.handle}: flat featured media is not at position 0`);
  }

  const plan = resolveSofaMediaPlan(media, planned, item.shortTitle);
  if (plan.action === 'mismatch') {
    throw new Error(
      `${item.handle}: ${media.length} media present with a conflicting sofa identity or non-sofa baseline; refusing to migrate`,
    );
  }
  assertSafeVariantMedia(product, item, plan.currentByAlt, originalFeaturedId);
  return {originalFeaturedId, plan};
}

async function waitForVerifiedProduct(
  adminGraphql,
  item,
  planned,
  originalFeaturedId,
  expectedMediaCount,
  expectedLegacyId,
) {
  for (let attempt = 0; attempt < 45; attempt += 1) {
    const product = await readProduct(adminGraphql, item.handle);
    const media = product?.media?.nodes ?? [];
    const byAlt = mediaByAlt(product, planned);
    const variants = variantsForScenes(product, item);
    const galleryReady = planned.every((entry, index) => {
      const sofaMedia = byAlt.get(entry.alt);
      return (
        media[index + 1]?.id === sofaMedia?.id &&
        sofaMedia?.mediaContentType === 'IMAGE' &&
        sofaMedia?.status === 'READY' &&
        mediaMatchesPlannedSource(sofaMedia, entry)
      );
    });
    const variantsReady = variants.every(({scene, variant}) => {
      const expected = byAlt.get(scene.altFor(item.shortTitle));
      return expected?.id && hasExactVariantMedia(variant, expected.id);
    });
    const legacyReady = expectedLegacyId
      ? media.some((entry) => entry.id === expectedLegacyId)
      : true;
    if (
      product?.featuredMedia?.id === originalFeaturedId &&
      media.length === expectedMediaCount &&
      media[0]?.id === originalFeaturedId &&
      galleryReady &&
      variantsReady &&
      legacyReady
    ) {
      return product;
    }
    await delay(1500);
  }
  throw new Error(
    `${item.handle}: timed out waiting for the verified ${expectedMediaCount}-image gallery and exact variant associations`,
  );
}

async function main() {
  validateLocalAssets();
  console.log(
    `${apply ? 'Applying' : preflightOnly ? 'Preflighting' : 'Previewing'} clean sofa media for ${catalog.length} ACTIVE original-art products.`,
  );
  console.log(`Sofa mockup base URL: ${sofaBaseUrl}\n`);

  if (!apply && !preflightOnly) {
    for (const item of catalog) {
      console.log(`  ${item.handle}`);
      for (const [index, media] of plannedMediaFor(item).entries()) {
        console.log(
          `    + position ${index + 1} / ${media.scene.sizeKey}  ${media.originalSource}`,
        );
        console.log(`      alt: ${media.alt}`);
      }
    }
    console.log(
      '\nDry run complete. Deploy these assets before using --apply. New READY images are attached to variants before the legacy text overlay is removed.',
    );
    return;
  }

  const adminGraphql = await resolveAdminClient(envWithAdminDefaults(), {
    requiredScope: 'write_products',
  });
  let added = 0;
  let removed = 0;
  let reordered = 0;
  let variantsAttached = 0;
  let variantAssociationsDetached = 0;

  const preflightByHandle = new Map();
  for (const item of catalog) {
    const planned = plannedMediaFor(item);
    const product = await readProduct(adminGraphql, item.handle);
    const validation = validateProductForMigration(product, item, planned);
    const missing = planned.filter(
      (entry) => !validation.plan.currentByAlt.has(entry.alt),
    );
    for (const entry of missing) await assertRemoteImage(entry.originalSource);
    preflightByHandle.set(item.handle, {
      ...validation,
      planned,
      product,
    });
  }
  console.log(
    `Preflight passed for all ${catalog.length} products and all public image URLs.\n`,
  );
  if (preflightOnly) return;

  for (const item of catalog) {
    const preflight = preflightByHandle.get(item.handle);
    const planned = preflight.planned;
    let product = preflight.product;
    const {originalFeaturedId, plan} = preflight;

    const missing = planned.filter(
      (entry) => !plan.currentByAlt.has(entry.alt),
    );
    if (missing.length) {
      const result = await adminGraphql(CREATE_MEDIA, {
        product: {id: product.id},
        media: missing.map((entry) => ({
          alt: entry.alt,
          mediaContentType: 'IMAGE',
          originalSource: entry.originalSource,
        })),
      });
      const errors = result.data?.productUpdate?.userErrors ?? [];
      if (errors.length) {
        throw new Error(`${item.handle}: ${JSON.stringify(errors, null, 2)}`);
      }
      added += missing.length;
    }

    let ready = await waitForReadyMedia(adminGraphql, item, planned);
    product = ready.product;
    assertSafeVariantMedia(product, item, ready.byAlt, originalFeaturedId);

    const moves = planned
      .map((entry, index) => ({
        id: ready.byAlt.get(entry.alt)?.id,
        newPosition: String(index + 1),
      }))
      .filter(
        (move, index) =>
          move.id &&
          product.media?.nodes?.findIndex((node) => node.id === move.id) !==
            index + 1,
      );
    if (moves.length) {
      const result = await adminGraphql(REORDER_MEDIA, {
        id: product.id,
        moves,
      });
      const payload = result.data?.productReorderMedia;
      const errors = payload?.mediaUserErrors ?? [];
      if (errors.length) {
        throw new Error(`${item.handle}: ${JSON.stringify(errors, null, 2)}`);
      }
      await waitForJob(adminGraphql, payload?.job);
      reordered += 1;
      ready = await waitForReadyMedia(adminGraphql, item, planned);
      product = ready.product;
    }

    const variantInputs = variantsForScenes(product, item).map(
      ({scene, variant}) => ({
        id: variant.id,
        mediaId: ready.byAlt.get(scene.altFor(item.shortTitle))?.id,
      }),
    );
    const alreadyAttached = variantsForScenes(product, item).every(
      ({scene, variant}) => {
        const mediaId = ready.byAlt.get(scene.altFor(item.shortTitle))?.id;
        return mediaId && hasExactVariantMedia(variant, mediaId);
      },
    );
    if (!alreadyAttached) {
      const result = await adminGraphql(ATTACH_VARIANT_MEDIA, {
        productId: product.id,
        variants: variantInputs,
      });
      const errors = result.data?.productVariantsBulkUpdate?.userErrors ?? [];
      if (errors.length) {
        throw new Error(`${item.handle}: ${JSON.stringify(errors, null, 2)}`);
      }
      variantsAttached += variantInputs.length;
      product = await readProduct(adminGraphql, item.handle);
    }

    const variantMediaToDetach = variantsForScenes(product, item)
      .map(({scene, variant}) => {
        const expectedId = ready.byAlt.get(scene.altFor(item.shortTitle))?.id;
        const extraIds = (variant.media?.nodes ?? [])
          .filter((media) => media.id !== expectedId)
          .map((media) => media.id);
        return extraIds.length
          ? {mediaIds: extraIds, variantId: variant.id}
          : null;
      })
      .filter(Boolean);
    if (variantMediaToDetach.length) {
      const result = await adminGraphql(DETACH_EXTRA_VARIANT_MEDIA, {
        productId: product.id,
        variantMedia: variantMediaToDetach,
      });
      const errors = result.data?.productVariantDetachMedia?.userErrors ?? [];
      if (errors.length) {
        throw new Error(`${item.handle}: ${JSON.stringify(errors, null, 2)}`);
      }
      variantAssociationsDetached += variantMediaToDetach.reduce(
        (total, entry) => total + entry.mediaIds.length,
        0,
      );
      product = await readProduct(adminGraphql, item.handle);
    }

    const legacyId = plan.legacy?.id ?? null;
    product = await waitForVerifiedProduct(
      adminGraphql,
      item,
      planned,
      originalFeaturedId,
      legacyId ? 11 : 10,
      legacyId,
    );
    if (legacyId) {
      const result = await adminGraphql(DELETE_LEGACY_MEDIA, {
        mediaIds: [legacyId],
        productId: product.id,
      });
      const payload = result.data?.productDeleteMedia;
      const errors = payload?.mediaUserErrors ?? [];
      if (errors.length || !payload?.deletedMediaIds?.includes(legacyId)) {
        throw new Error(
          `${item.handle}: failed to remove the legacy sofa overlay ${JSON.stringify(errors, null, 2)}`,
        );
      }
      removed += 1;
    }

    await waitForVerifiedProduct(
      adminGraphql,
      item,
      planned,
      originalFeaturedId,
      10,
      null,
    );
    console.log(
      `  VERIFIED ${item.handle} (flat featured, three clean sofa images, 10 READY media, three variant associations)`,
    );
  }

  console.log(
    `\nVerified all ${catalog.length} products: ${added} clean images added, ${removed} legacy overlays removed, ${reordered} galleries reordered, ${variantsAttached} variants attached, ${variantAssociationsDetached} obsolete variant associations detached.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

/* eslint-enable no-console */
