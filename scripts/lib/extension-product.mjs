/**
 * The single source of truth for how a manifest family in
 * `data/art-product-extensions.json` maps to a Shopify product shape:
 * description HTML, SEO fields, media alt text, and the exact variant
 * SKU/option grid. The sync writes with these, the audit verifies against
 * them, and the in-place rename script derives its targets from them, so
 * a manifest edit (a new edition year, a material change) cannot drift
 * between the three.
 */

export const CAPSULE_CODE_BY_NAME = {
  'Quiet Form': 'QF',
  'Patina Blue': 'PB',
  'Neo Deco': 'ND',
  'Midnight Garden': 'MG',
  'Sunlit Mosaic': 'SM',
};

/** Edition label for collection families (the calendar year). */
export function editionOf(family) {
  if (!family.collectionVariant) return null;
  const edition = String(family.edition ?? '').trim();
  if (!edition) {
    throw new Error(
      `${family.handle}: collection families must declare an "edition"`,
    );
  }
  return edition;
}

export function descriptionHtml(family) {
  const intro = family.frameOnly
    ? 'A Natural classic picture frame sized to fit the three Clara Mendes print editions. This product is the frame only; artwork is not included.'
    : family.collectionVariant
      ? 'A year of original Clara Mendes artwork, bringing all five art capsules together in one considered calendar.'
      : `Original Clara Mendes artwork adapted for the ${family.format.toLowerCase()}. Choose the art capsule that suits your space and everyday ritual.`;

  // Newline-joined so Shopify's flattened plain-text `description` keeps a
  // separator between list items (it is what the storefront lede, meta
  // description, and JSON-LD read).
  return [
    `<p>${intro}</p>`,
    '<ul>',
    `<li>${family.material}</li>`,
    `<li>${family.format}</li>`,
    '<li>Printed to order and fulfilled in white-label packaging</li>',
    '</ul>',
    '<p>Colours can vary slightly between screens, materials, and the finished print.</p>',
  ].join('\n');
}

export function seoFor(family) {
  return {
    description: `${family.title} featuring original Clara Mendes artwork. Printed to order.`,
    title: `${family.title} | Clara Mendes`,
  };
}

export function imageAlt(family, capsuleName) {
  if (family.frameOnly) {
    return 'Natural classic frame only; artwork not included';
  }
  if (family.collectionVariant) {
    return `Clara Mendes ${editionOf(family)} art calendar featuring all five original-art capsules`;
  }
  return `${capsuleName} artwork shown on the ${family.title.toLowerCase()}`;
}

export function expectedVariantCount(family, catalog) {
  return expectedVariants(family, catalog).length;
}

/**
 * Every variant a family must have, as `{sku, options}` where `options`
 * maps option name to the exact value. Order matches the sync's creation
 * order.
 */
export function expectedVariants(family, catalog) {
  if (family.frameOnly) {
    return family.sizeVariants.map(({code, label}) => ({
      options: {Size: label},
      sku: `CM-${family.skuSuffix}-${code}`,
    }));
  }
  if (family.collectionVariant) {
    return [
      {
        options: {Edition: editionOf(family)},
        sku: `CM-${family.skuSuffix}`,
      },
    ];
  }
  if (family.deviceOptions) {
    return catalog.capsuleOrder.flatMap((capsuleName) =>
      catalog.deviceVariants.map((device) => ({
        options: {Artwork: capsuleName, Device: device.label},
        sku: `CM-${CAPSULE_CODE_BY_NAME[capsuleName]}-${family.skuSuffix}-${device.code}`,
      })),
    );
  }
  return catalog.capsuleOrder.map((capsuleName) => ({
    options: {Artwork: capsuleName},
    sku: `CM-${CAPSULE_CODE_BY_NAME[capsuleName]}-${family.skuSuffix}`,
  }));
}

/**
 * Compares live Shopify variants (`{sku, selectedOptions: [{name, value}]}`)
 * against the manifest grid and returns human-readable issues, or [] when
 * every expected SKU exists exactly once with the expected option values.
 */
export function variantIssues(family, catalog, liveVariants) {
  const issues = [];
  const bySku = new Map();
  for (const variant of liveVariants ?? []) {
    const sku = String(variant?.sku ?? '').trim();
    bySku.set(sku, [...(bySku.get(sku) ?? []), variant]);
  }
  for (const expected of expectedVariants(family, catalog)) {
    const matches = bySku.get(expected.sku) ?? [];
    if (matches.length !== 1) {
      issues.push(
        `expected one variant with SKU ${expected.sku}, found ${matches.length}`,
      );
      continue;
    }
    const live = new Map(
      (matches[0].selectedOptions ?? []).map((option) => [
        option.name,
        option.value,
      ]),
    );
    for (const [name, value] of Object.entries(expected.options)) {
      if (live.get(name) !== value) {
        issues.push(
          `${expected.sku}: option ${name} is ${JSON.stringify(live.get(name) ?? null)}, expected ${JSON.stringify(value)}`,
        );
      }
    }
  }
  const expectedSkus = new Set(
    expectedVariants(family, catalog).map((variant) => variant.sku),
  );
  for (const sku of bySku.keys()) {
    if (!expectedSkus.has(sku)) issues.push(`unexpected variant SKU ${sku}`);
  }
  return issues;
}
