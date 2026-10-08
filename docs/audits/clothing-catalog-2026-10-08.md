# Clothing catalogue audit, 8 October 2026

Source: [`clothing-catalog-2026-10-08.json`](clothing-catalog-2026-10-08.json),
captured 2026-10-08 09:54 UTC by
[`scripts/audit-clothing-catalog.mjs`](../../scripts/audit-clothing-catalog.mjs).
The file says `readOnly: true` and `liveMutations: 0`. Do not overwrite it:
[`scripts/clothing.node-test.mjs`](../../scripts/clothing.node-test.mjs) reads
it.

**No Shopify changes were made by this work. Live product, collection and
publication states are unchanged.** Every change in this document is prepared,
not applied. How the page works: [Clothing destination guide](../clothing-destination.md).

## Counts

| Measure | Value |
| --- | ---: |
| Products in Admin | 61 (48 Active, 13 Draft) |
| Products the Storefront API returned | 47 |
| Products that pass the listing rule | 46 |
| Products classified as clothing | 4 |
| Clothing products eligible for the page | 4 |
| Collections in Admin | 17 (2 with products, 15 empty) |

The numbers fit together. 48 Active minus 47 returned leaves
`first-light-birth-poster`, which is Active in Admin but not returned to the
Storefront. Its release flag is also `false` in `PERSONALISED_RELEASE_FLAGS`,
so the code would hide it anyway. 47
returned minus 46 leaves `your-sky-star-map`, which is returned but kept out of
listings on purpose because it is sold through its own page. Neither is
clothing.

Categories on the page: Leggings 1, Bras 1, Shorts 1, Tops 1. Capsules: Quiet
Current 4.

## Product types

"Taxonomy" is the Shopify product category. "Named" is a real category,
"Uncategorized" is Shopify's `gid://shopify/TaxonomyCategory/na`, and "No
category" is `null`.

| Product type | Products | Active | Draft | In Storefront | Named | Uncategorized | No category |
| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: |
| Art Prints | 29 | 24 | 5 | 24 | 15 (Posters, Prints, & Visual Artwork) | 1 | 13 |
| Framed Art | 1 | 0 | 1 | 0 | 0 | 1 | 0 |
| Cards | 1 | 1 | 0 | 1 | 0 | 1 | 0 |
| Postcards | 1 | 1 | 0 | 1 | 0 | 1 | 0 |
| Notebooks | 1 | 0 | 1 | 0 | 0 | 0 | 1 |
| Journals | 1 | 0 | 1 | 0 | 0 | 0 | 1 |
| Calendars | 1 | 0 | 1 | 0 | 0 | 0 | 1 |
| Canvas Art | 1 | 1 | 0 | 1 | 0 | 1 | 0 |
| Bags | 1 | 0 | 1 | 0 | 0 | 0 | 1 |
| Cushions | 1 | 0 | 1 | 0 | 0 | 0 | 1 |
| Blankets | 1 | 0 | 1 | 0 | 0 | 1 | 0 |
| Phone Cases | 2 | 1 | 1 | 1 | 0 | 0 | 2 |
| Personalised Art | 2 | 2 | 0 | 1 | 2 (Prints; Posters) | 0 | 0 |
| Plant Pots | 4 | 4 | 0 | 4 | 0 | 0 | 4 |
| Book Nooks | 10 | 10 | 0 | 10 | 0 | 10 | 0 |
| **Yoga Leggings** | 1 | 1 | 0 | 1 | 0 | 1 | 0 |
| **Sports Bra** | 1 | 1 | 0 | 1 | 0 | 1 | 0 |
| **Biker Shorts** | 1 | 1 | 0 | 1 | 0 | 1 | 0 |
| **Studio Top** | 1 | 1 | 0 | 1 | 0 | 1 | 0 |
| Total | 61 | 48 | 13 | 47 | 17 | 20 | 24 |

The four bold rows are the clothing. They are the Quiet Current products.

| Garment | Handle | Product ID | Price | Approvals in Storefront |
| --- | --- | --- | --- | --- |
| High-Waist Leggings | `quiet-current-high-waist-leggings` | `gid://shopify/Product/16125355786574` | EUR 79 | both `false` |
| Studio Bra | `quiet-current-studio-bra` | `gid://shopify/Product/16125355819342` | EUR 69 | both `false` |
| High-Waist Biker Shorts | `quiet-current-high-waist-biker-shorts` | `gid://shopify/Product/16125355884878` | EUR 59 | both `false` |
| Studio Tank | `quiet-current-studio-tank` | `gid://shopify/Product/16125355950414` | EUR 55 | both `false` |

All four are Active, tagged `Activewear`, `Made to order` and `Quiet Current`,
in the collection `quiet-current`, with a Colour option (Moss / Mist, Clay /
Oat) and a Size option (XS, S, M, L, XL). They are shown through the released
path in `PRODUCT_RELEASE_FLAGS`, not through the metafields (see
[Who appears](../clothing-destination.md#who-appears)).

## Problems found

### 1. The four garments are "Uncategorized" in Shopify

All four have category `gid://shopify/TaxonomyCategory/na` (name
"Uncategorized"). Nothing in the storefront code reads the Shopify category,
so the Clothing page is not affected. The Google catalogue scripts in the repo
check it, but only for art prints (see
[the Google script section](#does-the-google-taxonomy-script-cover-clothing)).
Prepared values are in [the change table](#prepared-shopify-changes-not-applied).

### 2. Other products have no real category

Not part of this change; no values are proposed here.

| State | Active | Draft |
| --- | --- | --- |
| Uncategorized (`na`) | 17: Cards 1, Postcards 1, Canvas Art 1, Book Nooks 10, the 4 garments | 3: `large-fine-art-print-16x20`, `classic-framed-art-print-16x20`, `art-premium-fleece-blanket-30x40` |
| No category (`null`) | 14: nine newer art prints (`orbital-silence-art-print`, `neon-after-rain-art-print`, `desert-signal-art-print`, `the-fold-art-print`, `veil-of-stone-art-print`, `tidal-mirror-art-print`, `winter-script-art-print`, `fern-in-shadow-art-print`, `where-mist-rests-art-print`), `art-tough-phone-case`, four plant pots | 10: notebook, journal, calendar, tote, cushion, snap phone case, four art prints |

Only 15 original prints and the two personalised products have a real
category (17 products).

### 3. Thirteen empty legacy collections

All 13 have zero products in Admin and no rules (`ruleSet` is `null`). All 13
handles are on `LEGACY_COLLECTION_HANDLES` in
[`catalogFilters.ts`](../../app/lib/catalogFilters.ts).

| Handle | Title | Collection ID |
| --- | --- | --- |
| `frontpage` | Home page | `gid://shopify/Collection/687656042830` |
| `evening-gowns-formal-dresses` | Evening Gowns & Formal Dresses | `gid://shopify/Collection/687657353550` |
| `health-wellness` | Health & Wellness | `gid://shopify/Collection/687657484622` |
| `daily-carry` | Daily Carry | `gid://shopify/Collection/687703163214` |
| `home-rituals` | Home Rituals | `gid://shopify/Collection/687703228750` |
| `glow-tools` | Glow Tools | `gid://shopify/Collection/687703294286` |
| `wellness-reset` | Wellness Reset | `gid://shopify/Collection/687703327054` |
| `gift-sets` | Gift Sets | `gid://shopify/Collection/687703392590` |
| `lighting` | Lighting | `gid://shopify/Collection/688224567630` |
| `textiles` | Textiles | `gid://shopify/Collection/688224600398` |
| `ceramics` | Ceramics | `gid://shopify/Collection/688224633166` |
| `storage` | Storage | `gid://shopify/Collection/688224665934` |
| `accents` | Accents | `gid://shopify/Collection/688224698702` |

[`docs/shopify-admin-cleanup.md`](../shopify-admin-cleanup.md) already asks
for these to be removed from the Headless publication.

### 4. Three collections called "Art for Everyday Living"

| Handle | Collection ID | Products in Admin |
| --- | --- | ---: |
| `art-for-everyday-living` | `gid://shopify/Collection/697170952526` | 0 |
| `art-for-everyday-living-1` | `gid://shopify/Collection/697171018062` | 0 |
| `clara-mendes-art-living` | `gid://shopify/Collection/697171050830` | 7 |

Only `clara-mendes-art-living` has products. It is also the handle the code
uses: `EXTENSION_COLLECTION_HANDLE` in `catalogFilters.ts`, "the collection the
extension sync assigns". Its 7 members are 4 Active (`art-tough-phone-case`,
`stretched-canvas-art-16x20`, `fine-art-postcard`, `fine-art-greeting-card`)
and 3 Draft (`art-premium-fleece-blanket-30x40`,
`classic-framed-art-print-16x20`, `large-fine-art-print-16x20`). It is a manual
collection (no rules).

### 5. No collection is marked as a capsule

`clothingKind` (the collection metafield `custom.collection_kind`) is `null`
on all 17 collections. The audit reads values, not definitions, so it cannot
show whether the definition exists. Quiet Current is still a capsule because
the code names its handle.

### 6. Approval metafields on the garments

Both `custom.storefront_approved` and `custom.fulfillment_verified` are Boolean
`false` on all four garments, and the Storefront API returned them. That shows
the product metafield definitions exist and are readable. The garments appear
because of the released path. The owner declined samples, so the first paid
order is the first physical quality check (see
[the launch record](../quiet-current-release.md)). For the art phone case,
which also had its first live order as its first quality check, the record
says to set `custom.fulfillment_verified` after that order
([`art-tough-phone-case.md`](../art-tough-phone-case.md)). No change is
proposed for the garments.

## Where these collections show in the storefront

Read from the code on 8 October 2026. The audit file has no publication data
for collections, so it cannot say which of these Shopify returns to the
storefront.

**Navigation.** The header and mobile menu are a fixed list in
[`ClaraShell.tsx`](../../app/components/ClaraShell.tsx) (`NAV_LINKS`): Shop,
Clothing, Book Nooks (once released), Your Sky (once released), First Light
(once released), Our Story, Journal, Contact, Search. The footer links are also
fixed: nine "Shop by style" pages, `/collections/all`, `/clothing` and policy
links. None points to a Shopify collection by handle.

**`/collections` index.**
[`collections._index.tsx`](../../app/routes/collections._index.tsx) redirects
to `/collections/all`. It lists nothing.

**Surfaces that do list Shopify collections.** Each filters through
`filterDemoCollections` / `isDemoCollection`:

- the "Collection" menu on Shop All
  ([`collections.all.tsx`](../../app/routes/collections.all.tsx), first 24
  collections);
- the featured-collections carousel on the homepage
  ([`_index.tsx`](../../app/routes/_index.tsx), first 12 collections);
- predictive search suggestions
  ([`search.tsx`](../../app/routes/search.tsx)).

**What the code does with each collection.**

| Collection(s) | Direct URL `/collections/<handle>` | Shop All menu, homepage carousel, predictive search | Collection sitemap |
| --- | --- | --- | --- |
| The 13 legacy handles | Redirects to `/collections/all` before any Shopify request ([`collections.$handle.tsx`](../../app/routes/collections.$handle.tsx)) | Hidden: handle is on the legacy list | Removed |
| `art-for-everyday-living`, `art-for-everyday-living-1` | If Shopify returns it: it is empty, so it redirects to `/collections/all`. If it is not published: 404 | Hidden: empty collection | Removed |
| `clara-mendes-art-living` | Opens if Shopify returns it: its four Active members are listed products | Shown in the menu and carousel as "Art for Everyday Living". Predictive search passes it too. | Kept |
| `quiet-current` | Opens (its four products are listed) | Shown as "Quiet Current" | Kept |

So none of the 15 empty collections is reachable as a page or listed in a
menu. The code hides them even if Shopify still publishes them. Two points
stay open because the snapshot has no publication data: which of them are
still published, and whether other channels (feeds, Google, other sales
channels) show them.

## After structure

```
Clothing (destination, /clothing)
|- Categories (only those with garments)
|    Leggings 1, Bras 1, Shorts 1, Tops 1
|    (Dresses, Skirts, Trousers, Knitwear, Outerwear, One-pieces: no garments, no link)
`- Capsules (separate row)
     Quiet Current 4

Other families, unchanged
  Art Prints, Cards, Postcards, Canvas Art, Phone Cases, Plant Pots,
  Book Nooks, Personalised Art (Your Sky)
```

| Area | Before | After |
| --- | --- | --- |
| Entry point | No clothing page. Garments sit in Shop All, with one type tab each (Yoga Leggings, Sports Bra, Biker Shorts, Studio Top), and in `/collections/quiet-current`. | "Clothing" in the header, mobile menu and footer, a homepage section, and `/clothing`. `/collections/clothing` redirects there (301). |
| Shop All type tabs | One tab per garment type. | One "Clothing" tab to `/clothing`. Garment types are not listed. |
| Categories | None. | Taken from product type. Only categories with garments get a link. |
| Capsules | A collection page only. | A separate row on `/clothing`, from the collection. |
| This catalogue (4 garments) | | Category links, sort and the capsule filter are hidden: 4 is not more than 8 pieces, and there is one capsule. The plain grid shows. "Wear it together" has two groups, Moss / Mist and Clay / Oat, with all four garments in each, because every garment offers both colours. |
| Future garments | Need a code change for the release flag. | Need only the Shopify steps in the [guide](../clothing-destination.md#add-a-new-garment-no-code-change). They still need code for a delivery estimate. |
| Other product families | | Unchanged. |

## Prepared Shopify changes (not applied)

### Product categories for the four garments

Chosen from `taxonomyCandidates` in the JSON. No Baby & Children's entry was
used. The IDs and names are copied from the saved search results, not from a
full browse of the taxonomy. Check the name in Admin's category picker before
saving.

| Garment | Product ID | Set `category` to | Full name |
| --- | --- | --- | --- |
| `quiet-current-high-waist-leggings` | `gid://shopify/Product/16125355786574` | `gid://shopify/TaxonomyCategory/aa-1-1-1-2` | Apparel & Accessories > Clothing > Activewear > Activewear Pants > Leggings |
| `quiet-current-studio-bra` | `gid://shopify/Product/16125355819342` | `gid://shopify/TaxonomyCategory/aa-1-1-6` | Apparel & Accessories > Clothing > Activewear > Sports Bras |
| `quiet-current-high-waist-biker-shorts` | `gid://shopify/Product/16125355884878` | `gid://shopify/TaxonomyCategory/aa-1-1-1-3` | Apparel & Accessories > Clothing > Activewear > Activewear Pants > Shorts |
| `quiet-current-studio-tank` | `gid://shopify/Product/16125355950414` | `gid://shopify/TaxonomyCategory/aa-1-1-2-3` | Apparel & Accessories > Clothing > Activewear > Activewear Tops > Tank Tops |

Why these:

- All four products are activewear (tag `Activewear`), so the Activewear branch
  is used for all four.
- Leggings: the other adult entry is `aa-1-12-8` (Pants > Leggings), which is
  less specific.
- Sports bra: `aa-1-6-3` (Lingerie > Bras) is the other adult entry. The product
  is a sports bra, so `aa-1-1-6` fits better.
- Shorts: this is a judgment call. `aa-1-14-8` (Shorts > Legging Shorts) is a
  close alternative for biker shorts. The Activewear entry keeps all four in
  one branch. `sg-4-4-4-16` (Cycling Shorts & Bib Shorts) is for cycling and was
  not used.
- Tank: the product type is "Studio Top" but the product is a tank, so Tank
  Tops under Activewear Tops.

In Admin, set the product's Product category field. If done by script, the
field is `category` in `ProductUpdateInput` (the same field
`scripts/sync-google-commerce-catalog.mjs` writes for art prints).

### Collections and metafields

| Change | Target | Exact value | Why |
| --- | --- | --- | --- |
| Create metafield definition | Collections | Namespace `custom`, key `collection_kind`, type Single line text, Storefront access read (`PUBLIC_READ`) | The capsule rule reads this field. If it already exists with Storefront access, skip. |
| Set metafield (optional) | `quiet-current`, `gid://shopify/Collection/705300431182` | `custom.collection_kind` = `capsule` | The code already names this handle. Setting it makes all capsules follow one rule. |
| Remove from sales channels, do not delete | The 13 legacy collections in the [table above](#3-thirteen-empty-legacy-collections) | Not available on `Clara Mendes` or `Clara Mendes Headless` | Empty and off-theme. The code hides them, but the channels and feeds would not. If Admin does not allow it for a default collection such as `frontpage`, leave it. The code hides it. |
| Keep | `clara-mendes-art-living`, `gid://shopify/Collection/697171050830` | No change | The only one of the three with products, and the handle the code expects. |
| Remove from sales channels, do not delete | `art-for-everyday-living`, `gid://shopify/Collection/697170952526`, and `art-for-everyday-living-1`, `gid://shopify/Collection/697171018062` | Not available on `Clara Mendes` or `Clara Mendes Headless` | Empty duplicates. After this their URLs return 404 instead of redirecting (they are not on the legacy list). Add a Shopify URL redirect or a code entry if a redirect is wanted. |
| No change | The 4 garments' approval metafields | Stay `false` | The garments show through the released path. See problem 6. |

Deletion is not proposed. The older note in
[`docs/shopify-admin-cleanup.md`](../shopify-admin-cleanup.md) allows it as an
option.

## Does the Google taxonomy script cover clothing?

No. [`scripts/sync-google-commerce-catalog.mjs`](../../scripts/sync-google-commerce-catalog.mjs)
describes itself as a "Shopify taxonomy preflight only". It reads the Active
products tagged `Clara Mendes Original`, refuses to run unless there are
exactly 15, and sets one category on them:
`gid://shopify/TaxonomyCategory/hg-3-4-2` (Home & Garden > Decor > Artwork >
Posters, Prints, & Visual Artwork). It has no apparel logic.
`scripts/audit-google-commerce-catalog.mjs` expects the same single art
category. So `npm run catalog:google:taxonomy:dry-run` says nothing about the
garments, and it was not run. It would call the Admin API, which this work did
not do. A garment script would be a new script; none has been written.

## Not checked

- Which collections and products are published to which sales channels. The
  snapshot has `storefrontVisible` for products only.
- Whether the `custom.collection_kind` definition exists.
- Whether Shopify allows the default `frontpage` collection to be unpublished.
- The live site. The Clothing page is on an uncommitted branch.
- Any supplier mapping, billing, shipping or physical quality. The snapshot
  note says the audit changed and reverified none of these.
