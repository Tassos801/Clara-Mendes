#!/usr/bin/env node
/* eslint-disable no-console */
// Confirms every star-map variant against Prodigi's product catalogue and
// prices it: GET /v4.0/products/{sku} (attributes, print area pixels, EU
// destinations) and POST /v4.0/quotes (item + Standard shipping). Run with
// the sandbox key first, then the live key before go-live.
//
//   node scripts/sky-check-prodigi.mjs [--country DE] [--no-quote]
//
// Needs .env.sky.local with PRODIGI_API_KEY and PRODIGI_API_BASE.
import {parseArgs} from 'node:util';
import {envWithLocalDefaults, loadLocalEnv} from './lib/env.mjs';
import {createProdigiClient} from '../app/lib/prodigi.server.ts';
import {SKY_SIZES, SKY_VARIANTS} from '../app/lib/sky/products.ts';

const {values: args} = parseArgs({
  options: {
    country: {type: 'string', default: 'DE'},
    'no-quote': {type: 'boolean', default: false},
  },
});
const env = {...envWithLocalDefaults(), ...loadLocalEnv('.env.sky.local'), ...process.env};
const prodigi = createProdigiClient(env);
console.log(`Prodigi ${prodigi.isSandbox ? 'SANDBOX' : 'LIVE'} — ${prodigi.base}`);

let failures = 0;
const seen = new Map();
for (const [variantSku, variant] of Object.entries(SKY_VARIANTS)) {
  let product = seen.get(variant.prodigiSku);
  if (!product) {
    try {
      product = (await prodigi.getProduct(variant.prodigiSku)).product;
    } catch (error) {
      console.log(`✖ ${variantSku}: ${variant.prodigiSku} not found (${error.message})`);
      failures++;
      continue;
    }
    seen.set(variant.prodigiSku, product);
  }
  const problems = [];
  for (const [key, value] of Object.entries(variant.attributes)) {
    const allowed = product.attributes?.[key];
    if (!allowed) problems.push(`attribute "${key}" unknown (has: ${Object.keys(product.attributes ?? {}).join(', ') || 'none'})`);
    else if (!allowed.includes(value)) problems.push(`attribute ${key}=${value} not in [${allowed.join(', ')}]`);
  }
  for (const key of Object.keys(product.attributes ?? {})) {
    if (!(key in variant.attributes)) problems.push(`attribute "${key}" required by Prodigi but unset (options: ${product.attributes[key].join(', ')})`);
  }
  const area = product.printAreaSizes?.default;
  const expected = SKY_SIZES[variant.size].pixels;
  if (area && (area.horizontalResolution !== expected[0] || area.verticalResolution !== expected[1])) {
    problems.push(`print area ${area.horizontalResolution}×${area.verticalResolution}px vs expected ${expected.join('×')}`);
  }
  const shipsEu = product.variants?.some((v) => v.shipsTo?.includes(args.country));
  if (product.variants && !shipsEu) problems.push(`does not ship to ${args.country}`);

  let quote = '';
  if (!args['no-quote']) {
    try {
      const result = await prodigi.quote({
        shippingMethod: 'Standard',
        destinationCountryCode: args.country,
        items: [{sku: variant.prodigiSku, copies: 1, attributes: variant.attributes, assets: [{printArea: 'default'}]}],
      });
      const q = result.quotes?.[0];
      const cost = q?.costSummary;
      quote = cost ? ` | item ${cost.items?.amount} ${cost.items?.currency} + ship ${cost.shipping?.amount} = ${cost.totalCost?.amount} ${cost.totalCost?.currency}` : ` | quote: ${JSON.stringify(result).slice(0, 120)}`;
    } catch (error) {
      quote = ` | quote failed: ${error.message}`;
    }
  }
  if (problems.length) {
    failures++;
    console.log(`✖ ${variantSku} → ${variant.prodigiSku}: ${problems.join('; ')}${quote}`);
  } else {
    console.log(`✔ ${variantSku} → ${variant.prodigiSku} ${JSON.stringify(variant.attributes)}${quote}`);
  }
}
process.exit(failures ? 1 : 0);
/* eslint-enable no-console */
