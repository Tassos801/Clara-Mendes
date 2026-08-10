#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Appends the generated room mockups (scripts/generate-room-mockups.mjs) to
 * the 15 live original-art products as additional product media. Narrowly
 * scoped on purpose: unlike sync-original-art-catalog.mjs (a Draft staging
 * command), this only calls productCreateMedia — it never touches status,
 * variants, prices, or the existing flat art, so it is safe for the ACTIVE
 * catalog.
 *
 * Idempotent: a mockup is skipped when the product already carries a media
 * whose alt matches that scene's alt text. To replace an existing mockup,
 * delete the old media in Shopify Admin first, then rerun.
 *
 *   npm run catalog:art:mockups:dry-run
 *   npm run catalog:art:mockups:sync     # --apply, needs Admin credentials
 */

import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {envWithAdminDefaults} from './lib/env.mjs';
import {resolveAdminClient} from './lib/admin.mjs';
import {
  MOCKUP_SCENES,
  mockupRelativePath,
  resolveMockupAppendPlan,
} from './lib/room-mockup-scenes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const catalog = JSON.parse(
  readFileSync(
    path.join(repoRoot, 'data', 'original-art-catalog.json'),
    'utf8',
  ),
);
const apply = process.argv.slice(2).includes('--apply');
const mockupBaseUrl = (
  process.env.PRODUCT_ART_MOCKUP_BASE_URL ||
  'https://shopclaramendes.com/images/product-art-mockups'
).replace(/\/+$/, '');

const PRODUCT_MEDIA = `#graphql
  query RoomMockupProduct($handle: String!) {
    productByIdentifier(identifier: {handle: $handle}) {
      id
      status
      media(first: 10) {
        nodes {
          id
          alt
          mediaContentType
          status
        }
      }
    }
  }
`;

const CREATE_MEDIA = `#graphql
  mutation AddRoomMockups($productId: ID!, $media: [CreateMediaInput!]!) {
    productCreateMedia(productId: $productId, media: $media) {
      media {
        alt
        mediaContentType
        status
      }
      mediaUserErrors {
        code
        field
        message
      }
    }
  }
`;

function plannedMediaFor(item) {
  return MOCKUP_SCENES.map((scene) => {
    const relativePath = mockupRelativePath(item.image, scene);
    return {
      sceneKey: scene.key,
      alt: scene.altFor(item.shortTitle),
      localPath: path.join(
        repoRoot,
        'public',
        'images',
        'product-art-mockups',
        ...relativePath.split('/'),
      ),
      originalSource: `${mockupBaseUrl}/${relativePath}`,
    };
  });
}

function validateLocalAssets() {
  const missing = catalog
    .flatMap((item) => plannedMediaFor(item))
    .filter((media) => !existsSync(media.localPath));

  if (missing.length) {
    throw new Error(
      `Missing ${missing.length} generated mockup(s). Run: node ./scripts/generate-room-mockups.mjs\n${missing
        .map((media) => `  ${media.localPath}`)
        .join('\n')}`,
    );
  }
}

async function assertRemoteImage(url) {
  // Oxygen can reject HEAD while still serving the same static asset on GET.
  const response = await fetch(url, {
    method: 'GET',
    headers: {Range: 'bytes=0-0'},
    redirect: 'follow',
  });
  if (!response.ok) {
    throw new Error(
      `Mockup is not publicly reachable (${response.status}): ${url}`,
    );
  }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) {
    throw new Error(
      `Mockup returned an unexpected content type (${contentType || 'missing'}): ${url}`,
    );
  }
  await response.body?.cancel();
}

async function main() {
  validateLocalAssets();
  console.log(
    `${apply ? 'Applying' : 'Previewing'} room-mockup media for ${catalog.length} products.`,
  );
  console.log(`Mockup base URL: ${mockupBaseUrl}\n`);

  if (!apply) {
    for (const item of catalog) {
      const planned = plannedMediaFor(item);
      console.log(`  ${item.handle}`);
      for (const media of planned) {
        console.log(
          `    + ${media.sceneKey.padEnd(16)} ${media.originalSource}`,
        );
        console.log(`      alt: ${media.alt}`);
      }
    }
    console.log(
      '\nDry run complete. Already-present mockups (matched by alt text) are skipped on --apply.',
    );
    console.log(
      'Use --apply only after this branch is deployed (the URLs above must be live) and with explicit sign-off.',
    );
    return;
  }

  const adminGraphql = await resolveAdminClient(envWithAdminDefaults(), {
    requiredScope: 'write_products',
  });

  let appended = 0;
  let skipped = 0;
  let mismatched = 0;
  for (const item of catalog) {
    const body = await adminGraphql(PRODUCT_MEDIA, {handle: item.handle});
    const product = body.data?.productByIdentifier;
    if (!product?.id) {
      throw new Error(`${item.handle}: not found in Shopify`);
    }

    const mediaNodes = product.media?.nodes ?? [];
    const plan = resolveMockupAppendPlan(mediaNodes, plannedMediaFor(item));

    if (plan.action === 'complete') {
      skipped += 1;
      console.log(`  OK      ${item.handle} (mockups already present)`);
      continue;
    }
    if (plan.action === 'mismatch') {
      mismatched += 1;
      console.log(
        `  SKIP    ${item.handle} (${mediaNodes.length} media present but mockup alts don't match the current scene copy — delete the stale mockups in Admin or restore the alt text, then rerun)`,
      );
      continue;
    }
    const missing = plan.missing;

    for (const media of missing) {
      await assertRemoteImage(media.originalSource);
    }

    const result = await adminGraphql(CREATE_MEDIA, {
      productId: product.id,
      media: missing.map((media) => ({
        alt: media.alt,
        mediaContentType: 'IMAGE',
        originalSource: media.originalSource,
      })),
    });
    const errors = result.data?.productCreateMedia?.mediaUserErrors;
    if (errors?.length) {
      throw new Error(`${item.handle}: ${JSON.stringify(errors, null, 2)}`);
    }

    appended += missing.length;
    console.log(
      `  ADDED   ${item.handle} (${missing.map((media) => media.sceneKey).join(', ')})`,
    );
  }

  console.log(
    `\nAppended ${appended} mockup(s); ${skipped} product(s) already complete${
      mismatched ? `; ${mismatched} skipped on alt mismatch` : ''
    }.`,
  );
  console.log(
    'Shopify processes new media asynchronously; run npm run catalog:art:audit shortly to confirm 5 READY images per product.',
  );
  if (mismatched) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

/* eslint-enable no-console */
