/* eslint-disable no-console */

/**
 * The family steps of scripts/product.mjs: the same verbs as prints, for
 * museum works as framed prints, canvas, greeting cards, postcards and tough
 * phone cases (one Shopify Draft per artwork per family). Selected with
 * `--families` (all five) or `--family <f>[,<f>]`:
 *
 *   npm run product -- status   <collection> --families
 *   npm run product -- prepare  <collection> --families [--only a,b]
 *   npm run product -- stage    <collection> --families [--only a,b] [--apply]
 *   npm run product -- handoff  <collection> --families
 *   npm run product -- mapped   <collection> --family <f> <print>=<prodigi id> …
 *   npm run product -- mapped   <collection> --family phone-case <print> …
 *   npm run product -- release  <collection> --family <f> [--only a,b] [--apply]
 *   npm run product -- verify   <collection> --families [--origin https://…]
 *
 * Only data/art-product-catalog.json and files under the launch folder (and,
 * for `mapped --family phone-case`, the deploy copy under public/print-files/)
 * are written locally; data/print-catalog.json is read, never written.
 */

import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import {
  casePrintUrlPath,
  FAMILY_SPECS,
  validateArtProductCatalog,
} from '../../app/lib/artProductCatalog.ts';
import {findArtwork, masterSize} from '../../app/lib/artRegistry.ts';
import toughCaseManifest from '../../data/art-tough-phone-case.json' with {type: 'json'};
import {
  artMatchError,
  caseMasks,
  describeFile,
  findCaseTemplate,
  renderFamilyFile,
  renderFamilyPreview,
  sha256 as hashBuffer,
} from './art-product-assets.mjs';
import {
  ART_CATALOG_PATH,
  assetIssues,
  buildFamilyProductInput,
  casePublicFile,
  descriptionText,
  familyAssetPlan,
  familyHandoffRows,
  familyImageAlt,
  familyReadbackIssues,
  familyReleaseBlockers,
  familyStageAction,
  familyStatus,
  familySummary,
  findArtCollection,
  formatArtProductCatalog,
  FRAMED_PRINT_SIZE,
  parseFamilyMappings,
  recordFamilyIds,
  selectFamilyProducts,
  syncFamilyProducts,
  unverifyFamilyMappings,
} from './art-product-pipeline.mjs';
import {borderedLayout} from './museum-layout.mjs';
import {mutationErrors} from './admin.mjs';
import {PENDING_TAGS, toCsv} from './product-pipeline.mjs';
import {PREVIEW_DEVICE} from '../generate-tough-case-assets.mjs';

/** Largest acceptable mean difference between a panel and its crop (0–255). */
const MAX_ART_MATCH_ERROR = 4;

const PRODUCT_FIELDS = `
  id handle title vendor productType status tags totalInventory descriptionHtml
  seo { title description }
  featuredMedia { id status mediaContentType ... on MediaImage { image { url width height } } }
  media(first: 10) { nodes { id alt status mediaContentType } }
  variants(first: 50) { nodes { id sku price taxable inventoryPolicy selectedOptions { name value } inventoryItem { tracked requiresShipping } } }
`;

const fileSha = (file) =>
  createHash('sha256').update(readFileSync(file)).digest('hex');

export function createFamilySteps({
  apply,
  collection,
  families,
  helpers,
  launchDir,
  launchRoot,
  only,
  option,
  positional,
}) {
  const artCatalog = JSON.parse(readFileSync(ART_CATALOG_PATH, 'utf8'));
  const invalid = validateArtProductCatalog(artCatalog);
  if (invalid.length)
    throw new Error(
      `data/art-product-catalog.json is invalid:\n- ${invalid.join('\n- ')}`,
    );
  const artCollection = findArtCollection(artCatalog, collection.slug);
  const selected = () =>
    selectFamilyProducts(artCatalog, collection, {families, only});
  const absolute = (relativePath) =>
    path.join(launchRoot, ...relativePath.split('/'));

  function saveArtCatalog() {
    const problems = validateArtProductCatalog(artCatalog);
    if (problems.length)
      throw new Error(
        `refusing to write an invalid data/art-product-catalog.json:\n- ${problems.join('\n- ')}`,
      );
    writeFileSync(ART_CATALOG_PATH, formatArtProductCatalog(artCatalog));
  }

  function writeJson(name, value) {
    const file = path.join(launchDir, name);
    helpers.writeJson(file, value);
    return file;
  }

  /** The recorded print file still exists with its recorded checksum. */
  function assetsOnDisk(product) {
    if (!product.assets) return false;
    const files = [product.assets.print, product.assets.preview].map((entry) =>
      absolute(entry.path),
    );
    return (
      files.every((file) => existsSync(file)) &&
      fileSha(files[0]) === product.assets.print.sha256 &&
      fileSha(files[1]) === product.assets.preview.sha256
    );
  }

  function requirePrepared(products) {
    const stale = products.filter(
      (product) => !familyStatus(product).current || !assetsOnDisk(product),
    );
    assert.equal(
      stale.length,
      0,
      `assets missing or stale for ${stale.map((p) => p.handle).join(', ')} — run npm run product -- prepare ${collection.slug} --families`,
    );
  }

  // --------------------------------------------------------------- status --

  function status() {
    const products = selected();
    if (!products.length) {
      console.log(
        `No ${families.join('/')} products for ${collection.slug} yet. Next: npm run product -- prepare ${collection.slug} --families`,
      );
      return;
    }
    console.log(`\n${collection.title} (${collection.slug}) — families`);
    console.table(familySummary(products));
    console.table(
      products.map((product) => {
        const onDisk = assetsOnDisk(product);
        const state = familyStatus(product);
        return {
          handle: product.handle,
          ppi: product.assets?.ppi ?? '',
          assets: state.current && onDisk ? 'current' : 'missing/stale',
          staged: state.staged,
          mapped: state.mapped,
          released: state.released,
          next: state.current && !onDisk ? 'prepare --families' : state.next,
        };
      }),
    );
  }

  // -------------------------------------------------------------- prepare --

  async function prepare() {
    const prints = only?.length
      ? collection.prints.filter((print) => only.includes(print.slug))
      : collection.prints;
    const {added, refreshed} = syncFamilyProducts(artCatalog, collection, {
      families,
      prints,
    });
    const products = selected();

    // The framed print reuses `prepare`'s bordered 16×20 file: it must be
    // the current one in its asset report.
    const reportPath = path.join(launchDir, 'asset-validation.json');
    const printReport = existsSync(reportPath)
      ? JSON.parse(readFileSync(reportPath, 'utf8'))
      : null;
    const originals = new Map();
    const checkOriginal = (plan) => {
      if (!originals.has(plan.source.file)) {
        assert.ok(
          existsSync(plan.source.file),
          `${plan.source.file} is missing; re-run npm run museum -- fetch for ${plan.artworkId}`,
        );
        originals.set(plan.source.file, fileSha(plan.source.file));
      }
      assert.equal(
        originals.get(plan.source.file),
        plan.source.sha256,
        `${plan.source.file}: checksum differs from the registry; re-fetch it`,
      );
    };
    let masks = null;
    if (products.some((product) => product.family === 'phone-case')) {
      const device = toughCaseManifest.phones.find(
        (phone) => phone.code === PREVIEW_DEVICE,
      );
      masks = await caseMasks(findCaseTemplate(device));
    }

    const plans = [];
    const rows = [];
    const problems = [];
    for (const product of products) {
      const artwork = findArtwork(product.artworkId);
      const framedPpi =
        product.family === 'framed-print'
          ? borderedLayout(masterSize(artwork), FRAMED_PRINT_SIZE).nativePpi
          : undefined;
      const plan = familyAssetPlan(product, {
        collection,
        framedPpi,
        launchRoot,
      });
      plans.push(plan);
      checkOriginal(plan);

      let printBuffer;
      let rendered = false;
      const reusable =
        product.assets?.sourceSignature === plan.sourceSignature &&
        product.assets.print.path === plan.output.path &&
        assetsOnDisk(product);
      if (plan.output.reused) {
        assert.ok(
          existsSync(plan.output.file),
          `${plan.output.file} is missing — run npm run product -- prepare ${collection.slug} (prints) first`,
        );
        printBuffer = readFileSync(plan.output.file);
        const recorded = printReport?.files
          ?.find((file) => file.slug === product.print)
          ?.sizes.find((size) => size.size === FRAMED_PRINT_SIZE);
        if (!recorded)
          problems.push(
            `${product.handle}: ${FRAMED_PRINT_SIZE} is not in ${reportPath}`,
          );
        else if (recorded.sha256 !== hashBuffer(printBuffer))
          problems.push(
            `${product.handle}: ${path.basename(plan.output.file)} is not the file prepare last recorded`,
          );
      } else if (reusable) {
        printBuffer = readFileSync(plan.output.file);
      } else {
        printBuffer = await renderFamilyFile(plan);
        mkdirSync(path.dirname(plan.output.file), {recursive: true});
        writeFileSync(plan.output.file, printBuffer);
        rendered = true;
      }
      const file = await describeFile(printBuffer);
      problems.push(...assetIssues(plan, file));
      if (file.space !== 'srgb' || file.channels !== 3)
        problems.push(`${product.handle}: file is not 3-channel sRGB`);
      const matchError = plan.extract
        ? await artMatchError(plan, printBuffer)
        : null;
      if (matchError !== null && matchError > MAX_ART_MATCH_ERROR)
        problems.push(
          `${product.handle}: artwork panel differs from its crop (mean ${matchError}/255)`,
        );

      let previewBuffer;
      if (reusable && existsSync(plan.preview.file))
        previewBuffer = readFileSync(plan.preview.file);
      else {
        previewBuffer = await renderFamilyPreview(plan, printBuffer, {masks});
        mkdirSync(path.dirname(plan.preview.file), {recursive: true});
        writeFileSync(plan.preview.file, previewBuffer);
      }
      const preview = await describeFile(previewBuffer);
      if (
        preview.width !== plan.preview.width ||
        preview.height !== plan.preview.height
      )
        problems.push(
          `${product.handle}: preview is not ${plan.preview.width}×${plan.preview.height}`,
        );

      const previous = product.assets?.print.sha256;
      if (previous && previous !== file.sha256)
        unverifyFamilyMappings(
          product,
          `print file changed ${new Date().toISOString().slice(0, 10)}; re-map`,
        );
      product.assets = {
        box: plan.box,
        ppi: plan.ppi,
        preparedAt:
          !rendered && product.assets?.preparedAt
            ? product.assets.preparedAt
            : new Date().toISOString(),
        preview: {
          height: preview.height,
          path: plan.preview.path,
          sha256: preview.sha256,
          width: preview.width,
        },
        print: {
          dpi: Math.round(file.dpi),
          height: file.height,
          path: plan.output.path,
          sha256: file.sha256,
          width: file.width,
        },
        sourceSignature: plan.sourceSignature,
      };
      rows.push({
        handle: product.handle,
        family: product.family,
        pixels: `${file.width}×${file.height}`,
        dpi: Math.round(file.dpi),
        ppi: plan.ppi,
        minPpi: plan.minPpi,
        artMatch: matchError ?? 'whole print',
        file: rendered
          ? 'rendered'
          : plan.output.reused
            ? 'reused print'
            : 'current',
        sha256: file.sha256.slice(0, 12),
      });
    }
    if (problems.length)
      throw new Error(
        `Assets failed their checks:\n- ${problems.join('\n- ')}`,
      );
    saveArtCatalog();

    const byFamily = families
      .map((family) => {
        const ppis = rows
          .filter((row) => row.family === family)
          .map((row) => row.ppi);
        return ppis.length
          ? {
              family,
              files: ppis.length,
              minPpi: Math.min(...ppis),
              maxPpi: Math.max(...ppis),
              accepted: FAMILY_SPECS[family].minPpi,
              file: `${products.find((p) => p.family === family).assets.print.width}×${products.find((p) => p.family === family).assets.print.height} @ ${FAMILY_SPECS[family].file.dpi} dpi (${family === 'framed-print' || family === 'canvas' ? 'in the work’s orientation' : 'fixed'})`,
            }
          : null;
      })
      .filter(Boolean);
    writeJson('families-plan.json', {
      collection: collection.slug,
      families,
      launchRoot: launchRoot.replaceAll('\\', '/'),
      plans: plans.map((plan) => ({
        ...plan,
        output: {...plan.output, file: plan.output.file.replaceAll('\\', '/')},
        preview: {
          ...plan.preview,
          file: plan.preview.file.replaceAll('\\', '/'),
        },
        source: {...plan.source, file: plan.source.file.replaceAll('\\', '/')},
      })),
    });
    writeJson('families-assets.json', {
      collection: collection.slug,
      checkedAt: new Date().toISOString(),
      maxArtMatchError: MAX_ART_MATCH_ERROR,
      summary: byFamily,
      files: rows,
      generatedPixels: false,
      note: 'Cropped families cut the approved crop from the museum original and resample it; the framed print reuses the bordered 16x20 print file byte for byte.',
    });
    console.table(rows);
    console.table(byFamily);
    if (added.length || refreshed.length)
      console.log(
        `Catalog: ${added.length} product(s) added, ${refreshed.length} refreshed in data/art-product-catalog.json.`,
      );
    console.log(
      `Files: ${path.join(launchDir, '<family>')} (+ web/ previews). Plan and report: families-plan.json, families-assets.json. Next: stage --families (dry run).`,
    );
  }

  // ---------------------------------------------------------------- stage --

  async function lookupHandles(admin, handles) {
    const found = new Map();
    for (const handle of handles) {
      const {data} = await admin(
        `query FamilyByHandle($handle: String!) {
          productByIdentifier(identifier: {handle: $handle}) {
            id handle status vendor
            media(first: 5) { nodes { id status } }
            variants(first: 50) { nodes { id sku } }
          }
        }`,
        {handle},
      );
      if (data.productByIdentifier) found.set(handle, data.productByIdentifier);
    }
    return found;
  }

  /** Fresh Admin readback, eight products per query to stay under the cost limit. */
  async function readProducts(admin, ids) {
    const nodes = [];
    for (let start = 0; start < ids.length; start += 8) {
      const {data} = await admin(
        `query FamilyReadback($ids: [ID!]!) { nodes(ids: $ids) { ... on Product { ${PRODUCT_FIELDS} } } }`,
        {ids: ids.slice(start, start + 8)},
      );
      nodes.push(...data.nodes);
    }
    return nodes;
  }

  async function waitForPreview(admin, ids) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const nodes = await readProducts(admin, ids);
      if (
        nodes.every(
          (node) =>
            node?.featuredMedia?.status === 'READY' &&
            node.media.nodes.every((media) => media.status === 'READY'),
        ) ||
        nodes.some((node) =>
          node?.media.nodes.some((media) => media.status === 'FAILED'),
        )
      )
        return nodes;
      await helpers.delay(1500);
    }
    return readProducts(admin, ids);
  }

  async function stage() {
    const products = selected();
    assert.ok(
      products.length,
      `no products — run npm run product -- prepare ${collection.slug} --families first`,
    );
    requirePrepared(products);
    const work = products.map((product) => ({
      input: buildFamilyProductInput(product, {artCollection, collection}),
      product,
    }));
    const admin = await helpers.adminClient();
    const before = await helpers.vendorProducts(admin);
    const lookups = await lookupHandles(
      admin,
      work.map(({input}) => input.handle),
    );
    for (const entry of work) {
      entry.found = lookups.get(entry.input.handle) ?? null;
      if (entry.product.released) {
        entry.action = 'released (left alone)';
        continue;
      }
      entry.action = familyStageAction(
        entry.product,
        entry.input,
        entry.found,
      ).action;
    }
    const summary = familySummary(products);
    console.table(
      work.map(({input, action, product}) => ({
        handle: input.handle,
        action:
          action === 'create'
            ? 'create Draft'
            : action === 'present'
              ? 'already a Draft'
              : action,
        type: input.productType,
        variants: input.variants.length,
        price: product.variants[0].priceEUR,
        firstSku: input.variants[0].sku,
      })),
    );
    console.table(summary);
    const planned = new Set(work.map(({input}) => input.handle));
    const unrelated = before.filter((product) => !planned.has(product.handle));

    if (!apply) {
      const file = writeJson(`stage-families-dry-run-${helpers.stamp()}.json`, {
        dryRun: true,
        collection: collection.slug,
        families,
        summary,
        totals: {
          products: work.length,
          variants: work.reduce(
            (sum, {input}) => sum + input.variants.length,
            0,
          ),
          create: work.filter(({action}) => action === 'create').length,
          present: work.filter(({action}) => action === 'present').length,
          attachPreview: work.filter(({action}) => action === 'attach preview')
            .length,
        },
        existingVendorProducts: before.length,
        unrelatedProductsToCompare: unrelated.length,
        actions: work.map(({action, found, input, product}) => ({
          action,
          existingId: found?.id ?? null,
          handle: input.handle,
          preview: product.assets.preview.path,
          previewSha256: product.assets.preview.sha256,
          printFile: product.assets.print.path,
          printSha256: product.assets.print.sha256,
        })),
        inputs: work.map(({input, product}) => ({
          ...input,
          files: [
            {
              alt: familyImageAlt(product, {collection}),
              contentType: 'IMAGE',
              filename: `cm-${collection.slug}-${product.handle}.webp`,
              originalSource: '<staged upload of the preview>',
            },
          ],
        })),
      });
      console.log(
        `Dry run — nothing written to Shopify. ${work.length} product(s), ${unrelated.length} unrelated Clara Mendes products would be compared. Saved ${file}. Re-run with --apply to create the Drafts.`,
      );
      return;
    }

    const created = [];
    for (const entry of work) {
      const {input, product} = entry;
      if (entry.action === 'create' || entry.action === 'attach preview') {
        const filename = `cm-${collection.slug}-${product.handle}.webp`;
        const resourceUrl = await helpers.uploadImage(
          admin,
          absolute(product.assets.preview.path),
          filename,
        );
        const file = {
          alt: familyImageAlt(product, {collection}),
          contentType: 'IMAGE',
          filename,
          originalSource: resourceUrl,
        };
        if (entry.action === 'create') {
          const result = await admin(
            `mutation StageFamily($input: ProductSetInput!) {
              productSet(input: $input, synchronous: true) {
                product { id handle status variants(first: 50) { nodes { id sku } } }
                userErrors { code field message }
              }
            }`,
            {input: {...input, files: [file]}},
          );
          mutationErrors(result.data.productSet, `Create ${input.handle}`);
          const live = result.data.productSet.product;
          assert.equal(live.status, 'DRAFT');
          assert.equal(
            live.handle,
            input.handle,
            'Shopify changed the handle — a product with this handle may already exist.',
          );
          entry.found = live;
          created.push(live.handle);
          console.log(`CREATED DRAFT ${live.handle} ${live.id}`);
        } else {
          assert.equal(entry.found.status, 'DRAFT');
          const result = await admin(
            `mutation AttachFamilyPreview($product: ProductUpdateInput!, $media: [CreateMediaInput!]) {
              productUpdate(product: $product, media: $media) { product { id } userErrors { field message } }
            }`,
            {
              media: [
                {
                  alt: file.alt,
                  mediaContentType: 'IMAGE',
                  originalSource: resourceUrl,
                },
              ],
              product: {id: entry.found.id},
            },
          );
          mutationErrors(result.data.productUpdate, `Attach ${input.handle}`);
          console.log(`ATTACHED PREVIEW ${input.handle}`);
        }
      }
      if (entry.found) {
        recordFamilyIds(product, entry.found);
        // Ids are written as soon as they exist, so a re-run after a
        // partial create finds the Drafts by handle and never duplicates.
        saveArtCatalog();
      }
    }

    // Nothing else in the catalogue may move because of a launch.
    const after = await helpers.vendorProducts(admin);
    for (const old of unrelated)
      assert.deepEqual(
        after.find((product) => product.id === old.id),
        old,
        `Existing product changed during staging: ${old.handle}`,
      );
    const readback = await waitForPreview(
      admin,
      work
        .filter(({product}) => product.shopify?.productId)
        .map(({product}) => product.shopify.productId),
    );
    const issues = [];
    for (const {input, product} of work) {
      if (product.released) continue;
      const live = readback.find(
        (node) => node?.id === product.shopify?.productId,
      );
      issues.push(...familyReadbackIssues(input, live));
      if (live && live.featuredMedia?.status !== 'READY')
        issues.push(
          `${input.handle}: preview image is ${live.featuredMedia?.status ?? 'missing'}`,
        );
    }
    const file = writeJson(`stage-families-${helpers.stamp()}.json`, {
      collection: collection.slug,
      families,
      created,
      summary,
      unrelatedProductsChecked: unrelated.length,
      unrelatedProductsUnchanged: true,
      readbackIssues: issues,
      readback,
    });
    assert.equal(
      issues.length,
      0,
      `Readback differs from the catalog (evidence ${file}):\n- ${issues.join('\n- ')}`,
    );
    console.log(
      `\nStaged ${created.length} new Draft(s); ${work.length} verified on a fresh readback, ${unrelated.length} unrelated products unchanged. Ids written to data/art-product-catalog.json; evidence ${file}. Next: handoff --families.`,
    );
  }

  // -------------------------------------------------------------- handoff --

  function handoff() {
    const products = selected().filter(
      (product) => FAMILY_SPECS[product.family].route === 'channel',
    );
    assert.ok(products.length, 'no channel-mapped family products selected');
    for (const product of products) {
      assert.ok(
        product.shopify?.productId,
        `${product.handle}: run stage --families --apply first (no Shopify ids)`,
      );
      assert.ok(
        product.assets,
        `${product.handle}: run prepare --families first`,
      );
    }
    const rows = familyHandoffRows(products, {
      artCollection,
      collection,
      launchRoot,
      sha256: (file) => {
        assert.ok(existsSync(file), `Missing ${file} — run prepare --families`);
        return fileSha(file);
      },
    });
    const stale = rows.filter((row) => row.sha256 !== row.recordedSha256);
    assert.equal(
      stale.length,
      0,
      `files changed since prepare: ${stale.map((row) => row.handle).join(', ')}`,
    );
    writeFileSync(
      path.join(launchDir, 'prodigi-handoff-families.csv'),
      toCsv(rows),
    );
    writeFileSync(
      path.join(launchDir, 'prodigi-handoff-families.md'),
      [
        `# Prodigi mapping — ${collection.title} framed prints, canvas, cards and postcards`,
        '',
        'Prodigi dashboard → Sales channels → Clara Mendes → Products. Each row is its',
        'own Shopify product (one variant). Per row: the Prodigi SKU and settings',
        'listed, its own file from the Image library, then "Fulfilled by Prodigi',
        'automatically". Re-read on a fresh load, then record the channel product id:',
        `\`npm run product -- mapped ${collection.slug} --family <family> <print>=<id> …\`.`,
        'Phone cases are not mapped here (orders/paid webhook → Prodigi API).',
        '',
        '| Product | SKU | Prodigi SKU | Settings | File | Pixels | Mapped |',
        '| --- | --- | --- | --- | --- | --- | --- |',
        ...rows.map(
          (row) =>
            `| ${row.product} | ${row.sku} | ${row.providerSku} | ${row.settings} | ${path.basename(row.printFile)} | ${row.pixels} @ ${row.dpi} dpi | ${row.verified ? `yes (${row.prodigiChannelProductId})` : 'no'} |`,
        ),
        '',
        `Files: \`${launchDir.replaceAll('\\', '/')}/<family>/\` (framed prints use \`print/*-16x20-300dpi.jpg\`, the same files as the 16×20 prints).`,
        '',
        'Known dashboard traps (docs/add-products-runbook.md §Prodigi): upload from the',
        'Image library page (files over 10 MB need the injected upload); both modals',
        'drop the first typed search; keep the tab visible; confirm shipping on a reload.',
        '',
      ].join('\n'),
    );
    console.table(
      rows.map(({handle, sku, providerSku, pixels, verified}) => ({
        handle,
        sku,
        providerSku,
        pixels,
        verified,
      })),
    );
    console.log(
      `Handoff written to ${launchDir} (prodigi-handoff-families.csv/.md)`,
    );
  }

  // --------------------------------------------------------------- mapped --

  function mapped() {
    assert.equal(
      families.length,
      1,
      'mapped records one family at a time: pass --family <family>',
    );
    const [family] = families;
    const today = new Date().toISOString().slice(0, 10);
    for (const {slug, id} of parseFamilyMappings(
      collection,
      family,
      positional.slice(1),
    )) {
      const product = artCatalog.products.find(
        (entry) =>
          entry.collection === collection.slug &&
          entry.print === slug &&
          entry.family === family,
      );
      assert.ok(
        product,
        `${slug}: no ${family} product — run prepare --families`,
      );
      assert.ok(
        product.shopify?.productId,
        `${product.handle}: not staged in Shopify`,
      );
      assert.ok(
        familyStatus(product).current && assetsOnDisk(product),
        `${product.handle}: assets are stale — prepare, upload and map the current file`,
      );
      const assetSha256 = product.assets.print.sha256;
      if (FAMILY_SPECS[family].route === 'api') {
        // The webhook sends this URL to Prodigi; the release PR deploys it.
        const target = casePublicFile(product);
        mkdirSync(path.dirname(target), {recursive: true});
        copyFileSync(absolute(product.assets.print.path), target);
        assert.equal(fileSha(target), assetSha256);
        for (const variant of product.variants)
          variant.mapping = {
            assetSha256,
            printUrlPath: casePrintUrlPath(product),
            verified: true,
            verifiedAt: today,
          };
        console.log(
          `${product.handle}: ${product.variants.length} device SKUs → Prodigi API with ${casePrintUrlPath(product)} (commit public${casePrintUrlPath(product)})`,
        );
      } else {
        for (const variant of product.variants)
          variant.mapping = {
            assetSha256,
            channelProductId: id,
            verified: true,
            verifiedAt: today,
          };
        console.log(`${product.handle} → Prodigi channel product ${id}`);
      }
    }
    saveArtCatalog();
  }

  // -------------------------------------------------------------- release --

  async function release() {
    const products = selected();
    assert.ok(products.length, 'no family products selected');
    const blocked = products
      .map((product) => ({
        handle: product.handle,
        issues: familyReleaseBlockers(product),
      }))
      .filter((entry) => entry.issues.length);
    if (blocked.length)
      throw new Error(
        `not releasable:\n- ${blocked.map((entry) => `${entry.handle}: needs ${entry.issues.join(', ')}`).join('\n- ')}`,
      );
    requirePrepared(products);
    for (const product of products.filter((p) => p.family === 'phone-case')) {
      const target = casePublicFile(product);
      assert.ok(
        existsSync(target) && fileSha(target) === product.assets.print.sha256,
        `${product.handle}: public${casePrintUrlPath(product)} is missing or stale — run mapped --family phone-case`,
      );
    }
    const admin = await helpers.adminClient();
    const ids = products.map((product) => product.shopify.productId);
    const before = await readProducts(admin, ids);
    const work = products.map((product) => {
      const live = before.find(
        (node) => node?.id === product.shopify.productId,
      );
      assert.ok(live, `${product.handle}: Shopify product not found`);
      assert.equal(live.handle, product.handle);
      assert.ok(
        live.status === 'DRAFT' ||
          (live.status === 'ACTIVE' && product.released),
        `${product.handle}: expected DRAFT before release, found ${live.status}`,
      );
      assert.equal(
        live.featuredMedia?.status,
        'READY',
        `${product.handle}: preview image not READY`,
      );
      for (const variant of product.variants) {
        const node = live.variants.nodes.find(
          (entry) => entry.id === product.shopify.variantIds[variant.key],
        );
        assert.ok(node, `${product.handle} ${variant.key}: variant not found`);
        assert.equal(node.sku, variant.sku);
        assert.equal(
          node.price,
          variant.priceEUR,
          `${product.handle} ${variant.key}: price differs`,
        );
      }
      return {
        activate: live.status !== 'ACTIVE',
        live,
        product,
        untag: live.tags.filter((tag) => PENDING_TAGS.includes(tag)),
        untrack: live.variants.nodes.filter(
          (node) =>
            node.inventoryItem.tracked || node.inventoryPolicy !== 'DENY',
        ),
      };
    });
    console.table(
      work.map(({activate, live, product, untag, untrack}) => ({
        handle: product.handle,
        status: live.status,
        untrackVariants: untrack.length,
        removeTags: untag.length,
        activate,
        flipReleased: !product.released,
      })),
    );
    console.log(
      'Before --apply: the products must be in the right Shopify shipping profile (cards and postcards: Letter post, EU only; canvas: the canvas profile; framed: a framed profile; cases: the phone-case profile) — new products land in General. See docs/add-products-runbook.md.',
    );
    if (!apply) {
      console.log('Dry run — nothing written. Re-run with --apply to release.');
      return;
    }

    for (const {live, product, untag, untrack, activate} of work) {
      if (untrack.length) {
        const result = await admin(
          `mutation UntrackFamily($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
            productVariantsBulkUpdate(productId: $productId, variants: $variants) { userErrors { field message } }
          }`,
          {
            productId: live.id,
            variants: untrack.map((node) => ({
              id: node.id,
              inventoryItem: {tracked: false},
              inventoryPolicy: 'DENY',
            })),
          },
        );
        mutationErrors(
          result.data.productVariantsBulkUpdate,
          `Untrack ${product.handle}`,
        );
      }
      if (untag.length) {
        const result = await admin(
          `mutation UntagFamily($id: ID!, $tags: [String!]!) { tagsRemove(id: $id, tags: $tags) { userErrors { field message } } }`,
          {id: live.id, tags: untag},
        );
        mutationErrors(result.data.tagsRemove, `Untag ${product.handle}`);
      }
      if (activate) {
        const result = await admin(
          `mutation ActivateFamily($product: ProductUpdateInput!) { productUpdate(product: $product) { product { id status } userErrors { field message } } }`,
          {product: {id: live.id, status: 'ACTIVE'}},
        );
        mutationErrors(result.data.productUpdate, `Activate ${product.handle}`);
      }
    }
    const publication = await helpers.publish(admin, collection, ids);
    const after = await readProducts(admin, ids);
    for (const {product} of work) {
      const live = after.find((node) => node?.id === product.shopify.productId);
      assert.equal(live.status, 'ACTIVE');
      assert.ok(!live.tags.some((tag) => PENDING_TAGS.includes(tag)));
      assert.ok(
        live.variants.nodes.every(
          (node) => node.inventoryItem.tracked === false,
        ),
      );
      const expected = buildFamilyProductInput(product, {
        artCollection,
        collection,
      });
      assert.equal(
        descriptionText(live.descriptionHtml),
        descriptionText(expected.descriptionHtml),
      );
    }
    const storefront = await storefrontProducts(products);
    const unavailable = [];
    for (const product of products) {
      const entry = storefront.find(
        (candidate) => candidate.handle === product.handle,
      );
      for (const variant of product.variants) {
        const node = entry?.variants.find(
          (candidate) => candidate.sku === variant.sku,
        );
        if (
          !node?.availableForSale ||
          Number(node.price.amount) !== Number(variant.priceEUR) ||
          node.price.currencyCode !== 'EUR'
        )
          unavailable.push(`${product.handle}/${variant.key}`);
      }
    }
    writeJson(`release-families-${helpers.stamp()}.json`, {
      after,
      before,
      publication,
      storefront,
    });
    if (unavailable.length) {
      console.log(
        `\nActive in Shopify, but not yet sellable through the Storefront API: ${unavailable.slice(0, 12).join(', ')}${unavailable.length > 12 ? ` … (${unavailable.length})` : ''}.\n` +
          (publication.manual
            ? `Publish by hand — Admin → Products → filter tag "${collection.title}" → select the family products → ⋯ → Include in sales channels → ${collection.publications.join(' + ')} — then re-run this command.`
            : 'Re-run this command in a minute; publication can lag.') +
          '\n`released` was NOT flipped.',
      );
      process.exitCode = 1;
      return;
    }
    for (const product of products) {
      product.released = true;
      for (const variant of product.variants)
        variant.inventory = {policy: 'DENY', quantity: 0, tracked: false};
    }
    saveArtCatalog();
    console.log(
      '\nReleased and sellable through the Storefront API; `released` written to data/art-product-catalog.json. Commit it (and public/print-files/ for cases), merge the PR, deploy, then run verify --families.',
    );
  }

  async function storefrontProducts(products) {
    const results = [];
    for (const product of products) {
      const data = await helpers.storefront(
        `query VerifyFamily($handle: String!) {
          product(handle: $handle) { handle availableForSale variants(first: 50) { nodes { id sku availableForSale price { amount currencyCode } } } }
        }`,
        {handle: product.handle},
      );
      results.push({
        availableForSale: data.product?.availableForSale === true,
        handle: product.handle,
        variants: data.product?.variants.nodes ?? [],
      });
    }
    return results;
  }

  // --------------------------------------------------------------- verify --

  async function verify() {
    const origin = (option('origin') ?? helpers.defaultOrigin).replace(
      /\/$/,
      '',
    );
    const products = selected();
    const released = products.filter((product) => product.released);
    const staged = products.filter((product) => !product.released);
    const checks = [];
    const check = (subject, name, ok, detail = '') =>
      checks.push({check: name, detail, ok: Boolean(ok), subject});
    const storefront = await storefrontProducts(released);
    const sitemap = await helpers.sitemapProductUrls(origin);
    for (const product of released) {
      const entry = storefront.find(
        (candidate) => candidate.handle === product.handle,
      );
      check(
        product.handle,
        'storefront: available for sale',
        entry?.availableForSale,
      );
      const wrong = product.variants.filter((variant) => {
        const node = entry?.variants.find(
          (candidate) => candidate.sku === variant.sku,
        );
        return (
          !node?.availableForSale ||
          Number(node.price.amount) !== Number(variant.priceEUR)
        );
      });
      check(
        product.handle,
        `storefront: ${product.variants.length} variant(s) at €${product.variants[0].priceEUR}`,
        wrong.length === 0,
        wrong.length ? `${wrong.length} unavailable or mispriced` : '',
      );
      const first = entry?.variants.find((node) => node.availableForSale);
      if (first) {
        const cart = await helpers.addToCart(first.id);
        check(
          product.handle,
          'cart: add to cart',
          cart.quantity === 1 && !cart.errors.length,
          cart.errors.join('; ') || `subtotal ${cart.subtotal}`,
        );
      }
      const pdp = await helpers.page(`${origin}/products/${product.handle}`);
      check(
        product.handle,
        'PDP: 200 with title',
        pdp.status === 200 &&
          pdp.body.includes(helpers.htmlText(product.title)),
        `HTTP ${pdp.status}`,
      );
      check(
        product.handle,
        'sitemap: listed',
        sitemap.some((url) => url.endsWith(`/products/${product.handle}`)),
      );
      if (product.family === 'phone-case') {
        const response = await fetch(`${origin}${casePrintUrlPath(product)}`);
        const body = response.ok
          ? Buffer.from(await response.arrayBuffer())
          : null;
        check(
          product.handle,
          'case print file deployed with the recorded sha256',
          body && hashBuffer(body) === product.assets.print.sha256,
          `HTTP ${response.status}`,
        );
      }
    }
    for (const product of staged) {
      const pdp = await helpers.page(`${origin}/products/${product.handle}`);
      check(
        product.handle,
        'staged: PDP not served',
        pdp.status !== 200,
        `HTTP ${pdp.status}`,
      );
      check(
        product.handle,
        'staged: not in sitemap',
        !sitemap.some((url) => url.endsWith(`/products/${product.handle}`)),
      );
    }
    console.table(
      checks.map(({check: name, detail, ok, subject}) => ({
        subject,
        check: name,
        result: ok ? 'PASS' : 'FAIL',
        detail,
      })),
    );
    const failed = checks.filter((entry) => !entry.ok);
    writeJson(`verify-families-${helpers.stamp()}.json`, {
      checks,
      failed: failed.length,
      origin,
      passed: checks.length - failed.length,
    });
    console.log(
      `${checks.length - failed.length}/${checks.length} checks passed against ${origin}. Screenshots of the artist shop (Product type filter), one PDP per family and the cart are still owed.`,
    );
    if (failed.length) process.exitCode = 1;
  }

  return {handoff, mapped, prepare, release, stage, status, verify};
}

/* eslint-enable no-console */
