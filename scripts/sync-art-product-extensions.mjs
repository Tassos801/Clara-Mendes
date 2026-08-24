#!/usr/bin/env node
/* eslint-disable no-console */

import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  envWithAdminDefaults,
  getRequiredEnv,
  normalizeShopDomain,
} from './lib/env.mjs';
import {EXTENSION_RELEASE_FLAGS} from '../app/lib/catalogFilters.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const extensionCatalog = JSON.parse(
  readFileSync(
    path.join(repoRoot, 'data', 'art-product-extensions.json'),
    'utf8',
  ),
);
const apply = new Set(process.argv.slice(2)).has('--apply');
const baseUrl = (
  process.env.PRODUCT_EXTENSION_BASE_URL ||
  'https://shopclaramendes.com/images/art-product-extensions'
).replace(/\/+$/, '');

const capsuleCodeByName = {
  'Quiet Form': 'QF',
  'Patina Blue': 'PB',
  'Neo Deco': 'ND',
  'Midnight Garden': 'MG',
  'Sunlit Mosaic': 'SM',
};

const PRODUCT_SET = `#graphql
  mutation UpsertArtProductExtension(
    $identifier: ProductSetIdentifiers
    $input: ProductSetInput!
  ) {
    productSet(identifier: $identifier, input: $input, synchronous: true) {
      product {
        id
        handle
        status
        title
        media(first: 10) {
          nodes {
            alt
            mediaContentType
            status
          }
        }
        variants(first: 100) {
          nodes {
            id
            price
            sku
            title
          }
        }
      }
      userErrors {
        code
        field
        message
      }
    }
  }
`;

function slugify(value) {
  return value.toLowerCase().replaceAll(' ', '-');
}

function imageUrl(family, capsuleName) {
  if (family.frameOnly) {
    return `${baseUrl}/${family.id}/frame-only-natural.png`;
  }
  const filename = family.collectionVariant
    ? 'all-capsules.webp'
    : `${slugify(capsuleName)}.webp`;
  return `${baseUrl}/${family.id}/${filename}`;
}

function imageFile(family, capsuleName) {
  return {
    alt: family.frameOnly
      ? 'Natural classic frame only; artwork not included'
      : family.collectionVariant
        ? 'Clara Mendes 2026 art calendar featuring all five original-art capsules'
        : `${capsuleName} artwork shown on the ${family.title.toLowerCase()}`,
    contentType: 'IMAGE',
    filename: `${family.id}-${slugify(capsuleName)}.webp`,
    originalSource: imageUrl(family, capsuleName),
  };
}

function descriptionHtml(family) {
  const intro = family.frameOnly
    ? 'A Natural classic picture frame sized to fit the three Clara Mendes print editions. This product is the frame only; artwork is not included.'
    : family.collectionVariant
      ? 'A year of original Clara Mendes artwork, bringing all five art capsules together in one considered calendar.'
      : `Original Clara Mendes artwork adapted for the ${family.format.toLowerCase()}. Choose the art capsule that suits your space and everyday ritual.`;

  return [
    `<p>${intro}</p>`,
    '<ul>',
    `<li>${family.material}</li>`,
    `<li>${family.format}</li>`,
    '<li>Printed to order and fulfilled in white-label packaging</li>',
    '</ul>',
    '<p>Colours can vary slightly between screens, materials, and the finished print.</p>',
  ].join('');
}

function standardVariant(family, capsuleName, file) {
  const capsuleCode = capsuleCodeByName[capsuleName];
  return {
    file,
    inventoryItem: {
      requiresShipping: true,
      tracked: false,
    },
    inventoryPolicy: 'DENY',
    optionValues: [{name: capsuleName, optionName: 'Artwork'}],
    price: family.price,
    sku: `CM-${capsuleCode}-${family.skuSuffix}`,
    taxable: true,
  };
}

function phoneVariants(family, capsuleName, file) {
  const capsuleCode = capsuleCodeByName[capsuleName];
  return extensionCatalog.deviceVariants.map((device) => ({
    file,
    inventoryItem: {
      requiresShipping: true,
      tracked: false,
    },
    inventoryPolicy: 'DENY',
    optionValues: [
      {name: capsuleName, optionName: 'Artwork'},
      {name: device.label, optionName: 'Device'},
    ],
    price: family.price,
    sku: `CM-${capsuleCode}-${family.skuSuffix}-${device.code}`,
    taxable: true,
  }));
}

function productInput(family) {
  const capsuleNames = family.frameOnly
    ? ['Frame Only']
    : family.collectionVariant
      ? ['All Capsules']
      : extensionCatalog.capsuleOrder;
  const files = capsuleNames.map((capsuleName) =>
    imageFile(family, capsuleName),
  );
  const fileByCapsule = new Map(
    capsuleNames.map((capsuleName, index) => [capsuleName, files[index]]),
  );

  let productOptions;
  let variants;

  if (family.frameOnly) {
    productOptions = [
      {
        name: 'Size',
        position: 1,
        values: family.sizeVariants.map(({label}) => ({name: label})),
      },
    ];
    variants = family.sizeVariants.map(({code, label, price}) => ({
      file: files[0],
      inventoryItem: {
        requiresShipping: true,
        tracked: false,
      },
      inventoryPolicy: 'DENY',
      optionValues: [{name: label, optionName: 'Size'}],
      price,
      sku: `CM-${family.skuSuffix}-${code}`,
      taxable: true,
    }));
  } else if (family.collectionVariant) {
    productOptions = [
      {
        name: 'Edition',
        position: 1,
        values: [{name: '2026'}],
      },
    ];
    variants = [
      {
        file: files[0],
        inventoryItem: {
          requiresShipping: true,
          tracked: false,
        },
        inventoryPolicy: 'DENY',
        optionValues: [{name: '2026', optionName: 'Edition'}],
        price: family.price,
        sku: `CM-${family.skuSuffix}`,
        taxable: true,
      },
    ];
  } else if (family.deviceOptions) {
    productOptions = [
      {
        name: 'Artwork',
        position: 1,
        values: capsuleNames.map((name) => ({name})),
      },
      {
        name: 'Device',
        position: 2,
        values: extensionCatalog.deviceVariants.map((device) => ({
          name: device.label,
        })),
      },
    ];
    variants = capsuleNames.flatMap((capsuleName) =>
      phoneVariants(family, capsuleName, fileByCapsule.get(capsuleName)),
    );
  } else {
    productOptions = [
      {
        name: 'Artwork',
        position: 1,
        values: capsuleNames.map((name) => ({name})),
      },
    ];
    variants = capsuleNames.map((capsuleName) =>
      standardVariant(family, capsuleName, fileByCapsule.get(capsuleName)),
    );
  }

  return {
    descriptionHtml: descriptionHtml(family),
    files,
    handle: family.handle,
    productOptions,
    productType: family.productType,
    seo: {
      description: `${family.title} featuring original Clara Mendes artwork. Printed to order.`,
      title: `${family.title} | Clara Mendes`,
    },
    status: 'DRAFT',
    tags: family.frameOnly
      ? [
          'Clara Mendes Frame',
          'Frame Only',
          'Natural Frame',
          family.productType,
        ]
      : [
          'Clara Mendes Original',
          'Art for Everyday Living',
          'Prodigi Mapping Pending',
          'Cost Gate Pending',
          'Sample Gate Pending',
          family.productType,
        ],
    title: family.title,
    variants,
    vendor: 'Clara Mendes',
  };
}

function expectedVariantCount(family) {
  if (family.frameOnly) return family.sizeVariants.length;
  if (family.collectionVariant) return 1;
  if (family.deviceOptions) {
    return (
      extensionCatalog.capsuleOrder.length *
      extensionCatalog.deviceVariants.length
    );
  }
  return extensionCatalog.capsuleOrder.length;
}

function validateLocalPreviews() {
  const missing = [];
  for (const family of extensionCatalog.families) {
    if (family.frameOnly) {
      const filePath = path.join(
        repoRoot,
        'public',
        'images',
        'art-product-extensions',
        family.id,
        'frame-only-natural.png',
      );
      if (!existsSync(filePath)) missing.push(filePath);
      continue;
    }
    const capsuleNames = family.collectionVariant
      ? ['All Capsules']
      : extensionCatalog.capsuleOrder;
    for (const capsuleName of capsuleNames) {
      const filename = family.collectionVariant
        ? 'all-capsules.webp'
        : `${slugify(capsuleName)}.webp`;
      const filePath = path.join(
        repoRoot,
        'public',
        'images',
        'art-product-extensions',
        family.id,
        filename,
      );
      if (!existsSync(filePath)) missing.push(filePath);
    }
  }
  if (missing.length) {
    throw new Error(
      `Missing ${missing.length} preview image(s):\n${missing
        .map((filePath) => `  ${filePath}`)
        .join('\n')}`,
    );
  }
}

async function assertRemoteImages() {
  const urls = extensionCatalog.families.flatMap((family) => {
    const capsuleNames = family.frameOnly
      ? ['Frame Only']
      : family.collectionVariant
        ? ['All Capsules']
        : extensionCatalog.capsuleOrder;
    return capsuleNames.map((capsuleName) => imageUrl(family, capsuleName));
  });

  for (const url of urls) {
    const response = await fetch(url, {
      headers: {Range: 'bytes=0-0'},
      redirect: 'follow',
    });
    const contentType = response.headers.get('content-type') || '';
    await response.body?.cancel();
    if (!response.ok || !contentType.startsWith('image/')) {
      throw new Error(
        `Preview is not publicly reachable as an image (${response.status}, ${
          contentType || 'no content type'
        }): ${url}`,
      );
    }
  }
  console.log(`Verified ${urls.length} public product preview images.`);
}

function createAdminClient({accessToken, endpoint}) {
  return async (query, variables) => {
    const response = await fetch(endpoint, {
      body: JSON.stringify({query, variables}),
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      method: 'POST',
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.errors) {
      throw new Error(
        `Admin API request failed: ${JSON.stringify(body?.errors || body)}`,
      );
    }
    return body;
  };
}

async function getAdminAccessToken({clientId, clientSecret, storeDomain}) {
  const response = await fetch(
    `https://${storeDomain}/admin/oauth/access_token`,
    {
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      method: 'POST',
    },
  );
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.access_token) {
    throw new Error(
      `Admin token exchange failed: ${JSON.stringify(body?.errors || body)}`,
    );
  }
  const scopes = String(body.scope || '')
    .split(',')
    .map((scope) => scope.trim());
  if (!scopes.includes('write_products')) {
    throw new Error(
      'The installed Shopify app is missing the write_products access scope.',
    );
  }
  console.log(
    `Admin authorization refreshed (${body.expires_in || 'unknown'} seconds).`,
  );
  return body.access_token;
}

async function main() {
  validateLocalPreviews();

  const totalVariants = extensionCatalog.families.reduce(
    (sum, family) => sum + expectedVariantCount(family),
    0,
  );
  console.log(
    `${apply ? 'Applying' : 'Previewing'} ${
      extensionCatalog.families.length
    } art-led products with ${totalVariants} variants.`,
  );
  for (const family of extensionCatalog.families) {
    console.log(
      `  ${family.handle} | ${expectedVariantCount(family)} variant(s) | $${
        family.price
      } | ${family.prodigiSku}`,
    );
  }

  if (!apply) {
    console.log(
      '\nDry run complete. Products will remain DRAFT. Deploy the preview images and rerun with --apply to create them in Shopify.',
    );
    return;
  }

  await assertRemoteImages();

  const env = envWithAdminDefaults();
  const storeDomain = normalizeShopDomain(
    env.SHOPIFY_ADMIN_STORE || getRequiredEnv(env, 'PUBLIC_STORE_DOMAIN'),
  );
  const clientId = String(env.SHOPIFY_CLIENT_ID || '').trim();
  const clientSecret = String(env.SHOPIFY_CLIENT_SECRET || '').trim();
  const accessToken =
    clientId && clientSecret
      ? await getAdminAccessToken({clientId, clientSecret, storeDomain})
      : getRequiredEnv(env, 'SHOPIFY_ADMIN_ACCESS_TOKEN');
  const apiVersion = env.SHOPIFY_ADMIN_API_VERSION || '2026-07';
  const adminGraphql = createAdminClient({
    accessToken,
    endpoint: `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`,
  });

  let synced = 0;
  for (const family of extensionCatalog.families) {
    // Released families are live and Admin-managed: re-syncing would force
    // them back to DRAFT (status is part of the upsert) and clobber
    // post-release tag cleanup.
    if (EXTENSION_RELEASE_FLAGS[family.handle]) {
      console.log(`${family.handle}: RELEASED — skipped, manage in Admin.`);
      continue;
    }
    const body = await adminGraphql(PRODUCT_SET, {
      identifier: {handle: family.handle},
      input: productInput(family),
    });
    const result = body.data?.productSet;
    if (result?.userErrors?.length) {
      throw new Error(
        `${family.handle}: ${JSON.stringify(result.userErrors, null, 2)}`,
      );
    }
    const expectedCount = expectedVariantCount(family);
    if (
      !result?.product ||
      result.product.status !== 'DRAFT' ||
      result.product.variants.nodes.length !== expectedCount
    ) {
      throw new Error(
        `${family.handle}: Shopify did not return the expected DRAFT product with ${expectedCount} variants.`,
      );
    }
    synced += 1;
    console.log(
      `  DRAFT  ${result.product.handle} (${synced}/${extensionCatalog.families.length})`,
    );
  }

  console.log(
    `Created or updated ${synced}/${extensionCatalog.families.length} art-led products as DRAFT.`,
  );
  console.log(
    'They were intentionally not published. Prodigi mapping, delivered costs, billing, and samples remain required.',
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

/* eslint-enable no-console */
