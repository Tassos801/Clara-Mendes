#!/usr/bin/env node
/* eslint-disable no-console */
// In-place edition roll for the calendar family. Moves the live Shopify
// record from its previous handle to the manifest handle BY ID, so the
// single Edition variant keeps its id and the Prodigi channel mapping (the
// fourteen attached sides) survives. Every target value comes from
// data/art-product-extensions.json through scripts/lib/extension-product.mjs,
// the same builders the sync and audit use.
//
// Idempotent: each step (product fields + SEO, Edition value, variant SKU,
// media alt) is diffed against the live record and only the missing ones
// run, so a partial earlier run or an Admin-side handle rename is
// completed, never reported as done.
//
//   node scripts/rename-calendar-2027.mjs           # dry run: prints the plan
//   node scripts/rename-calendar-2027.mjs --apply   # applies the missing steps
//
// Must run BEFORE `sync-art-product-extensions.mjs --apply` whenever the
// manifest handle changes: the sync upserts by handle and refuses to run
// while a previous handle is still live.

import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {mutationErrors, resolveAdminClient} from './lib/admin.mjs';
import {envWithAdminDefaults} from './lib/env.mjs';
import {
  descriptionHtml,
  editionOf,
  expectedVariants,
  imageAlt,
  seoFor,
} from './lib/extension-product.mjs';

const APPLY = process.argv.includes('--apply');
const FAMILY_ID = 'calendar';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const catalog = JSON.parse(
  readFileSync(
    path.join(repoRoot, 'data', 'art-product-extensions.json'),
    'utf8',
  ),
);

const PRODUCT_QUERY = `#graphql
  query ExtensionProductForRename($handle: String!) {
    productByIdentifier(identifier: {handle: $handle}) {
      id
      title
      handle
      status
      productType
      seo {
        title
        description
      }
      options {
        id
        name
        optionValues {
          id
          name
        }
      }
      variants(first: 5) {
        nodes {
          id
          sku
          selectedOptions {
            name
            value
          }
        }
      }
      media(first: 10) {
        nodes {
          ... on MediaImage {
            id
            alt
          }
        }
      }
    }
  }
`;

const PRODUCT_UPDATE = `#graphql
  mutation RenameExtensionProduct($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product {
        id
        title
        handle
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const OPTION_VALUE_UPDATE = `#graphql
  mutation RenameEditionValue(
    $productId: ID!
    $option: OptionUpdateInput!
    $optionValuesToUpdate: [OptionValueUpdateInput!]
  ) {
    productOptionUpdate(
      productId: $productId
      option: $option
      optionValuesToUpdate: $optionValuesToUpdate
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

const VARIANT_SKU_UPDATE = `#graphql
  mutation RenameVariantSku($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants {
        id
        sku
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const MEDIA_ALT_UPDATE = `#graphql
  mutation RenameMediaAlt($files: [FileUpdateInput!]!) {
    fileUpdate(files: $files) {
      files {
        id
        alt
      }
      userErrors {
        field
        message
      }
    }
  }
`;

async function findProduct(adminGraphql, handle) {
  const body = await adminGraphql(PRODUCT_QUERY, {handle});
  return body.data?.productByIdentifier ?? null;
}

async function main() {
  const family = catalog.families.find((entry) => entry.id === FAMILY_ID);
  if (!family) throw new Error(`No "${FAMILY_ID}" family in the manifest.`);
  const previousHandles = family.previousHandles ?? [];
  if (!previousHandles.length) {
    throw new Error(
      `${family.handle}: the manifest lists no previousHandles, so there is nothing to rename.`,
    );
  }
  const [expectedVariant] = expectedVariants(family, catalog);
  const edition = editionOf(family);
  const seo = seoFor(family);
  const alt = imageAlt(family, 'All Capsules');
  const skuPattern = new RegExp(
    `^CM-${family.skuSuffix.replace(/-\\d{4}$/, '')}-\\d{4}$`,
  );

  const adminGraphql = await resolveAdminClient(
    envWithAdminDefaults(),
    APPLY ? {requiredScope: 'write_products'} : {},
  );

  // The record may already sit at the manifest handle (a previous partial
  // run, or an Admin-side rename) or still at a previous handle.
  let product = await findProduct(adminGraphql, family.handle);
  let foundAt = family.handle;
  if (!product) {
    for (const handle of previousHandles) {
      product = await findProduct(adminGraphql, handle);
      if (product) {
        foundAt = handle;
        break;
      }
    }
  }
  if (!product) {
    throw new Error(
      `No product at ${family.handle} or ${previousHandles.join(', ')}.`,
    );
  }
  if (foundAt !== family.handle) {
    const occupant = await findProduct(adminGraphql, family.handle);
    if (occupant) {
      throw new Error(
        `Target handle ${family.handle} is already taken by ${occupant.id} (${occupant.title}); Shopify would uniquify the handle and the manifest would point at the wrong record. Resolve the duplicate first.`,
      );
    }
  }

  // Identity guards: only ever touch the Draft calendar with its single
  // Edition variant and a calendar SKU.
  if (product.status !== 'DRAFT') {
    throw new Error(
      `Refusing: ${product.handle} is ${product.status}, expected DRAFT.`,
    );
  }
  if (product.productType !== family.productType) {
    throw new Error(
      `Refusing: ${product.handle} is a "${product.productType}" product, expected "${family.productType}".`,
    );
  }
  const variants = product.variants.nodes;
  if (variants.length !== 1) {
    throw new Error(
      `Refusing: expected one variant, found ${variants.length}.`,
    );
  }
  const [variant] = variants;
  if (!skuPattern.test(variant.sku ?? '')) {
    throw new Error(
      `Refusing: variant SKU ${JSON.stringify(variant.sku)} is not a calendar SKU.`,
    );
  }
  const editionOption = product.options.find(
    (option) => option.name === 'Edition',
  );
  if (!editionOption || editionOption.optionValues.length !== 1) {
    throw new Error('Refusing: expected exactly one Edition option value.');
  }
  const [editionValue] = editionOption.optionValues;
  const mediaImages = product.media.nodes.filter((node) => node?.id);

  const steps = [];
  if (
    product.handle !== family.handle ||
    product.title !== family.title ||
    product.seo?.title !== seo.title ||
    product.seo?.description !== seo.description
  ) {
    steps.push({
      label: `productUpdate: handle ${product.handle} → ${family.handle}, title → "${family.title}", SEO title/description`,
      run: async () => {
        const body = await adminGraphql(PRODUCT_UPDATE, {
          product: {
            descriptionHtml: descriptionHtml(family),
            handle: family.handle,
            id: product.id,
            seo,
            title: family.title,
          },
        });
        mutationErrors(body.data?.productUpdate, 'productUpdate');
      },
    });
  }
  if (editionValue.name !== edition) {
    steps.push({
      label: `productOptionUpdate: Edition "${editionValue.name}" → "${edition}" (variant ${variant.id} kept)`,
      run: async () => {
        const body = await adminGraphql(OPTION_VALUE_UPDATE, {
          option: {id: editionOption.id},
          optionValuesToUpdate: [{id: editionValue.id, name: edition}],
          productId: product.id,
        });
        mutationErrors(body.data?.productOptionUpdate, 'productOptionUpdate');
      },
    });
  }
  if (variant.sku !== expectedVariant.sku) {
    steps.push({
      label: `productVariantsBulkUpdate: SKU ${variant.sku} → ${expectedVariant.sku}`,
      run: async () => {
        const body = await adminGraphql(VARIANT_SKU_UPDATE, {
          productId: product.id,
          variants: [
            {id: variant.id, inventoryItem: {sku: expectedVariant.sku}},
          ],
        });
        mutationErrors(
          body.data?.productVariantsBulkUpdate,
          'productVariantsBulkUpdate',
        );
      },
    });
  }
  const staleMedia = mediaImages.filter((node) => node.alt !== alt);
  if (staleMedia.length) {
    steps.push({
      label: `fileUpdate: alt on ${staleMedia.length} image(s) → "${alt}"`,
      run: async () => {
        const body = await adminGraphql(MEDIA_ALT_UPDATE, {
          files: staleMedia.map((node) => ({alt, id: node.id})),
        });
        mutationErrors(body.data?.fileUpdate, 'fileUpdate');
      },
    });
  }

  console.log(
    `${product.title} (${product.id}) found at handle ${foundAt}; variant ${variant.id} SKU ${variant.sku}; Edition "${editionValue.name}".`,
  );
  if (!steps.length) {
    console.log('Nothing to do: the live record already matches the manifest.');
    return;
  }
  console.log(`${APPLY ? 'Applying' : 'Would apply'} ${steps.length} step(s):`);
  for (const step of steps) console.log(`  - ${step.label}`);
  if (!APPLY) {
    console.log('\nDry run. Re-run with --apply to perform these steps.');
    return;
  }

  for (const step of steps) {
    await step.run();
    console.log(`  ok  ${step.label}`);
  }

  // Verify by id: the same product and the same variant must now sit at
  // the manifest handle with the manifest's Edition value and SKU.
  const after = await findProduct(adminGraphql, family.handle);
  const afterVariant = after?.variants.nodes[0];
  const afterEdition = after?.options.find(
    (option) => option.name === 'Edition',
  )?.optionValues[0]?.name;
  const problems = [];
  if (after?.id !== product.id)
    problems.push('product id changed or not found');
  if (afterVariant?.id !== variant.id) problems.push('variant id changed');
  if (afterVariant?.sku !== expectedVariant.sku) problems.push('SKU mismatch');
  if (afterEdition !== edition) problems.push('Edition value mismatch');
  if (after?.title !== family.title) problems.push('title mismatch');
  if (problems.length) {
    throw new Error(`Post-rename verification failed: ${problems.join('; ')}`);
  }
  console.log(
    `\nVerified: ${after.id} at ${after.handle}, variant ${afterVariant.id} SKU ${afterVariant.sku}, Edition ${afterEdition}. Prodigi mapping preserved by id.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

/* eslint-enable no-console */
