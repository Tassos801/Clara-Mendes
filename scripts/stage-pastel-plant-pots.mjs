#!/usr/bin/env node
/* eslint-disable no-console */
import {mkdir, readFile, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {mutationErrors, resolveAdminClient} from './lib/admin.mjs';
import {loadLocalEnv} from './lib/env.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const catalog = JSON.parse(
  await readFile(path.join(root, 'data/pastel-plant-pots.json'), 'utf8'),
);
const READ = `query PotReadback($handle: String!) {
  productByIdentifier(identifier: {handle: $handle}) {
    id handle title status tags
    storefrontApproved: metafield(namespace: "custom", key: "storefront_approved") { value }
    fulfillmentVerified: metafield(namespace: "custom", key: "fulfillment_verified") { value }
    media(first: 10) { nodes { id alt status ... on MediaImage { image { url width height } } } }
    variants(first: 10) { nodes { id sku price inventoryPolicy inventoryQuantity inventoryItem { tracked requiresShipping } } }
  }
}`;

export function potInput(design, files) {
  return {
    handle: design.handle,
    title: `${design.title} Ceramic Plant Pot`,
    status: 'DRAFT',
    vendor: 'Clara Mendes',
    productType: catalog.productType,
    descriptionHtml: [
      `<p>${design.story} An original design from the Pastel Forms series.</p>`,
      '<ul><li>Glossy white ceramic with a pastel exterior print</li><li>90 mm diameter x 102 mm high</li><li>Drainage hole; suitable for indoor or outdoor use</li><li>One pot; plant and saucer not included</li></ul>',
      '<p>Images are design mockups, not photographs of a physical sample. Final printed colours may vary.</p>',
    ].join('\n'),
    seo: {
      title: `${design.title} Ceramic Plant Pot | Clara Mendes`,
      description: design.story,
    },
    tags: [
      'Clara Mendes Original',
      'Pastel Forms',
      'Plant Pots',
      'Prodigi Mapping Pending',
      'Cost Gate Pending',
      'Sample Gate Pending',
      'Provisional Price',
    ],
    metafields: [
      {
        namespace: 'custom',
        key: 'storefront_approved',
        type: 'boolean',
        value: 'false',
      },
      {
        namespace: 'custom',
        key: 'fulfillment_verified',
        type: 'boolean',
        value: 'false',
      },
    ],
    files,
    productOptions: [
      {name: 'Size', position: 1, values: [{name: '90 x 102 mm'}]},
    ],
    variants: [
      {
        sku: design.sku,
        price: catalog.provisionalPrice,
        taxable: true,
        inventoryPolicy: 'DENY',
        inventoryItem: {tracked: true, requiresShipping: true},
        optionValues: [{optionName: 'Size', name: '90 x 102 mm'}],
        file: files[0],
        metafields: [
          {
            namespace: 'custom',
            key: 'prodigi_candidate_sku',
            type: 'single_line_text_field',
            value: catalog.providerSku,
          },
        ],
      },
    ],
  };
}

export function verifyPot(design, product) {
  const problems = [];
  if (product?.handle !== design.handle || product?.status !== 'DRAFT')
    problems.push('not the expected Draft');
  if (
    product?.storefrontApproved?.value !== 'false' ||
    product?.fulfillmentVerified?.value !== 'false'
  )
    problems.push('approval fields must remain false');
  const variants = product?.variants.nodes ?? [];
  if (variants.length !== 1) problems.push('expected one size variant');
  const v = variants[0];
  if (v?.sku !== design.sku || v?.price !== catalog.provisionalPrice)
    problems.push('SKU or provisional price mismatch');
  if (
    !v?.inventoryItem.tracked ||
    !v.inventoryItem.requiresShipping ||
    v.inventoryPolicy !== 'DENY' ||
    v.inventoryQuantity !== 0
  )
    problems.push('inventory must be tracked, zero, DENY, shippable');
  const media = product?.media.nodes ?? [];
  if (media.length !== 2 || media.some((m) => m.status !== 'READY'))
    problems.push('two READY images required');
  const art = media.find(
    (m) => m.alt === `${design.title} production artwork, 300 dpi`,
  );
  if (
    art?.image?.width !== catalog.print.width ||
    art?.image?.height !== catalog.print.height
  )
    problems.push('print geometry mismatch');
  if (problems.length)
    throw new Error(`${design.handle}: ${problems.join('; ')}`);
  return product;
}

async function upload(admin, file, alt) {
  const size = (await stat(file)).size;
  const body = await admin(
    `mutation StagePotImage($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) { stagedTargets { url resourceUrl parameters { name value } } userErrors { field message } }
  }`,
    {
      input: [
        {
          filename: path.basename(file),
          mimeType: 'image/jpeg',
          resource: 'PRODUCT_IMAGE',
          httpMethod: 'POST',
          fileSize: String(size),
        },
      ],
    },
  );
  mutationErrors(body.data.stagedUploadsCreate, 'Stage pot image');
  const [target] = body.data.stagedUploadsCreate.stagedTargets;
  const form = new FormData();
  for (const p of target.parameters) form.append(p.name, p.value);
  form.append(
    'file',
    new Blob([await readFile(file)], {type: 'image/jpeg'}),
    path.basename(file),
  );
  const response = await fetch(target.url, {method: 'POST', body: form});
  if (!response.ok) throw new Error(`Upload failed: HTTP ${response.status}`);
  return {
    originalSource: target.resourceUrl,
    contentType: 'IMAGE',
    filename: path.basename(file),
    alt,
  };
}

export async function stagePot(admin, design, apply) {
  const current = (await admin(READ, {handle: design.handle})).data
    .productByIdentifier;
  if (current) {
    // Never re-create or overwrite an existing product, including an owner's Draft edits.
    return verifyPot(design, current);
  }
  if (!apply) return {handle: design.handle, status: 'NOT_STAGED'};
  const files = [
    await upload(
      admin,
      path.join(root, 'assets/plant-pots/mockups', `${design.id}.jpg`),
      `${design.title} ceramic plant pot design mockup`,
    ),
    await upload(
      admin,
      path.join(root, 'assets/plant-pots/artwork', `${design.id}-300dpi.jpg`),
      `${design.title} production artwork, 300 dpi`,
    ),
  ];
  const body = await admin(
    `mutation CreatePotDraft($input: ProductSetInput!) {
    productSet(input: $input, synchronous: true) { product { id } userErrors { field message } }
  }`,
    {input: potInput(design, files)},
  );
  mutationErrors(body.data.productSet, 'Create pot Draft');
  for (let i = 0; i < 45; i++) {
    const product = (await admin(READ, {handle: design.handle})).data
      .productByIdentifier;
    if (product?.media.nodes.some((m) => m.status === 'FAILED'))
      throw new Error(`${design.handle}: image processing failed`);
    if (
      product?.media.nodes.length === 2 &&
      product.media.nodes.every((m) => m.status === 'READY')
    )
      return verifyPot(design, product);
    await delay(2000);
  }
  throw new Error(
    `${design.handle}: media processing timed out; re-run dry verification`,
  );
}

export async function main() {
  const {values} = parseArgs({
    options: {
      'env-dir': {type: 'string'},
      apply: {type: 'boolean', default: false},
    },
  });
  const dir = values['env-dir'] ?? root;
  const env = {
    ...loadLocalEnv('.env', dir),
    ...loadLocalEnv('.env.shopify-admin.local', dir),
    ...process.env,
  };
  const admin = await resolveAdminClient(env, {
    requiredScope: 'write_products',
  });
  const shop = (await admin('query { shop {name currencyCode} }')).data.shop;
  if (shop.name !== 'Clara Mendes' || shop.currencyCode !== catalog.currency)
    throw new Error('Wrong shop or currency');
  const products = [];
  for (const design of catalog.designs) {
    const product = await stagePot(admin, design, values.apply);
    products.push(product);
    console.log(
      `${product.handle}: ${product.status}${product.id ? ` ${product.id}` : ''}`,
    );
  }
  if (products.every((p) => p.id)) {
    const report = {
      checkedAt: new Date().toISOString(),
      shop,
      purchaseEnabled: false,
      publicationReadback:
        'Unavailable: installed app lacks read_publications; no publication mutation performed',
      providerMappingVerified: false,
      products: products.map((p) => ({
        id: p.id,
        handle: p.handle,
        status: p.status,
        variantId: p.variants.nodes[0].id,
        sku: p.variants.nodes[0].sku,
        mockupUrl: p.media.nodes.find((m) => m.alt.endsWith('design mockup'))
          ?.image.url,
        productionArtworkUrl: p.media.nodes.find((m) =>
          m.alt.endsWith('300 dpi'),
        )?.image.url,
      })),
    };
    const output = path.join(root, 'output/launches/pastel-plant-pots');
    await mkdir(output, {recursive: true});
    await writeFile(
      path.join(output, 'shopify-readback.json'),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    const rows = [
      'design,shopify_variant_id,shopify_sku,prodigi_candidate_sku,production_artwork_url,mapping_status',
      ...report.products.map(
        (p) =>
          `${p.handle},${p.variantId},${p.sku},PLANT-POT,${p.productionArtworkUrl},UNVERIFIED`,
      ),
    ];
    await writeFile(
      path.join(output, 'prodigi-handoff.csv'),
      `${rows.join('\n')}\n`,
    );
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
/* eslint-enable no-console */
