# Artist-shop pilot: start here on every PC

**Repository:** https://github.com/Tassos801/Clara-Mendes  
**Development branch:** `codex/artist-shops-pilot`  
**Production branch:** `main`  
**Initial base:** `f4ac0f2f6bd29f7493418636cf98ce79924c8200`  
**Owner:** Tassos  
**Model preference:** use Sol for implementation and bounded review tasks.

## Read first

1. Root [AGENTS.md](../../AGENTS.md).
2. [Current status and next step](status.md).
3. [Agreed product brief](brief.md).
4. The implementation plan linked from status, plus [LLM wiki](../llm-wiki/index.md).

Build a small curated museum-art print collection with dedicated artist shops.
Artist and product-type browsing must share the same product records. Preserve
all existing store behaviour and independent publication/fulfilment gates.
The full merchandise catalogue is a later expansion.

## First checkout on another PC

```sh
git clone --branch codex/artist-shops-pilot https://github.com/Tassos801/Clara-Mendes.git clara-mendes-artist-shops
cd clara-mendes-artist-shops
git status --short --branch
git branch --show-current
npm ci
```

Requires Node 22 or 24. The branch printed must be
`codex/artist-shops-pilot`. Do not create a similarly named replacement branch.

For an existing clone, first inspect local changes, then fetch:

```sh
git status --short --branch
git fetch origin
git switch codex/artist-shops-pilot
git pull --ff-only origin codex/artist-shops-pilot
```

If the local branch does not yet exist, use
`git switch --track origin/codex/artist-shops-pilot`.
If it is already checked out in a worktree on that PC, use that worktree.
Do not reset, clean or overwrite unrelated work to make these commands succeed.
Local folder paths are machine-specific; GitHub is the shared handoff.

## Working together without overwriting progress

- One active writer on the shared branch at a time. Check status and the draft
  PR before editing; the status file is a handoff record, not a locking system.
- Before a machine switch, finish a coherent checkpoint, run the relevant
  checks, update status with completed work, remaining work and actual evidence,
  commit explicit files, and push. Verify the remote branch matches local HEAD.
- At the next PC, fetch and fast-forward before starting. Stop and inspect
  divergence; do not force-push or silently discard another agent's commits.
- For genuinely concurrent work on another PC, use a separate sub-branch from
  this branch and a PR targeting `codex/artist-shops-pilot`. Assign disjoint
  scope and integrate deliberately.
- Keep the draft PR to main as the discovery/review entry point. Do not merge
  or enable auto-merge until the owner authorises release.

## Environment and external-state boundaries

Do not commit or copy secret values into these documents. Configure credentials
locally using the repository's existing setup. Read variable names in README;
use `CLARA_ENV_DIR` / `CLARA_LAUNCH_DIR` only as documented in the
[print runbook](../add-products-runbook.md).

A Git branch isolates code, not Shopify data or supplier orders. This initial
work is local/read-only: no Admin mutations, product publication, paid orders,
webhook activation, production deploy or advertising. Use a development store
for mutation testing when available.

The current GitHub workflow validates branch pushes and then attempts an Oxygen
preview; only main is the production branch. Verify the actual resulting
environment before sharing a preview URL. A preview can still read production
Shopify data, so code isolation must not be described as data isolation.

## Validation

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

Use focused tests while iterating, then the repository gate for a milestone.
Document pre-existing failures separately from new failures. A build or cart
check does not establish supplier mapping, delivered cost or physical quality.

## Important baseline findings

- Current main still contains legacy release allowlists. Generic product
  visibility is not uniformly controlled by Boolean approval fields.
- Future clothing has a strict approval path; artist-backed products need their
  own consistent integration across search, PDP, collections and sitemap.
- Extend the existing print pipeline; do not introduce per-artist launch scripts
  or new hardcoded release registries.
- The primary PC's old checkout is on an unrelated framed-print branch. Do not
  build this work there merely because it contains credentials or dependencies.
