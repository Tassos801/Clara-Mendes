#!/usr/bin/env node
/* eslint-disable no-console */

import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {resolveAdminClient} from './lib/admin.mjs';
import {envWithAdminDefaults} from './lib/env.mjs';
import {ARTWORKS} from './generate-classic-frame-mockups.mjs';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const productHandle = 'classic-framed-art-print-16x20';
const apply = process.argv.includes('--apply');
const deleteOld = process.argv.includes('--delete-old');

const PRODUCT_MEDIA = `#graphql
  query ClassicFrameProduct($handle: String!) {
    productByIdentifier(identifier: {handle: $handle}) {
      featuredMedia {
        id
      }
      id
      media(first: 20) {
        nodes {
          alt
          id
          mediaContentType
          status
        }
      }
      status
      variants(first: 10) {
        nodes {
          id
          media(first: 20) {
            nodes {
              id
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

const STAGE_UPLOADS = `#graphql
  mutation StageClassicFrameMockups($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        parameters {
          name
          value
        }
        resourceUrl
        url
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CREATE_MEDIA = `#graphql
  mutation AddClassicFrameMockups(
    $product: ProductUpdateInput!
    $media: [CreateMediaInput!]
  ) {
    productUpdate(product: $product, media: $media) {
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

const REORDER_MEDIA = `#graphql
  mutation OrderClassicFrameMockups($id: ID!, $moves: [MoveInput!]!) {
    productReorderMedia(id: $id, moves: $moves) {
      job {
        done
        id
      }
      mediaUserErrors {
        field
        message
      }
    }
  }
`;

const ATTACH_VARIANT_MEDIA = `#graphql
  mutation AttachClassicFrameMockups(
    $productId: ID!
    $variants: [ProductVariantsBulkInput!]!
  ) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const DETACH_OLD_VARIANT_MEDIA = `#graphql
  mutation DetachOldClassicFrameMockups(
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

const DELETE_OLD_MEDIA = `#graphql
  mutation DeleteOldClassicFrameMockups($productId: ID!, $mediaIds: [ID!]!) {
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
  query ClassicFrameMediaOrderJob($id: ID!) {
    job(id: $id) {
      done
      id
    }
  }
`;

function altFor(artwork) {
  return `${artwork.title} artwork in a slim natural wood-effect classic frame, no mat, 16 x 20 in`;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function readProduct(adminGraphql) {
  const body = await adminGraphql(PRODUCT_MEDIA, {handle: productHandle});
  return body.data?.productByIdentifier;
}

function variantArtwork(variant) {
  return variant.selectedOptions?.find(
    (option) => option.name.toLowerCase() === 'artwork',
  )?.value;
}

function mediaByPlannedAlt(product) {
  const result = new Map();
  for (const artwork of ARTWORKS) {
    const alt = altFor(artwork);
    const matches = product.media.nodes.filter((media) => media.alt === alt);
    if (matches.length > 1) {
      throw new Error(`Duplicate Shopify media uses planned alt: ${alt}`);
    }
    if (matches[0]) result.set(artwork.title, matches[0]);
  }
  return result;
}

function assertExpectedProduct(product) {
  if (!product?.id) throw new Error(`${productHandle}: product not found`);
  if (product.status !== 'ACTIVE') {
    throw new Error(`${productHandle}: expected ACTIVE, got ${product.status}`);
  }
  if (product.variants.nodes.length !== ARTWORKS.length) {
    throw new Error(
      `${productHandle}: expected five variants, got ${product.variants.nodes.length}`,
    );
  }
  const variantTitles = product.variants.nodes.map(variantArtwork);
  if (
    variantTitles.some((title) => !title) ||
    ARTWORKS.some((artwork) => !variantTitles.includes(artwork.title))
  ) {
    throw new Error(
      `${productHandle}: Artwork variants do not match the five planned previews`,
    );
  }

  const plannedByTitle = mediaByPlannedAlt(product);
  const plannedIds = new Set(
    [...plannedByTitle.values()].map((media) => media.id),
  );
  const oldMedia = product.media.nodes.filter(
    (media) => !plannedIds.has(media.id),
  );
  if (oldMedia.length !== ARTWORKS.length) {
    throw new Error(
      `${productHandle}: expected exactly five old media records, got ${oldMedia.length}`,
    );
  }
  return {oldMedia, plannedByTitle};
}

async function stageLocalMedia(adminGraphql, artwork) {
  const file = await stat(artwork.outputPath);
  const staged = await adminGraphql(STAGE_UPLOADS, {
    input: [
      {
        fileSize: String(file.size),
        filename: path.basename(artwork.outputPath),
        httpMethod: 'POST',
        mimeType: 'image/webp',
        resource: 'PRODUCT_IMAGE',
      },
    ],
  });
  const payload = staged.data?.stagedUploadsCreate;
  if (payload?.userErrors?.length) {
    throw new Error(`${artwork.title}: ${JSON.stringify(payload.userErrors)}`);
  }
  const target = payload?.stagedTargets?.[0];
  if (!target?.url || !target.resourceUrl) {
    throw new Error(
      `${artwork.title}: Shopify returned no staged upload target`,
    );
  }

  const form = new FormData();
  for (const parameter of target.parameters) {
    form.append(parameter.name, parameter.value);
  }
  form.append(
    'file',
    new Blob([await readFile(artwork.outputPath)], {type: 'image/webp'}),
    path.basename(artwork.outputPath),
  );
  const response = await fetch(target.url, {body: form, method: 'POST'});
  if (!response.ok) {
    throw new Error(
      `${artwork.title}: staged upload failed with HTTP ${response.status}`,
    );
  }
  return target.resourceUrl;
}

async function waitForReadyMedia(adminGraphql) {
  for (let attempt = 0; attempt < 45; attempt += 1) {
    const product = await readProduct(adminGraphql);
    const plannedByTitle = mediaByPlannedAlt(product);
    for (const [title, media] of plannedByTitle) {
      if (media.status === 'FAILED') {
        throw new Error(`${title}: Shopify media processing failed`);
      }
    }
    if (
      plannedByTitle.size === ARTWORKS.length &&
      [...plannedByTitle.values()].every(
        (media) =>
          media.mediaContentType === 'IMAGE' && media.status === 'READY',
      )
    ) {
      return {plannedByTitle, product};
    }
    await delay(1500);
  }
  throw new Error('Timed out waiting for five READY classic-frame images');
}

async function waitForJob(adminGraphql, job) {
  if (!job?.id || job.done) return;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await delay(1000);
    const body = await adminGraphql(JOB_STATUS, {id: job.id});
    if (body.data?.job?.done) return;
  }
  throw new Error(`Timed out waiting for media-order job ${job.id}`);
}

async function waitForVerifiedReplacement(adminGraphql, oldIds) {
  for (let attempt = 0; attempt < 45; attempt += 1) {
    const product = await readProduct(adminGraphql);
    const plannedByTitle = mediaByPlannedAlt(product);
    const ordered = ARTWORKS.every(
      (artwork, index) =>
        product.media.nodes[index]?.id ===
        plannedByTitle.get(artwork.title)?.id,
    );
    const variantsReady = product.variants.nodes.every((variant) => {
      const plannedId = plannedByTitle.get(variantArtwork(variant))?.id;
      return (
        plannedId &&
        variant.media.nodes.length === 1 &&
        variant.media.nodes[0].id === plannedId
      );
    });
    const oldMediaPresent = oldIds.every((id) =>
      product.media.nodes.some((media) => media.id === id),
    );
    if (
      plannedByTitle.size === ARTWORKS.length &&
      product.featuredMedia?.id === plannedByTitle.get(ARTWORKS[0].title)?.id &&
      ordered &&
      variantsReady &&
      oldMediaPresent
    ) {
      return product;
    }
    await delay(1500);
  }
  throw new Error('Timed out verifying the classic-frame replacement state');
}

async function deleteOldMedia(adminGraphql, product, oldMedia) {
  const result = await adminGraphql(DELETE_OLD_MEDIA, {
    mediaIds: oldMedia.map((media) => media.id),
    productId: product.id,
  });
  const payload = result.data?.productDeleteMedia;
  if (payload?.mediaUserErrors?.length) {
    throw new Error(JSON.stringify(payload.mediaUserErrors, null, 2));
  }
  if (payload?.deletedMediaIds?.length !== ARTWORKS.length) {
    throw new Error('Shopify did not confirm deletion of all five old images');
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const current = await readProduct(adminGraphql);
    if (
      current.media.nodes.length === ARTWORKS.length &&
      mediaByPlannedAlt(current).size === ARTWORKS.length
    ) {
      return;
    }
    await delay(1000);
  }
  throw new Error('Timed out verifying removal of the five old images');
}

async function main() {
  console.log(
    `${apply ? 'Applying' : deleteOld ? 'Deleting old' : 'Previewing'} accurate classic-frame media for ${productHandle}.`,
  );
  for (const artwork of ARTWORKS) {
    console.log(
      `  ${artwork.title}: ${path.relative(repoRoot, artwork.outputPath)}`,
    );
  }
  if (!apply && !deleteOld) {
    console.log(
      '\nDry run complete. Use --apply to stage and attach the five files.',
    );
    return;
  }

  const adminGraphql = await resolveAdminClient(envWithAdminDefaults(), {
    requiredScope: 'write_products',
  });
  let product = await readProduct(adminGraphql);
  const preflight = assertExpectedProduct(product);

  if (deleteOld) {
    if (preflight.plannedByTitle.size !== ARTWORKS.length) {
      throw new Error('Refusing deletion until all five accurate images exist');
    }
    await deleteOldMedia(adminGraphql, product, preflight.oldMedia);
    console.log('Deleted and verified the five old misleading product images.');
    return;
  }

  const missing = ARTWORKS.filter(
    (artwork) => !preflight.plannedByTitle.has(artwork.title),
  );
  if (missing.length) {
    const stagedMedia = [];
    for (const artwork of missing) {
      stagedMedia.push({
        alt: altFor(artwork),
        mediaContentType: 'IMAGE',
        originalSource: await stageLocalMedia(adminGraphql, artwork),
      });
    }
    const result = await adminGraphql(CREATE_MEDIA, {
      media: stagedMedia,
      product: {id: product.id},
    });
    const errors = result.data?.productUpdate?.userErrors ?? [];
    if (errors.length) throw new Error(JSON.stringify(errors, null, 2));
  }

  let ready = await waitForReadyMedia(adminGraphql);
  product = ready.product;
  const moves = ARTWORKS.map((artwork, index) => ({
    id: ready.plannedByTitle.get(artwork.title).id,
    newPosition: String(index),
  })).filter((move, index) => product.media.nodes[index]?.id !== move.id);
  if (moves.length) {
    const result = await adminGraphql(REORDER_MEDIA, {id: product.id, moves});
    const payload = result.data?.productReorderMedia;
    if (payload?.mediaUserErrors?.length) {
      throw new Error(JSON.stringify(payload.mediaUserErrors, null, 2));
    }
    await waitForJob(adminGraphql, payload?.job);
    ready = await waitForReadyMedia(adminGraphql);
    product = ready.product;
  }

  const variantInputs = product.variants.nodes.map((variant) => ({
    id: variant.id,
    mediaId: ready.plannedByTitle.get(variantArtwork(variant)).id,
  }));
  const attached = await adminGraphql(ATTACH_VARIANT_MEDIA, {
    productId: product.id,
    variants: variantInputs,
  });
  const attachErrors =
    attached.data?.productVariantsBulkUpdate?.userErrors ?? [];
  if (attachErrors.length)
    throw new Error(JSON.stringify(attachErrors, null, 2));

  product = await readProduct(adminGraphql);
  const oldIds = preflight.oldMedia.map((media) => media.id);
  const detachInputs = product.variants.nodes
    .map((variant) => {
      const oldVariantIds = variant.media.nodes
        .map((media) => media.id)
        .filter((id) => oldIds.includes(id));
      return oldVariantIds.length
        ? {mediaIds: oldVariantIds, variantId: variant.id}
        : null;
    })
    .filter(Boolean);
  if (detachInputs.length) {
    const detached = await adminGraphql(DETACH_OLD_VARIANT_MEDIA, {
      productId: product.id,
      variantMedia: detachInputs,
    });
    const detachErrors =
      detached.data?.productVariantDetachMedia?.userErrors ?? [];
    if (detachErrors.length)
      throw new Error(JSON.stringify(detachErrors, null, 2));
  }

  await waitForVerifiedReplacement(adminGraphql, oldIds);
  console.log(
    'Uploaded five READY images, ordered them first, and verified one exact image per Artwork variant.',
  );
  console.log(
    'The five old product images remain stored until explicit deletion.',
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

/* eslint-enable no-console */
