# Sci-fi & Cinema launch — Facebook and Instagram schedule (September 2026)

Four paired posts, one per print, scheduled on 22 September 2026 from Meta
Business Suite to the Clara Mendes Facebook page and the @shopclaramendes
Instagram account (both under the "Clara Mendes, shopclaramendes" asset,
business portfolio 1063579051716208). Each post uses the print's tailored
living-room image from the product gallery (1080×1350, no text), so the
artwork in the post is the exact artwork the customer receives.

The captions promote the new room imagery and stay true whether or not the
larger sizes are released yet: they name the paper, "unframed, printed to
order" and the shop, and do not list sizes. A follow-up post can announce the
three sizes once `release --apply` has run and been verified.

## Campaign entries (same caption on both platforms)

| # | Print | Image | Scheduled (Europe/Nicosia) | Caption |
| --- | --- | --- | --- | --- |
| 1 | Orbital Silence | `orbital-silence-living-room.jpg` | Thu 24 Sep 2026 19:30 | Quiet at orbital altitude. Orbital Silence, now shown in the room it was made for. Giclee print on 200 gsm enhanced matte paper, unframed and printed to order. Shop at shopclaramendes.com (link in bio). #artprint #scifiart #wallart #interiordesign |
| 2 | Neon After Rain | `neon-after-rain-living-room.jpg` | Sat 26 Sep 2026 19:30 | Wet streets, warm light, a city that never quite sleeps. Neon After Rain, now shown in the room it was made for. Giclee print on 200 gsm enhanced matte paper, unframed and printed to order. Shop at shopclaramendes.com (link in bio). #artprint #cyberpunkart #wallart #interiordesign |
| 3 | Desert Signal | `desert-signal-living-room.jpg` | Mon 28 Sep 2026 19:30 | Warm dunes, one lone traveller, one distant signal. Desert Signal, now shown in the room it was made for. Giclee print on 200 gsm enhanced matte paper, unframed and printed to order. Shop at shopclaramendes.com (link in bio). #artprint #scifiart #wallart #interiordesign |
| 4 | The Fold | `the-fold-living-room.jpg` | Wed 30 Sep 2026 19:30 | Terracotta stairs, an ivory arch, a blue sea below. The Fold, now shown in the room it was made for. Giclee print on 200 gsm enhanced matte paper, unframed and printed to order. Shop at shopclaramendes.com (link in bio). #artprint #architectureart #wallart |

Images come from `public/images/product-art-mockups/scifi-cinema/`.

## Queue readback (Content → Posts and reels → Scheduled, 22 Sep 2026 13:35)

Eight rows, all type "Photo", privacy Public, no failure badge:

| Date scheduled | Facebook (Clara Mendes) | Instagram (shopclaramendes) |
| --- | --- | --- |
| 24 September 19:30 | Orbital Silence | Orbital Silence |
| 26 September 19:30 | Neon After Rain | Neon After Rain |
| 28 September 19:30 | Desert Signal | Desert Signal |
| 30 September 19:30 | The Fold | The Fold |

No boost was bought (the "Reach a wider audience" offer after each schedule
was declined).

## Notes for next time

- The five August posts in the same queue show "Failed to publish": they were
  scheduled as text-only Instagram posts (no media attached). Instagram
  rejects posts without media, so always confirm the composer shows the image
  (1080 × 1350) before scheduling.
- The composer's "Add photo/video" opens the OS file picker directly; with the
  Chrome extension, capture the dynamically created `input type=file` (patch
  `HTMLInputElement.prototype.click` in the page) and use `file_upload` on it.
- Typing hashtags triggers a typeahead that can stall the composer; if the
  last hashtag is dropped, select all and retype the whole caption.
