/**
 * Pure helpers for the family steps of scripts/product.mjs (`--family <f>` /
 * `--families`): museum works as framed prints, canvas, greeting cards,
 * postcards, tough phone cases and mugs, one Shopify Draft per artwork per family
 * (data/art-product-catalog.json, app/lib/artProductCatalog.ts). Everything
 * here is decided from data without touching the network, so it is covered
 * by scripts/artProductPipeline.node-test.mjs.
 */

import path from 'node:path';
import {
  ART_PRODUCT_CATALOG,
  ART_PRODUCT_FAMILIES,
  casePrintUrlPath,
  FAMILY_SPECS,
  familyCrop,
  familyFileSize,
  familyHandle,
  familyIneligibility,
  familyLayout,
  familyOptionNames,
  familyPpiFloor,
  familyReleaseIssues,
  familySku,
  familySourceSignature,
  familyTitle,
  familyVariantDefs,
  familyVariantPrice,
  variantFile,
  variantMappingCurrent,
  wholePanelLayout,
} from '../../app/lib/artProductCatalog.ts';
import {
  ART_REGISTRY,
  findArtwork,
  lifeDatesLabel,
  masterSize,
  MUSEUMS,
  orientationOf,
  sourceCredit,
} from '../../app/lib/artRegistry.ts';
import {MUSEUM_CROPS} from '../../app/lib/museumCrops.ts';
import {
  MUSEUM_TAG,
  museumSource,
  normalizeHtml,
  PENDING_TAGS,
  printFileName,
  REPO_ROOT,
  VENDOR,
} from './product-pipeline.mjs';

export const ART_CATALOG_PATH = path.join(
  REPO_ROOT,
  'data/art-product-catalog.json',
);
/** Shopper previews: 4:5 like the print cards, product on linen. */
export const PREVIEW_SIZE = {height: 2000, width: 1600};
/** The framed print reuses the bordered print file of this size. */
export const FRAMED_PRINT_SIZE = '16x20';

/**
 * `--family a,b` or `--families` → the families a step works on, in catalog
 * order. `--families` is every family the collection offers (its entry in
 * data/art-product-catalog.json); naming one it does not offer is an error.
 */
export function selectFamilies({family, all, offered = ART_PRODUCT_FAMILIES}) {
  if (all)
    return ART_PRODUCT_FAMILIES.filter((entry) => offered.includes(entry));
  const wanted = String(family ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (!wanted.length)
    throw new Error(
      `Pass --families or --family <${ART_PRODUCT_FAMILIES.join('|')}>`,
    );
  const unknown = wanted.filter(
    (entry) => !ART_PRODUCT_FAMILIES.includes(entry),
  );
  if (unknown.length)
    throw new Error(
      `Unknown family ${unknown.join(', ')}. Families: ${ART_PRODUCT_FAMILIES.join(', ')}`,
    );
  const missing = wanted.filter((entry) => !offered.includes(entry));
  if (missing.length)
    throw new Error(
      `This collection does not offer ${missing.join(', ')}: add it to its entry in data/art-product-catalog.json first`,
    );
  return ART_PRODUCT_FAMILIES.filter((entry) => wanted.includes(entry));
}

export function findArtCollection(artCatalog, slug) {
  const entry = artCatalog.collections.find((c) => c.slug === slug);
  if (!entry)
    throw new Error(
      `data/art-product-catalog.json has no collection "${slug}" (families are configured per museum collection)`,
    );
  return entry;
}

/**
 * The catalog entry a print and family should have, with no state yet.
 * `artCollection` (its data/art-product-catalog.json entry) names the
 * layout of a square work's supplied files.
 */
export function expectedFamilyProduct(
  collection,
  print,
  family,
  config,
  artCollection,
) {
  const spec = FAMILY_SPECS[family];
  if (!config)
    throw new Error(
      `${collection.slug} does not offer ${family} (no entry in data/art-product-catalog.json)`,
    );
  const inventory = {policy: 'DENY', quantity: 0, tracked: true};
  const orientation = familyLayout(
    {artworkId: print.artworkId, family, orientation: print.orientation},
    artCollection,
  );
  const variants = familyVariantDefs(family, orientation).map((def) => ({
    key: def.key,
    option: def.values.join(' / '),
    sku: familySku(
      collection,
      print,
      family,
      spec.single ? undefined : def.key,
    ),
    priceEUR: familyVariantPrice(config, def),
    providerSku: def.providerSku ?? config.providerSku,
    ...(def.providerAttributes
      ? {providerAttributes: {...def.providerAttributes}}
      : {}),
    ...(def.file ? {file: def.file} : {}),
    inventory: {...inventory},
    mapping: {verified: false},
  }));
  return {
    handle: familyHandle(print, family),
    family,
    collection: collection.slug,
    print: print.slug,
    artworkId: print.artworkId,
    title: familyTitle(print, family),
    orientation: print.orientation ?? 'portrait',
    released: false,
    variants,
  };
}

const IDENTITY_FIELDS = [
  'handle',
  'family',
  'collection',
  'print',
  'artworkId',
  'title',
  'orientation',
];

/**
 * Adds missing family products for the selected prints and families and
 * checks existing ones still match the catalog. An entry not yet in Shopify
 * is refreshed from the data; a staged one must match exactly (a price or
 * SKU change of a staged Draft is a Shopify update, not a data edit).
 * A work that cannot have a family (no crop for its shape, or a framed print
 * without 16×20) is skipped and reported. Products stay ordered by
 * collection, family, then print sequence.
 */
export function syncFamilyProducts(
  artCatalog,
  collection,
  {families, prints, crops = MUSEUM_CROPS},
) {
  const artCollection = findArtCollection(artCatalog, collection.slug);
  const config = artCollection.families;
  const added = [];
  const refreshed = [];
  const skipped = [];
  for (const family of families)
    for (const print of prints) {
      const reason = familyIneligibility(family, collection, print, crops);
      if (reason) {
        skipped.push({family, print: print.slug, reason});
        continue;
      }
      const expected = expectedFamilyProduct(
        collection,
        print,
        family,
        config[family],
        artCollection,
      );
      const existing = artCatalog.products.find(
        (product) => product.handle === expected.handle,
      );
      if (!existing) {
        artCatalog.products.push(expected);
        added.push(expected.handle);
        continue;
      }
      const differences = [
        ...IDENTITY_FIELDS.filter(
          (field) => existing[field] !== expected[field],
        ),
        ...(existing.variants.length !== expected.variants.length ||
        existing.variants.some((variant, index) => {
          const want = expected.variants[index];
          return (
            variant.key !== want.key ||
            variant.option !== want.option ||
            variant.sku !== want.sku ||
            variant.priceEUR !== want.priceEUR ||
            variant.providerSku !== want.providerSku ||
            variant.file !== want.file ||
            JSON.stringify(variant.providerAttributes ?? null) !==
              JSON.stringify(want.providerAttributes ?? null)
          );
        })
          ? ['variants']
          : []),
      ];
      if (!differences.length) continue;
      if (existing.shopify?.productId || existing.released)
        throw new Error(
          `${existing.handle} is already in Shopify but its ${differences.join(', ')} changed in the data; resolve by hand`,
        );
      Object.assign(existing, {
        ...expected,
        ...(existing.assets ? {assets: existing.assets} : {}),
      });
      refreshed.push(existing.handle);
    }
  const sequence = new Map(prints.map((print) => [print.slug, print.sequence]));
  const rank = (product) => [
    product.collection,
    ART_PRODUCT_FAMILIES.indexOf(product.family),
    sequence.get(product.print) ??
      collection.prints.find((print) => print.slug === product.print)
        ?.sequence ??
      0,
  ];
  artCatalog.products.sort((a, b) => {
    const [ca, fa, sa] = rank(a);
    const [cb, fb, sb] = rank(b);
    return ca.localeCompare(cb) || fa - fb || sa - sb;
  });
  return {added, refreshed, skipped};
}

/** Products of one collection, narrowed to families and print slugs. */
export function selectFamilyProducts(artCatalog, collection, {families, only}) {
  const products = artCatalog.products.filter(
    (product) =>
      product.collection === collection.slug &&
      families.includes(product.family) &&
      (!only?.length || only.includes(product.print)),
  );
  if (only?.length) {
    const unknown = only.filter(
      (slug) => !collection.prints.some((print) => print.slug === slug),
    );
    if (unknown.length)
      throw new Error(
        `Unknown print(s) in ${collection.slug}: ${unknown.join(', ')}`,
      );
  }
  return products;
}

const relative = (launchRoot, file) =>
  path.relative(launchRoot, file).replaceAll('\\', '/');

/** "16x20", "7x5", "4x5" or "11oz" for file names. */
function fileTag(family) {
  if (family === 'greeting-card' || family === 'postcard') return '7x5';
  if (family === 'phone-case') return '4x5';
  if (family === 'mug') return '11oz';
  return FRAMED_PRINT_SIZE;
}

/**
 * Everything the renderer needs for one product, in absolute paths, plus
 * the values recorded in the catalog. The crop is mapped from master pixels
 * (original less trim) to original pixels, so the renderer cuts the
 * original once and never re-encodes an intermediate. A whole-panel family
 * (the mug) extracts the whole master and places it in each panel; the
 * framed print reuses the bordered print file.
 */
export function familyAssetPlan(
  product,
  {
    collection,
    launchRoot,
    artCatalog = ART_PRODUCT_CATALOG,
    crops = MUSEUM_CROPS,
    registry = ART_REGISTRY,
    framedPpi,
  },
) {
  const spec = FAMILY_SPECS[product.family];
  if (spec.suppliedFiles)
    throw new Error(
      `${product.handle}: ${product.family} prints supplied files (suppliedAssetPlan)`,
    );
  const print = collection.prints.find((entry) => entry.slug === product.print);
  const {artwork} = museumSource(print, registry);
  if (!artwork.original)
    throw new Error(`${product.handle}: ${artwork.id} has no fetched original`);
  const master = masterSize(artwork);
  if (orientationOf(master) !== product.orientation)
    throw new Error(`${product.handle}: orientation differs from the artwork`);
  const familyDir = path.join(launchRoot, collection.slug, product.family);
  const file = familyFileSize(product.family, product.orientation);
  const crop = familyCrop(product.family, product.artworkId, {crops, registry});
  if (spec.shape && !crop)
    throw new Error(
      `${product.handle}: no ${spec.shape} crop for ${product.artworkId}`,
    );
  const trim = artwork.trim ?? {bottom: 0, left: 0, right: 0, top: 0};
  const whole = wholePanelLayout(master, product.family);
  const reused = !spec.shape && !whole;
  const ineligible = familyIneligibility(
    product.family,
    collection,
    print,
    crops,
  );
  if (ineligible) throw new Error(`${product.handle}: ${ineligible}`);
  const output = reused
    ? path.join(
        launchRoot,
        collection.slug,
        'print',
        printFileName(print, FRAMED_PRINT_SIZE),
      )
    : path.join(
        familyDir,
        `${product.print}-${product.family}-${fileTag(product.family)}-${spec.file.dpi}dpi.jpg`,
      );
  const preview = path.join(familyDir, 'web', `${product.handle}.webp`);
  return {
    artworkId: product.artworkId,
    family: product.family,
    handle: product.handle,
    orientation: product.orientation,
    print: product.print,
    source: {
      file: path.join(
        launchRoot,
        'museum',
        'originals',
        artwork.original.fileName,
      ),
      height: artwork.original.height,
      sha256: artwork.original.sha256,
      width: artwork.original.width,
    },
    master,
    trim: {
      bottom: trim.bottom,
      left: trim.left,
      right: trim.right,
      top: trim.top,
    },
    /** Master-pixel region rendered (the case renders its 4:5 file box). */
    box: crop ? crop.render : null,
    /** The same region in original pixels (the whole master for a mug). */
    extract: crop
      ? {
          height: crop.render.height,
          left: crop.render.left + trim.left,
          top: crop.render.top + trim.top,
          width: crop.render.width,
        }
      : whole
        ? {
            height: master.height,
            left: trim.left,
            top: trim.top,
            width: master.width,
          }
        : null,
    output: {
      dpi: spec.file.dpi,
      file: output,
      height: file.height,
      panel: spec.file.panel ?? null,
      /** Where the whole work sits in each panel (mugs); null otherwise. */
      placements: whole?.placements ?? null,
      path: relative(launchRoot, output),
      reused,
      width: file.width,
    },
    preview: {
      file: preview,
      height: PREVIEW_SIZE.height,
      path: relative(launchRoot, preview),
      width: PREVIEW_SIZE.width,
    },
    ppi: crop
      ? Math.round(crop.ppi * 10) / 10
      : (whole?.nativePpi ?? framedPpi ?? null),
    // The family's floor, or the owner's recorded exception for this work.
    ...familyPpiFloor(product, artCatalog),
    sourceSignature: familySourceSignature(product, {crops, registry}),
  };
}

/** Checks a rendered or reused file against its plan; returns problems. */
export function assetIssues(plan, file) {
  const issues = [];
  if (file.width !== plan.output.width || file.height !== plan.output.height)
    issues.push(
      `${plan.handle}: file is ${file.width}×${file.height}, expected ${plan.output.width}×${plan.output.height}`,
    );
  if (Math.round(file.dpi ?? 0) !== plan.output.dpi)
    issues.push(
      `${plan.handle}: file is ${file.dpi} dpi, expected ${plan.output.dpi}`,
    );
  if (!(plan.ppi >= plan.minPpi))
    issues.push(
      `${plan.handle}: ${plan.ppi} ppi native is below the accepted ${plan.minPpi}; only the owner can accept less (ppiExceptions in data/art-product-catalog.json)`,
    );
  if (plan.extract) {
    const {extract, source} = plan;
    if (
      extract.left < plan.trim.left ||
      extract.top < plan.trim.top ||
      extract.left + extract.width > source.width - plan.trim.right ||
      extract.top + extract.height > source.height - plan.trim.bottom
    )
      issues.push(`${plan.handle}: the crop leaves the trimmed artwork`);
  }
  return issues;
}

/**
 * The checks and records for a family printed from supplied files (the
 * AI-fitted files of the seven-products standard). `manifest` is the
 * folder's products/manifest.json, `assembly` its masters/assembly.json and
 * `masterPixels(master)` the [width, height] of a master whose log has no
 * canvas (a master that is the work itself). Returns one entry per file the
 * variants print, each with its expected size, the manifest row, its AI-fill
 * log and the native ppi of the museum image in it, plus the problems found
 * in the logs themselves (the files on disk are checked by the caller).
 */
export function suppliedAssetPlan(
  product,
  {
    collection,
    artCollection,
    launchRoot,
    manifest,
    assembly,
    masterPixels,
    artCatalog = ART_PRODUCT_CATALOG,
    crops = MUSEUM_CROPS,
    registry = ART_REGISTRY,
  },
) {
  const spec = FAMILY_SPECS[product.family];
  if (!spec.suppliedFiles)
    throw new Error(`${product.handle}: ${product.family} is rendered here`);
  if (!artCollection.suppliedFiles)
    throw new Error(
      `${collection.slug}: set suppliedFiles in data/art-product-catalog.json to the folder of the finished files`,
    );
  // A square work's files may run the other way (suppliedLayout).
  const orientation = familyLayout(product, artCollection);
  const folder = artCollection.suppliedFiles.replace(/\/+$/, '');
  const problems = [];
  const keys = [
    ...new Set(product.variants.map((variant) => variant.file)),
  ].filter(Boolean);
  const files = keys.map((key) => {
    const want = spec.suppliedFiles[key];
    if (!want) throw new Error(`${product.handle}: no file spec for ${key}`);
    const rows = manifest.filter(
      (row) => row.work === product.artworkId && row.product === key,
    );
    if (rows.length !== 1) {
      problems.push(
        `${product.handle}: ${rows.length} manifest rows for ${product.artworkId} ${key}, expected 1`,
      );
      return null;
    }
    const [row] = rows;
    const size = want[orientation];
    if (row.pixels[0] !== size.width || row.pixels[1] !== size.height)
      problems.push(
        `${product.handle}: manifest says ${key} is ${row.pixels.join('×')}, the ${orientation} file must be ${size.width}×${size.height}`,
      );
    if (row.dpi !== want.dpi)
      problems.push(
        `${product.handle}: manifest says ${key} is ${row.dpi} dpi, expected ${want.dpi}`,
      );
    // The manifest names the supplier SKU each file was drawn for.
    const skus = product.variants
      .filter((variant) => variant.file === key)
      .map((variant) => variant.providerSku);
    if (spec.route === 'channel' && skus.some((sku) => sku !== row.sku))
      problems.push(
        `${product.handle}: ${key} was drawn for ${row.sku}, the variants use ${[...new Set(skus)].join(', ')}`,
      );
    const namedVariant = /\(variant (\d+)\)/.exec(row.sku)?.[1];
    if (
      spec.route === 'printful' &&
      (!row.sku.startsWith('Printful') ||
        (namedVariant && skus.some((sku) => sku !== namedVariant)))
    )
      problems.push(
        `${product.handle}: ${key} was drawn for "${row.sku}", the variants use Printful variants ${skus.join(', ')}`,
      );
    const masterKey = row.source_master
      .replace(/^masters\//, '')
      .replace(/\.png$/, '');
    const aiFill = assembly[masterKey];
    if (!aiFill) {
      problems.push(`${product.handle}: no AI-fill log for ${masterKey}`);
      return null;
    }
    if (aiFill.block_identical !== true || aiFill.status !== 'ok')
      problems.push(
        `${product.handle}: ${masterKey} is not logged as ok with the museum image unchanged`,
      );
    let [canvasWidth, canvasHeight] = aiFill.canvas ?? masterPixels(row);
    if (row.rotated_90)
      [canvasWidth, canvasHeight] = [canvasHeight, canvasWidth];
    const ppi =
      Math.round(
        Math.min(
          canvasWidth / (row.pixels[0] / row.dpi),
          canvasHeight / (row.pixels[1] / row.dpi),
        ) * 10,
      ) / 10;
    const relativePath = `${folder}/${row.file}`;
    return {
      dpi: want.dpi,
      file: path.join(launchRoot, ...relativePath.split('/')),
      height: size.height,
      key,
      path: relativePath,
      ppi,
      provenance: {
        aiFill: structuredClone(aiFill),
        aspectTrimPercent: row.aspect_trim_percent,
        hangerStripMm: row.hanger_strip_mm,
        manifestSku: row.sku,
        master: `${folder}/${row.source_master}`,
        masterSha256: row.source_sha256,
        rotated90: row.rotated_90 === true,
      },
      sha256: row.sha256,
      width: size.width,
    };
  });
  const familyDir = path.join(launchRoot, collection.slug, product.family);
  const preview = path.join(familyDir, 'web', `${product.handle}.webp`);
  const ppis = files.filter(Boolean).map((file) => file.ppi);
  return {
    artworkId: product.artworkId,
    family: product.family,
    files: files.filter(Boolean),
    handle: product.handle,
    /** The files' layout (a square work's may differ from the work's own). */
    layout: orientation,
    orientation: product.orientation,
    ppi: ppis.length ? Math.min(...ppis) : 0,
    preview: {
      file: preview,
      height: PREVIEW_SIZE.height,
      path: relative(launchRoot, preview),
      width: PREVIEW_SIZE.width,
    },
    print: product.print,
    problems,
    ...familyPpiFloor(product, artCatalog),
    sourceSignature: familySourceSignature(product, {crops, registry}),
  };
}

const escapeHtml = (text) =>
  String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/**
 * Museum copy for a family product: the print's description, artist and
 * work, how the image was made, the family spec sheet, the institution's
 * credit with its rights designation and record link, and the
 * no-endorsement line. Never "original", never print-only claims.
 */
export function familyDescription(
  product,
  {artCollection, collection, registry = ART_REGISTRY},
) {
  const print = collection.prints.find((entry) => entry.slug === product.print);
  const {artist, artwork} = museumSource(print, registry);
  const {source} = artwork;
  const spec = FAMILY_SPECS[product.family];
  const dates = lifeDatesLabel(artist);
  return [
    `<p>${escapeHtml(print.description)}</p>`,
    `<p>${escapeHtml(artist.name)}${dates ? ` (${escapeHtml(dates)})` : ''}, <em>${escapeHtml(artwork.title)}</em>, ${escapeHtml(artwork.date)}. ${escapeHtml(artwork.medium)}.</p>`,
    `<p>${escapeHtml(artCollection.copy)}</p>`,
    `<ul>${spec.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul>`,
    `<p>${escapeHtml(spec.reproduction)} Source: ${escapeHtml(sourceCredit(source))}, object ${escapeHtml(source.objectId)} (<a href="${escapeHtml(source.objectUrl)}">museum record</a>). ${escapeHtml(MUSEUMS[source.museum].rightsDesignation)}. Clara Mendes is not affiliated with or endorsed by the museum.</p>`,
    '<p>Printed to order. Screen and print colours can vary slightly.</p>',
  ].join('\n');
}

export function familyTags(product, {collection, registry = ART_REGISTRY}) {
  const print = collection.prints.find((entry) => entry.slug === product.print);
  const {artist} = museumSource(print, registry);
  return [
    MUSEUM_TAG,
    ...FAMILY_SPECS[product.family].tags,
    collection.title,
    artist.name,
    ...PENDING_TAGS,
  ];
}

/**
 * The ProductSetInput for a new family Draft, minus the uploaded preview:
 * the same conventions as a staged print (DRAFT, tracked at zero with DENY,
 * shipping required, pending tags, museum copy and credit), with the
 * family's product type and option.
 */
export function buildFamilyProductInput(
  product,
  {artCollection, collection, registry = ART_REGISTRY},
) {
  const spec = FAMILY_SPECS[product.family];
  const print = collection.prints.find((entry) => entry.slug === product.print);
  const {artist} = museumSource(print, registry);
  if (product.variants.some((variant) => variant.priceEUR === undefined))
    throw new Error(
      `${product.handle}: no approved ${product.family} price yet — add ${spec.variantDefs ? 'its prices' : 'priceEUR'} to the collection in data/art-product-catalog.json once the owner approves it`,
    );
  const names = familyOptionNames(product.family);
  const valuesOf = (variant) => {
    const values =
      names.length > 1 ? variant.option.split(' / ') : [variant.option];
    if (values.length !== names.length)
      throw new Error(
        `${product.handle} ${variant.key}: option "${variant.option}" needs ${names.length} values`,
      );
    return values;
  };
  return {
    descriptionHtml: familyDescription(product, {
      artCollection,
      collection,
      registry,
    }),
    handle: product.handle,
    productOptions: names.map((name, index) => ({
      name,
      position: index + 1,
      values: [
        ...new Set(product.variants.map((variant) => valuesOf(variant)[index])),
      ].map((value) => ({name: value})),
    })),
    productType: spec.productType,
    seo: {
      description: `${print.description} ${spec.seoSuffix}`,
      title: `${product.title} by ${artist.name} | ${VENDOR}`,
    },
    status: 'DRAFT',
    tags: familyTags(product, {collection, registry}),
    title: product.title,
    variants: product.variants.map((variant) => ({
      // Tracked at zero with DENY keeps a Draft unbuyable even if it is
      // activated by accident; `release` switches tracking off.
      inventoryItem: {requiresShipping: true, tracked: true},
      inventoryPolicy: 'DENY',
      optionValues: valuesOf(variant).map((value, index) => ({
        name: value,
        optionName: names[index],
      })),
      price: variant.priceEUR,
      sku: variant.sku,
      taxable: true,
    })),
    vendor: VENDOR,
  };
}

/**
 * What `stage` does with one product, given the exact-handle lookup:
 * create a missing Draft; leave a matching Draft alone (re-running after a
 * partial create never duplicates); refuse anything else.
 */
export function familyStageAction(product, input, found) {
  if (!found) return {action: 'create'};
  if (found.handle !== input.handle)
    throw new Error(`${input.handle}: Shopify returned ${found.handle}`);
  if (found.status !== 'DRAFT')
    throw new Error(
      `${input.handle} exists in Shopify as ${found.status}; stage only touches Drafts — resolve by hand`,
    );
  const live = (found.variants?.nodes ?? [])
    .map((variant) => variant.sku)
    .sort();
  const expected = input.variants.map((variant) => variant.sku).sort();
  if (JSON.stringify(live) !== JSON.stringify(expected))
    throw new Error(
      `${input.handle} exists as a Draft with different SKUs (${live.length} live, ${expected.length} expected) — resolve by hand`,
    );
  return {
    action: (found.media?.nodes ?? []).length ? 'present' : 'attach preview',
  };
}

/**
 * Compares a fresh Admin readback with the input `stage` sent. Returns
 * problems; empty means the Draft is exactly what the catalog describes.
 */
export function familyReadbackIssues(input, live) {
  const at = input.handle;
  if (!live) return [`${at}: not found in Shopify`];
  const issues = [];
  for (const field of ['handle', 'title', 'vendor', 'productType', 'status'])
    if (live[field] !== input[field])
      issues.push(
        `${at}: ${field} is ${live[field]}, expected ${input[field]}`,
      );
  if (
    JSON.stringify([...live.tags].sort()) !==
    JSON.stringify([...input.tags].sort())
  )
    issues.push(`${at}: tags are ${live.tags.join(', ')}`);
  if (
    descriptionText(live.descriptionHtml) !==
    descriptionText(input.descriptionHtml)
  )
    issues.push(`${at}: description differs`);
  if (
    live.seo?.title !== input.seo.title ||
    live.seo?.description !== input.seo.description
  )
    issues.push(`${at}: SEO differs`);
  if (live.totalInventory != null && live.totalInventory !== 0)
    issues.push(`${at}: total inventory is ${live.totalInventory}`);
  const variants = live.variants?.nodes ?? [];
  if (variants.length !== input.variants.length)
    issues.push(
      `${at}: ${variants.length} variants, expected ${input.variants.length}`,
    );
  for (const want of input.variants) {
    const got = variants.find((variant) => variant.sku === want.sku);
    if (!got) {
      issues.push(`${at}: missing ${want.sku}`);
      continue;
    }
    for (const value of want.optionValues) {
      const option = got.selectedOptions?.find(
        (entry) => entry.name === value.optionName,
      );
      if (option?.value !== value.name)
        issues.push(
          `${at} ${want.sku}: ${value.optionName} is ${option?.value}`,
        );
    }
    if (got.price !== want.price)
      issues.push(`${at} ${want.sku}: price is ${got.price}`);
    if (got.inventoryPolicy !== 'DENY')
      issues.push(
        `${at} ${want.sku}: inventory policy is ${got.inventoryPolicy}`,
      );
    if (got.inventoryItem?.tracked !== true)
      issues.push(`${at} ${want.sku}: inventory is not tracked`);
    if (got.inventoryItem?.requiresShipping !== true)
      issues.push(`${at} ${want.sku}: does not require shipping`);
  }
  return issues;
}

const ENTITIES = {
  amp: '&',
  apos: "'",
  gt: '>',
  hellip: '…',
  ldquo: '“',
  lsquo: '‘',
  lt: '<',
  mdash: '—',
  nbsp: ' ',
  ndash: '–',
  quot: '"',
  rdquo: '”',
  rsquo: '’',
  times: '×',
};

/**
 * A description's words and links, for readbacks: Shopify may re-indent,
 * re-encode entities or reorder attributes of stored HTML, none of which
 * changes what a shopper reads.
 */
export function descriptionText(html) {
  const links = [...String(html ?? '').matchAll(/href="([^"]*)"/g)].map(
    (match) => match[1].replaceAll('&amp;', '&'),
  );
  const text = normalizeHtml(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (entity, code) => {
      if (code[0] !== '#') return ENTITIES[code] ?? entity;
      return String.fromCodePoint(
        code[1].toLowerCase() === 'x'
          ? parseInt(code.slice(2), 16)
          : Number(code.slice(1)),
      );
    })
    .replace(/\s+/g, ' ')
    .trim();
  return `${text} | ${links.join(' ')}`;
}

/** Writes Shopify ids from a product read onto a catalog entry. */
export function recordFamilyIds(product, found) {
  const variantIds = {};
  for (const variant of product.variants) {
    const live = found.variants.nodes.find((node) => node.sku === variant.sku);
    if (live) variantIds[variant.key] = live.id;
  }
  product.shopify = {productId: found.id, variantIds};
}

/** Where a family product stands and the one command that moves it on. */
export function familyStatus(product, {fileSha256, crops, registry} = {}) {
  const assets = product.assets;
  const current =
    Boolean(assets) &&
    assets.sourceSignature ===
      familySourceSignature(product, {
        ...(crops ? {crops} : {}),
        ...(registry ? {registry} : {}),
      }) &&
    (fileSha256 === undefined || fileSha256 === assets.print.sha256);
  const staged =
    Boolean(product.shopify?.productId) &&
    product.variants.every(
      (variant) => product.shopify.variantIds?.[variant.key],
    );
  const mapped = product.variants.every((variant) =>
    variantMappingCurrent(product, variant),
  );
  const route = FAMILY_SPECS[product.family].route;
  let next = 'verify';
  if (!current) next = 'prepare --families';
  else if (!staged) next = 'stage --families';
  else if (!mapped)
    next =
      route === 'channel'
        ? 'handoff → map in Prodigi → mapped --family'
        : route === 'printful'
          ? 'handoff → sync in Printful → mapped --family'
          : 'mapped --family phone-case';
  else if (!product.released) next = 'owner reviews → release --family';
  return {current, mapped, next, released: product.released === true, staged};
}

/** Alt text of a product's preview image. */
export function familyImageAlt(product, {collection, registry = ART_REGISTRY}) {
  const print = collection.prints.find((entry) => entry.slug === product.print);
  const {artist} = museumSource(print, registry);
  const noun = FAMILY_SPECS[product.family].noun;
  return `${print.title} by ${artist.name} as ${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${product.family === 'phone-case' ? 'matte tough phone case, shown on iPhone 16 Pro' : noun}`;
}

/**
 * One handoff row per variant of the products mapped in a supplier's
 * dashboard: Prodigi channel families (`route` 'channel', the default) or
 * Printful families ('printful'). Each row names the variant's own file.
 */
export function familyHandoffRows(
  products,
  {launchRoot, collection, sha256, artCollection, route = 'channel'},
) {
  return products
    .filter((product) => FAMILY_SPECS[product.family].route === route)
    .flatMap((product) =>
      product.variants.map((variant) => {
        const recorded = variantFile(product, variant);
        const file = path.join(launchRoot, recorded.path);
        return {
          product: product.title,
          family: product.family,
          handle: product.handle,
          sku: variant.sku,
          shopifyProductId: product.shopify?.productId ?? '',
          shopifyVariantId: product.shopify?.variantIds?.[variant.key] ?? '',
          option: variant.option,
          providerSku: variant.providerSku,
          providerAttributes: variant.providerAttributes
            ? Object.entries(variant.providerAttributes)
                .map(([name, value]) => `${name}=${value}`)
                .join(' ')
            : '',
          settings:
            artCollection.families[product.family]?.providerSettings ?? '',
          printFile: file.replaceAll('\\', '/'),
          pixels: `${recorded.width}x${recorded.height}`,
          dpi: recorded.dpi ?? '',
          ppi: recorded.ppi ?? product.assets.ppi,
          sha256: sha256(file),
          recordedSha256: recorded.sha256,
          ...(route === 'printful'
            ? {
                printfulSyncProductId:
                  variant.mapping.printfulSyncProductId ?? '',
                printfulSyncVariantId:
                  variant.mapping.printfulSyncVariantId ?? '',
              }
            : {
                prodigiChannelProductId: variant.mapping.channelProductId ?? '',
              }),
          verified: variant.mapping.verified === true,
          collection: collection.slug,
        };
      }),
    );
}

/**
 * `print-slug=channelProductId` pairs (channel families) or bare print
 * slugs (phone cases, which have no channel product).
 */
export function parseFamilyMappings(collection, family, pairs) {
  if (!pairs.length)
    throw new Error(
      FAMILY_SPECS[family].route === 'channel'
        ? 'Pass at least one <print-slug>=<prodigi channel product id>.'
        : 'Pass at least one <print-slug>.',
    );
  return pairs.map((pair) => {
    const [slug, id] = pair.split('=');
    if (!collection.prints.some((print) => print.slug === slug))
      throw new Error(`Unknown print "${slug}" in ${collection.slug}`);
    if (FAMILY_SPECS[family].route === 'channel' && !/^\d+$/.test(id ?? ''))
      throw new Error(
        `"${pair}": the Prodigi channel product id must be digits`,
      );
    if (FAMILY_SPECS[family].route === 'printful' && !/^\d+$/.test(id ?? ''))
      throw new Error(`"${pair}": the Printful sync product id must be digits`);
    if (FAMILY_SPECS[family].route === 'api' && id !== undefined)
      throw new Error(`"${pair}": phone cases have no channel product id`);
    return {id: id ?? null, slug};
  });
}

const numericId = (gid) =>
  String(gid ?? '')
    .split('/')
    .pop();

/**
 * Checks a Printful readback of one product (the Printful API's
 * `GET /sync/products/{id}` result: `sync_product` plus `sync_variants`)
 * against the catalog: the sync product is this Shopify product, every
 * Shopify variant is synced to the Printful catalog variant it should be,
 * and prints its own file on every placement the family needs. A file is
 * recognised by its MD5 (`hash`) when Printful gives one that matches, else
 * by file name and pixel size. Returns the problems and, when there are
 * none, the mapping each variant gets.
 */
export function printfulMappingFromReadback(
  product,
  readback,
  {fileFacts, today},
) {
  const spec = FAMILY_SPECS[product.family];
  const at = product.handle;
  const problems = [];
  const syncProduct = readback?.sync_product;
  if (!syncProduct)
    return {
      mappings: null,
      problems: [`${at}: no sync_product in the readback`],
    };
  if (String(syncProduct.external_id) !== numericId(product.shopify?.productId))
    problems.push(
      `${at}: Printful sync product ${syncProduct.id} is Shopify product ${syncProduct.external_id}, expected ${numericId(product.shopify?.productId)}`,
    );
  const mappings = {};
  for (const variant of product.variants) {
    const shopifyId = numericId(product.shopify?.variantIds?.[variant.key]);
    const sync = (readback.sync_variants ?? []).find(
      (entry) => String(entry.external_id) === shopifyId,
    );
    const where = `${at} ${variant.key}`;
    if (!sync) {
      problems.push(
        `${where}: Shopify variant ${shopifyId} is not in the readback`,
      );
      continue;
    }
    if (sync.synced !== true) problems.push(`${where}: not synced in Printful`);
    if (String(sync.variant_id) !== variant.providerSku)
      problems.push(
        `${where}: synced to Printful variant ${sync.variant_id}, expected ${variant.providerSku}`,
      );
    const recorded = product.assets?.files?.[variant.file];
    const facts = recorded && fileFacts(recorded);
    let method = null;
    for (const placement of spec.printfulPlacements ?? ['default']) {
      // Printful names the front placement "default" on some products.
      const file = (sync.files ?? []).find(
        (entry) =>
          entry.type === placement ||
          (placement === 'front' && entry.type === 'default'),
      );
      if (!file) {
        problems.push(`${where}: no ${placement} file in Printful`);
        continue;
      }
      if (facts && file.hash && file.hash === facts.md5) method ??= 'md5';
      else if (
        facts &&
        file.filename === facts.name &&
        Number(file.width) === recorded.width &&
        Number(file.height) === recorded.height
      )
        method = method === 'md5' ? 'md5' : 'name and pixels';
      else
        problems.push(
          `${where}: the ${placement} file in Printful (${file.filename ?? file.id}, ${file.width}×${file.height}) is not ${facts?.name ?? variant.file}`,
        );
    }
    mappings[variant.key] = {
      assetSha256: recorded?.sha256,
      printfulSyncProductId: String(syncProduct.id),
      printfulSyncVariantId: String(sync.id),
      verified: true,
      verifiedAt: today,
      ...(method ? {note: `Printful file matched by ${method}`} : {}),
    };
  }
  return {mappings: problems.length ? null : mappings, problems};
}

/**
 * What `printful` would do for one product of a Printful family, given the
 * store's sync product as Printful reads it (`GET /sync/products/@<Shopify
 * product id>`, null when the Printful app has not imported it) and the
 * Printful file-library id of each supplied file (`fileIds`, keyed by the
 * variant's `file`). A variant is kept when it is already synced to its
 * catalogue variant with that file on every placement; otherwise it is
 * synced with `body`.
 */
export function printfulSyncPlan(product, readback, fileIds = new Map()) {
  const placements = FAMILY_SPECS[product.family].printfulPlacements ?? [
    'default',
  ];
  const problems = [];
  if (!readback?.sync_product)
    problems.push(
      `${product.handle}: not in Printful yet (the Printful app has not imported Shopify product ${numericId(product.shopify?.productId)})`,
    );
  const rows = product.variants.map((variant) => {
    const externalId = numericId(product.shopify?.variantIds?.[variant.key]);
    const sync = (readback?.sync_variants ?? []).find(
      (entry) => String(entry.external_id) === externalId,
    );
    if (readback?.sync_product && !sync)
      problems.push(
        `${product.handle} ${variant.key}: Shopify variant ${externalId} is not in Printful`,
      );
    const fileId = fileIds.get(variant.file);
    const current =
      sync?.synced === true &&
      String(sync.variant_id) === variant.providerSku &&
      fileId !== undefined &&
      placements.every((placement) =>
        (sync.files ?? []).some(
          (file) =>
            (file.type === placement ||
              (placement === 'front' && file.type === 'default')) &&
            String(file.id) === String(fileId),
        ),
      );
    return {
      action: current ? 'keep' : 'sync',
      body: {
        files: placements.map((type) => ({id: fileId, type})),
        variant_id: Number(variant.providerSku),
      },
      externalId,
      file: variant.file,
      handle: product.handle,
      key: variant.key,
      was: sync
        ? {
            files: (sync.files ?? []).map((file) => file.type),
            synced: sync.synced,
            variantId: sync.variant_id,
          }
        : null,
    };
  });
  return {problems, rows};
}

/** Marks a product's mappings unverified because its print file changed. */
export function unverifyFamilyMappings(product, reason) {
  let changed = false;
  for (const variant of product.variants) {
    if (!variant.mapping.verified) continue;
    variant.mapping = {...variant.mapping, note: reason, verified: false};
    changed = true;
  }
  return changed;
}

/** Products, variants and prices per family, for dry runs and reports. */
export function familySummary(products) {
  return ART_PRODUCT_FAMILIES.map((family) => {
    const members = products.filter((product) => product.family === family);
    const prices = [
      ...new Set(members.flatMap((p) => p.variants.map((v) => v.priceEUR))),
    ];
    return {
      family,
      products: members.length,
      variants: members.reduce(
        (sum, product) => sum + product.variants.length,
        0,
      ),
      priceEUR: prices.join(' '),
      providerSkus: [
        ...new Set(
          members.flatMap((p) => p.variants.map((v) => v.providerSku)),
        ),
      ].length,
    };
  }).filter((row) => row.products > 0);
}

/** The release-blocking issues, with a hypothetical release flag. */
export function familyReleaseBlockers(product, sources) {
  return familyReleaseIssues({...product, released: true}, sources);
}

/** The deploy copy of a case file, served at casePrintUrlPath(). */
export function casePublicFile(product) {
  return path.join(
    REPO_ROOT,
    'public',
    ...casePrintUrlPath(product).split('/').filter(Boolean),
  );
}

/**
 * The family catalog as written to disk: two-space JSON, but each variant
 * on one line so 400 case variants stay readable in a diff.
 */
export function formatArtProductCatalog(catalog) {
  const write = (value, indent) => {
    if (Array.isArray(value)) {
      if (!value.length) return '[]';
      const inner = value.map(
        (entry) => `${indent}  ${write(entry, `${indent}  `)}`,
      );
      return `[\n${inner.join(',\n')}\n${indent}]`;
    }
    if (value && typeof value === 'object') {
      const entries = Object.entries(value).filter(
        ([, entry]) => entry !== undefined,
      );
      if (!entries.length) return '{}';
      const inner = entries.map(([key, entry]) => {
        // A supplied file's provenance (its manifest row and AI-fill log)
        // is kept whole but on one line, like a variant.
        const rendered =
          key === 'variants' && Array.isArray(entry) && entry.length
            ? `[\n${entry.map((variant) => `${indent}    ${JSON.stringify(variant)}`).join(',\n')}\n${indent}  ]`
            : key === 'provenance' && entry && typeof entry === 'object'
              ? JSON.stringify(entry)
              : write(entry, `${indent}  `);
        return `${indent}  ${JSON.stringify(key)}: ${rendered}`;
      });
      return `{\n${inner.join(',\n')}\n${indent}}`;
    }
    return JSON.stringify(value);
  };
  return `${write(catalog, '')}\n`;
}

/** The artwork record behind a family product (throws if unknown). */
export function familyArtwork(product, registry = ART_REGISTRY) {
  const artwork = findArtwork(product.artworkId, registry);
  if (!artwork) throw new Error(`${product.handle}: unknown artwork`);
  return artwork;
}
