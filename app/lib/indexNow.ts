/**
 * IndexNow (indexnow.org): Bing, Yandex and other engines that share the
 * protocol (Bing feeds ChatGPT search) re-crawl URLs we submit instead of
 * waiting for their next sitemap pass. The key is public by design: the
 * engines fetch it from /<key>.txt to confirm the submitter owns the host.
 * `node scripts/indexnow-submit.mjs` submits the live sitemap URLs (dry run
 * by default; `--apply` sends).
 */
export const INDEXNOW_KEY = '780654777ade8d31c5a58e744d087926';
export const INDEXNOW_KEY_PATH = `/${INDEXNOW_KEY}.txt`;
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
