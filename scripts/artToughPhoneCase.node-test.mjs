import assert from 'node:assert/strict';
import {test} from 'node:test';

import {
  assertReleasedSources,
  assertShop,
  assertSources,
  assertTargetSafe,
  buildProductInput,
  makeHandoffCsv,
  preflight,
  readTargetProduct,
  stageProduct,
  validateManifest,
  verifyProduct,
  waitForOperation,
} from './lib/art-tough-phone-case.mjs';
import {parseArgs} from './stage-art-tough-phone-case.mjs';

const page = (nodes, endCursor = null) => ({
  nodes,
  pageInfo: {hasNextPage: endCursor !== null, endCursor},
});

function fixture() {
  const manifest = {
    version: 1,
    handle: 'art-tough-phone-case',
    title: 'Art Tough Phone Case',
    currency: 'EUR',
    price: '39.99',
    finish: 'Matte',
    status: 'DRAFT',
    designs: Array.from({length: 24}, (_, i) => ({
      title: `Artwork ${i + 1}`,
      sourceTitle: `Artwork ${i + 1} — Fine Art Print`,
      sourceHandle: `artwork-${i + 1}-art-print`,
      sourceProductId: `gid://shopify/Product/${i + 1}`,
      skuPrefix: `CM-ART-${i + 1}`,
      mediaId: `gid://shopify/MediaImage/${i + 1}`,
      imageUrl: `https://cdn.shopify.com/art-${i + 1}.jpg`,
    })),
    phones: Array.from({length: 11}, (_, i) => ({
      label: `iPhone ${i + 10}`,
      code: `IP${i + 10}`,
      templateUrl: `https://www.prodigi.com/templates/ip${i + 10}.png`,
      providerSku: null,
      providerSkuEvidence: null,
      template: {width: 1000, height: 2000, sha256: 'a'.repeat(64)},
    })),
  };
  const shop = {
    name: 'Clara Mendes',
    currencyCode: 'EUR',
    resourceLimits: {maxProductVariants: 2048},
  };
  const sources = manifest.designs.map((design) => ({
    id: design.sourceProductId,
    handle: design.sourceHandle,
    title: design.sourceTitle,
    status: 'ACTIVE',
    productType: 'Art Prints',
    featuredMedia: {
      id: design.mediaId,
      status: 'READY',
      mediaContentType: 'IMAGE',
      image: {url: design.imageUrl},
    },
    variants: page([
      {sku: `${design.skuPrefix}-8X10`},
      {sku: `${design.skuPrefix}-16X20`},
    ]),
  }));
  const variants = manifest.designs.flatMap((design, d) =>
    manifest.phones.map((phone, p) => ({
      id: `gid://shopify/ProductVariant/${d * 11 + p + 1000}`,
      sku: `${design.skuPrefix}-TC-${phone.code}`,
      price: '39.99',
      taxable: true,
      inventoryPolicy: 'DENY',
      inventoryQuantity: 0,
      selectedOptions: [
        {name: 'Artwork', value: design.title},
        {name: 'Phone Model', value: phone.label},
      ],
      media: page([{id: design.mediaId, status: 'READY'}]),
      inventoryItem: {
        id: `gid://shopify/InventoryItem/${d * 11 + p + 1000}`,
        tracked: true,
        requiresShipping: true,
        inventoryLevels: page([]),
      },
    })),
  );
  const product = {
    id: 'gid://shopify/Product/999',
    handle: manifest.handle,
    title: manifest.title,
    status: 'DRAFT',
    vendor: 'Clara Mendes',
    productType: 'Phone Cases',
    options: [
      {name: 'Artwork', values: manifest.designs.map((d) => d.title)},
      {name: 'Phone Model', values: manifest.phones.map((p) => p.label)},
    ],
    media: page(
      manifest.designs.map((d) => ({
        id: d.mediaId,
        status: 'READY',
        mediaContentType: 'IMAGE',
      })),
    ),
    resourcePublications: page([]),
    storefrontApproved: {type: 'boolean', value: 'false'},
    fulfillmentVerified: {type: 'boolean', value: 'false'},
    variants,
  };
  return {manifest, shop, sources, product};
}

function mockAdmin(f) {
  const calls = [];
  const admin = async (query, variables = {}) => {
    calls.push({query, variables});
    if (query.includes('ToughCasePreflight'))
      return {data: {shop: f.shop, nodes: f.sources}};
    if (query.includes('ToughCaseTargetLookup'))
      return {
        data: {
          products: page(
            f.target === null
              ? []
              : [{id: f.product.id, handle: f.product.handle}],
          ),
        },
      };
    if (query.includes('ToughCasePublications'))
      return {
        data: {
          product: {
            id: f.product.id,
            resourcePublications: f.product.resourcePublications,
          },
        },
      };
    if (query.includes('ToughCaseProductReadback')) {
      const metadata = {...f.product};
      delete metadata.variants;
      return {data: {product: metadata}};
    }
    if (query.includes('ToughCaseVariants')) {
      const start = variables.after === null ? 0 : Number(variables.after);
      const stop = Math.min(start + 250, f.product.variants.length);
      return {
        data: {
          product: {
            id: f.product.id,
            variants: page(
              f.product.variants.slice(start, stop),
              stop < f.product.variants.length ? String(stop) : null,
            ),
          },
        },
      };
    }
    if (query.includes('ToughCaseVariantMedia'))
      return {
        data: {
          nodes: variables.ids.map((id) => ({
            id,
            media: f.product.variants.find((v) => v.id === id).media,
          })),
        },
      };
    if (query.includes('ToughCaseInventory'))
      return {
        data: {
          nodes: variables.ids.map(
            (id) =>
              f.product.variants.find((v) => v.inventoryItem.id === id)
                .inventoryItem,
          ),
        },
      };
    if (query.includes('ToughCaseOperation'))
      return {
        data: {
          productOperation: {
            id: variables.id,
            status: 'COMPLETE',
            userErrors: [],
            product: {
              id: f.product.id,
              handle: f.product.handle,
              status: 'DRAFT',
            },
          },
        },
      };
    if (query.includes('StageArtToughCase'))
      return {
        data: {
          productSet: {
            userErrors: [],
            productSetOperation: {
              id: 'gid://shopify/ProductSetOperation/123',
              status: 'CREATED',
              userErrors: [],
              product: null,
            },
          },
        },
      };
    throw new Error('Unexpected mocked query');
  };
  return {admin, calls};
}

test('manifest requires the approved identity, 24 unique designs and evidenced model templates', () => {
  const {manifest} = fixture();
  assert.equal(validateManifest(manifest).variantCount, 264);
  for (const mutate of [
    (m) => {
      m.handle = 'phone-case';
    },
    (m) => {
      m.designs.pop();
    },
    (m) => {
      m.designs[23].mediaId = m.designs[0].mediaId;
    },
    (m) => {
      m.phones[0].providerSku = 'INFERRED-SKU';
    },
    (m) => {
      m.phones[0].templateUrl = 'https://unknown.example/template.png';
    },
  ]) {
    const invalid = structuredClone(manifest);
    mutate(invalid);
    assert.throws(() => validateManifest(invalid));
  }
});

test('wrong currency and insufficient store variant limit fail closed', () => {
  const {manifest, shop} = fixture();
  assert.doesNotThrow(() => assertShop(shop, manifest));
  assert.throws(
    () => assertShop({...shop, currencyCode: 'USD'}, manifest),
    /EUR/,
  );
  assert.throws(
    () => assertShop({...shop, name: 'Another Shop'}, manifest),
    /Clara Mendes/,
  );
  assert.throws(
    () =>
      assertShop(
        {...shop, resourceLimits: {maxProductVariants: 250}},
        manifest,
      ),
    /limit/i,
  );
});

test('source validation uses exact live title, handle, state, featured media and source SKU', () => {
  const {manifest, sources} = fixture();
  assert.doesNotThrow(() => assertSources(manifest, sources));
  for (const mutate of [
    (s) => {
      s[3].title = 'Wrong print';
    },
    (s) => {
      s[3].handle = 'another-art-print';
    },
    (s) => {
      s[3].status = 'DRAFT';
    },
    (s) => {
      s[3].productType = 'Canvas Art';
    },
    (s) => {
      s[3].featuredMedia.id = sources[2].featuredMedia.id;
    },
    (s) => {
      s[3].featuredMedia.status = 'PROCESSING';
    },
    (s) => {
      s[3].variants.nodes[0].sku = 'CM-WRONG-8X10';
    },
    (s) => {
      s[3].variants.pageInfo.hasNextPage = true;
    },
  ]) {
    const invalid = structuredClone(sources);
    mutate(invalid);
    assert.throws(
      () => assertSources(manifest, invalid),
      /source|print|media|SKU|pagination/i,
    );
  }
});

test('an ACTIVE existing target is rejected before any mutation', async () => {
  const f = fixture();
  f.product.status = 'ACTIVE';
  const {admin, calls} = mockAdmin(f);
  await assert.rejects(
    () => stageProduct({admin, manifest: f.manifest, apply: true}),
    /ACTIVE/,
  );
  assert.equal(
    calls.some((c) => c.query.includes('mutation')),
    false,
  );
});

test('fresh source mismatch blocks even a new target before mutation', async () => {
  const f = fixture();
  f.target = null;
  f.sources[23].featuredMedia.id = 'gid://shopify/MediaImage/999';
  const {admin, calls} = mockAdmin(f);
  await assert.rejects(() => preflight(admin, f.manifest), /media/i);
  assert.equal(
    calls.some((c) => c.query.includes('mutation')),
    false,
  );
});

test('a repeated run preserves every existing variant ID by the full two-option tuple', () => {
  const {manifest, product} = fixture();
  product.variants.reverse();
  assert.doesNotThrow(() => assertTargetSafe(manifest, product));
  const input = buildProductInput(manifest, product);
  assert.equal(input.variants.length, 264);
  assert.equal(input.variants[0].id, 'gid://shopify/ProductVariant/1000');
  assert.equal(input.variants[11].id, 'gid://shopify/ProductVariant/1011');
  assert.deepEqual(input.files[0], {id: manifest.designs[0].mediaId});
  assert.deepEqual(input.variants[0].file, {id: manifest.designs[0].mediaId});
  assert.deepEqual(input.variants[0].inventoryItem, {
    tracked: true,
    requiresShipping: true,
  });
  assert.equal(input.status, 'DRAFT');
  assert.equal(
    input.variants.every(
      (v) => v.price === '39.99' && v.inventoryPolicy === 'DENY' && v.taxable,
    ),
    true,
  );
  assert.equal(
    input.metafields.every((m) => m.type === 'boolean' && m.value === 'false'),
    true,
  );
});

test('duplicate combinations and unexpected models are rejected rather than silently deleted on rerun', () => {
  const {manifest, product} = fixture();
  product.variants[263].selectedOptions = product.variants[0].selectedOptions;
  assert.throws(() => assertTargetSafe(manifest, product), /duplicate/i);
  product.variants[263].selectedOptions = [
    {name: 'Artwork', value: 'Artwork 24'},
    {name: 'Phone Model', value: 'Unsupported Model'},
  ];
  assert.throws(
    () => assertTargetSafe(manifest, product),
    /unexpected|unknown/i,
  );
});

test('variant pagination reads beyond the first 250 and finds a defect on the final page', async () => {
  const f = fixture();
  f.product.variants[263].price = '29.99';
  const {admin, calls} = mockAdmin(f);
  const readback = await readTargetProduct(admin, f.product.id);
  assert.equal(readback.variants.length, 264);
  assert.deepEqual(
    calls
      .filter((c) => c.query.includes('ToughCaseVariants'))
      .map((c) => c.variables.after),
    [null, '250'],
  );
  assert.throws(() => verifyProduct(f.manifest, f.shop, readback), /price/i);
});

test('readback catches duplicate option combinations on a later page', async () => {
  const f = fixture();
  f.product.variants[263].selectedOptions =
    f.product.variants[0].selectedOptions;
  const {admin} = mockAdmin(f);
  const product = await readTargetProduct(admin, f.product.id);
  assert.throws(() => verifyProduct(f.manifest, f.shop, product), /duplicate/i);
});

test('readback rejects a crossed image association, untracked stock, nonzero location quantity or publication', () => {
  const {manifest, shop, product} = fixture();
  assert.equal(verifyProduct(manifest, shop, product).passed, true);
  for (const mutate of [
    (p) => {
      p.variants[263].media.nodes[0].id = p.media.nodes[0].id;
    },
    (p) => {
      p.variants[263].inventoryItem.tracked = false;
    },
    (p) => {
      p.variants[263].inventoryQuantity = 1;
    },
    (p) => {
      p.variants[263].inventoryItem.inventoryLevels.nodes.push({
        id: 'level',
        quantities: [
          {name: 'available', quantity: 0},
          {name: 'on_hand', quantity: 1},
        ],
      });
    },
    (p) => {
      p.resourcePublications.nodes.push({isPublished: true});
    },
    (p) => {
      p.fulfillmentVerified.value = 'true';
    },
    (p) => {
      p.media.nodes[23].status = 'PROCESSING';
    },
  ]) {
    const invalid = structuredClone(product);
    mutate(invalid);
    assert.throws(() => verifyProduct(manifest, shop, invalid));
  }
});

test('default stage is a dry run that makes no mutation', async () => {
  const f = fixture();
  f.target = null;
  const {admin, calls} = mockAdmin(f);
  const result = await stageProduct({admin, manifest: f.manifest});
  assert.equal(result.mode, 'dry-run');
  assert.equal(result.plan.variantCount, 264);
  assert.equal(
    calls.some((c) => c.query.includes('mutation')),
    false,
  );
});

test('async apply writes recovery evidence before submitting and retains the operation ID', async () => {
  const f = fixture();
  const {admin, calls} = mockAdmin(f);
  const states = [];
  const result = await stageProduct({
    admin,
    manifest: f.manifest,
    apply: true,
    onState: async (state) => {
      states.push(structuredClone(state));
    },
    sleep: async () => {},
  });
  assert.equal(result.verification.passed, true);
  assert.equal(states[0].phase, 'submission-uncertain');
  assert.equal(states[1].operationId, 'gid://shopify/ProductSetOperation/123');
  const mutation = calls.find((c) => c.query.includes('StageArtToughCase'));
  assert.match(mutation.query, /synchronous: false/);
  assert.deepEqual(mutation.variables.identifier, {id: f.product.id});
});

test('an unresolved previous submission blocks automatic reapplication', async () => {
  const f = fixture();
  const {admin, calls} = mockAdmin(f);
  await assert.rejects(
    () =>
      stageProduct({
        admin,
        manifest: f.manifest,
        apply: true,
        previousState: {
          phase: 'submission-uncertain',
          handle: f.manifest.handle,
        },
      }),
    /uncertain|resume|recover/i,
  );
  assert.equal(
    calls.some((c) => c.query.includes('mutation')),
    false,
  );
});

test('operation timeout is bounded and reports the operation ID for recovery', async () => {
  let attempts = 0;
  const id = 'gid://shopify/ProductSetOperation/123';
  const admin = async () => {
    attempts++;
    return {data: {productOperation: {id, status: 'ACTIVE', userErrors: []}}};
  };
  await assert.rejects(
    () => waitForOperation(admin, id, {maxPolls: 3, sleep: async () => {}}),
    /ProductSetOperation\/123.*resume|resume.*ProductSetOperation\/123/i,
  );
  assert.equal(attempts, 3);
});

test('late async userErrors are read without repeating a mutation', async () => {
  const id = 'gid://shopify/ProductSetOperation/123';
  const admin = async () => ({
    data: {
      productOperation: {
        id,
        status: 'COMPLETE',
        product: null,
        userErrors: [{field: ['variants', '263'], message: 'Invalid file'}],
      },
    },
  });
  await assert.rejects(
    () => waitForOperation(admin, id, {sleep: async () => {}}),
    /variants\.263.*Invalid file/,
  );
});

test('handoff has every variant ID and leaves unknown provider SKUs empty and mapping pending', () => {
  const {manifest, product} = fixture();
  const csv = makeHandoffCsv(manifest, product);
  const lines = csv.trim().split('\n');
  assert.equal(lines.length, 265);
  assert.match(
    lines[0],
    /shopify_variant_id.*merchant_sku.*art_source_url.*template_url.*provider_sku.*mapping_status/,
  );
  assert.match(lines[1], /ProductVariant\/1000.*CM-ART-1-TC-IP10.*,,pending$/);
  assert.match(lines[264], /ProductVariant\/1263/);
});

test('CLI defaults to read-only and rejects relative env paths and contradictory modes', () => {
  assert.equal(parseArgs([]).apply, false);
  assert.equal(parseArgs(['--verify-only']).verifyOnly, true);
  assert.throws(() => parseArgs(['--env-dir', 'relative/path']), /absolute/);
  assert.throws(() => parseArgs(['--apply', '--verify-only']), /mode|combine/);
  assert.throws(() => parseArgs(['--unknown']), /Unknown/);
});

test('publication scope denial is isolated and never reported as verified zero channels', async () => {
  const f = fixture();
  const {admin: base, calls} = mockAdmin(f);
  const admin = async (query, variables) => {
    if (query.includes('ToughCasePublications'))
      throw new Error(
        'Access denied for resourcePublications field. Required access: read_publications',
      );
    return base(query, variables);
  };
  const result = await stageProduct({
    admin,
    manifest: f.manifest,
    verifyOnly: true,
  });
  assert.equal(result.verification.passed, true);
  assert.equal(
    result.verification.publicationVerification,
    'unavailable_missing_read_publications',
  );
  assert.equal(result.verification.publishedChannelCount, null);
  assert.equal(result.verification.checks.includes('no_publications'), false);
  assert.equal(
    calls.some((c) => c.query.includes('mutation')),
    false,
  );
});

test('other publication query failures are not hidden as scope denial', async () => {
  const f = fixture();
  const {admin: base} = mockAdmin(f);
  const admin = async (query, variables) => {
    if (query.includes('ToughCasePublications'))
      throw new Error('Network failure');
    return base(query, variables);
  };
  await assert.rejects(
    () => readTargetProduct(admin, f.product.id),
    /Network failure/,
  );
});

test('local release guard excludes an unreleased print even if another API says ACTIVE', () => {
  const {manifest} = fixture();
  const originals = manifest.designs.map((d) => ({
    handle: d.sourceHandle,
    shortTitle: d.title,
    title: d.sourceTitle,
    skuPrefix: d.skuPrefix,
  }));
  const catalog = {
    collections: [
      {
        skuCode: 'NEW',
        prints: [
          {
            slug: 'unreleased',
            title: 'Unreleased',
            sequence: 1,
            released: false,
          },
        ],
      },
    ],
  };
  assert.doesNotThrow(() =>
    assertReleasedSources(manifest, originals, catalog),
  );
  manifest.designs[23].sourceHandle = 'unreleased-art-print';
  assert.throws(
    () => assertReleasedSources(manifest, originals, catalog),
    /locally released/,
  );
});

test('mutation transport failure preserves uncertain journal and never retries', async () => {
  const f = fixture();
  const {admin: base} = mockAdmin(f);
  const states = [];
  let submitted = 0;
  const admin = async (query, variables) => {
    if (query.includes('StageArtToughCase')) {
      submitted++;
      throw new Error('Connection interrupted');
    }
    return base(query, variables);
  };
  await assert.rejects(
    () =>
      stageProduct({
        admin,
        manifest: f.manifest,
        apply: true,
        onState: async (state) => {
          states.push(state);
        },
      }),
    /Connection interrupted/,
  );
  assert.equal(submitted, 1);
  assert.equal(states.at(-1).phase, 'submission-uncertain');
});

test('explicit operation recovery reads the completed product without submitting again', async () => {
  const f = fixture();
  const {admin, calls} = mockAdmin(f);
  const result = await stageProduct({
    admin,
    manifest: f.manifest,
    resumeOperation: 'gid://shopify/ProductSetOperation/123',
    sleep: async () => {},
  });
  assert.equal(result.mode, 'resumed');
  assert.equal(result.verification.passed, true);
  assert.equal(
    calls.some((c) => c.query.includes('mutation')),
    false,
  );
});

test('source query reads all 12 live original-print variants before certifying SKU identity', async () => {
  const f = fixture();
  const source = f.sources[0];
  source.variants = page(
    Array.from({length: 12}, (_, i) => ({
      sku: `${f.manifest.designs[0].skuPrefix}-SIZE-${i + 1}`,
    })),
  );
  const {admin: base} = mockAdmin(f);
  const admin = async (query, variables) => {
    if (query.includes('ToughCasePreflight')) {
      const first = Number(query.match(/variants\(first:\s*(\d+)\)/)[1]);
      return {
        data: {
          shop: f.shop,
          nodes: f.sources.map((p) => ({
            ...p,
            variants: page(
              p.variants.nodes.slice(0, first),
              p.variants.nodes.length > first ? 'more' : null,
            ),
          })),
        },
      };
    }
    return base(query, variables);
  };
  assert.equal(
    (await preflight(admin, f.manifest)).sources[0].variants.nodes.length,
    12,
  );
});

test('handoff distinguishes artwork previews from missing production files and case mockups', () => {
  const {manifest, product} = fixture();
  const lines = makeHandoffCsv(manifest, product).trim().split('\n');
  const columns = lines[0].split(',');
  const first = lines[1].split(',');
  assert.equal(first[columns.indexOf('production_file')], '');
  assert.equal(first[columns.indexOf('crop_review_status')], 'pending');
  assert.equal(first[columns.indexOf('mockup_status')], 'pending');
  assert.equal(first[columns.indexOf('provider_sku')], '');
});
