// One-off: rename the Draft calendar product to the 2027 edition IN PLACE.
// Surgical by-id mutations so the single variant keeps its id and the
// Prodigi channel mapping (14 attached sides) survives. Run from a repo checkout root (or any dir whose .env files carry admin credentials):
//   node scripts/rename-calendar-2027.mjs [--apply]
import {resolveAdminClient} from './lib/admin.mjs';
import {envWithAdminDefaults} from './lib/env.mjs';

const APPLY = process.argv.includes('--apply');
const OLD_HANDLE = 'clara-mendes-art-calendar-2026';
const NEW_HANDLE = 'clara-mendes-art-calendar-2027';
const NEW_TITLE = 'Clara Mendes Art Calendar 2027';
const NEW_SKU = 'CM-CAL-A4-2027';
const NEW_DESCRIPTION = [
  '<p>A year of original Clara Mendes artwork, bringing all five art capsules together in one considered calendar.</p>',
  '<ul>',
  '<li>300gsm silk-coated paper with Wire-O binding</li>',
  '<li>A4 landscape calendar with 12 original artworks</li>',
  '<li>Printed to order and fulfilled in white-label packaging</li>',
  '</ul>',
  '<p>Colours can vary slightly between screens, materials, and the finished print.</p>',
].join('');

const QUERY = `#graphql
  query CalendarProduct($handle: String!) {
    productByHandle(handle: $handle) {
      id
      title
      handle
      status
      options { id name optionValues { id name } }
      variants(first: 5) { nodes { id sku title } }
    }
  }
`;

const PRODUCT_UPDATE = `#graphql
  mutation RenameCalendar($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product { id title handle }
      userErrors { field message }
    }
  }
`;

const OPTION_UPDATE = `#graphql
  mutation RenameEditionValue($productId: ID!, $option: OptionUpdateInput!, $optionValuesToUpdate: [OptionValueUpdateInput!]) {
    productOptionUpdate(productId: $productId, option: $option, optionValuesToUpdate: $optionValuesToUpdate) {
      product { id options { name optionValues { id name } } }
      userErrors { field message }
    }
  }
`;

const VARIANTS_UPDATE = `#graphql
  mutation RenameCalendarSku($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants { id sku title }
      userErrors { field message }
    }
  }
`;

const adminGraphql = await resolveAdminClient(envWithAdminDefaults());
const found = await adminGraphql(QUERY, {handle: OLD_HANDLE});
const product = found.data?.productByHandle;
if (!product) {
  const already = await adminGraphql(QUERY, {handle: NEW_HANDLE});
  if (already.data?.productByHandle) {
    console.log('Already renamed:', JSON.stringify(already.data.productByHandle, null, 2));
    process.exit(0);
  }
  throw new Error(`No product at handle ${OLD_HANDLE} (or ${NEW_HANDLE}).`);
}
console.log('Current:', JSON.stringify(product, null, 2));
if (product.status !== 'DRAFT') {
  throw new Error(`Refusing: product status is ${product.status}, expected DRAFT.`);
}
const edition = product.options.find((option) => option.name === 'Edition');
const value2026 = edition?.optionValues.find((value) => value.name === '2026');
const variant = product.variants.nodes[0];
if (!edition || !value2026 || product.variants.nodes.length !== 1) {
  throw new Error('Unexpected option/variant shape; aborting.');
}

if (!APPLY) {
  console.log('\nDry run. Would apply:');
  console.log(`  title  -> ${NEW_TITLE}`);
  console.log(`  handle -> ${NEW_HANDLE}`);
  console.log(`  Edition value ${value2026.id} '2026' -> '2027' (variant ${variant.id} preserved)`);
  console.log(`  variant sku ${variant.sku} -> ${NEW_SKU}`);
  process.exit(0);
}

const renamed = await adminGraphql(PRODUCT_UPDATE, {
  product: {
    descriptionHtml: NEW_DESCRIPTION,
    handle: NEW_HANDLE,
    id: product.id,
    title: NEW_TITLE,
  },
});
const renameErrors = renamed.data?.productUpdate?.userErrors ?? [];
if (renameErrors.length) throw new Error(JSON.stringify(renameErrors));
console.log('productUpdate ok:', JSON.stringify(renamed.data.productUpdate.product));

const optioned = await adminGraphql(OPTION_UPDATE, {
  option: {id: edition.id},
  optionValuesToUpdate: [{id: value2026.id, name: '2027'}],
  productId: product.id,
});
const optionErrors = optioned.data?.productOptionUpdate?.userErrors ?? [];
if (optionErrors.length) throw new Error(JSON.stringify(optionErrors));
console.log('productOptionUpdate ok:', JSON.stringify(optioned.data.productOptionUpdate.product.options));

const skued = await adminGraphql(VARIANTS_UPDATE, {
  productId: product.id,
  variants: [{id: variant.id, sku: NEW_SKU}],
});
const skuErrors = skued.data?.productVariantsBulkUpdate?.userErrors ?? [];
if (skuErrors.length) throw new Error(JSON.stringify(skuErrors));
console.log('variant sku ok:', JSON.stringify(skued.data.productVariantsBulkUpdate.productVariants));

const after = await adminGraphql(QUERY, {handle: NEW_HANDLE});
console.log('\nFinal:', JSON.stringify(after.data?.productByHandle, null, 2));
