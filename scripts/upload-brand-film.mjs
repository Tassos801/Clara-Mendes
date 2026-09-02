#!/usr/bin/env node
// Stages the rendered brand film and its poster into Shopify Files and
// prints their CDN URLs. Dry by default; pass --apply to upload.
//
//   node scripts/upload-brand-film.mjs            # checks the files exist
//   node scripts/upload-brand-film.mjs --apply    # uploads, polls, prints URLs
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolveAdminClient} from './lib/admin.mjs';
import {envWithAdminDefaults} from './lib/env.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APPLY = process.argv.includes('--apply');

const FILES = [
  {
    key: 'video',
    file: path.join(ROOT, 'video/out/introducing-clara-mendes.mp4'),
    mimeType: 'video/mp4',
    resource: 'VIDEO',
    contentType: 'VIDEO',
    alt: 'Introducing Clara Mendes — silent 45-second brand film',
  },
  {
    key: 'poster',
    file: path.join(ROOT, 'video/out/introducing-clara-mendes-poster.jpg'),
    mimeType: 'image/jpeg',
    resource: 'IMAGE',
    contentType: 'IMAGE',
    alt: 'Introducing Clara Mendes — poster frame',
  },
];

const STAGE = `#graphql
  mutation StageBrandFilm($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        parameters { name value }
        resourceUrl
        url
      }
      userErrors { field message }
    }
  }
`;

const CREATE = `#graphql
  mutation CreateBrandFilm($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files { id fileStatus alt }
      userErrors { field message }
    }
  }
`;

const READ = `#graphql
  query BrandFilmFiles($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Video {
        id
        fileStatus
        fileErrors { code message }
        originalSource { url mimeType width height }
        sources { url mimeType format width height }
      }
      ... on MediaImage {
        id
        fileStatus
        fileErrors { code message }
        image { url width height }
      }
    }
  }
`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function stage(adminGraphql, item) {
  const info = await stat(item.file);
  const staged = await adminGraphql(STAGE, {
    input: [
      {
        fileSize: String(info.size),
        filename: path.basename(item.file),
        httpMethod: 'POST',
        mimeType: item.mimeType,
        resource: item.resource,
      },
    ],
  });
  const payload = staged.data?.stagedUploadsCreate;
  if (payload?.userErrors?.length) {
    throw new Error(`${item.key}: ${JSON.stringify(payload.userErrors)}`);
  }
  const target = payload?.stagedTargets?.[0];
  if (!target?.url || !target.resourceUrl) {
    throw new Error(`${item.key}: Shopify returned no staged upload target`);
  }
  const form = new FormData();
  for (const parameter of target.parameters) {
    form.append(parameter.name, parameter.value);
  }
  form.append(
    'file',
    new Blob([await readFile(item.file)], {type: item.mimeType}),
    path.basename(item.file),
  );
  const response = await fetch(target.url, {body: form, method: 'POST'});
  if (!response.ok) {
    throw new Error(`${item.key}: staged upload failed with HTTP ${response.status}`);
  }
  return target.resourceUrl;
}

async function createFiles(adminGraphql, staged) {
  const result = await adminGraphql(CREATE, {
    files: FILES.map((item) => ({
      alt: item.alt,
      contentType: item.contentType,
      filename: path.basename(item.file),
      originalSource: staged[item.key],
    })),
  });
  const payload = result.data?.fileCreate;
  if (payload?.userErrors?.length) {
    throw new Error(`fileCreate: ${JSON.stringify(payload.userErrors)}`);
  }
  return payload.files.map((file) => file.id);
}

function pickVideoUrl(node) {
  const mp4s = (node.sources || []).filter((source) => source.mimeType === 'video/mp4');
  const exact = mp4s.find((source) => source.height === 1080);
  const best = exact || mp4s.sort((a, b) => b.height - a.height)[0];
  return best?.url || node.originalSource?.url || null;
}

async function waitForReady(adminGraphql, ids) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const result = await adminGraphql(READ, {ids});
    const nodes = result.data?.nodes || [];
    for (const node of nodes) {
      if (node?.fileErrors?.length) {
        throw new Error(`${node.id}: ${JSON.stringify(node.fileErrors)}`);
      }
    }
    if (nodes.length === ids.length && nodes.every((node) => node?.fileStatus === 'READY')) {
      return nodes;
    }
    await delay(3000);
  }
  throw new Error('Timed out waiting for the brand film files to be READY');
}

async function main() {
  for (const item of FILES) {
    const info = await stat(item.file);
    console.log(
      `${item.key}: ${path.relative(ROOT, item.file)} (${(info.size / 1024 / 1024).toFixed(1)} MB)`,
    );
  }
  if (!APPLY) {
    console.log('Dry run. Re-run with --apply to upload to Shopify Files.');
    return;
  }

  const adminGraphql = await resolveAdminClient(envWithAdminDefaults(), {
    requiredScope: 'write_files',
  });
  const staged = {};
  for (const item of FILES) {
    staged[item.key] = await stage(adminGraphql, item);
    console.log(`${item.key}: staged`);
  }
  const ids = await createFiles(adminGraphql, staged);
  console.log(`created: ${ids.join(', ')}`);
  const nodes = await waitForReady(adminGraphql, ids);

  const video = nodes.find((node) => node.sources);
  const poster = nodes.find((node) => node.image);
  const videoUrl = video ? pickVideoUrl(video) : null;
  const posterUrl = poster?.image?.url || null;
  if (!videoUrl || !posterUrl) {
    throw new Error(`Missing URLs: video=${videoUrl} poster=${posterUrl}`);
  }
  console.log('\nPaste into app/lib/brandFilm.ts:');
  console.log(`  videoUrl: '${videoUrl}',`);
  console.log(`  posterUrl: '${posterUrl}',`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
