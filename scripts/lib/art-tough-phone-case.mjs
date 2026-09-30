import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';

import {mutationErrors} from './admin.mjs';

export const TARGET_HANDLE = 'art-tough-phone-case';
const TAGS = [
  'Clara Mendes Original',
  'Art for Everyday Living',
  'Phone Cases',
  'Tough Case',
  'Matte',
  'Prodigi Mapping Pending',
  'Cost Gate Pending',
  'Sample Gate Pending',
  'Phone Crop Review Pending',
  'Case Mockups Pending',
];
const ERRORS = 'userErrors { code field message }';
const PAGE = 'pageInfo { hasNextPage endCursor }';

// These operation and file shapes were checked against the shop's 2026-07
// schema. Async errors live in userErrors; status is CREATED/ACTIVE/COMPLETE.
const PREFLIGHT_QUERY = `#graphql
  query ToughCasePreflight($ids: [ID!]!) {
    shop { name currencyCode resourceLimits { maxProductVariants } }
    nodes(ids: $ids) {
      ... on Product {
        id handle title status productType
        featuredMedia { id status mediaContentType ... on MediaImage { image { url } } }
        variants(first: 25) { nodes { sku } ${PAGE} }
      }
    }
  }
`;
const TARGET_QUERY = `#graphql
  query ToughCaseTargetLookup($query: String!, $after: String) {
    products(first: 250, after: $after, query: $query) { nodes { id handle } ${PAGE} }
  }
`;
const PRODUCT_QUERY = `#graphql
  query ToughCaseProductReadback($id: ID!) {
    product(id: $id) {
      id handle title status vendor productType tags descriptionHtml
      options { name values }
      media(first: 250) { nodes { id status mediaContentType } ${PAGE} }
      storefrontApproved: metafield(namespace: "custom", key: "storefront_approved") { type value }
      fulfillmentVerified: metafield(namespace: "custom", key: "fulfillment_verified") { type value }
    }
  }
`;
const PUBLICATIONS_QUERY = `#graphql
  query ToughCasePublications($id: ID!) {
    product(id: $id) {
      id resourcePublications(first: 250, onlyPublished: true) {
        nodes { isPublished publishDate publication { id name } } ${PAGE}
      }
    }
  }
`;
const VARIANTS_QUERY = `#graphql
  query ToughCaseVariants($id: ID!, $after: String) {
    product(id: $id) {
      id variants(first: 250, after: $after) {
        nodes {
          id sku price taxable inventoryPolicy inventoryQuantity
          selectedOptions { name value }
          inventoryItem { id tracked requiresShipping }
        }
        ${PAGE}
      }
    }
  }
`;
const VARIANT_MEDIA_QUERY = `#graphql
  query ToughCaseVariantMedia($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant { id media(first: 2) { nodes { id status } ${PAGE} } }
    }
  }
`;
const PRODUCT_SET = `#graphql
  mutation StageArtToughCase($identifier: ProductSetIdentifiers, $input: ProductSetInput!) {
    productSet(identifier: $identifier, input: $input, synchronous: false) {
      product { id }
      productSetOperation { id status product { id handle status } ${ERRORS} }
      ${ERRORS}
    }
  }
`;
const OPERATION_QUERY = `#graphql
  query ToughCaseOperation($id: ID!) {
    productOperation(id: $id) {
      ... on ProductSetOperation { id status product { id handle status } ${ERRORS} }
    }
  }
`;

function requireThat(condition, message) {
  if (!condition) throw new Error(message);
}

function unique(values, label) {
  requireThat(new Set(values).size === values.length, `Duplicate ${label}`);
}

function validText(value) {
  return (
    typeof value === 'string' && value.trim() === value && value.length > 0
  );
}

function isHttpsUrl(value, domain) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      (url.hostname === domain || url.hostname.endsWith(`.${domain}`))
    );
  } catch {
    return false;
  }
}

function tuple(artwork, phone) {
  return JSON.stringify([artwork, phone]);
}

function variantTuple(variant) {
  const selected = variant.selectedOptions ?? [];
  requireThat(
    selected.length === 2 && new Set(selected.map((s) => s.name)).size === 2,
    `Invalid option tuple for ${variant.id}`,
  );
  const artwork = selected.find((s) => s.name === 'Artwork')?.value;
  const phone = selected.find((s) => s.name === 'Phone Model')?.value;
  requireThat(
    validText(artwork) && validText(phone),
    `Invalid option names for ${variant.id}`,
  );
  return tuple(artwork, phone);
}

function combinations(manifest) {
  return manifest.designs.flatMap((design) =>
    manifest.phones.map((phone) => ({
      design,
      phone,
      key: tuple(design.title, phone.label),
      sku: `${design.skuPrefix}-TC-${phone.code}`,
    })),
  );
}

export function validateManifest(manifest) {
  requireThat(
    manifest?.version === 1 &&
      manifest.handle === TARGET_HANDLE &&
      manifest.title === 'Art Tough Phone Case',
    'Manifest must identify the new Art Tough Phone Case handle',
  );
  requireThat(
    manifest.status === 'DRAFT' &&
      manifest.currency === 'EUR' &&
      manifest.price === '39.99' &&
      manifest.finish === 'Matte',
    'Manifest must be DRAFT, EUR 39.99, Matte',
  );
  requireThat(
    Array.isArray(manifest.designs) && manifest.designs.length === 24,
    'Exactly 24 released artwork sources are required',
  );
  requireThat(
    Array.isArray(manifest.phones) && manifest.phones.length > 0,
    'At least one evidenced phone model is required',
  );
  for (const design of manifest.designs) {
    requireThat(
      validText(design.title) && validText(design.sourceTitle ?? design.title),
      'Artwork and source titles are required',
    );
    requireThat(
      /^[a-z0-9]+(?:-[a-z0-9]+)*-art-print$/.test(design.sourceHandle),
      'Invalid source print handle',
    );
    requireThat(
      /^gid:\/\/shopify\/Product\/\d+$/.test(design.sourceProductId),
      'Invalid source product ID',
    );
    requireThat(
      /^gid:\/\/shopify\/MediaImage\/\d+$/.test(design.mediaId),
      'Invalid source artwork media ID',
    );
    requireThat(
      design.previewMediaId === undefined ||
        (/^gid:\/\/shopify\/MediaImage\/\d+$/.test(design.previewMediaId) &&
          design.previewMediaId !== design.mediaId),
      'Invalid case preview media ID',
    );
    requireThat(
      /^CM-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(design.skuPrefix),
      'Invalid source SKU prefix',
    );
    requireThat(
      isHttpsUrl(design.imageUrl, 'shopify.com'),
      'Source artwork must use its HTTPS Shopify image URL',
    );
  }
  for (const field of [
    'title',
    'sourceHandle',
    'sourceProductId',
    'skuPrefix',
    'mediaId',
  ])
    unique(
      manifest.designs.map((d) => d[field]),
      `artwork ${field}`,
    );
  const previewCount = manifest.designs.filter(
    (d) => d.previewMediaId !== undefined,
  ).length;
  requireThat(
    previewCount === 0 || previewCount === manifest.designs.length,
    'Case preview media must be set for every artwork or none',
  );
  if (previewCount)
    unique(
      manifest.designs.map((d) => d.previewMediaId),
      'artwork previewMediaId',
    );
  for (const phone of manifest.phones) {
    requireThat(
      validText(phone.label) && /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(phone.code),
      'Invalid phone model name or SKU code',
    );
    requireThat(
      isHttpsUrl(phone.templateUrl, 'prodigi.com'),
      `Official HTTPS Prodigi template required for ${phone.label}`,
    );
    requireThat(
      Number.isInteger(phone.template?.width) &&
        phone.template.width > 0 &&
        Number.isInteger(phone.template?.height) &&
        phone.template.height > 0 &&
        /^[a-f0-9]{64}$/.test(phone.template?.sha256),
      `Verified template dimensions and digest required for ${phone.label}`,
    );
    requireThat(
      phone.providerSku === null ||
        (validText(phone.providerSku) &&
          isHttpsUrl(phone.providerSkuEvidence, 'prodigi.com')),
      `Exact provider SKU evidence required for ${phone.label}; unknown SKU must be null`,
    );
  }
  unique(
    manifest.phones.map((p) => p.label),
    'phone model label',
  );
  unique(
    manifest.phones.map((p) => p.code),
    'phone model code',
  );
  const entries = combinations(manifest);
  unique(
    entries.map((entry) => entry.sku),
    'merchant SKU',
  );
  return {
    designCount: 24,
    phoneCount: manifest.phones.length,
    variantCount: entries.length,
  };
}

export function assertReleasedSources(manifest, originals, printCatalog) {
  const released = [
    ...originals.map((p) => ({
      handle: p.handle,
      title: p.shortTitle,
      sourceTitle: p.title,
      skuPrefix: p.skuPrefix,
    })),
    ...printCatalog.collections.flatMap((collection) =>
      collection.prints
        .filter((p) => p.released === true)
        .map((p) => ({
          handle: `${p.slug}-art-print`,
          title: p.title,
          sourceTitle: `${p.title} Art Print`,
          skuPrefix: `CM-${collection.skuCode}-${String(p.sequence).padStart(2, '0')}`,
        })),
    ),
  ];
  requireThat(
    released.length === 24,
    'Local released print catalog must contain exactly 24 sources',
  );
  const byHandle = new Map(released.map((source) => [source.handle, source]));
  for (const design of manifest.designs) {
    const source = byHandle.get(design.sourceHandle);
    requireThat(
      source &&
        source.title === design.title &&
        source.sourceTitle === (design.sourceTitle ?? design.title) &&
        source.skuPrefix === design.skuPrefix,
      `Source ${design.sourceHandle} is not an exact locally released artwork identity`,
    );
  }
}

export function assertShop(shop, manifest) {
  const {variantCount} = validateManifest(manifest);
  requireThat(shop?.name === 'Clara Mendes', 'Shop name must be Clara Mendes');
  requireThat(shop.currencyCode === 'EUR', 'Shop currency must be EUR');
  requireThat(
    Number.isInteger(shop.resourceLimits?.maxProductVariants) &&
      shop.resourceLimits.maxProductVariants >= variantCount,
    `Shop variant limit does not support ${variantCount} combinations`,
  );
}

function completeConnection(connection, label) {
  requireThat(
    Array.isArray(connection?.nodes) &&
      typeof connection.pageInfo?.hasNextPage === 'boolean',
    `Missing ${label} pagination evidence`,
  );
  requireThat(
    !connection.pageInfo.hasNextPage,
    `Incomplete ${label} pagination`,
  );
  return connection.nodes;
}

export function assertSources(manifest, sources) {
  requireThat(
    Array.isArray(sources) &&
      sources.length === manifest.designs.length &&
      sources.every(Boolean),
    'Fresh source print records are missing',
  );
  unique(
    sources.map((p) => p.id),
    'source print ID',
  );
  const byId = new Map(sources.map((p) => [p.id, p]));
  for (const design of manifest.designs) {
    const source = byId.get(design.sourceProductId);
    requireThat(
      source &&
        source.handle === design.sourceHandle &&
        source.title === (design.sourceTitle ?? design.title) &&
        source.status === 'ACTIVE' &&
        source.productType === 'Art Prints',
      `Source print identity/state mismatch: ${design.sourceHandle}`,
    );
    requireThat(
      source.featuredMedia?.id === design.mediaId &&
        source.featuredMedia.status === 'READY' &&
        source.featuredMedia.mediaContentType === 'IMAGE' &&
        source.featuredMedia.image?.url === design.imageUrl,
      `Source artwork media mismatch: ${design.sourceHandle}`,
    );
    const variants = completeConnection(source.variants, 'source variant');
    requireThat(
      variants.length > 0 &&
        variants.every(
          (v) =>
            typeof v.sku === 'string' &&
            v.sku.startsWith(`${design.skuPrefix}-`),
        ),
      `Source SKU prefix mismatch: ${design.sourceHandle}`,
    );
  }
}

function assertZeroInventory(variant) {
  requireThat(
    variant.inventoryPolicy === 'DENY' &&
      variant.inventoryQuantity === 0 &&
      variant.inventoryItem?.tracked === true &&
      variant.inventoryItem.requiresShipping === true,
    `Unsafe inventory or shipping state for ${variant.id}`,
  );
  // Product.inventoryQuantity is readable with read_products. If an independent
  // broader-scope audit supplied location detail, require each state to be zero.
  if (variant.inventoryItem.inventoryLevels) {
    const levels = completeConnection(
      variant.inventoryItem.inventoryLevels,
      'inventory level',
    );
    unique(
      levels.map((l) => l.id),
      'inventory level ID',
    );
    for (const level of levels) {
      const quantities = level.quantities ?? [];
      requireThat(
        quantities.some((q) => q.name === 'available') &&
          quantities.some((q) => q.name === 'on_hand') &&
          quantities.every((q) => q.quantity === 0),
        `Nonzero or missing inventory quantity for ${variant.id} at ${level.id}`,
      );
    }
  }
}

function assertNoPublications(target) {
  if (
    target.publicationVerification === 'unavailable_missing_read_publications'
  )
    return;
  requireThat(
    completeConnection(target.resourcePublications, 'publication').length === 0,
    'Target has published channels',
  );
}

export function assertTargetSafe(manifest, target) {
  if (target === null) return;
  requireThat(
    target?.handle === TARGET_HANDLE,
    'Existing target handle mismatch',
  );
  requireThat(
    target.status === 'DRAFT',
    `Refusing to mutate ${target.status} existing target; only this DRAFT is allowed`,
  );
  requireThat(
    target.title === manifest.title &&
      target.vendor === 'Clara Mendes' &&
      target.productType === 'Phone Cases',
    'Existing Draft target identity mismatch',
  );
  assertNoPublications(target);
  for (const field of ['storefrontApproved', 'fulfillmentVerified'])
    requireThat(
      target[field]?.type === 'boolean' && target[field].value === 'false',
      `Existing target ${field} must be boolean false`,
    );
  requireThat(
    target.options?.length === 2 &&
      target.options[0].name === 'Artwork' &&
      target.options[1].name === 'Phone Model',
    'Existing target must have Artwork and Phone Model options',
  );
  const expected = new Map(
    combinations(manifest).map((entry) => [entry.key, entry]),
  );
  unique(target.variants.map(variantTuple), 'option combination');
  unique(
    target.variants.map((v) => v.id),
    'variant ID',
  );
  for (const variant of target.variants) {
    const entry = expected.get(variantTuple(variant));
    requireThat(
      entry,
      `Unexpected option combination for ${variant.id}; refusing to delete it`,
    );
    requireThat(
      variant.sku === entry.sku,
      `Existing target SKU mismatch for ${variant.id}`,
    );
    assertZeroInventory(variant);
  }
}

export const DESCRIPTION_HTML =
  '<p>Carry a Clara Mendes artwork with you. Choose one of 24 original artworks and your exact phone model for a matte, dual-layer tough case: an impact-resistant polycarbonate shell over a shock-absorbing silicone liner.</p>' +
  '<p>The artwork is printed edge to edge and wraps the sides of the case. It is centred on every model; the crop and camera opening follow the phone you choose. Product images show the case on iPhone 16 Pro.</p>' +
  '<p>Cases are printed to order for the model selected. Similar model names are not interchangeable, so check the model in your phone settings before ordering.</p>';

export function buildProductInput(manifest, target = null) {
  validateManifest(manifest);
  assertTargetSafe(manifest, target);
  const ids = new Map(
    (target?.variants ?? []).map((v) => [variantTuple(v), v.id]),
  );
  return {
    handle: TARGET_HANDLE,
    title: manifest.title,
    status: 'DRAFT',
    vendor: 'Clara Mendes',
    productType: 'Phone Cases',
    tags: TAGS,
    descriptionHtml: DESCRIPTION_HTML,
    metafields: ['storefront_approved', 'fulfillment_verified'].map((key) => ({
      namespace: 'custom',
      key,
      type: 'boolean',
      value: 'false',
    })),
    // Case previews (scripts/sync-tough-case-previews.mjs) lead the gallery
    // and front each variant. The source print images stay attached behind
    // them: they are shared with the live print products, so dropping them
    // from this list must never be what removes them.
    files: productFileIds(manifest).map((id) => ({id})),
    productOptions: [
      {
        name: 'Artwork',
        position: 1,
        values: manifest.designs.map((d) => ({name: d.title})),
      },
      {
        name: 'Phone Model',
        position: 2,
        values: manifest.phones.map((p) => ({name: p.label})),
      },
    ],
    variants: combinations(manifest).map((entry) => ({
      ...(ids.has(entry.key) ? {id: ids.get(entry.key)} : {}),
      optionValues: [
        {optionName: 'Artwork', name: entry.design.title},
        {optionName: 'Phone Model', name: entry.phone.label},
      ],
      sku: entry.sku,
      price: '39.99',
      taxable: true,
      inventoryPolicy: 'DENY',
      inventoryItem: {tracked: true, requiresShipping: true},
      file: {id: variantMediaId(entry.design)},
    })),
  };
}

function variantMediaId(design) {
  return design.previewMediaId ?? design.mediaId;
}

function productFileIds(manifest) {
  return [
    ...manifest.designs.map(variantMediaId),
    ...manifest.designs
      .filter((d) => d.previewMediaId !== undefined)
      .map((d) => d.mediaId),
  ];
}

function nextCursor(connection, previous, seen, label) {
  requireThat(
    Array.isArray(connection?.nodes) &&
      typeof connection.pageInfo?.hasNextPage === 'boolean',
    `Missing ${label} pagination evidence`,
  );
  if (!connection.pageInfo.hasNextPage) return null;
  const cursor = connection.pageInfo.endCursor;
  requireThat(
    validText(cursor) &&
      cursor !== previous &&
      !seen.has(cursor) &&
      seen.size < 1000,
    `Invalid or repeated ${label} pagination cursor`,
  );
  seen.add(cursor);
  return cursor;
}

async function lookupTarget(admin) {
  const matches = [];
  const seen = new Set();
  let after = null;
  do {
    const response = await admin(TARGET_QUERY, {
      query: `handle:${TARGET_HANDLE}`,
      after,
    });
    const connection = response.data?.products;
    after = nextCursor(connection, after, seen, 'target product');
    matches.push(...connection.nodes.filter((p) => p.handle === TARGET_HANDLE));
  } while (after !== null);
  requireThat(matches.length <= 1, 'Multiple exact target handles found');
  return matches[0]?.id ?? null;
}

export async function readTargetProduct(admin, id) {
  const response = await admin(PRODUCT_QUERY, {id});
  const product = response.data?.product;
  requireThat(product?.id === id, `Target product missing: ${id}`);
  completeConnection(product.media, 'product media');
  try {
    const published = await admin(PUBLICATIONS_QUERY, {id});
    requireThat(
      published.data?.product?.id === id,
      'Product missing during publication readback',
    );
    product.resourcePublications = published.data.product.resourcePublications;
    completeConnection(product.resourcePublications, 'publication');
    product.publicationVerification = 'verified';
  } catch (error) {
    if (
      !/access denied.*resourcePublications|read_publications/i.test(
        String(error.message),
      )
    )
      throw error;
    product.resourcePublications = null;
    product.publicationVerification = 'unavailable_missing_read_publications';
  }
  const variants = [];
  const seen = new Set();
  let after = null;
  do {
    const result = await admin(VARIANTS_QUERY, {id, after});
    requireThat(
      result.data?.product?.id === id,
      'Product changed during variant pagination',
    );
    const connection = result.data.product.variants;
    after = nextCursor(connection, after, seen, 'variant');
    variants.push(...connection.nodes);
  } while (after !== null);
  unique(
    variants.map((v) => v.id),
    'variant ID across pages',
  );
  const byId = new Map(variants.map((v) => [v.id, v]));
  for (let start = 0; start < variants.length; start += 100) {
    const ids = variants.slice(start, start + 100).map((v) => v.id);
    const result = await admin(VARIANT_MEDIA_QUERY, {ids});
    requireThat(
      result.data?.nodes?.length === ids.length &&
        result.data.nodes.every(Boolean),
      'Missing variant media detail',
    );
    unique(
      result.data.nodes.map((node) => node.id),
      'variant media detail ID',
    );
    for (const node of result.data.nodes) {
      requireThat(ids.includes(node.id), 'Unexpected variant media detail ID');
      byId.get(node.id).media = node.media;
    }
  }
  unique(
    variants.map((v) => v.inventoryItem?.id),
    'variant inventory item ID',
  );
  return {...product, variants, variantPages: seen.size + 1};
}

export async function preflight(admin, manifest, {checkTarget = true} = {}) {
  const counts = validateManifest(manifest);
  const response = await admin(PREFLIGHT_QUERY, {
    ids: manifest.designs.map((d) => d.sourceProductId),
  });
  const shop = response.data?.shop;
  assertShop(shop, manifest);
  assertSources(manifest, response.data?.nodes);
  const targetId = await lookupTarget(admin);
  const target = targetId ? await readTargetProduct(admin, targetId) : null;
  if (checkTarget) assertTargetSafe(manifest, target);
  return {shop, sources: response.data.nodes, target, ...counts};
}

export function verifyProduct(manifest, shop, product) {
  assertShop(shop, manifest);
  assertTargetSafe(manifest, product);
  requireThat(product, 'Target product does not exist');
  const expected = combinations(manifest);
  requireThat(
    product.variants.length === expected.length,
    `Variant count mismatch: expected ${expected.length}, got ${product.variants.length}`,
  );
  const actual = new Map(product.variants.map((v) => [variantTuple(v), v]));
  for (const [index, values] of [
    manifest.designs.map((d) => d.title),
    manifest.phones.map((p) => p.label),
  ].entries()) {
    const option = product.options[index];
    requireThat(
      option.values.length === values.length &&
        new Set(option.values).size === values.length &&
        values.every((value) => option.values.includes(value)),
      `Product option values mismatch: ${option.name}`,
    );
  }
  const media = completeConnection(product.media, 'product media');
  const mediaIds = productFileIds(manifest);
  requireThat(
    media.length === mediaIds.length &&
      new Set(media.map((m) => m.id)).size === mediaIds.length &&
      media.every(
        (m, index) =>
          mediaIds.includes(m.id) &&
          (index >= manifest.designs.length ||
            m.id === variantMediaId(manifest.designs[index])) &&
          m.status === 'READY' &&
          m.mediaContentType === 'IMAGE',
      ),
    `Product must have exactly ${mediaIds.length} matching READY images, artwork images first`,
  );
  unique(
    product.variants.map((v) => v.sku),
    'merchant SKU',
  );
  for (const entry of expected) {
    const variant = actual.get(entry.key);
    requireThat(variant, `Missing artwork/phone combination: ${entry.key}`);
    requireThat(
      /^39\.99(?:0*)$/.test(String(variant.price)),
      `Variant price mismatch for ${variant.id}`,
    );
    requireThat(
      variant.taxable === true,
      `Variant must be taxable: ${variant.id}`,
    );
    const associated = completeConnection(variant.media, 'variant media');
    requireThat(
      associated.length === 1 &&
        associated[0].id === variantMediaId(entry.design) &&
        associated[0].status === 'READY',
      `Variant artwork media mismatch for ${variant.id}`,
    );
  }
  const publicationVerification = product.publicationVerification ?? 'verified';
  return {
    passed: true,
    handle: TARGET_HANDLE,
    productId: product.id,
    status: product.status,
    currency: shop.currencyCode,
    price: '39.99',
    ...validateManifest(manifest),
    readyMediaCount: media.length,
    publicationVerification,
    publishedChannelCount: publicationVerification === 'verified' ? 0 : null,
    trackedInventoryQuantity: 0,
    inventoryVerification: 'aggregate_inventoryQuantity_per_variant',
    storefrontApproved: false,
    fulfillmentVerified: false,
    variantPages: product.variantPages ?? null,
    checks: [
      'exact_identity',
      'full_cartesian_options',
      'unique_ids_and_skus',
      'prices_and_tax',
      'source_media_and_associations',
      'tracked_zero_inventory',
      'deny_inventory_policy',
      'shipping_required',
      'false_approval_metafields',
      ...(publicationVerification === 'verified' ? ['no_publications'] : []),
    ],
  };
}

export async function waitForOperation(
  admin,
  id,
  {
    maxPolls = 120,
    pollMs = 5000,
    sleep = delay,
    onOperation = async () => {},
  } = {},
) {
  requireThat(
    /^gid:\/\/shopify\/ProductSetOperation\/\d+$/.test(id),
    'Invalid ProductSetOperation ID',
  );
  requireThat(
    Number.isInteger(maxPolls) &&
      maxPolls > 0 &&
      maxPolls <= 120 &&
      pollMs >= 0 &&
      pollMs <= 10000,
    'Operation polling must be bounded',
  );
  for (let attempt = 0; attempt < maxPolls; attempt++) {
    const response = await admin(OPERATION_QUERY, {id});
    const operation = response.data?.productOperation;
    requireThat(
      operation?.id === id &&
        ['CREATED', 'ACTIVE', 'COMPLETE'].includes(operation.status),
      `Missing or unknown operation status: ${id}`,
    );
    await onOperation(operation);
    mutationErrors(operation, `ProductSetOperation ${id}`);
    if (operation.status === 'COMPLETE') {
      requireThat(
        operation.product?.id,
        `Completed operation has no product: ${id}; resume after investigating`,
      );
      return operation;
    }
    if (attempt + 1 < maxPolls) await sleep(pollMs);
  }
  throw new Error(
    `Operation ${id} is still pending; resume with --resume-operation ${id}. Do not reapply.`,
  );
}

export async function stageProduct({
  admin,
  manifest,
  apply = false,
  resumeOperation = null,
  verifyOnly = false,
  previousState = null,
  onState = async () => {},
  sleep = delay,
}) {
  validateManifest(manifest);
  const manifestSha256 = createHash('sha256')
    .update(JSON.stringify(manifest))
    .digest('hex');
  if (
    apply &&
    !resumeOperation &&
    previousState &&
    previousState.phase !== 'verified'
  ) {
    throw new Error(
      `Previous submission is ${previousState.phase}; recover or resume ${previousState.operationId ?? 'the uncertain request'} before reapplying`,
    );
  }
  const checked = await preflight(admin, manifest, {
    checkTarget: !resumeOperation,
  });
  const plan = {
    handle: TARGET_HANDLE,
    title: manifest.title,
    status: 'DRAFT',
    currency: 'EUR',
    price: '39.99',
    finish: 'Matte',
    designCount: checked.designCount,
    phoneCount: checked.phoneCount,
    variantCount: checked.variantCount,
    existingProductId: checked.target?.id ?? null,
    sourceIds: manifest.designs.map((d) => d.sourceProductId),
    mediaIds: manifest.designs.map((d) => d.mediaId),
    providerSkuKnownCount: manifest.phones.filter((p) => p.providerSku !== null)
      .length,
    manifestSha256,
    input: buildProductInput(manifest, resumeOperation ? null : checked.target),
  };
  if (!apply && !resumeOperation && !verifyOnly)
    return {mode: 'dry-run', plan, preflight: checked};
  let state = {
    handle: TARGET_HANDLE,
    manifestSha256,
    productId: checked.target?.id ?? null,
  };
  let product;
  if (verifyOnly) {
    product = checked.target;
  } else {
    let operationId = resumeOperation;
    if (!operationId) {
      state = {
        ...state,
        phase: 'submission-uncertain',
        submittedAt: new Date().toISOString(),
      };
      await onState(state);
      // Never retry a mutation after transport failure: it may have been accepted.
      const response = await admin(PRODUCT_SET, {
        identifier: checked.target ? {id: checked.target.id} : null,
        input: plan.input,
      });
      const payload = response.data?.productSet;
      operationId = payload?.productSetOperation?.id;
      if (operationId) {
        state = {...state, phase: 'pending', operationId};
        await onState(state);
      }
      requireThat(
        payload,
        'No productSet payload; submission is uncertain. Investigate before reapplying.',
      );
      mutationErrors(payload, 'productSet');
      requireThat(
        operationId,
        'No asynchronous operation ID; submission is uncertain. Investigate before reapplying.',
      );
    } else {
      state = {...state, phase: 'pending', operationId};
      await onState(state);
    }
    const operation = await waitForOperation(admin, operationId, {
      sleep,
      onOperation: async (value) => {
        state = {
          ...state,
          operationStatus: value.status,
          productId: value.product?.id ?? state.productId,
        };
        await onState(state);
      },
    });
    requireThat(
      operation.product.handle === TARGET_HANDLE &&
        operation.product.status === 'DRAFT',
      `Operation ${operationId} returned a different or non-Draft target`,
    );
    requireThat(
      !checked.target || operation.product.id === checked.target.id,
      `Operation ${operationId} returned a different product ID`,
    );
    state = {
      ...state,
      phase: 'complete-unverified',
      productId: operation.product.id,
    };
    await onState(state);
    product = await readTargetProduct(admin, operation.product.id);
  }
  const verification = verifyProduct(manifest, checked.shop, product);
  if (!verifyOnly) {
    state = {...state, phase: 'verified', verifiedAt: new Date().toISOString()};
    await onState(state);
  }
  return {
    mode: verifyOnly ? 'verify-only' : resumeOperation ? 'resumed' : 'applied',
    plan,
    preflight: checked,
    readback: product,
    verification,
    state,
  };
}

export function makeHandoffCsv(manifest, product = null) {
  const byTuple = new Map(
    (product?.variants ?? []).map((v) => [variantTuple(v), v]),
  );
  const rows = [
    [
      'artwork',
      'phone_model',
      'finish',
      'shopify_product_id',
      'shopify_variant_id',
      'merchant_sku',
      'art_source_url',
      'template_url',
      'production_file',
      'crop_review_status',
      'mockup_status',
      'provider_sku',
      'mapping_status',
    ],
  ];
  for (const entry of combinations(manifest))
    rows.push([
      entry.design.title,
      entry.phone.label,
      'Matte',
      product?.id ?? '',
      byTuple.get(entry.key)?.id ?? '',
      entry.sku,
      entry.design.imageUrl,
      entry.phone.templateUrl,
      '',
      'pending',
      'pending',
      entry.phone.providerSku ?? '',
      'pending',
    ]);
  return (
    rows
      .map((row) =>
        row
          .map((value) =>
            /[",\r\n]/.test(String(value))
              ? `"${String(value).replaceAll('"', '""')}"`
              : String(value),
          )
          .join(','),
      )
      .join('\n') + '\n'
  );
}
