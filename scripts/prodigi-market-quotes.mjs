#!/usr/bin/env node
/* eslint-disable no-console */

// Read-only Prodigi price check for one or more destination countries: for
// each product line's representative SKU it reads GET /v4.0/products/{sku}
// (required attributes, ship-to countries) and POST /v4.0/quotes (item +
// Standard shipping, EUR). It never creates an order. Used for the US market
// (docs/us-market/status.md, step B1); any market works.
//
//   node scripts/prodigi-market-quotes.mjs [--country US,CY] [--env-dir <dir>] [--json <file>]
//
// Needs PRODIGI_API_KEY and PRODIGI_API_BASE (live: https://api.prodigi.com)
// in .env.sky.local (in --env-dir or the cwd) or the environment. The
// sandbox base quotes too, but its prices and routing aren't the live ones.

import {writeFileSync} from 'node:fs';
import {parseArgs} from 'node:util';

import {createProdigiClient} from '../app/lib/prodigi.server.ts';
import {envWithLocalDefaults, loadLocalEnv} from './lib/env.mjs';

const {values: args} = parseArgs({
  options: {
    country: {type: 'string', default: 'US'},
    'env-dir': {type: 'string'},
    json: {type: 'string'},
  },
});

// One representative SKU per line the store sells or has staged. Attributes
// left out are filled from Prodigi's allowed values (preferring the store's
// usual choice), so a renamed option shows up in the output, not as a crash.
const LINES = [
  {line: 'Art print 8×10', sku: 'ART-FAP-EMA-8X10'},
  {line: 'Art print 16×20', sku: 'ART-FAP-EMA-16X20'},
  {line: 'Art print 20×24', sku: 'GLOBAL-FAP-20X24'},
  {line: 'Canvas 16×20', sku: 'GLOBAL-CAN-16X20', attributes: {wrap: 'MirrorWrap'}},
  {line: 'Framed 16×20 (natural)', sku: 'GLOBAL-CFP-16X20', attributes: {color: 'natural'}},
  {line: 'Framed 20×24 (natural)', sku: 'GLOBAL-CFP-20X24', attributes: {color: 'natural'}},
  {line: 'Tough case iPhone 16 Pro', sku: 'GLOBAL-TECH-IP16PR-TCB-CS-M'},
  {line: 'Greeting card 7×5', sku: 'GLOBAL-GRE-MOH-7X5-BLA'},
  {line: 'Postcard 7×5', sku: 'GLOBAL-POST-MOH-7X5'},
  {line: 'Mug 11 oz', sku: 'GLOBAL-MUG-W'},
  {line: 'Acrylic 12×16', sku: 'GLOBAL-MOU-ACRY-12X16'},
  {line: 'Print with hanger A3', sku: 'POSTER-HANGER-30-A3-PORT'},
  {line: 'Plant pot', sku: 'PLANT-POT'},
];
const PREFERRED = {wrap: 'MirrorWrap', color: 'natural', finish: 'matte'};

const env = {
  ...envWithLocalDefaults(),
  ...loadLocalEnv('.env.sky.local', args['env-dir'] ?? process.cwd()),
  ...process.env,
};
if (!env.PRODIGI_API_KEY) {
  console.error(
    'PRODIGI_API_KEY is not set. Put PRODIGI_API_KEY and PRODIGI_API_BASE=https://api.prodigi.com in .env.sky.local (git-ignored), or pass --env-dir.',
  );
  process.exit(2);
}
const prodigi = createProdigiClient(env);
const countries = args.country
  .split(',')
  .map((code) => code.trim().toUpperCase())
  .filter(Boolean);

console.log(
  `Prodigi ${prodigi.isSandbox ? 'SANDBOX (prices not live)' : 'live'} · Standard · EUR · ${countries.join(', ')} · read-only`,
);

const results = [];
for (const entry of LINES) {
  let product;
  try {
    product = (await prodigi.getProduct(entry.sku)).product;
  } catch (error) {
    console.log(`✖ ${entry.line} (${entry.sku}): product lookup failed (${error.message})`);
    results.push({...entry, error: `lookup: ${error.message}`});
    continue;
  }
  const attributes = {...entry.attributes};
  for (const [key, allowed] of Object.entries(product.attributes ?? {})) {
    if (attributes[key] && allowed.includes(attributes[key])) continue;
    attributes[key] = allowed.includes(PREFERRED[key]) ? PREFERRED[key] : allowed[0];
  }
  for (const country of countries) {
    const shipsTo = product.variants?.some((variant) => variant.shipsTo?.includes(country));
    const row = {line: entry.line, sku: entry.sku, attributes, country, shipsTo: Boolean(shipsTo)};
    try {
      const result = await prodigi.quote({
        shippingMethod: 'Standard',
        destinationCountryCode: country,
        currencyCode: 'EUR',
        items: [{sku: entry.sku, copies: 1, attributes, assets: [{printArea: 'default'}]}],
      });
      const quote = result.quotes?.[0];
      const cost = quote?.costSummary;
      const shipment = quote?.shipments?.[0];
      Object.assign(row, {
        item: cost?.items?.amount ?? null,
        shipping: cost?.shipping?.amount ?? null,
        total: cost?.totalCost?.amount ?? null,
        currency: cost?.totalCost?.currency ?? null,
        lab: shipment?.fulfillmentLocation
          ? `${shipment.fulfillmentLocation.countryCode}/${shipment.fulfillmentLocation.labCode}`
          : null,
        carrier: shipment?.carrier
          ? `${shipment.carrier.name} ${shipment.carrier.service ?? ''}`.trim()
          : null,
        outcome: result.outcome ?? null,
      });
      console.log(
        `✔ ${country} ${entry.line} (${entry.sku}): item ${row.item} + ship ${row.shipping} = ${row.total} ${row.currency} · from ${row.lab ?? '?'} · ${row.carrier ?? '?'}${shipsTo ? '' : ' · (not in shipsTo)'}`,
      );
    } catch (error) {
      row.error = `quote: ${error.message}`;
      console.log(`✖ ${country} ${entry.line} (${entry.sku}): quote failed (${error.message})${shipsTo ? '' : ' · not in shipsTo'}`);
    }
    results.push(row);
  }
}

if (args.json) {
  writeFileSync(args.json, `${JSON.stringify({checkedAt: new Date().toISOString(), live: !prodigi.isSandbox, results}, null, 2)}\n`);
  console.log(`Saved ${args.json}`);
}
/* eslint-enable no-console */
