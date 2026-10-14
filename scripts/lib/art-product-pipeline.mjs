/**
 * Pure helpers for the family steps of scripts/product.mjs (`--family <f>` /
 * `--families`): museum works as framed prints, canvas, greeting cards,
 * postcards and tough phone cases, one Shopify Draft per artwork per family
 * (data/art-product-catalog.json, app/lib/artProductCatalog.ts). Everything
 * here is decided from data without touching the network, so it is covered
 * by scripts/artProductPipeline.node-test.mjs.
 */

import path from 'node:path';
import {
  ART_PRODUCT_FAMILIES,
  casePrintUrlPath,
  FAMILY_SPECS,
  familyCrop,
  familyFileSize,
  familyHandle,
  familyReleaseIssues,
  familySku,
  familySourceSignature,
  familyTitle,
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
import {TOUGH_CASE_PHONES} from '../../app/lib/toughCase.ts';
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

/** `--family a,b` or `--families` → the families a step works on. */
export function selectFamilies({family, all}) {
  if (all) return [...ART_PRODUCT_FAMILIES];
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

/** The catalog entry a print and family should have, with no state yet. */
export function expectedFamilyProduct(collection, print, family, config) {
  const spec = FAMILY_SPECS[family];
  if (!config)
    throw new Error(`${collection.slug} does not offer ${family} (no price)`);
  const inventory = {policy: 'DENY', quantity: 0, tracked: true};
  const variants = spec.single
    ? [
        {
          key: spec.single.key,
          option: spec.single.option,
          sku: familySku(collection, print, family),
          priceEUR: config.priceEUR,
          providerSku: config.providerSku,
          inventory: {...inventory},
          mapping: {verified: false},
        },
      ]
    : TOUGH_CASE_PHONES.map((phone) => ({
        key: phone.code,
        option: phone.label,
        sku: familySku(collection, print, family, phone.code),
        priceEUR: config.priceEUR,
        providerSku: phone.prodigiSku,
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
 * Products stay ordered by collection, family, then print sequence.
 */
export function syncFamilyProducts(artCatalog, collection, {families, prints}) {
  const config = findArtCollection(artCatalog, collection.slug).families;
  const added = [];
  const refreshed = [];
  for (const family of families)
    for (const print of prints) {
      const expected = expectedFamilyProduct(
        collection,
        print,
        family,
        config[family],
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
            variant.providerSku !== want.providerSku
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
  return {added, refreshed};
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

/** "16x20", "7x5" or "4x5" for file names. */
function fileTag(family) {
  if (family === 'greeting-card' || family === 'postcard') return '7x5';
  if (family === 'phone-case') return '4x5';
  return FRAMED_PRINT_SIZE;
}

/**
 * Everything the renderer needs for one product, in absolute paths, plus
 * the values recorded in the catalog. The crop is mapped from master pixels
 * (original less trim) to original pixels, so the renderer cuts the
 * original once and never re-encodes an intermediate.
 */
export function familyAssetPlan(
  product,
  {
    collection,
    launchRoot,
    crops = MUSEUM_CROPS,
    registry = ART_REGISTRY,
    framedPpi,
  },
) {
  const spec = FAMILY_SPECS[product.family];
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
  const output = spec.shape
    ? path.join(
        familyDir,
        `${product.print}-${product.family}-${fileTag(product.family)}-${spec.file.dpi}dpi.jpg`,
      )
    : path.join(
        launchRoot,
        collection.slug,
        'print',
        printFileName(print, FRAMED_PRINT_SIZE),
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
    /** The same region in original pixels. */
    extract: crop
      ? {
          height: crop.render.height,
          left: crop.render.left + trim.left,
          top: crop.render.top + trim.top,
          width: crop.render.width,
        }
      : null,
    output: {
      dpi: spec.file.dpi,
      file: output,
      height: file.height,
      panel: spec.file.panel ?? null,
      path: relative(launchRoot, output),
      reused: !spec.shape,
      width: file.width,
    },
    preview: {
      file: preview,
      height: PREVIEW_SIZE.height,
      path: relative(launchRoot, preview),
      width: PREVIEW_SIZE.width,
    },
    ppi: crop ? Math.round(crop.ppi * 10) / 10 : (framedPpi ?? null),
    minPpi: spec.minPpi,
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
      `${plan.handle}: ${plan.ppi} ppi native is below the accepted ${plan.minPpi}`,
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
  return {
    descriptionHtml: familyDescription(product, {
      artCollection,
      collection,
      registry,
    }),
    handle: product.handle,
    productOptions: [
      {
        name: spec.optionName,
        position: 1,
        values: product.variants.map((variant) => ({name: variant.option})),
      },
    ],
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
      optionValues: [{name: variant.option, optionName: spec.optionName}],
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
    const option = got.selectedOptions?.find(
      (entry) => entry.name === want.optionValues[0].optionName,
    );
    if (option?.value !== want.optionValues[0].name)
      issues.push(`${at} ${want.sku}: option is ${option?.value}`);
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
  const mapped = product.variants.every(
    (variant) =>
      variant.mapping.verified &&
      variant.mapping.assetSha256 === assets?.print.sha256,
  );
  let next = 'verify';
  if (!current) next = 'prepare --families';
  else if (!staged) next = 'stage --families';
  else if (!mapped)
    next =
      FAMILY_SPECS[product.family].route === 'channel'
        ? 'handoff → map in Prodigi → mapped --family'
        : 'mapped --family phone-case';
  else if (!product.released) next = 'owner reviews → release --family';
  return {current, mapped, next, released: product.released === true, staged};
}

/** Alt text of a product's preview image. */
export function familyImageAlt(product, {collection, registry = ART_REGISTRY}) {
  const print = collection.prints.find((entry) => entry.slug === product.print);
  const {artist} = museumSource(print, registry);
  const noun = FAMILY_SPECS[product.family].noun;
  return `${print.title} by ${artist.name} as a ${product.family === 'phone-case' ? 'matte tough phone case, shown on iPhone 16 Pro' : noun}`;
}

/** One handoff row per channel-mapped product (single-variant families). */
export function familyHandoffRows(
  products,
  {launchRoot, collection, sha256, artCollection},
) {
  return products
    .filter((product) => FAMILY_SPECS[product.family].route === 'channel')
    .flatMap((product) =>
      product.variants.map((variant) => {
        const file = path.join(launchRoot, product.assets.print.path);
        return {
          product: product.title,
          family: product.family,
          handle: product.handle,
          sku: variant.sku,
          shopifyProductId: product.shopify?.productId ?? '',
          shopifyVariantId: product.shopify?.variantIds?.[variant.key] ?? '',
          option: variant.option,
          providerSku: variant.providerSku,
          settings:
            artCollection.families[product.family]?.providerSettings ?? '',
          printFile: file.replaceAll('\\', '/'),
          pixels: `${product.assets.print.width}x${product.assets.print.height}`,
          dpi: product.assets.print.dpi ?? '',
          ppi: product.assets.ppi,
          sha256: sha256(file),
          recordedSha256: product.assets.print.sha256,
          prodigiChannelProductId: variant.mapping.channelProductId ?? '',
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
    if (FAMILY_SPECS[family].route === 'api' && id !== undefined)
      throw new Error(`"${pair}": phone cases have no channel product id`);
    return {id: id ?? null, slug};
  });
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
        const rendered =
          key === 'variants' && Array.isArray(entry) && entry.length
            ? `[\n${entry.map((variant) => `${indent}    ${JSON.stringify(variant)}`).join(',\n')}\n${indent}  ]`
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
