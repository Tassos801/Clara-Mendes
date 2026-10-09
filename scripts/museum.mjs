#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Museum sourcing for the artist shops (docs/artist-shops/brief.md §5, §8).
 * Reads and writes data/art-registry.json and commits the raw museum record
 * of every fetched object under data/museum-evidence/. Originals are cached
 * in the launch folder and re-fetchable by URL, verified by checksum. Nothing
 * here touches Shopify or Prodigi.
 *
 *   npm run museum -- status
 *   npm run museum -- search <query…> [--title|--anywhere] [--limit 20] [--offset 0]
 *     (matches artist names by default; --title matches titles)
 *   npm run museum -- fetch <met object id> --artist <artist id> [--short-title "…"]
 *   npm run museum -- qualify [artwork id …]
 *
 * Owner decisions — run only on the owner's explicit instruction:
 *
 *   npm run museum -- review <artwork id> --rights|--master <cleared|blocked|pending> --by "<name>" [--note "…"]
 *   npm run museum -- approve-artist <artist id> --by "<name>" [--revoke]
 */

import {createHash} from 'node:crypto';
import {
  createWriteStream,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import path from 'node:path';
import {Readable, Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import sharp from 'sharp';
import {
  artworkId,
  findArtist,
  screenArtworkRights,
  validateArtRegistry,
} from '../app/lib/artRegistry.ts';
import {PRINT_SIZES} from '../app/lib/printCatalog.ts';
import {qualifySizes} from './lib/museum-layout.mjs';
import {
  attributionIssues,
  impressionKey,
  metArtworkRecord,
  metObjectUrl,
  metSearchUrl,
  normalizeMetObject,
} from './lib/museum-met.mjs';
import {
  CATALOG_PATH,
  REPO_ROOT,
  resolveLocalPaths,
} from './lib/product-pipeline.mjs';

const REGISTRY_PATH = path.join(REPO_ROOT, 'data/art-registry.json');
const EVIDENCE_DIR = 'data/museum-evidence';
const USER_AGENT =
  'ClaraMendesCatalogue/1.0 (+https://shopclaramendes.com; open-access sourcing)';
/** Well under The Met's 80 requests per second. */
const MIN_REQUEST_GAP_MS = 150;
let lastRequestAt = 0;

const [step = 'status', ...rest] = process.argv.slice(2);
const VALUE_OPTIONS = [
  'artist',
  'by',
  'limit',
  'master',
  'note',
  'offset',
  'rights',
  'short-title',
];
const options = {};
const flags = new Set();
const positional = [];
for (let index = 0; index < rest.length; index++) {
  const arg = rest[index];
  if (!arg.startsWith('--')) {
    positional.push(arg);
    continue;
  }
  const [name, inline] = arg.slice(2).split(/=(.*)/s, 2);
  if (VALUE_OPTIONS.includes(name)) {
    options[name] = inline ?? rest[++index];
  } else {
    flags.add(name);
  }
}

const steps = {
  'approve-artist': approveArtist,
  fetch: fetchArtwork,
  qualify,
  review,
  search,
  status,
};
if (!steps[step]) {
  console.error(
    `Unknown step "${step}". Steps: ${Object.keys(steps).sort().join(', ')}`,
  );
  process.exit(2);
}

const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
const problems = validateArtRegistry(registry);
if (problems.length) {
  console.error(
    `data/art-registry.json is invalid:\n- ${problems.join('\n- ')}`,
  );
  process.exit(1);
}
const museumRoot = path.join(resolveLocalPaths().launchRoot, 'museum');

try {
  await steps[step]();
} catch (error) {
  console.error(`\n${step} failed: ${error.message}`);
  process.exit(1);
}

// ---------------------------------------------------------------- steps --

function status() {
  const links = catalogLinks();
  console.log('\nArtists');
  console.table(
    registry.artists.map((artist) => ({
      artist: artist.id,
      page: `/artists/${artist.slug}`,
      kind: artist.kind,
      approved: artist.approval.approved,
      artworks: registry.artworks.filter((a) => a.artistId === artist.id)
        .length,
    })),
  );
  if (!registry.artworks.length) {
    console.log(
      'No artworks yet. Next: npm run museum -- search <query> → fetch <id> --artist <artist id>',
    );
    return;
  }
  console.log('\nArtworks');
  console.table(
    registry.artworks.map((artwork) => {
      const screen = screenArtworkRights(
        artwork,
        findArtist(artwork.artistId, registry),
      );
      const qualified = artwork.original
        ? qualifySizes(artwork.original)
            .filter((layout) => layout.verdict === 'qualified')
            .map((layout) => layout.size)
            .join(' ')
        : '';
      const link = links.get(artwork.id);
      return {
        artwork: artwork.id,
        title: truncate(artwork.shortTitle, 32),
        original: artwork.original
          ? `${artwork.original.width}×${artwork.original.height}`
          : 'not fetched',
        screen: screen.pass ? 'pass' : `fail (${screen.reasons.length})`,
        rights: artwork.reviews.rights.status,
        master: artwork.reviews.master.status,
        '300ppi': qualified || '—',
        catalog: link
          ? `${link.collection}/${link.print}${link.released ? ' (released)' : ''}`
          : '—',
      };
    }),
  );
  console.log(`Originals: ${path.join(museumRoot, 'originals')}`);
}

async function search() {
  const query = positional.join(' ').trim();
  if (!query) throw new Error('Usage: npm run museum -- search <query…>');
  const limit = Number(options.limit ?? 20);
  const offset = Number(options.offset ?? 0);
  let match = 'artist';
  if (flags.has('title')) match = 'title';
  if (flags.has('anywhere')) match = 'anywhere';
  const {json: found} = await getJson(
    metSearchUrl({limit, match, offset, q: query}),
  );
  const ids = found.objectIDs ?? [];
  console.log(
    `\nThe Met: ${found.total} objects match "${query}"; showing ${offset + 1}–${offset + ids.length}.`,
  );
  const candidates = [];
  for (const id of ids) {
    const {json} = await getJson(metObjectUrl(id), {cache: true});
    candidates.push(normalizeMetObject(json));
  }
  const impressions = new Map();
  for (const candidate of candidates) {
    const key = impressionKey(candidate);
    impressions.set(key, (impressions.get(key) ?? 0) + 1);
  }
  const registeredKeys = registeredImpressionKeys();
  console.table(
    candidates.map((candidate) => {
      const key = impressionKey(candidate);
      const id = artworkId('met', candidate.objectId);
      const otherRegistered = (registeredKeys.get(key) ?? []).filter(
        (registered) => registered !== id,
      );
      return {
        id: candidate.objectId,
        title: truncate(candidate.title, 56),
        artist: truncate(candidate.artistDisplayName, 24),
        date: candidate.date,
        publicDomain: candidate.publicDomain,
        image: Boolean(candidate.imageUrl),
        attribution: attributionIssues(candidate).join('; ') || 'ok',
        impressions:
          [
            impressions.get(key) > 1 ? `${impressions.get(key)} here` : '',
            otherRegistered.length ? `also ${otherRegistered.join(', ')}` : '',
          ]
            .filter(Boolean)
            .join('; ') || '—',
        registered: registry.artworks.some((artwork) => artwork.id === id),
      };
    }),
  );
  console.log(
    'Same-title rows may be different impressions: compare the images before choosing one.',
  );
  const file = path.join(
    museumRoot,
    'candidates',
    `${slugify(query)}-${offset}.json`,
  );
  mkdirSync(path.dirname(file), {recursive: true});
  writeJson(file, {
    candidates,
    fetchedAt: new Date().toISOString(),
    offset,
    query,
    total: found.total,
  });
  console.log(`Candidates: ${file}`);
  console.log('Search results are candidates, not a publication queue.');
}

async function fetchArtwork() {
  const objectId = positional[0];
  if (!/^\d+$/.test(objectId ?? ''))
    throw new Error(
      'Usage: npm run museum -- fetch <met object id> --artist <artist id>',
    );
  const artist = findArtist(options.artist ?? '', registry);
  if (!artist)
    throw new Error(
      `--artist must be one of: ${registry.artists.map((a) => a.id).join(', ')}`,
    );
  if (artist.kind !== 'historical')
    throw new Error(`${artist.id} is not a historical artist`);

  const {json, raw} = await getJson(metObjectUrl(objectId));
  const candidate = normalizeMetObject(json);
  if (candidate.objectId !== objectId)
    throw new Error(`The Met returned object ${candidate.objectId}`);
  if (!candidate.imageUrl)
    throw new Error(`Object ${objectId} has no open-access primary image`);

  const id = artworkId('met', objectId);
  const previous = registry.artworks.find((artwork) => artwork.id === id);
  if (previous && previous.artistId !== artist.id)
    throw new Error(`${id} is already registered to ${previous.artistId}`);
  const fetchedAt = new Date().toISOString();
  const evidenceFile = `${EVIDENCE_DIR}/${id}.json`;
  mkdirSync(path.join(REPO_ROOT, EVIDENCE_DIR), {recursive: true});
  writeFileSync(path.join(REPO_ROOT, evidenceFile), raw);
  const original = await downloadOriginal(candidate.imageUrl, id);

  const record = metArtworkRecord(candidate, {
    artistId: artist.id,
    evidenceFile,
    fetchedAt,
    metadataSha256: sha256(raw),
    original,
    previous,
    shortTitle: options['short-title'],
  });
  if (previous) registry.artworks[registry.artworks.indexOf(previous)] = record;
  else registry.artworks.push(record);
  saveRegistry();

  const screen = screenArtworkRights(record, artist);
  console.log(`\n${id}: ${record.title}`);
  console.log(
    `${record.source.artistDisplayName}, ${record.date}. ${record.medium}.`,
  );
  console.log(`Credit: ${record.source.creditLine}`);
  console.log(
    `Original: ${original.width}×${original.height} ${original.contentType}, ${(original.bytes / 1e6).toFixed(1)} MB, sha256 ${original.sha256.slice(0, 12)}…`,
  );
  const issues = attributionIssues(candidate);
  if (issues.length) console.log(`Attribution: ${issues.join('; ')}`);
  const siblings = (
    registeredImpressionKeys().get(impressionKey(candidate)) ?? []
  ).filter((other) => other !== id);
  if (siblings.length)
    console.log(
      `Possible other impression(s) already registered: ${siblings.join(', ')}. Compare them; keep both records.`,
    );
  console.log(
    screen.pass
      ? 'Rights screen: pass (still needs the owner rights review)'
      : `Rights screen: FAIL\n- ${screen.reasons.join('\n- ')}`,
  );
  if (previous) {
    for (const kind of ['rights', 'master']) {
      if (record.reviews[kind].note && record.reviews[kind] !== previous.reviews[kind])
        console.log(`${kind} review: ${record.reviews[kind].note}`);
    }
  }
  printQualification([record]);
}

function qualify() {
  const artworks = positional.length
    ? positional.map((id) => {
        const artwork = registry.artworks.find((a) => a.id === id);
        if (!artwork) throw new Error(`Unknown artwork ${id}`);
        return artwork;
      })
    : registry.artworks;
  printQualification(artworks);
}

function review() {
  const id = positional[0];
  const artwork = registry.artworks.find((a) => a.id === id);
  if (!artwork)
    throw new Error(
      'Usage: npm run museum -- review <artwork id> --rights|--master <status> --by "<name>"',
    );
  const kinds = ['rights', 'master'].filter((kind) => options[kind]);
  if (kinds.length !== 1)
    throw new Error('Pass exactly one of --rights <status> or --master <status>');
  const [kind] = kinds;
  const decision = options[kind];
  if (!['blocked', 'cleared', 'pending'].includes(decision))
    throw new Error(`--${kind} must be cleared, blocked or pending`);
  if (decision !== 'pending' && !options.by?.trim())
    throw new Error('--by "<name>" records who made the decision');
  if (decision === 'cleared' && kind === 'rights') {
    const screen = screenArtworkRights(
      artwork,
      findArtist(artwork.artistId, registry),
    );
    if (!screen.pass)
      throw new Error(
        `the rights screen fails, so it cannot be cleared:\n- ${screen.reasons.join('\n- ')}`,
      );
  }
  if (decision === 'cleared' && kind === 'master' && !artwork.original)
    throw new Error('fetch the original before clearing its master');
  artwork.reviews[kind] = {
    status: decision,
    ...(decision === 'pending' ? {} : {by: options.by.trim()}),
    at: new Date().toISOString(),
    ...(options.note?.trim() ? {note: options.note.trim()} : {}),
  };
  saveRegistry();
  console.log(`${id}: ${kind} review ${decision}`);
}

function approveArtist() {
  const artist = findArtist(positional[0] ?? '', registry);
  if (!artist)
    throw new Error(
      'Usage: npm run museum -- approve-artist <artist id> --by "<name>"',
    );
  if (flags.has('revoke')) {
    artist.approval = {approved: false};
  } else {
    if (!options.by?.trim())
      throw new Error('--by "<name>" records who approved the artist');
    artist.approval = {
      approved: true,
      at: new Date().toISOString(),
      by: options.by.trim(),
    };
  }
  saveRegistry();
  console.log(`${artist.id}: approved ${artist.approval.approved}`);
}

// -------------------------------------------------------------- helpers --

function printQualification(artworks) {
  const rows = artworks.flatMap((artwork) =>
    artwork.original
      ? qualifySizes(artwork.original, Object.keys(PRINT_SIZES)).map(
          (layout) => ({
            artwork: artwork.id,
            size: layout.size,
            paper: `${layout.paperInches.width}×${layout.paperInches.height} in ${layout.orientation}`,
            image: `${layout.imageInches.width}×${layout.imageInches.height} in`,
            needs: `${layout.image.width}×${layout.image.height}px`,
            original: `${artwork.original.width}×${artwork.original.height}`,
            ppi: layout.nativePpi,
            verdict: layout.verdict,
          }),
        )
      : [{artwork: artwork.id, verdict: 'original not fetched'}],
  );
  console.log('\nSize qualification (full composition on a white border, 300 ppi target)');
  console.table(rows);
}

/** impression key → registered artwork ids, from their stored evidence. */
function registeredImpressionKeys() {
  const keys = new Map();
  for (const artwork of registry.artworks) {
    const key = impressionKey({
      artistDisplayName: artwork.source.artistDisplayName,
      title: artwork.title,
    });
    keys.set(key, [...(keys.get(key) ?? []), artwork.id]);
  }
  return keys;
}

/** artwork id → the print-catalog entry that sells it. */
function catalogLinks() {
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
  const links = new Map();
  for (const collection of catalog.collections)
    for (const print of collection.prints)
      if (print.artworkId)
        links.set(print.artworkId, {
          collection: collection.slug,
          print: print.slug,
          released: print.released === true,
        });
  return links;
}

async function request(url, {attempts = 4, timeoutMs = 60_000} = {}) {
  for (let attempt = 1; ; attempt++) {
    const wait = lastRequestAt + MIN_REQUEST_GAP_MS - Date.now();
    if (wait > 0) await delay(wait);
    lastRequestAt = Date.now();
    let response;
    try {
      response = await fetch(url, {
        headers: {'User-Agent': USER_AGENT},
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (attempt >= attempts) throw new Error(`${url}: ${error.message}`);
      await delay(1000 * 2 ** (attempt - 1));
      continue;
    }
    if (response.ok) return response;
    const retryable = [429, 500, 502, 503, 504].includes(response.status);
    await response.body?.cancel();
    if (!retryable || attempt >= attempts)
      throw new Error(`${url}: HTTP ${response.status}`);
    const retryAfter = Number(response.headers.get('retry-after'));
    await delay(
      retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** (attempt - 1),
    );
  }
}

/** JSON plus its exact bytes; `cache` keeps search browsing polite. */
async function getJson(url, {cache = false} = {}) {
  const cacheFile = path.join(
    museumRoot,
    'cache',
    `${createHash('sha1').update(url).digest('hex')}.json`,
  );
  if (cache && existsSync(cacheFile)) {
    const raw = readFileSync(cacheFile, 'utf8');
    return {json: JSON.parse(raw), raw};
  }
  const raw = await (await request(url)).text();
  const json = JSON.parse(raw);
  if (cache) {
    mkdirSync(path.dirname(cacheFile), {recursive: true});
    writeFileSync(cacheFile, raw);
  }
  return {json, raw};
}

async function downloadOriginal(url, id) {
  const extension = path.extname(new URL(url).pathname).toLowerCase() || '.jpg';
  const dir = path.join(museumRoot, 'originals');
  mkdirSync(dir, {recursive: true});
  const file = path.join(dir, `${id}${extension}`);
  const partial = `${file}.part`;
  const response = await request(url, {timeoutMs: 300_000});
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/'))
    throw new Error(`${url} is ${contentType || 'not an image'}`);
  const hash = createHash('sha256');
  let bytes = 0;
  try {
    await pipeline(
      Readable.fromWeb(response.body),
      new Transform({
        transform(chunk, _encoding, callback) {
          hash.update(chunk);
          bytes += chunk.length;
          callback(null, chunk);
        },
      }),
      createWriteStream(partial),
    );
  } catch (error) {
    rmSync(partial, {force: true});
    throw error;
  }
  renameSync(partial, file);
  const metadata = await sharp(file).metadata();
  // EXIF orientations 5–8 swap the displayed width and height.
  const swapped = (metadata.orientation ?? 1) >= 5;
  return {
    fileName: path.basename(file),
    sha256: hash.digest('hex'),
    bytes,
    contentType: contentType.split(';')[0],
    width: swapped ? metadata.height : metadata.width,
    height: swapped ? metadata.width : metadata.height,
  };
}

function saveRegistry() {
  const after = validateArtRegistry(registry);
  if (after.length)
    throw new Error(`refusing to save an invalid registry:\n- ${after.join('\n- ')}`);
  writeJson(REGISTRY_PATH, registry);
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function truncate(text, length) {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/* eslint-enable no-console */
