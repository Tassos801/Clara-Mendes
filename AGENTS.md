# Clara Mendes Storefront Knowledge Contract

This repository has a maintained Karpathy-style LLM wiki at:

`docs/llm-wiki/index.md`

## Routing

For architecture, onboarding, Shopify store, Hydrogen storefront, catalog, cart,
analytics, fulfillment, launch, or "where is X?" questions:

1. Start with `docs/llm-wiki/index.md`.
2. Read the relevant wiki pages.
3. Verify important claims against source code, tests, docs, scripts, or data
   before answering.
4. Cite source files when making non-obvious claims.

## Source Of Truth

- The code, tests, configuration, scripts, docs, and data files in this repo are
  the source of truth.
- The wiki is a maintained map. It can be stale.
- Do not document guesses as facts. Put unresolved assumptions in
  `docs/llm-wiki/open-questions.md`.

## Secrets

- Do not print or copy `.env` values.
- It is acceptable to mention environment variable names when needed.
- Do not store access tokens, API keys, webhook secrets, customer data, or order
  payloads in the wiki.

## Wiki Maintenance

When adding or materially changing durable knowledge:

1. Update the relevant page under `docs/llm-wiki/`.
2. Update `docs/llm-wiki/index.md` if pages are added, renamed, or materially
   re-scoped.
3. Append a dated entry to `docs/llm-wiki/log.md`.
4. Verify Markdown links.

