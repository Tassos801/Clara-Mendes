# US market: start here on every PC

**Repository:** https://github.com/Tassos801/Clara-Mendes  
**Working branch:** `claude/us-market` (draft PR into `main`)  
**Base:** `9fca667` (main after #139)  
**Owner:** Tassos  
**Agents:** Claude Code or Codex (Sol), one active writer at a time. The writer
is named in [status.md](status.md).

## Goal

Sell properly to US buyers without changing what EU and Cyprus buyers get:
a US market in USD, US delivery wording, US listings in Google Merchant
Center, and a clear list of which products are offered in the US.

## Ground rules (owner, 2026-10-18)

1. **Don't erase anything.** Cyprus, the EU and International markets, every
   existing shipping zone and rate, the EUR Merchant Center feed, and the
   current wording for non-US buyers all stay as they are. The US work is
   added beside them. Hiding a product from US buyers is not erasing it, but
   it needs the owner's OK first.
2. **Make it dynamic.** Every surface reads the buyer's country
   (`resolveMarketCountry` in `app/lib/markets.ts`) and Shopify's prices for
   that market (Storefront `@inContext(country)`). Don't add a hardcoded `$`
   copy of a `€` string. Derive the figure, or key a table by market.
3. **Owner gates.** Every write to Shopify Admin, Merchant Center or Prodigi
   needs the owner's explicit go-ahead in chat for that step. Carts and
   Prodigi *quotes* are fine. Never place an order, and stop every checkout
   test before payment.
4. **Secrets.** Never print `.env` values. Naming the variables is fine.

## Picking the work up

1. Fetch the branch and fast-forward it (commands below). Don't reset,
   clean or force-push over another agent's commits.
2. Read [status.md](status.md): "Stopped here", then the open decisions.
3. Put your name as **Current writer** in status.md, commit and push. Then
   start the first unticked step whose gate is clear.
4. Finish one step at a time. Tick it in status.md with the evidence
   (command output, readback, PR number) and commit the files you changed
   by name. Push before you stop.
5. When you stop, set **Current writer** back to `none`, update "Stopped
   here", and push. GitHub is the shared handoff, not local folders.

```sh
git fetch origin
git switch claude/us-market 2>/dev/null || git switch --track origin/claude/us-market
git pull --ff-only origin claude/us-market
npm ci
```

On the owner's Mac the worktree is `~/Desktop/shopify/.worktrees/us-market`.
See the repo's [AGENTS.md](../../AGENTS.md) and [LLM wiki](../llm-wiki/index.md),
especially [fulfillment](../llm-wiki/modules/fulfillment.md).

## Tools that already exist

- `node scripts/audit-customer-purchase-path.mjs --handle=<handle> --country-code=US --country="United States" --city="New York" --postal-code=10001`
  builds a real cart for a US address and reads what checkout offers. It
  places no order.
- The Storefront query in [status.md § Evidence](status.md#evidence-2026-10-18)
  shows which product types each country can buy.
- Shopify Admin and Prodigi are only signed in through Claude in Chrome. The
  built-in browser lands on login pages, and you must never sign in there.
