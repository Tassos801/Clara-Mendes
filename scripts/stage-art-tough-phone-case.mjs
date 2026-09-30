#!/usr/bin/env node
/* eslint-disable no-console */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';

import {resolveAdminClient} from './lib/admin.mjs';
import {loadLocalEnv} from './lib/env.mjs';
import {
  assertReleasedSources,
  makeHandoffCsv,
  stageProduct,
  validateManifest,
} from './lib/art-tough-phone-case.mjs';

const sourcePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(sourcePath), '..');
const outputDir = path.join(
  repoRoot,
  'output',
  'launches',
  'art-tough-phone-case',
);

export function parseArgs(args) {
  const options = {
    apply: false,
    verifyOnly: false,
    resumeOperation: null,
    envDir: repoRoot,
    help: false,
  };
  const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (seen.has(flag)) throw new Error(`Repeated argument: ${flag}`);
    seen.add(flag);
    if (flag === '--apply') options.apply = true;
    else if (flag === '--verify-only') options.verifyOnly = true;
    else if (flag === '--help') options.help = true;
    else if (flag === '--env-dir' || flag === '--resume-operation') {
      const value = args[++index];
      if (!value || value.startsWith('--'))
        throw new Error(`Missing value for ${flag}`);
      if (flag === '--env-dir') {
        if (!path.isAbsolute(value))
          throw new Error('--env-dir must be an absolute directory path');
        options.envDir = value;
      } else {
        if (!/^gid:\/\/shopify\/ProductSetOperation\/\d+$/.test(value))
          throw new Error('Invalid --resume-operation ID');
        options.resumeOperation = value;
      }
    } else throw new Error(`Unknown argument: ${flag}`);
  }
  if (
    [
      options.apply,
      options.verifyOnly,
      Boolean(options.resumeOperation),
    ].filter(Boolean).length > 1
  )
    throw new Error(
      'Do not combine apply, verify-only and resume-operation modes',
    );
  return options;
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function writeJson(file, body) {
  const temporary = `${file}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(body, null, 2)}\n`);
  renameSync(temporary, file);
}

// Shared auth errors may contain provider response text. Redact every local
// credential value from the final diagnostic before writing or displaying it.
function safeMessage(error, env) {
  let message = String(error?.message ?? error);
  const values = Object.entries(env)
    .filter(
      ([key, value]) =>
        /TOKEN|SECRET|PASSWORD|API_KEY/i.test(key) &&
        typeof value === 'string' &&
        value.length >= 4,
    )
    .map(([, value]) => value)
    .sort((a, b) => b.length - a.length);
  for (const value of values) message = message.replaceAll(value, '[redacted]');
  return message;
}

function withReadThrottle(client) {
  return async (query, variables) => {
    const readOnly = !/\bmutation\b/.test(query);
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await client(query, variables);
        const throttle = response.extensions?.cost?.throttleStatus;
        if (
          readOnly &&
          throttle?.restoreRate > 0 &&
          throttle.currentlyAvailable < 900
        ) {
          await delay(
            Math.min(
              10000,
              Math.ceil(
                ((900 - throttle.currentlyAvailable) / throttle.restoreRate) *
                  1000,
              ),
            ),
          );
        }
        return response;
      } catch (error) {
        if (
          !readOnly ||
          attempt >= 4 ||
          !/THROTTLED|Throttled/.test(String(error.message))
        )
          throw error;
        await delay(2500);
      }
    }
  };
}

export async function main(args = process.argv.slice(2)) {
  let env = {};
  let started = false;
  try {
    const options = parseArgs(args);
    if (options.help) {
      console.log(
        'Stage Art Tough Phone Case (dry-run by default).\nUsage: node scripts/stage-art-tough-phone-case.mjs [--env-dir ABSOLUTE_DIRECTORY] [--apply | --verify-only | --resume-operation PRODUCT_SET_OPERATION_GID]\nApply always retains DRAFT, zero tracked inventory, DENY and false approval metafields. Resume and verify-only make no mutations.',
      );
      return;
    }
    if (!existsSync(options.envDir) || !statSync(options.envDir).isDirectory())
      throw new Error('Environment directory does not exist');
    env = {
      ...loadLocalEnv('.env', options.envDir),
      ...loadLocalEnv('.env.shopify-admin.local', options.envDir),
      ...process.env,
    };
    const manifest = readJson(
      path.join(repoRoot, 'data', 'art-tough-phone-case.json'),
    );
    validateManifest(manifest);
    assertReleasedSources(
      manifest,
      readJson(path.join(repoRoot, 'data', 'original-art-catalog.json')),
      readJson(path.join(repoRoot, 'data', 'print-catalog.json')),
    );
    const admin = withReadThrottle(
      await resolveAdminClient(
        env,
        options.apply ? {requiredScope: 'write_products'} : {},
      ),
    );
    mkdirSync(outputDir, {recursive: true});
    started = true;
    const stateFile = path.join(outputDir, 'operation.json');
    const previousState = existsSync(stateFile) ? readJson(stateFile) : null;
    const result = await stageProduct({
      admin,
      manifest,
      apply: options.apply,
      verifyOnly: options.verifyOnly,
      resumeOperation: options.resumeOperation,
      previousState,
      onState: async (state) => writeJson(stateFile, state),
    });
    const observedAt = new Date().toISOString();
    writeJson(path.join(outputDir, 'product-plan.json'), {
      ...result.plan,
      mode: result.mode,
      observedAt,
    });
    const product = result.readback ?? result.preflight.target;
    writeFileSync(
      path.join(outputDir, 'prodigi-handoff.csv'),
      makeHandoffCsv(manifest, product),
    );
    if (result.readback) {
      writeJson(path.join(outputDir, 'readback.json'), {
        observedAt,
        shop: result.preflight.shop,
        sources: result.preflight.sources,
        product: result.readback,
      });
      writeJson(path.join(outputDir, 'verification.json'), {
        ...result.verification,
        mode: result.mode,
        observedAt,
      });
    } else {
      writeJson(path.join(outputDir, 'dry-run-verification.json'), {
        passed: null,
        mode: 'dry-run',
        observedAt,
        sourcePreflightPassed: true,
        designCount: result.plan.designCount,
        phoneCount: result.plan.phoneCount,
        variantCount: result.plan.variantCount,
        existingProductId: product?.id ?? null,
        reason:
          'No mutation; complete product verification requires --verify-only or a completed --apply.',
      });
    }
    console.log(
      JSON.stringify(
        {
          mode: result.mode,
          handle: result.plan.handle,
          status: product?.status ?? 'DRAFT',
          designs: result.plan.designCount,
          phones: result.plan.phoneCount,
          variants: result.plan.variantCount,
          productId: product?.id ?? null,
          verificationPassed: result.verification?.passed ?? null,
          publicationVerification:
            result.verification?.publicationVerification ?? null,
          outputDir,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    const message = safeMessage(error, env);
    if (started)
      writeJson(path.join(outputDir, 'last-failure.json'), {
        passed: false,
        observedAt: new Date().toISOString(),
        message,
      });
    console.error(message);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === sourcePath)
  await main();
/* eslint-enable no-console */
