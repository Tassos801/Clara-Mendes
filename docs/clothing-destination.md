# Clothing destination: operator guide

Written 8 October 2026 for the work on branch
`codex/clothing-destination-2026-10-08`. That work was not committed when this
guide was written, so nothing here is live until the branch is merged and
deployed. No Shopify change has been made for it. Product facts come from the
saved read-only snapshot `audits/clothing-catalog-2026-10-08.json`, described
in [the catalogue audit](audits/clothing-catalog-2026-10-08.md).

## What it is

`/clothing` is one page for all Clara Mendes clothing. The code reads the
garments, categories and capsules from Shopify when the page loads. Adding a
garment or a capsule is a Shopify Admin task. A few things still need code;
see [What still needs code](#what-still-needs-code).

- A **category** is a kind of garment (Leggings, Bras, Shorts, Tops, ...). It
  comes from the product type.
- A **capsule** is a named group of garments, such as Quiet Current. It comes
  from a Shopify collection. Categories and capsules are kept apart.

In the snapshot there are 4 garments: 1 in each of Leggings, Bras, Shorts and
Tops, all in the capsule Quiet Current.

## Files

| Part | File |
| --- | --- |
| What counts as clothing, categories, capsules, the Shopify search query | [`app/lib/clothing.ts`](../app/lib/clothing.ts) |
| Loads clothing from the Storefront API (all pages, then filters) | [`app/lib/clothing.server.ts`](../app/lib/clothing.server.ts) |
| Sorting, paging (12 per page), colour images, looks, small-range rule | [`app/lib/clothingPresentation.ts`](../app/lib/clothingPresentation.ts) |
| Page copy and artwork, one entry per capsule | [`app/lib/clothingEditorial.ts`](../app/lib/clothingEditorial.ts) |
| The page | [`app/routes/clothing.tsx`](../app/routes/clothing.tsx), [`app/components/ClothingProductCard.tsx`](../app/components/ClothingProductCard.tsx), [`app/styles/clothing.css`](../app/styles/clothing.css) |
| Permanent (301) redirect `/collections/clothing` to `/clothing`, query string kept | [`app/routes/collections.clothing.tsx`](../app/routes/collections.clothing.tsx) |
| Homepage section (not shown when there are no garments) | [`app/components/ClothingFeature.tsx`](../app/components/ClothingFeature.tsx), loaded in [`app/routes/_index.tsx`](../app/routes/_index.tsx) |
| Header, mobile menu and footer link (always shown) | [`app/components/ClaraShell.tsx`](../app/components/ClaraShell.tsx) |
| The rule that decides if a product may be shown, on every page | `isListedProduct` and `isStoreThemeProduct` in [`app/lib/catalogFilters.ts`](../app/lib/catalogFilters.ts) |
| Delivery windows | `fulfilmentWindows` in [`app/lib/storefrontBasics.ts`](../app/lib/storefrontBasics.ts) |
| Sitemap (`/clothing` is in the custom list; product and collection URLs are checked against live eligibility) | [`app/lib/sitemap.ts`](../app/lib/sitemap.ts) |
| Tests (`npm test`) | [`scripts/clothing.node-test.mjs`](../scripts/clothing.node-test.mjs), [`scripts/fulfilmentWindows.node-test.mjs`](../scripts/fulfilmentWindows.node-test.mjs) |
| Read-only catalogue audit | [`scripts/audit-clothing-catalog.mjs`](../scripts/audit-clothing-catalog.mjs) |

## Who appears

A product is shown on `/clothing` only when **all** of these are true.

1. **Shopify gives it to the storefront.** Status is Active and it is
   published to the `Clara Mendes` sales channel (the channel the Quiet
   Current products use; see [the launch record](quiet-current-release.md)).
   Draft and unpublished products never reach the code.
2. **It is clothing.** Its product type is one of the exact types in the table
   below (capital letters and outer spaces are ignored), **or** it has the tag
   `clara-mendes-clothing`. A title, a vendor name or any other tag never makes
   a product clothing.
3. **The store rule allows it.** `isListedProduct`, built on
   `isStoreThemeProduct`, is the same rule for the grid, search, product page,
   sitemap and recently viewed. It refuses a product that is:
   - on the off-theme or unfulfillable handle lists, or from a vendor whose
     name contains `mock.shop`, `hydrogen`, `stlouisbeautyline` or `tux-usa`;
   - a staged handle whose release flag is `false`;
   - sold only through a feature page (Your Sky).

   It then admits a product by one of two paths:
   - **Released path.** The handle is already released in
     `PRODUCT_RELEASE_FLAGS`. Today this is the four Quiet Current handles
     (`quiet-current-high-waist-leggings`, `quiet-current-studio-bra`,
     `quiet-current-high-waist-biker-shorts`, `quiet-current-studio-tank`).
     Their approval metafields are not used. In the snapshot both are `false`
     on all four.
   - **Future garment path.** Both product metafields
     `custom.storefront_approved` and `custom.fulfillment_verified` must be
     type Boolean, readable by the Storefront API, and exactly `true`.

**The rule fails closed.** A missing metafield, a missing value, a value of
`false`, a text-type field, `TRUE` in capitals, or a field the Storefront API
cannot read all count as "not approved", and the garment stays hidden.

**Never shown:** anything that is not clothing (art prints, cards, canvases,
phone cases, plant pots, book nooks); Draft or unpublished products; future
garments without both approvals; and the protected products in the list above,
even if they carry the clothing tag and both approvals. Do not put the clothing tag on
a product that is not clothing, because the tag alone makes it clothing.

### Product types that count as clothing

The page category comes from this table. Source: `CATEGORIES` in
[`app/lib/clothing.ts`](../app/lib/clothing.ts).

| Category | Exact product types |
| --- | --- |
| Leggings | Yoga Leggings, Leggings |
| Bras | Sports Bra, Sports Bras, Bras |
| Shorts | Biker Shorts, Shorts |
| Tops | Studio Top, Tops, T-Shirts, T-Shirt, Shirts, Tank Tops, Blouses, Sweatshirts, Hoodies |
| Dresses | Dresses, Dress |
| Skirts | Skirts, Skirt |
| Trousers | Trousers, Pants, Jeans |
| Knitwear | Knitwear, Sweaters, Cardigans |
| Outerwear | Outerwear, Jackets, Coats |
| One-pieces | Jumpsuits, Playsuits, Bodysuits |

A garment admitted only by the tag, with a type that is not in the table, is
shown under a category called "Clothing". Use a listed type when you can.

## Add a new garment (no code change)

1. **Create the product** in Shopify Admin. Give it a colour option named
   `Colour`, `Color` or `Colourway`, and a `Size` option. The page takes the
   card image, price and link for each colour from that colour option.
2. **Set the product type** to one type from the table above. If the garment is
   a kind that is not listed, add the tag `clara-mendes-clothing` instead.
3. **Set the Shopify product category** (taxonomy) under Apparel &
   Accessories > Clothing. The page does not read it, but Shopify feeds do.
   The four Quiet Current garments are still "Uncategorized"; the prepared
   values are in [the catalogue audit](audits/clothing-catalog-2026-10-08.md#prepared-shopify-changes-not-applied).
4. **Add it to its capsule collection**, if it belongs to one (see
   [Add a new capsule](#add-a-new-capsule)). A collection named after a
   category or "Clothing" is never treated as a capsule.
5. **Finish the fulfilment checks before approving.** Use the
   [Quiet Current record](quiet-current-release.md) as the model: supplier
   mapping of every variant, billing, a shipping profile with rates, fabric and
   size details in the description, and images. Leave both metafields `false`
   (or empty) until then.
6. **Set both metafields to `true`:** `custom.storefront_approved` and
   `custom.fulfillment_verified`. If they do not show on the product page,
   check their definitions in Settings, Custom data. They already exist and
   are readable by the Storefront API: the snapshot's Storefront query
   returned both as Boolean for the four garments.
7. **Set status to Active** and **publish to the `Clara Mendes` channel.**
8. **Check it** (next section).

### Check that it appears

After Hydrogen's short cache expires (`CacheShort` in the loader):

- `/clothing` shows the piece, and its category appears when the tools are on
  (see [What the page hides](#what-the-page-hides-automatically)).
- `/products/<handle>` opens. For a future garment, if an approval is not
  `true`, the page redirects away.
- `/search?q=<title>` returns it.
- `/sitemap/products/1.xml` lists it. Product and collection sitemaps are not
  cached (`no-store`) and are checked against the live metafields.

If it does not appear, check in this order: status Active; published to the
channel; product type spelled exactly as in the table, or the tag spelled
`clara-mendes-clothing`; both metafields Boolean and `true`; the handle is not
on an off-theme list; the vendor does not contain an off-theme word.

To see the whole catalogue at once, run the read-only audit and write to a
**new** dated file. Do not overwrite `audits/clothing-catalog-2026-10-08.json`,
because `scripts/clothing.node-test.mjs` reads it.

```powershell
node scripts/audit-clothing-catalog.mjs --output=docs/audits/clothing-catalog-YYYY-MM-DD.json
```

It reads the Admin and Storefront APIs, makes no change, and refuses
`--apply`. It needs the local Shopify settings (`PUBLIC_STORE_DOMAIN`,
`PUBLIC_STOREFRONT_API_TOKEN` and the Admin client settings kept in
`.env.shopify-admin.local`). Each garment in the result has
`destinationEligible`.

## What still needs code

- **A delivery estimate for the new garment.** `fulfilmentWindows` in
  `app/lib/storefrontBasics.ts` returns a value only for the four Quiet Current
  handles. For every other garment it returns `null`, so the garment has no
  delivery window. Exactly what happens:
  - The product page shows "Available" in the status chip (Quiet Current
    shows "Made to order"), and the processing line reads "Shipping
    calculated at checkout".
  - The Shipping row reads "Available destinations and shipping fees are
    confirmed at checkout. See the product details for any item-specific
    processing and delivery information." The same sentence is used in the
    order reassurance list.
  - The product's structured data has no `shippingDetails` (no handling or
    transit time). The return-policy block is still there.

  The Quiet Current windows (processing 2–7, dispatch 3–8 business days) come
  from Printful's published times plus the manual confirmation day. A new
  garment needs its own verified source, a code change in `storefrontBasics.ts`
  and a test in `scripts/fulfilmentWindows.node-test.mjs`.
- **Shipping rates on the page.** The rate table on the product page, the
  "Shipping from" line and the Quiet Current collection subtitle are fixed to
  the four Quiet Current handles (`APPAREL_SHIPPING_RATES`). A new garment
  charges whatever its Shopify shipping profile says, and the page says
  shipping is calculated at checkout. The `/clothing` page shows the "Shipping
  from" line only while every piece is Quiet Current.
- **Editorial block for a new capsule.** Add an entry to `CAPSULE_STORIES` in
  [`app/lib/clothingEditorial.ts`](../app/lib/clothingEditorial.ts). Without an
  entry the capsule still lists, filters and links; it gets the generic block
  (name, piece count, link).
- **Collection page hero.** `app/lib/collectionHeroes.ts` has an entry for
  `quiet-current` only.
- **A garment type that is not in the table**, if you want its own category
  instead of the tag: add it to `CATEGORIES` in `app/lib/clothing.ts`.

## Add a new capsule

1. **Create a collection** in Shopify Admin. The title is the name shown on the
   page. Two checks make a collection "never a capsule":
   - The handle is on the legacy list in `catalogFilters.ts` (for example
     `women`, `men`, `tops`, `bottoms`, `accessories`).
   - The handle is `clothing` or a category slug (`leggings`, `bras`, `shorts`,
     `tops`, `dresses`, `skirts`, `trousers`, `knitwear`, `outerwear`,
     `one-pieces`), or the title is "Clothing", a category label, or a product
     type from the table (for example "Dresses", "Tops", "Skirt").
2. **Set the collection metafield `custom.collection_kind` to `capsule`** (type
   Single line text, exact lower-case value). **This needs a collection
   metafield definition with Storefront access. It is prepared, not done:**
   in the snapshot `clothingKind` is `null` on all 17 collections, and the
   snapshot cannot show whether the definition exists. See
   [One-time Shopify set-up](#one-time-shopify-set-up-prepared-not-applied).
   Without the value the collection is not a capsule. Quiet Current is the one
   exception: the code treats the handle `quiet-current` as a capsule.
3. **Add the garments** to the collection (manual or by rule). The page reads
   the real membership from each garment, so the garments must be eligible
   (see [Who appears](#who-appears)).
4. **Publish the collection** to the `Clara Mendes` channel, as Quiet Current
   was. Whether an unpublished collection would still show as a capsule has
   not been tested.
5. **Check it.** The capsule shows on `/clothing` when it holds at least one
   eligible garment and there are two or more capsules (see below). The
   collection page `/collections/<handle>` opens only if the collection has an
   eligible garment; otherwise it redirects to `/collections/all` (or returns
   404 if the collection is not published). Shop All and the homepage judge a
   collection from its first four products, so keep an approved garment among
   them.

Predictive search suggestions do not list a new capsule collection. That
check has no product list to judge by, and only `quiet-current`,
`clara-mendes-art-living` and the five original-art handles pass without one.

## One-time Shopify set-up (prepared, not applied)

Nothing in this section has been done.

| Item | State | What to do |
| --- | --- | --- |
| Product metafields `custom.storefront_approved` and `custom.fulfillment_verified` (Boolean) | Exist and are readable by the Storefront API (snapshot, 4 garments). | Nothing. |
| Collection metafield `custom.collection_kind`, owner type Collection, type Single line text, Storefront access read | Unknown. All 17 collections have no value. No script in the repo creates it. | Check Settings, Custom data, Collections. If it is missing, create it with Storefront access. In the API this is `access: {storefront: 'PUBLIC_READ'}`, as `scripts/setup-reviews.mjs` does for the reviews field. |
| `custom.collection_kind` = `capsule` on collection `quiet-current` (`gid://shopify/Collection/705300431182`) | Optional. The code already treats this handle as a capsule. | Set it after the definition exists, so all capsules follow one rule. |
| Shopify product category for the 4 Quiet Current garments | "Uncategorized" on all 4. | See [prepared changes](audits/clothing-catalog-2026-10-08.md#prepared-shopify-changes-not-applied). |

## What the page hides automatically

- **Garments that fail the rule** (see [Who appears](#who-appears)).
- **Categories with no garments.** Only categories that have a product get a
  link, with the real count.
- **Category links and the sort menu** appear only when the clothing
  catalogue has **more than 8 pieces** (9 or more), or a category is already
  selected in the address. Below that, the page shows the plain grid. The
  threshold is `CLOTHING_TOOLS_MIN_PRODUCTS` in
  `app/lib/clothingPresentation.ts`.
- **The capsule filter** appears only when there are **2 or more capsules**, or
  a capsule is already selected in the address. With one capsule there is no
  filter.
- **"Show more"** appears only when the current selection has more than 12
  pieces.
- **"Wear it together"** groups pieces by a colourway they share, such as
  Moss / Mist or Clay / Oat, using each colour's real variant image. A
  colourway used by only one piece makes no group, and the section is hidden
  when there are no groups. Colourways match on the exact colour option value.
- **The capsule block** shows the capsule that holds the newest piece (or the
  first capsule by name), and is hidden when there is no capsule.
- **Summary line.** "Sizes XS–XL" shows only when every size
  option is a standard size. "Made to order" shows only when every piece has
  the tag `Made to order`.
- **An empty catalogue.** The page stays up with "Clothing is coming soon.",
  and it is marked noindex. The homepage section is not shown.
- **Non-clothing.** Nothing outside the clothing rule can appear.
- **Shop All.** Garment types are not listed as separate type tabs. One
  "Clothing" tab links to `/clothing` while the catalogue has a garment. A
  garment admitted by the tag with an unlisted type still shows its type as a
  tab (see [open questions](llm-wiki/open-questions.md)).

## Related

- [Catalogue audit, 8 October 2026](audits/clothing-catalog-2026-10-08.md)
- [Quiet Current launch record](quiet-current-release.md)
- [Wiki page: Clothing](llm-wiki/modules/clothing.md)
- [Shopify Admin cleanup](shopify-admin-cleanup.md)
