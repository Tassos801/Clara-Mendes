// astronomy-engine ships a UMD main; Node's ESM loader exposes it on
// `default`, Vite exposes named exports. Normalise once here.
import * as AE from 'astronomy-engine';

type AstronomyModule = typeof import('astronomy-engine');

export const Astronomy: AstronomyModule =
  (AE as unknown as {default?: AstronomyModule}).default ??
  (AE as AstronomyModule);
