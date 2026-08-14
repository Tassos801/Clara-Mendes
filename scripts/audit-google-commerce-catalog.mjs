#!/usr/bin/env node
/* eslint-disable no-console */

import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {envWithAdminDefaults} from './lib/env.mjs';
import {resolveAdminClient} from './lib/admin.mjs';
import {
  validateGoogleAttributeReadback,
  validateGooglePublicationReadiness,
} from './lib/google-commerce-audit.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const originalCatalog = JSON.parse(
  readFileSync(
    path.join(repoRoot, 'data', 'original-art-catalog.json'),
    'utf8',
  ),
);
const extensionCatalog = JSON.parse(
  readFileSync(
    path.join(repoRoot, 'data', 'art-product-extensions.json'),
    'utf8',
  ),
);

const EXPECTED_BRAND = 'Clara Mendes';
const EXPECTED_CATEGORY_ID = 'gid://shopify/TaxonomyCategory/hg-3-4-2';
const EXPECTED_ORIGINAL_COUNT = 15;
const EXPECTED_VARIANT_COUNT = 45;
const EXPECTED_EXTENSION_COUNT = 12;
const shopifyOnly = process.argv.includes('--shopify-only');

const GOOGLE_CATALOG_QUERY = `#graphql
  query GoogleCommerceCatalog($first: Int!, $query: String!) {
    taxonomy {
      categories(first: 25, search: "posters") {
        nodes {
          fullName
          id
          isArchived
          isLeaf
          name
        }
      }
    }
    products(first: $first, query: $query, sortKey: TITLE) {
      nodes {
        category {
          fullName
          id
          name
        }
        description
        handle
        id
        media(first: 10) {
          nodes {
            alt
            mediaContentType
            status
          }
        }
        productType
        seo {
          description
          title
        }
        status
        tags
        title
        vendor
        variants(first: 10) {
          nodes {
            barcode
            id
            inventoryItem {
              requiresShipping
            }
            price
            selectedOptions {
              name
              value
            }
            sku
          }
        }
      }
    }
  }
`;

const PUBLICATIONS_QUERY = `#graphql
  query GoogleCommercePublications {
    publications(first: 30) {
      nodes {
        autoPublish
        channels(first: 5) {
          nodes {
            activeRegions
            app {
              handle
              id
              title
            }
            handle
            id
            name
          }
        }
        id
      }
    }
  }
`;

const PUBLICATION_STATUS_QUERY = `#graphql
  query GoogleCommercePublicationStatus($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        handle
        id
        resourcePublicationsV2(first: 30, onlyPublished: false) {
          nodes {
            isPublished
            publication {
              id
            }
          }
        }
      }
    }
  }
`;

const APPROVED_PRODUCTS_QUERY = `#graphql
  query GoogleCommerceApprovedProducts($first: Int!, $query: String!) {
    products(first: $first, query: $query, sortKey: TITLE) {
      nodes {
        handle
        id
        status
      }
    }
  }
`;

function publicationLabel(publication) {
  const channels = publication?.channels?.nodes ?? [];
  return channels
    .map((channel) =>
      [
        channel?.name,
        channel?.handle,
        channel?.app?.title,
        channel?.app?.handle,
      ]
        .filter(Boolean)
        .join(' / '),
    )
    .filter(Boolean)
    .join(', ');
}

function isGooglePublication(publication) {
  return /google/i.test(publicationLabel(publication));
}

function inspectOriginal(product) {
  const issues = [];
  const variants = product?.variants?.nodes ?? [];
  const media = product?.media?.nodes ?? [];

  if (product?.status !== 'ACTIVE') issues.push(`status is ${product?.status}`);
  if (product?.vendor !== EXPECTED_BRAND) {
    issues.push(`brand/vendor is ${product?.vendor || 'missing'}`);
  }
  if (product?.category?.id !== EXPECTED_CATEGORY_ID) {
    issues.push(
      `Shopify taxonomy category is ${product?.category?.fullName || 'missing'}`,
    );
  }
  if (!/art/i.test(product?.productType ?? '')) {
    issues.push(`product type is ${product?.productType || 'missing'}`);
  }
  if ((product?.description ?? '').trim().length < 80) {
    issues.push('description is too short for a useful product listing');
  }
  if (variants.length !== 3)
    issues.push(`${variants.length} variants, expected 3`);

  for (const variant of variants) {
    if (!String(variant?.sku ?? '').trim())
      issues.push('variant SKU is missing');
    if (String(variant?.barcode ?? '').trim()) {
      issues.push(`${variant.sku || variant.id} has a barcode/GTIN`);
    }
    if (variant?.inventoryItem?.requiresShipping !== true) {
      issues.push(`${variant.sku || variant.id} does not require shipping`);
    }
    const size = (variant?.selectedOptions ?? []).find(
      (option) => option.name === 'Size',
    )?.value;
    if (!size)
      issues.push(`${variant.sku || variant.id} has no Size dimension`);
  }

  if (!media.length) issues.push('product media is missing');
  if (
    media.some(
      (entry) =>
        entry?.mediaContentType !== 'IMAGE' ||
        entry?.status !== 'READY' ||
        !String(entry?.alt ?? '').trim(),
    )
  ) {
    issues.push('one or more images are not READY images with alt text');
  }

  return issues;
}

async function main() {
  const adminGraphql = await resolveAdminClient(envWithAdminDefaults());
  const response = await adminGraphql(GOOGLE_CATALOG_QUERY, {
    first: 30,
    query: "tag:'Clara Mendes Original'",
  });
  let publications = [];
  let publicationAuditAvailable = !shopifyOnly;
  let publicationAuditError = '';
  if (!shopifyOnly) {
    try {
      const publicationResponse = await adminGraphql(PUBLICATIONS_QUERY);
      publications = publicationResponse.data?.publications?.nodes ?? [];
    } catch (error) {
      publicationAuditAvailable = false;
      publicationAuditError = String(error?.message ?? error);
    }
  }
  const products = response.data?.products?.nodes ?? [];
  const productsByHandle = new Map(
    products.map((product) => [product.handle, product]),
  );
  const expectedHandles = new Set(originalCatalog.map((item) => item.handle));
  const missing = originalCatalog.filter(
    (item) => !productsByHandle.has(item.handle),
  );
  const extensionHandles = new Set(
    extensionCatalog.families.map((family) => family.handle),
  );
  const unexpected = products.filter(
    (product) =>
      !expectedHandles.has(product.handle) &&
      !extensionHandles.has(product.handle),
  );
  const allVariants = originalCatalog.flatMap(
    (item) => productsByHandle.get(item.handle)?.variants?.nodes ?? [],
  );
  const duplicateSkus = [
    ...new Set(
      allVariants
        .map((variant) => String(variant?.sku ?? '').trim())
        .filter((sku, index, skus) => sku && skus.indexOf(sku) !== index),
    ),
  ];
  const googlePublications = publications.filter(isGooglePublication);
  const taxonomyCandidates = response.data?.taxonomy?.categories?.nodes ?? [];
  let issueCount = 0;

  console.log(
    `Google catalog scope: ${products.length} tagged products; ` +
      `${allVariants.length} expected-original variants.`,
  );

  if (products.length !== EXPECTED_ORIGINAL_COUNT + EXPECTED_EXTENSION_COUNT) {
    console.log(
      `ISSUE expected ${EXPECTED_ORIGINAL_COUNT + EXPECTED_EXTENSION_COUNT} tagged products, found ${products.length}`,
    );
    issueCount += 1;
  }
  if (missing.length) {
    console.log(
      `ISSUE missing originals: ${missing.map((item) => item.handle).join(', ')}`,
    );
    issueCount += missing.length;
  }
  if (unexpected.length) {
    console.log(
      `ISSUE unexpected tagged products: ${unexpected.map((item) => item.handle).join(', ')}`,
    );
    issueCount += unexpected.length;
  }
  if (allVariants.length !== EXPECTED_VARIANT_COUNT) {
    console.log(
      `ISSUE expected ${EXPECTED_VARIANT_COUNT} original variants, found ${allVariants.length}`,
    );
    issueCount += 1;
  }
  if (duplicateSkus.length) {
    console.log(`ISSUE duplicate SKUs: ${duplicateSkus.join(', ')}`);
    issueCount += duplicateSkus.length;
  }

  for (const expected of originalCatalog) {
    const product = productsByHandle.get(expected.handle);
    const issues = product
      ? inspectOriginal(product)
      : ['missing from Shopify'];
    issueCount += issues.length;
    console.log(
      `${issues.length ? 'ISSUE' : 'OK'}  ${expected.handle}${
        issues.length ? `: ${issues.join('; ')}` : ''
      }`,
    );
  }

  const extensions = products.filter((product) =>
    extensionHandles.has(product.handle),
  );
  if (extensions.length !== EXPECTED_EXTENSION_COUNT) {
    console.log(
      `ISSUE expected ${EXPECTED_EXTENSION_COUNT} extension products, found ${extensions.length}`,
    );
    issueCount += 1;
  }

  for (const extension of extensions) {
    const issues = [];
    if (extension.status !== 'DRAFT')
      issues.push(`status is ${extension.status}`);
    issueCount += issues.length;
    console.log(
      `${issues.length ? 'ISSUE' : 'OK'}  ${extension.handle}${
        issues.length ? `: ${issues.join('; ')}` : ' (Draft and excluded)'
      }`,
    );
  }

  console.log(
    `Assigned original categories: ${
      [
        ...new Set(
          originalCatalog
            .map((item) => productsByHandle.get(item.handle)?.category)
            .filter(Boolean)
            .map((category) => `${category.id} (${category.fullName})`),
        ),
      ].join(' | ') || 'none'
    }`,
  );
  console.log(
    `Google publication: ${
      shopifyOnly
        ? 'not checked in --shopify-only mode'
        : !publicationAuditAvailable
          ? 'not readable with the current Admin API scope; verify in Google & YouTube'
          : googlePublications.length
            ? googlePublications.map(publicationLabel).join(' | ')
            : 'not provisioned yet'
    }`,
  );
  if (publicationAuditError) {
    console.log(`Google publication readback error: ${publicationAuditError}`);
  }
  console.log(
    `Art-print taxonomy candidates: ${
      taxonomyCandidates
        .map((category) => `${category.id} (${category.fullName})`)
        .join(' | ') || 'none'
    }`,
  );

  if (!shopifyOnly) {
    let publicationProducts = [];
    let approvedHandles = null;
    if (publicationAuditAvailable && googlePublications.length === 1) {
      try {
        const publicationStatus = await adminGraphql(PUBLICATION_STATUS_QUERY, {
          ids: products.map((product) => product.id),
        });
        publicationProducts = (publicationStatus.data?.nodes ?? []).filter(
          Boolean,
        );

        const appId = googlePublications[0]?.channels?.nodes?.find(
          (channel) => channel?.app?.id,
        )?.app?.id;
        const appNumericId = String(appId ?? '')
          .split('/')
          .pop();
        if (!appNumericId) {
          throw new Error('Google channel app ID is unavailable');
        }
        const approvalResponse = await adminGraphql(APPROVED_PRODUCTS_QUERY, {
          first: 100,
          query: `product_publication_status:${appNumericId}-approved`,
        });
        approvedHandles = (approvalResponse.data?.products?.nodes ?? []).map(
          (product) => product.handle,
        );
      } catch (error) {
        publicationAuditAvailable = false;
        console.log(
          `Google product publication/approval readback error: ${String(
            error?.message ?? error,
          )}`,
        );
      }
    }

    const publicationIssues = validateGooglePublicationReadiness({
      approvedHandles,
      expectedExtensionHandles: [...extensionHandles],
      expectedOriginalHandles: [...expectedHandles],
      googlePublicationIds: googlePublications.map(
        (publication) => publication.id,
      ),
      publicationAuditAvailable,
      publicationProducts,
    });
    for (const issue of publicationIssues) {
      console.log(`ISSUE ${issue}`);
    }
    issueCount += publicationIssues.length;

    const readbackArgument = process.argv.find((argument) =>
      argument.startsWith('--google-readback='),
    );
    const configuredReadbackPath =
      readbackArgument?.slice('--google-readback='.length) ||
      process.env.GOOGLE_COMMERCE_READBACK_FILE ||
      path.join('data', 'google-commerce-readback.json');
    const readbackPath = path.resolve(repoRoot, configuredReadbackPath);
    let readback = null;
    if (existsSync(readbackPath)) {
      try {
        readback = JSON.parse(readFileSync(readbackPath, 'utf8'));
      } catch (error) {
        console.log(
          `ISSUE Google product-attribute readback is invalid JSON: ${String(
            error?.message ?? error,
          )}`,
        );
        issueCount += 1;
      }
    }

    const attributeIssues = validateGoogleAttributeReadback({
      expectedExtensionHandles: [...extensionHandles],
      originals: originalCatalog
        .map((item) => productsByHandle.get(item.handle))
        .filter(Boolean),
      readback,
    });
    for (const issue of attributeIssues) {
      console.log(`ISSUE ${issue}`);
    }
    issueCount += attributeIssues.length;
    console.log(
      `Google attribute evidence: ${
        readback
          ? readbackPath
          : `missing (${readbackPath}); Shopify SKU alone is not MPN/custom-product proof`
      }`,
    );
  }

  if (issueCount) {
    throw new Error(
      `Google commerce catalog audit failed with ${issueCount} issue(s).`,
    );
  }

  console.log(
    shopifyOnly
      ? 'Shopify catalog preflight passed. Google publication, approval, and product attributes were not audited.'
      : 'Strict Google commerce catalog audit passed.',
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

/* eslint-enable no-console */
