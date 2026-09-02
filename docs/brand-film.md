# Introducing Clara Mendes — brand film

Silent, 45 seconds, 1920 × 1080, 24 fps. Rendered from `video/`
(Remotion) out of the storefront's own mockups; hosted on Shopify Files;
embedded on the homepage between the collection intro and the capsule
carousel (Our Story carries no film, by owner decision). Design: `superpowers/specs/2026-09-02-brand-film-design.md`.

## YouTube

**Title:** Introducing Clara Mendes

**Description:**

Today we're opening Clara Mendes: fifteen original works in five capsules
— Quiet Form, Patina Blue, Neo Deco, Sunlit Mosaic and Midnight Garden —
made to live with. Each capsule holds three works composed together; one
print carries a room, a pair or trio reads as one arrangement. Giclée on
200 gsm enhanced matte paper in three sizes (8 × 10, 16 × 20, 20 × 24 in),
printed when you order it and shipped across the EU.

https://shopclaramendes.com

**Tags:** wall art, art prints, abstract wall art, dark botanical, art deco
prints, living room wall art, giclée prints, Clara Mendes

**Thumbnail:** `video/out/introducing-clara-mendes-poster.jpg`.

Upload as unlisted first, check playback, then set Public and add the link
to the Instagram and Pinterest bios.

## Beat sheet

| # | Time | Picture | Words |
|---|------|---------|-------|
| 1 | 00:00–00:04 | Quiet Form living room | Today we're opening Clara Mendes. |
| 2 | 00:04–00:07.5 | Quiet Form I room detail | Fifteen original works, in five capsules, made to live with. |
| 3 | 00:07.5–00:11 | Quiet Form trio on paper | Each capsule holds three works composed together. |
| 4–8 | 00:11–00:26 | One room per capsule, into the print | Quiet Form · Patina Blue · Neo Deco · Sunlit Mosaic · Midnight Garden (lower-thirds) |
| 9 | 00:26–00:30 | The same sofa wall, 8 × 10 → 16 × 20 → 20 × 24 | Three sizes. Printed when you order it. |
| 10 | 00:30–00:33.5 | Patina Blue detail | Giclée on 200 gsm enhanced matte paper. |
| 11 | 00:33.5–00:37 | Midnight Garden trio | Buy one now. Add its companions later. |
| 12 | 00:37–00:40.5 | Living room, pulling back | Clara Mendes is open today. Ships across the EU. |
| 13 | 00:40.5–00:45 | Interior backdrop, wordmark, URL | — |

## Re-render and re-upload

1. Edit `video/src/film/script.ts` (captions, order, pictures).
2. `cd video && npm test && npm run render && npm run poster && npm run check`.
3. `node scripts/upload-brand-film.mjs --apply` (needs working Admin client
   credentials in `.env.shopify-admin.local`; as of 2026-09-02 the exchange
   fails with "invalid_request", so upload by hand in Admin > Content > Files
   and read the link from the file's detail page) and paste the two URLs into
   `app/lib/brandFilm.ts`. (Shopify Files keeps the old file; delete it in
   Admin → Content → Files once the new URL is live.)
