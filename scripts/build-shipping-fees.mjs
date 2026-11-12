#!/usr/bin/env node
/**
 * Rebuilds app/lib/printfulShippingFees.ts: checkout's standard shipping fee
 * for one Printful piece per shipping group and region (see
 * app/lib/printfulShipping.ts), and what a US buyer pays in USD for each
 * fixed-rate line that ships there (app/lib/merchantFeedShipping.ts), read
 * from real Storefront cart quotes. Product pages and the Merchant Center
 * feeds read the table, so neither creates a cart.
 *
 *   npm run shipping-fees            quote, check, write the table
 *   npm run shipping-fees -- --check quote and compare, write nothing
 *                                    (exit 1 when the table is out of date)
 *
 * Shopify counts every cart as a visit that added to cart, so this makes
 * one cart per probe country (9) and swaps its single line through one
 * variant of every listed Printful product (147 line updates per cart on
 * 2026-11-12, no new carts); the US cart goes on through one variant per
 * fixed line and product type. No checkout, no order. Carts are created 20 s
 * apart: a burst of new carts gets the IP throttled, which also blocks
 * add-to-cart on the live site from that IP. A full run takes about 30
 * minutes.
 *
 * A request a network failure stopped is sent again, up to four times, 15
 * to 60 s apart, unless it is a cart create that may have reached Shopify
 * (scripts/lib/storefront-request.mjs): a DNS failure halfway no longer
 * throws away the carts already quoted.
 *
 * It stops without writing when two EU probe countries disagree, when
 * products of one group are charged different fees (the group map in
 * printfulShipping.ts needs a change then), or when a fixed line is charged
 * two US rates.
 */
import {writeFileSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {getRequiredEnv, envWithLocalDefaults} from './lib/env.mjs';
import {storefrontRequest} from './lib/storefront-request.mjs';

const {PRINTFUL_FEE_REGIONS, PRINTFUL_SHIPPING_GROUPS, printfulShippingGroup} =
  await import('../app/lib/printfulShipping.ts');
const {fixedRateLineFor} = await import('../app/lib/merchantFeed.ts');
const {FIXED_RATES} = await import('../app/lib/merchantFeedShipping.ts');

// The fixed lines with a US rate (in EUR) in the feeds' table.
const US_FIXED_LINES = Object.entries(FIXED_RATES)
  .filter(([, rates]) =>
    Object.values(rates.international ?? {}).some((countries) =>
      countries.includes('US'),
    ),
  )
  .map(([line]) => line);

const OUTPUT = resolve('app/lib/printfulShippingFees.ts');
const API_VERSION = '2025-10';
const CART_GAP_MS = 20_000;
const SWAP_GAP_MS = 300;

// Printful prices the US, Canada, Australia and Japan by state or
// prefecture, so a country code alone gets no rate there. Public
// landmarks, used only to price delivery.
const QUOTE_ADDRESSES = {
  US: {city: 'New York', zip: '10001', provinceCode: 'NY'},
  CA: {city: 'Toronto', zip: 'M5V 2T6', provinceCode: 'ON'},
  AU: {city: 'Sydney', zip: '2000', provinceCode: 'NSW'},
  JP: {city: 'Tokyo', zip: '100-0001', provinceCode: 'JP-13'},
};

const env = envWithLocalDefaults();
const domain = getRequiredEnv(env, 'PUBLIC_STORE_DOMAIN');
const token = getRequiredEnv(env, 'PUBLIC_STOREFRONT_API_TOKEN');
const check = process.argv.includes('--check');
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/**
 * Reads and line swaps are `repeatable`: sending one twice leaves the store
 * as sending it once does. A cart create is not.
 */
function storefront(query, variables, {repeatable = true, label} = {}) {
  return storefrontRequest({
    endpoint: `https://${domain}/api/${API_VERSION}/graphql.json`,
    token,
    query,
    variables,
    repeatable,
    label,
  });
}

/**
 * One variant per (product, group): every listed Printful piece. And, for
 * the US cart only, one variant per fixed line and product type (group
 * `fixed:<line>`): the General profile's US rate depends on the order value,
 * so each type that shares a line is quoted.
 */
async function quoteItems() {
  const items = [];
  const fixed = new Map();
  let after = null;
  do {
    const data = await storefront(
      `query ($after: String) {
        products(first: 100, after: $after, query: "status:active") {
          pageInfo { hasNextPage endCursor }
          nodes {
            handle productType tags
            variants(first: 100) {
              nodes { id availableForSale selectedOptions { name value } }
            }
          }
        }
      }`,
      {after},
      {label: 'catalogue read'},
    );
    for (const product of data.products.nodes) {
      const seen = new Set();
      for (const variant of product.variants.nodes) {
        const group = printfulShippingGroup(product, variant.selectedOptions);
        if (!variant.availableForSale) continue;
        const line = fixedRateLineFor(product, variant.selectedOptions);
        const type = `${line}:${product.productType}`;
        if (US_FIXED_LINES.includes(line) && !fixed.has(type))
          fixed.set(type, {
            handle: product.handle,
            group: `fixed:${line}`,
            variantId: variant.id,
          });
        if (!group || seen.has(group)) continue;
        seen.add(group);
        items.push({handle: product.handle, group, variantId: variant.id});
      }
    }
    after = data.products.pageInfo.hasNextPage
      ? data.products.pageInfo.endCursor
      : null;
  } while (after);
  // Garments sell everywhere the table covers, so a hoodie opens each cart.
  items.sort(
    (a, b) => (a.group === 'hoodie' ? 0 : 1) - (b.group === 'hoodie' ? 0 : 1),
  );
  return {items, fixedItems: [...fixed.values()]};
}

const CART = `fragment QuoteCart on Cart {
  id
  lines(first: 1) { nodes { id merchandise { ... on ProductVariant { id } } } }
  deliveryGroups(first: 5) {
    nodes { deliveryOptions { estimatedCost { amount currencyCode } } }
  }
}`;
const CREATE = `mutation ($input: CartInput!, $country: CountryCode)
@inContext(country: $country) {
  cartCreate(input: $input) { cart { ...QuoteCart } userErrors { message } }
} ${CART}`;
const SWAP = `mutation ($cartId: ID!, $lines: [CartLineUpdateInput!]!, $country: CountryCode)
@inContext(country: $country) {
  cartLinesUpdate(cartId: $cartId, lines: $lines) {
    cart { ...QuoteCart } userErrors { message }
  }
} ${CART}`;

function cheapest(cart) {
  const costs = cart.deliveryGroups.nodes
    .flatMap((group) => group.deliveryOptions)
    .map((option) => option.estimatedCost)
    .filter((cost) => Number.isFinite(Number(cost.amount)));
  if (!costs.length) return null;
  const low = costs.reduce((a, b) =>
    Number(b.amount) < Number(a.amount) ? b : a,
  );
  return {
    amount: Number(low.amount).toFixed(2),
    currencyCode: low.currencyCode,
  };
}

let carts = 0;
let swaps = 0;

/** handle#group -> fee (or null: no rate there) for one country. */
async function quoteCountry(country, items) {
  const fees = new Map();
  let cart = null;
  let failedCreates = 0;
  for (const item of items) {
    const key = `${item.handle}#${item.group}`;
    let result;
    if (!cart) {
      if (carts) await sleep(CART_GAP_MS);
      carts++;
      result = (
        await storefront(
          CREATE,
          {
            country,
            input: {
              buyerIdentity: {countryCode: country},
              delivery: {
                addresses: [
                  {
                    address: {
                      deliveryAddress: {
                        countryCode: country,
                        ...QUOTE_ADDRESSES[country],
                      },
                    },
                    selected: true,
                    validationStrategy: 'COUNTRY_CODE_ONLY',
                  },
                ],
              },
              lines: [{merchandiseId: item.variantId, quantity: 1}],
            },
          },
          {repeatable: false, label: `${country} cart create`},
        )
      ).cartCreate;
    } else {
      swaps++;
      result = (
        await storefront(
          SWAP,
          {
            country,
            cartId: cart.id,
            lines: [
              {
                id: cart.lines.nodes[0].id,
                merchandiseId: item.variantId,
                quantity: 1,
              },
            ],
          },
          {label: `${country} line swap`},
        )
      ).cartLinesUpdate;
      await sleep(SWAP_GAP_MS);
    }
    // Not for sale in this market: the line is refused, so no fee.
    const line = result?.cart?.lines.nodes[0];
    if (line?.merchandise?.id !== item.variantId) {
      fees.set(key, null);
      if (!cart && ++failedCreates > 2)
        throw new Error(`No quote cart for ${country}`);
      continue;
    }
    cart = result.cart;
    fees.set(key, cheapest(cart));
  }
  return fees;
}

const same = (a, b) =>
  a === b ||
  (a && b && a.amount === b.amount && a.currencyCode === b.currencyCode);
const show = (fee) => (fee ? `${fee.amount} ${fee.currencyCode}` : 'none');

const {items, fixedItems} = await quoteItems();
const problems = [];
const table = Object.fromEntries(PRINTFUL_SHIPPING_GROUPS.map((g) => [g, {}]));
const usFixed = {};
for (const group of PRINTFUL_SHIPPING_GROUPS) {
  if (!items.some((item) => item.group === group))
    problems.push(`No listed product in group ${group}`);
}

for (const [region, {probes}] of Object.entries(PRINTFUL_FEE_REGIONS)) {
  const perProbe = [];
  for (const country of probes) {
    const quoted = country === 'US' ? [...items, ...fixedItems] : items;
    perProbe.push([country, await quoteCountry(country, quoted)]);
    console.error(`quoted ${country}`);
  }
  if (region === 'US') {
    const fees = perProbe[0][1];
    for (const line of US_FIXED_LINES) {
      const quotes = fixedItems
        .filter((item) => item.group === `fixed:${line}`)
        .map((item) => ({
          where: item.handle,
          fee: fees.get(`${item.handle}#${item.group}`),
        }));
      if (!quotes.length) continue;
      const first = quotes[0].fee;
      const odd = quotes.filter((quote) => !same(quote.fee, first));
      if (odd.length)
        problems.push(
          `${line} line in the US: ${quotes[0].where} ${show(first)}, but ${odd
            .map((quote) => `${quote.where} ${show(quote.fee)}`)
            .join(', ')}`,
        );
      else if (first) usFixed[line] = first;
    }
  }
  for (const group of PRINTFUL_SHIPPING_GROUPS) {
    const quotes = items
      .filter((item) => item.group === group)
      .flatMap((item) =>
        perProbe.map(([country, fees]) => ({
          where: `${item.handle} ${country}`,
          fee: fees.get(`${item.handle}#${item.group}`),
        })),
      );
    if (!quotes.length) continue;
    const first = quotes[0].fee;
    const odd = quotes.filter((quote) => !same(quote.fee, first));
    if (odd.length) {
      problems.push(
        `${group} in ${region}: ${quotes[0].where} ${show(first)}, but ${odd
          .slice(0, 4)
          .map((quote) => `${quote.where} ${show(quote.fee)}`)
          .join(', ')}`,
      );
      continue;
    }
    if (first) table[group][region] = first;
  }
}

console.error(
  `${carts} carts, ${swaps} line updates, ${items.length} products and ${fixedItems.length} fixed-line types quoted`,
);
if (problems.length) {
  console.error(`Not written:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}

const feeSource = (fee) =>
  `{amount: '${fee.amount}', currencyCode: '${fee.currencyCode}'}`;
const lines = PRINTFUL_SHIPPING_GROUPS.map((group) => {
  const regions = Object.entries(table[group])
    .map(([region, fee]) => `    ${region}: ${feeSource(fee)},`)
    .join('\n');
  const key = /^[a-z]+$/.test(group) ? group : `'${group}'`;
  return `  ${key}: {\n${regions}\n  },`;
});
const usFixedLines = Object.entries(usFixed).map(
  ([line, fee]) => `  ${line}: ${feeSource(fee)},`,
);
const today = new Date().toISOString().slice(0, 10);
const source = (
  date,
) => `// Generated by \`npm run shipping-fees\` (scripts/build-shipping-fees.mjs)
// from checkout quotes on ${date}. Do not edit by hand: rebuild instead.
// A region missing from a group means that group does not ship there.
export const PRINTFUL_FEES_QUOTED_ON = '${date}';

export const PRINTFUL_SHIPPING_FEES = {
${lines.join('\n')}
} as const;

// What a US buyer pays for one item of a fixed-rate line (the EUR tables in
// merchantFeedShipping.ts): checkout converts the line's US rate to USD and
// rounds it up to a whole dollar. A line missing here has no US rate.
export const US_FIXED_SHIPPING_FEES = {
${usFixedLines.join('\n')}
} as const;
`;

if (check) {
  // Git may check the file out with CRLF line endings.
  const current = readFileSync(OUTPUT, 'utf8').replace(/\r\n/g, '\n');
  const quotedOn = current.match(/PRINTFUL_FEES_QUOTED_ON = '([\d-]+)'/)?.[1];
  if (current === source(quotedOn)) {
    console.error(`Table quoted on ${quotedOn} still matches checkout.`);
  } else {
    console.error(
      `Table quoted on ${quotedOn} no longer matches checkout; run npm run shipping-fees.`,
    );
    process.exit(1);
  }
} else {
  writeFileSync(OUTPUT, source(today));
  console.error(`Wrote ${OUTPUT}`);
}
