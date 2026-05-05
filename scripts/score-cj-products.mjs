/* eslint-disable no-console */
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repoRoot, 'data/cj-products/launch-batch.json');
const outputJsonPath = path.join(
  repoRoot,
  'data/cj-products/product-score-report.json',
);
const outputCsvPath = path.join(
  repoRoot,
  'data/cj-products/product-score-report.csv',
);

const CSV_HEADERS = [
  'Rank',
  'Decision',
  'Score',
  'Product',
  'Handle',
  'Source SKU',
  'Source Cost Range',
  'Retail Range',
  'Gross Margin Range',
  'Weight Range',
  'Variant Count',
  'Warnings',
  'Blockers',
];

function csvEscape(value) {
  if (value === undefined || value === null) return '';
  const str = Array.isArray(value) ? value.join('; ') : String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
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

function variantsFor(product) {
  return cartesian(product.options).map((optionValues) => ({
    options: optionValues,
    ...defaultsFor(product, optionValues),
  }));
}

function range(values, formatter = (value) => value) {
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) return formatter(min);
  return `${formatter(min)}-${formatter(max)}`;
}

function money(value) {
  return `$${Number(value).toFixed(2)}`;
}

function percent(value) {
  return `${Number(value).toFixed(1)}%`;
}

function marginScore(minMargin) {
  if (minMargin >= 85) return 25;
  if (minMargin >= 80) return 22;
  if (minMargin >= 75) return 19;
  if (minMargin >= 70) return 16;
  if (minMargin >= 60) return 10;
  return 0;
}

function shippingScore(maxGrams) {
  if (maxGrams <= 250) return 20;
  if (maxGrams <= 500) return 17;
  if (maxGrams <= 900) return 14;
  if (maxGrams <= 1400) return 9;
  if (maxGrams <= 2000) return 5;
  return 0;
}

function brandFitScore(product) {
  const text = [
    product.collection,
    product.type,
    ...(product.tags ?? []),
    product.title,
    product.sourceTitle,
  ]
    .join(' ')
    .toLowerCase();
  const strongFitTerms = [
    'textile',
    'table',
    'storage',
    'accent',
    'bath',
    'cushion',
    'pillow',
    'throw',
    'blanket',
    'runner',
    'tray',
    'linen',
    'cotton',
  ];
  const riskTerms = [
    'electronics',
    'battery',
    'lamp',
    'plug',
    'ceramic',
    'glass',
    'fragile',
  ];
  const fitHits = strongFitTerms.filter((term) => text.includes(term)).length;
  const riskHits = riskTerms.filter((term) => text.includes(term)).length;

  return Math.max(0, Math.min(20, 12 + fitHits * 2 - riskHits * 5));
}

function returnRiskScore(product, maxGrams) {
  const text = [product.collection, product.type, product.title, product.sourceTitle]
    .join(' ')
    .toLowerCase();
  let score = 15;

  if (/(ceramic|glass|vase|planter)/.test(text)) score -= 8;
  if (/(electronics|battery|lamp|plug|cosmetic|supplement|baby)/.test(text)) {
    score -= 15;
  }
  if (/(wood|tray|basket)/.test(text)) score -= 3;
  if (maxGrams > 900) score -= 3;
  if (maxGrams > 1400) score -= 3;

  return Math.max(0, score);
}

function imageScore(product) {
  const imageCount = product.imageUrls?.length ?? 0;

  if (imageCount >= 3) return 10;
  if (imageCount >= 1) return 7;
  return 5;
}

function variantScore(variantCount) {
  if (variantCount <= 6) return 5;
  if (variantCount <= 12) return 4;
  if (variantCount <= 20) return 2;
  return 1;
}

function bundleScore(product) {
  const text = [product.collection, product.type, ...(product.tags ?? [])]
    .join(' ')
    .toLowerCase();

  if (/(table|cushion|pillow|throw|blanket|tray|storage|bath)/.test(text)) {
    return 5;
  }

  return 3;
}

function evaluateProduct(product) {
  const variants = variantsFor(product);
  const costs = variants.map((variant) => Number(variant.cost));
  const prices = variants.map((variant) => Number(variant.price));
  const grams = variants.map((variant) => Number(variant.grams));
  const margins = variants.map(
    (variant) =>
      ((Number(variant.price) - Number(variant.cost)) / Number(variant.price)) *
      100,
  );
  const minMargin = Math.min(...margins);
  const maxGrams = Math.max(...grams);
  const warnings = [];
  const blockers = [];
  const scores = {
    margin: marginScore(minMargin),
    shipping: shippingScore(maxGrams),
    brandFit: brandFitScore(product),
    returnRisk: returnRiskScore(product, maxGrams),
    images: imageScore(product),
    variants: variantScore(variants.length),
    bundle: bundleScore(product),
  };
  const score = Object.values(scores).reduce((sum, value) => sum + value, 0);

  if (minMargin < 70) blockers.push('gross_margin_below_70_percent');
  if (!product.sourceSku) blockers.push('missing_source_sku');
  if (!product.cjUrl) blockers.push('missing_source_url');
  if (maxGrams > 900) warnings.push('shipping_cost_check_required');
  if ((product.imageUrls?.length ?? 0) < 3) warnings.push('needs_image_review');
  if (variants.length > 12) warnings.push('variant_count_review');

  const decision =
    blockers.length > 0
      ? 'reject'
      : score >= 75
        ? 'approved'
        : score >= 65
          ? 'sample-first'
          : 'reject';

  return {
    decision,
    score,
    scores,
    priority: product.priority,
    handle: product.handle,
    title: product.title,
    sourceTitle: product.sourceTitle,
    sourceSku: product.sourceSku,
    cjUrl: product.cjUrl,
    collection: product.collection,
    variantCount: variants.length,
    sourceCostRange: range(costs, money),
    retailRange: range(prices, money),
    grossMarginRange: range(margins, percent),
    weightRange: range(grams, (value) => `${value} g`),
    warnings,
    blockers,
  };
}

async function main() {
  const batch = JSON.parse(await readFile(sourcePath, 'utf8'));
  const products = batch.products
    .map(evaluateProduct)
    .sort((a, b) => b.score - a.score || a.priority - b.priority)
    .map((product, index) => ({
      rank: index + 1,
      ...product,
    }));
  const summary = {
    generatedAt: new Date().toISOString(),
    batchName: batch.batchName,
    productCount: products.length,
    approvedCount: products.filter((product) => product.decision === 'approved')
      .length,
    sampleFirstCount: products.filter(
      (product) => product.decision === 'sample-first',
    ).length,
    rejectCount: products.filter((product) => product.decision === 'reject')
      .length,
    averageScore:
      products.reduce((sum, product) => sum + product.score, 0) /
      Math.max(products.length, 1),
  };
  const report = {
    ...summary,
    products,
  };
  const csv = [
    CSV_HEADERS.join(','),
    ...products.map((product) =>
      [
        product.rank,
        product.decision,
        product.score,
        product.title,
        product.handle,
        product.sourceSku,
        product.sourceCostRange,
        product.retailRange,
        product.grossMarginRange,
        product.weightRange,
        product.variantCount,
        product.warnings,
        product.blockers,
      ]
        .map(csvEscape)
        .join(','),
    ),
  ].join('\n');

  await mkdir(path.dirname(outputJsonPath), {recursive: true});
  await writeFile(outputJsonPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  await writeFile(outputCsvPath, `${csv}\n`, 'utf8');

  console.log(
    `Scored ${summary.productCount} products: ${summary.approvedCount} approved, ${summary.sampleFirstCount} sample-first, ${summary.rejectCount} rejected.`,
  );
  console.log(`Average score: ${summary.averageScore.toFixed(1)}/100`);
  console.log(`JSON: ${outputJsonPath}`);
  console.log(`CSV: ${outputCsvPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

/* eslint-enable no-console */
