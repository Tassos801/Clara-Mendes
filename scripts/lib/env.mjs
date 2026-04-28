import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

export function envWithLocalDefaults(fileName = '.env') {
  return {
    ...loadLocalEnv(fileName),
    ...process.env,
  };
}

export function getRequiredEnv(env, key) {
  const value = String(env[key] ?? '').trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export function loadLocalEnv(fileName = '.env') {
  const envPath = resolve(process.cwd(), fileName);

  if (!existsSync(envPath)) return {};

  return readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return env;

      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) return env;

      env[match[1]] = stripQuotes(match[2].trim());
      return env;
    }, {});
}

export function normalizeShopDomain(value) {
  const trimmed = String(value ?? '').trim();
  const withoutProtocol = trimmed.replace(/^https?:\/\//, '');
  const domain = withoutProtocol.split('/')[0]?.trim();

  if (!domain) {
    throw new Error('PUBLIC_STORE_DOMAIN must be a Shopify store domain');
  }

  return domain;
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
