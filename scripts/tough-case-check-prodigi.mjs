#!/usr/bin/env node
/* eslint-disable no-console */
// Confirms every Art Tough Phone Case device against Prodigi's product API
// and prices it: GET /v4.0/products/{sku} (attributes, print area pixels,
// destinations) and POST /v4.0/quotes (item + Standard shipping). Read-only:
// no order is created. Run with the sandbox key, then the live key before
// go-live.
//
//   node scripts/tough-case-check-prodigi.mjs [--env-dir <dir>] [--country DE,GR] [--no-quote]
//
// Needs .env.sky.local (in --env-dir or the cwd) with PRODIGI_API_KEY and
// PRODIGI_API_BASE.
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';

import {createProdigiClient} from '../app/lib/prodigi.server.ts';
import {TOUGH_CASE_PHONES} from '../app/lib/toughCase.ts';
import {envWithLocalDefaults, loadLocalEnv} from './lib/env.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const {values: args} = parseArgs({
  options: {
    'env-dir': {type: 'string'},
    country: {type: 'string', default: 'DE,GR,CY,BG,IE'},
    'no-quote': {type: 'boolean', default: false},
  },
});
const env = {
  ...envWithLocalDefaults(),
  ...loadLocalEnv('.env.sky.local', args['env-dir'] ?? process.cwd()),
  ...process.env,
};
const prodigi = createProdigiClient(env);
console.log(`Prodigi ${prodigi.isSandbox ? 'SANDBOX' : 'LIVE'} — ${prodigi.base}`);

const manifest = JSON.parse(
  await readFile(path.join(REPO_ROOT, 'data', 'art-tough-phone-case.json'), 'utf8'),
);
const countries = args.country.split(',').map((c) => c.trim().toUpperCase());
let failures = 0;

for (const phone of manifest.phones) {
  const sku = phone.providerSku;
  const expected = TOUGH_CASE_PHONES.find((p) => p.code === phone.code).prodigiAttributes;
  const problems = [];
  let product;
  try {
    product = (await prodigi.getProduct(sku)).product;
  } catch (error) {
    console.log(`✖ ${phone.label}: ${sku} not found (${error.message})`);
    failures++;
    continue;
  }
  const attributes = product.attributes ?? {};
  for (const [key, value] of Object.entries(expected)) {
    const allowed = attributes[key];
    if (!allowed) problems.push(`attribute "${key}" unknown`);
    else if (!allowed.includes(value)) problems.push(`attribute ${key}=${value} not in [${allowed.join(', ')}]`);
  }
  for (const key of Object.keys(attributes)) {
    if (!(key in expected)) {
      problems.push(`attribute "${key}" required but unset (options: ${attributes[key].join(', ')})`);
    }
  }
  const area = product.variants?.[0]?.printAreaSizes?.default;
  if (
    !area ||
    area.horizontalResolution !== phone.printArea.width ||
    area.verticalResolution !== phone.printArea.height
  ) {
    problems.push(
      `print area ${area?.horizontalResolution}×${area?.verticalResolution}px vs manifest ${phone.printArea.width}×${phone.printArea.height}`,
    );
  }
  const shipsTo = new Set((product.variants ?? []).flatMap((v) => v.shipsTo ?? []));
  const missing = countries.filter((c) => !shipsTo.has(c));
  if (missing.length) problems.push(`does not ship to ${missing.join(', ')}`);

  let quote = '';
  if (!args['no-quote']) {
    const parts = [];
    for (const country of countries) {
      try {
        const result = await prodigi.quote({
          shippingMethod: 'Standard',
          destinationCountryCode: country,
          items: [
            {
              sku,
              copies: 1,
              attributes: expected,
              assets: [{printArea: 'default'}],
            },
          ],
        });
        const cost = result.quotes?.[0]?.costSummary;
        const origin = result.quotes?.[0]?.shipments?.[0]?.fulfillmentLocation?.countryCode ?? '?';
        parts.push(
          cost
            ? `${country} ${cost.items?.amount}+${cost.shipping?.amount}=${cost.totalCost?.amount} ${cost.totalCost?.currency} from ${origin}`
            : `${country} ${JSON.stringify(result).slice(0, 80)}`,
        );
      } catch (error) {
        parts.push(`${country} quote failed: ${error.message} ${JSON.stringify(error.body ?? '').slice(0, 160)}`);
        problems.push(`quote ${country} failed`);
      }
    }
    quote = ` | ${parts.join(' | ')}`;
  }
  if (problems.length) {
    failures++;
    console.log(`✖ ${phone.label} → ${sku}: ${problems.join('; ')}${quote}`);
  } else {
    console.log(`✔ ${phone.label} → ${sku}${quote}`);
  }
}
process.exit(failures ? 1 : 0);
/* eslint-enable no-console */
