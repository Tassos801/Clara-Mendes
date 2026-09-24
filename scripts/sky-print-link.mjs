#!/usr/bin/env node
/* eslint-disable no-console */
// Prints signed print URLs (v1 and v2 samples) for checking a deployed
// print route. Needs SKY_SIGNING_SECRET for the target deployment:
//
//   node --env-file=<path to env file> scripts/sky-print-link.mjs https://shopclaramendes.com
import {validateSkyParams} from '../app/lib/sky/params.ts';
import {encodeSkyToken} from '../app/lib/sky/sign.server.ts';

const origin = process.argv[2] ?? 'http://localhost:3006';
const secret = process.env.SKY_SIGNING_SECRET;
if (!secret) throw new Error('SKY_SIGNING_SECRET is not set');
const base = {
  date: '2019-06-14',
  time: '22:00',
  lat: 48.8566,
  lon: 2.3522,
  tz: 'Europe/Paris',
  place: 'Paris, France',
  title: 'The night we met',
  theme: 'linen',
};
for (const [label, input, size] of [
  ['v1 classic', {...base, v: 1}, '8x10'],
  ['v2 compass all details', {...base, layout: 'compass', details: 'names,grid,time'}, '20x24'],
]) {
  const token = await encodeSkyToken(validateSkyParams(input).params, secret);
  console.log(`${label}: ${origin}/api/sky-print/${token}.pdf?size=${size}`);
}
/* eslint-enable no-console */
