/* eslint-disable no-console */
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repoRoot, 'data/cj-products/launch-batch.json');
const outputPath = path.join(
  repoRoot,
  'data/cj-products/shopify-import-clara-cj-launch-2026-04-26.csv',
);

const HEADERS = [
  'Handle',
  'Title',
  'Body (HTML)',
  'Vendor',
  'Product Category',
  'Type',
  'Tags',
  'Published',
  'Option1 Name',
  'Option1 Value',
  'Option2 Name',
  'Option2 Value',
  'Option3 Name',
  'Option3 Value',
  'Variant SKU',
  'Variant Grams',
  'Variant Inventory Tracker',
  'Variant Inventory Qty',
  'Variant Inventory Policy',
  'Variant Fulfillment Service',
  'Variant Price',
  'Variant Compare At Price',
  'Variant Requires Shipping',
  'Variant Taxable',
  'Variant Barcode',
  'Image Src',
  'Image Position',
  'Image Alt Text',
  'Gift Card',
  'SEO Title',
  'SEO Description',
  'Google Shopping / Google Product Category',
  'Google Shopping / Gender',
  'Google Shopping / Age Group',
  'Google Shopping / MPN',
  'Google Shopping / AdWords Grouping',
  'Google Shopping / AdWords Labels',
  'Google Shopping / Condition',
  'Google Shopping / Custom Product',
  'Google Shopping / Custom Label 0',
  'Google Shopping / Custom Label 1',
  'Google Shopping / Custom Label 2',
  'Google Shopping / Custom Label 3',
  'Google Shopping / Custom Label 4',
  'Variant Image',
  'Variant Weight Unit',
  'Variant Tax Code',
  'Cost per item',
  'Price International',
  'Compare At Price International',
  'Status',
];

function csvEscape(value) {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function slug(value) {
  return String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function cartesian(options) {
  return options.reduce(
    (rows, option) =>
      rows.flatMap((row) =>
        option.values.map((value) => [
          ...row,
          {
            name: option.name,
            value,
          },
        ]),
      ),
    [[]],
  );
}

function defaultsFor(product, optionValues) {
  const bySize = optionValues.find((option) => option.name === 'Size')?.value;
  const byStyle = optionValues.find((option) => option.name === 'Style')?.value;

  if (bySize && product.variantDefaultsBySize?.[bySize]) {
    return product.variantDefaultsBySize[bySize];
  }

  if (byStyle && product.variantDefaultsByStyle?.[byStyle]) {
    return product.variantDefaultsByStyle[byStyle];
  }

  return product.variantDefaults ?? {};
}

function rowFor(product, optionValues, index, batch) {
  const defaults = defaultsFor(product, optionValues);
  const optionMap = new Map(optionValues.map((option) => [option.name, option]));
  const optionList = product.options.map((option) => optionMap.get(option.name));
  const skuParts = [
    'CM',
    product.sourceSku,
    ...optionList.map((option) => slug(option?.value ?? 'Default')),
  ];

  return {
    Handle: product.handle,
    Title: index === 0 ? product.title : '',
    'Body (HTML)': index === 0 ? product.bodyHtml : '',
    Vendor: index === 0 ? product.vendor : '',
    'Product Category': '',
    Type: index === 0 ? product.type : '',
    Tags: index === 0 ? product.tags.join(', ') : '',
    Published: batch.published ? 'TRUE' : 'FALSE',
    'Option1 Name': product.options[0]?.name ?? 'Title',
    'Option1 Value': optionList[0]?.value ?? 'Default Title',
    'Option2 Name': product.options[1]?.name ?? '',
    'Option2 Value': optionList[1]?.value ?? '',
    'Option3 Name': product.options[2]?.name ?? '',
    'Option3 Value': optionList[2]?.value ?? '',
    'Variant SKU': skuParts.join('-'),
    'Variant Grams': defaults.grams ?? '',
    'Variant Inventory Tracker': '',
    'Variant Inventory Qty': '',
    'Variant Inventory Policy': 'continue',
    'Variant Fulfillment Service': 'manual',
    'Variant Price': defaults.price ?? '',
    'Variant Compare At Price': defaults.compareAtPrice ?? '',
    'Variant Requires Shipping': 'TRUE',
    'Variant Taxable': 'TRUE',
    'Variant Barcode': '',
    'Image Src': index === 0 ? product.imageUrls?.[0] ?? '' : '',
    'Image Position': index === 0 ? '1' : '',
    'Image Alt Text': index === 0 ? product.title : '',
    'Gift Card': 'FALSE',
    'SEO Title': index === 0 ? product.seoTitle : '',
    'SEO Description': index === 0 ? product.seoDescription : '',
    'Google Shopping / Google Product Category': '',
    'Google Shopping / Gender': '',
    'Google Shopping / Age Group': '',
    'Google Shopping / MPN': product.sourceSku,
    'Google Shopping / AdWords Grouping': '',
    'Google Shopping / AdWords Labels': '',
    'Google Shopping / Condition': 'new',
    'Google Shopping / Custom Product': 'TRUE',
    'Google Shopping / Custom Label 0': product.collection,
    'Google Shopping / Custom Label 1': 'CJ Dropshipping',
    'Google Shopping / Custom Label 2': 'Launch Batch',
    'Google Shopping / Custom Label 3': '',
    'Google Shopping / Custom Label 4': '',
    'Variant Image': '',
    'Variant Weight Unit': 'g',
    'Variant Tax Code': '',
    'Cost per item': defaults.cost ?? '',
    'Price International': '',
    'Compare At Price International': '',
    Status: batch.status ?? 'draft',
  };
}

async function main() {
  const batch = JSON.parse(await readFile(sourcePath, 'utf8'));
  const rows = batch.products.flatMap((product) =>
    cartesian(product.options).map((optionValues, index) =>
      rowFor(product, optionValues, index, batch),
    ),
  );
  const csv = [
    HEADERS.join(','),
    ...rows.map((row) => HEADERS.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n');

  await mkdir(path.dirname(outputPath), {recursive: true});
  await writeFile(outputPath, `${csv}\n`, 'utf8');
  console.log(`Generated ${rows.length} variants at ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

/* eslint-enable no-console */
