#!/usr/bin/env node
/* eslint-disable no-console */
// Submits the live sitemap URLs to IndexNow (app/lib/indexNow.ts).
//
//   node scripts/indexnow-submit.mjs            dry run: prints what it would send
//   node scripts/indexnow-submit.mjs --apply    sends it
//   --origin=https://shopclaramendes.com        another host (default: the store)
//
// It reads /sitemap.xml and every sitemap it lists, checks that the key file
// is live (the engines reject the batch otherwise), then POSTs the URLs in
// batches of up to 10,000 (the protocol's limit). Read-only until --apply.
import {
  INDEXNOW_ENDPOINT,
  INDEXNOW_KEY,
  INDEXNOW_KEY_PATH,
} from '../app/lib/indexNow.ts';
import {STOREFRONT_ORIGIN} from '../app/lib/storefrontBasics.ts';

const BATCH = 10_000;
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const origin = (
  args.find((arg) => arg.startsWith('--origin='))?.slice('--origin='.length) ??
  STOREFRONT_ORIGIN
).replace(/\/$/, '');
const host = new URL(origin).host;
// Oxygen turns away bare clients; a browser-like request reads sitemaps.
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  Accept: 'application/xml,text/xml,text/plain,*/*',
};

async function get(url) {
  const response = await fetch(url, {headers: HEADERS});
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

const locs = (xml) =>
  [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((match) =>
    match[1].replace(/&amp;/g, '&'),
  );

/** Every page URL in the sitemap tree, same host only, de-duplicated. */
async function sitemapUrls(root) {
  const pages = new Set();
  const seen = new Set();
  const queue = [root];
  while (queue.length) {
    const sitemap = queue.shift();
    if (seen.has(sitemap)) continue;
    seen.add(sitemap);
    const xml = await get(sitemap);
    const entries = locs(xml);
    if (/<sitemapindex[\s>]/.test(xml)) queue.push(...entries);
    else
      for (const url of entries) if (new URL(url).host === host) pages.add(url);
  }
  return {pages: [...pages], sitemaps: [...seen]};
}

const {pages, sitemaps} = await sitemapUrls(`${origin}/sitemap.xml`);
const keyLocation = `${origin}${INDEXNOW_KEY_PATH}`;
console.log(
  `Read ${sitemaps.length} sitemaps: ${pages.length} URLs on ${host}.`,
);

let keyLive = false;
try {
  keyLive = (await get(keyLocation)).trim() === INDEXNOW_KEY;
} catch {
  keyLive = false;
}
console.log(`Key file ${keyLocation}: ${keyLive ? 'live' : 'NOT live'}.`);

const batches = [];
for (let i = 0; i < pages.length; i += BATCH)
  batches.push({
    host,
    key: INDEXNOW_KEY,
    keyLocation,
    urlList: pages.slice(i, i + BATCH),
  });

if (!apply) {
  console.log(
    `\nDry run: would POST ${batches.length} batch(es) to ${INDEXNOW_ENDPOINT}`,
  );
  for (const batch of batches)
    console.log(
      JSON.stringify(
        {
          ...batch,
          urlList: [
            ...batch.urlList.slice(0, 5),
            `… ${batch.urlList.length} URLs`,
          ],
        },
        null,
        2,
      ),
    );
  console.log('\nURLs:');
  for (const url of pages) console.log(url);
  console.log('\nNothing sent. Run again with --apply to submit.');
  process.exit(0);
}

if (!keyLive) {
  console.error(
    'Refusing to submit: the key file is not live on this host yet (deploy first).',
  );
  process.exit(1);
}
if (!pages.length) {
  console.error('Refusing to submit: the sitemaps listed no URLs.');
  process.exit(1);
}
for (const [index, batch] of batches.entries()) {
  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: {'Content-Type': 'application/json; charset=utf-8'},
    body: JSON.stringify(batch),
  });
  // 200 = accepted, 202 = accepted, key validation pending.
  console.log(
    `Batch ${index + 1}/${batches.length}: ${batch.urlList.length} URLs -> HTTP ${response.status} ${await response.text()}`,
  );
  if (response.status !== 200 && response.status !== 202) process.exit(1);
}
/* eslint-enable no-console */
