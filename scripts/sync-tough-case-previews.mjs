#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Attaches the 24 case previews (scripts/generate-tough-case-assets.mjs) to
 * the Art Tough Phone Case product and points every variant at its
 * artwork's preview. Dry run by default; `--apply` writes.
 *
 * The flat print images Codex's staging attached are shared file references
 * owned by the live print products. They are only detached from variants
 * (productVariantDetachMedia never deletes a file) and moved behind the
 * previews; they are never removed from the product, because deleting
 * product media can delete the shared file and blank the print pages.
 *
 *   node scripts/sync-tough-case-previews.mjs --env-dir <clara-mendes checkout> [--apply]
 */

import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';

import {mutationErrors, resolveAdminClient} from './lib/admin.mjs';
import {loadLocalEnv} from './lib/env.mjs';
import {PREVIEW_DIR, toughCaseArtworkSlug} from './generate-tough-case-assets.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const {values: args} = parseArgs({
  options: {
    'env-dir': {type: 'string'},
    apply: {type: 'boolean', default: false},
  },
});
const envDir = args['env-dir'] ?? process.cwd();
const env = {
  ...loadLocalEnv('.env', envDir),
  ...loadLocalEnv('.env.shopify-admin.local', envDir),
  ...process.env,
};
const manifest = JSON.parse(
  await readFile(path.join(REPO_ROOT, 'data', 'art-tough-phone-case.json'), 'utf8'),
);

export function previewAlt(title) {
  return `${title} artwork on the Art Tough Phone Case, shown on iPhone 16 Pro`;
}

const PRODUCT = `#graphql
  query ToughCaseMedia($handle: String!, $after: String) {
    productByIdentifier(identifier: {handle: $handle}) {
      id
      status
      media(first: 100) {
        nodes { id alt status mediaContentType }
      }
      variants(first: 250, after: $after) {
        nodes {
          id
          selectedOptions { name value }
          media(first: 5) { nodes { id } }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

const STAGE = `#graphql
  mutation StageToughCasePreview($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets { url resourceUrl parameters { name value } }
      userErrors { field message }
    }
  }
`;

const CREATE_MEDIA = `#graphql
  mutation AddToughCasePreviews($product: ProductUpdateInput!, $media: [CreateMediaInput!]) {
    productUpdate(product: $product, media: $media) {
      product { id }
      userErrors { field message }
    }
  }
`;

const REORDER = `#graphql
  mutation OrderToughCasePreviews($id: ID!, $moves: [MoveInput!]!) {
    productReorderMedia(id: $id, moves: $moves) {
      job { id done }
      mediaUserErrors { field message }
    }
  }
`;

const JOB = `#graphql
  query ToughCaseJob($id: ID!) { job(id: $id) { done } }
`;

const ATTACH = `#graphql
  mutation AttachToughCasePreviews($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants { id }
      userErrors { field message }
    }
  }
`;

const DETACH = `#graphql
  mutation DetachToughCaseSourceMedia($productId: ID!, $variantMedia: [ProductVariantDetachMediaInput!]!) {
    productVariantDetachMedia(productId: $productId, variantMedia: $variantMedia) {
      product { id }
      userErrors { field message }
    }
  }
`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const chunks = (list, size) =>
  Array.from({length: Math.ceil(list.length / size)}, (_, i) =>
    list.slice(i * size, i * size + size),
  );

async function readProduct(admin) {
  let after = null;
  let product = null;
  const variants = [];
  do {
    const body = await admin(PRODUCT, {handle: manifest.handle, after});
    const page = body.data?.productByIdentifier;
    if (!page) throw new Error(`No product with handle ${manifest.handle}`);
    product ??= page;
    variants.push(...page.variants.nodes);
    after = page.variants.pageInfo.hasNextPage ? page.variants.pageInfo.endCursor : null;
  } while (after);
  return {...product, variants};
}

function artworkOf(variant) {
  return variant.selectedOptions.find((option) => option.name === 'Artwork')?.value;
}

function previewsByTitle(product) {
  const byAlt = new Map(product.media.nodes.map((media) => [media.alt, media]));
  return new Map(
    manifest.designs
      .map((design) => [design.title, byAlt.get(previewAlt(design.title))])
      .filter(([, media]) => media),
  );
}

async function stagePreview(admin, design) {
  const file = path.join(PREVIEW_DIR, `${toughCaseArtworkSlug(design.sourceHandle)}.jpg`);
  const {size} = await stat(file);
  const staged = await admin(STAGE, {
    input: [
      {
        fileSize: String(size),
        filename: path.basename(file),
        httpMethod: 'POST',
        mimeType: 'image/jpeg',
        resource: 'PRODUCT_IMAGE',
      },
    ],
  });
  mutationErrors(staged.data?.stagedUploadsCreate, `Stage ${design.title}`);
  const [target] = staged.data.stagedUploadsCreate.stagedTargets;
  const form = new FormData();
  for (const {name, value} of target.parameters) form.append(name, value);
  form.append('file', new Blob([await readFile(file)], {type: 'image/jpeg'}), path.basename(file));
  const response = await fetch(target.url, {method: 'POST', body: form});
  if (!response.ok) throw new Error(`${design.title}: upload HTTP ${response.status}`);
  return target.resourceUrl;
}

async function waitForPreviews(admin) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const product = await readProduct(admin);
    const previews = previewsByTitle(product);
    const failed = [...previews.values()].find((media) => media.status === 'FAILED');
    if (failed) throw new Error(`Preview processing failed: ${failed.alt}`);
    if (
      previews.size === manifest.designs.length &&
      [...previews.values()].every((media) => media.status === 'READY')
    ) {
      return {product, previews};
    }
    await delay(2000);
  }
  throw new Error('Timed out waiting for 24 READY previews');
}

function verify(product, previews) {
  const problems = [];
  manifest.designs.forEach((design, index) => {
    if (product.media.nodes[index]?.id !== previews.get(design.title)?.id) {
      problems.push(`media position ${index} is not the ${design.title} preview`);
    }
  });
  for (const variant of product.variants) {
    const expected = previews.get(artworkOf(variant))?.id;
    const ids = variant.media.nodes.map((media) => media.id);
    if (ids.length !== 1 || ids[0] !== expected) {
      problems.push(`${variant.id} media ${JSON.stringify(ids)} ≠ ${expected}`);
    }
  }
  return problems;
}

async function main() {
  const admin = await resolveAdminClient(env);
  let product = await readProduct(admin);
  console.log(
    `${manifest.handle}: ${product.status}, ${product.media.nodes.length} media, ${product.variants.length} variants`,
  );
  if (product.variants.length !== manifest.designs.length * manifest.phones.length) {
    throw new Error('Variant count does not match the manifest');
  }
  const missing = manifest.designs.filter((design) => !previewsByTitle(product).has(design.title));
  console.log(`previews to upload: ${missing.length}`);
  if (!args.apply) {
    const previews = previewsByTitle(product);
    const problems = previews.size === manifest.designs.length ? verify(product, previews) : ['previews missing'];
    console.log(problems.length ? `dry run: ${problems.length} problems (first: ${problems[0]})` : 'dry run: already in sync');
    return;
  }

  for (const batch of chunks(missing, 6)) {
    const media = [];
    for (const design of batch) {
      media.push({
        alt: previewAlt(design.title),
        mediaContentType: 'IMAGE',
        originalSource: await stagePreview(admin, design),
      });
    }
    const result = await admin(CREATE_MEDIA, {product: {id: product.id}, media});
    mutationErrors(result.data?.productUpdate, 'productUpdate media');
    console.log(`uploaded ${batch.map((d) => d.title).join(', ')}`);
  }

  let ready = await waitForPreviews(admin);
  const moves = manifest.designs
    .map((design, index) => ({id: ready.previews.get(design.title).id, newPosition: String(index)}))
    .filter((move, index) => ready.product.media.nodes[index]?.id !== move.id);
  if (moves.length) {
    const result = await admin(REORDER, {id: ready.product.id, moves});
    const payload = result.data?.productReorderMedia;
    if (payload?.mediaUserErrors?.length) throw new Error(JSON.stringify(payload.mediaUserErrors));
    for (let attempt = 0; payload?.job?.id && attempt < 30; attempt += 1) {
      if ((await admin(JOB, {id: payload.job.id})).data?.job?.done) break;
      await delay(1000);
    }
    ready = await waitForPreviews(admin);
  }

  const attach = ready.product.variants
    .filter((variant) => !variant.media.nodes.some((m) => m.id === ready.previews.get(artworkOf(variant)).id))
    .map((variant) => ({id: variant.id, mediaId: ready.previews.get(artworkOf(variant)).id}));
  for (const batch of chunks(attach, 100)) {
    const result = await admin(ATTACH, {productId: ready.product.id, variants: batch});
    mutationErrors(result.data?.productVariantsBulkUpdate, 'productVariantsBulkUpdate');
  }
  console.log(`attached previews to ${attach.length} variants`);

  product = await readProduct(admin);
  const previewIds = new Set([...ready.previews.values()].map((media) => media.id));
  const detach = product.variants
    .map((variant) => ({
      variantId: variant.id,
      mediaIds: variant.media.nodes.map((m) => m.id).filter((id) => !previewIds.has(id)),
    }))
    .filter((entry) => entry.mediaIds.length);
  for (const batch of chunks(detach, 100)) {
    const result = await admin(DETACH, {productId: product.id, variantMedia: batch});
    mutationErrors(result.data?.productVariantDetachMedia, 'productVariantDetachMedia');
  }
  console.log(`detached source print images from ${detach.length} variants`);

  product = await readProduct(admin);
  const problems = verify(product, previewsByTitle(product));
  if (problems.length) {
    throw new Error(`${problems.length} problems after sync, first: ${problems[0]}`);
  }
  console.log(`verified: 24 previews lead the gallery; all ${product.variants.length} variants show their artwork preview`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
/* eslint-enable no-console */
