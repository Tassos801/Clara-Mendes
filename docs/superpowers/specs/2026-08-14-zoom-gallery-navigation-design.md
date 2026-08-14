# Product zoom-view photo navigation — design

**Date:** 2026-08-14
**Status:** Approved (owner picked the full version over arrows-only)

## Problem

On the product page, pressing a gallery photo opens the enlarged view
(`product-zoom-overlay` in `app/routes/products.$handle.tsx`), which is stuck
on the clicked photo. The only controls are Close, Esc, and backdrop click.
Shoppers must close the overlay, scroll the gallery, and re-open to see the
next photo.

## Design

Extend the existing zoom overlay in `ProductGalleryCarousel` — no new
component, no dependency.

- **State:** replace `zoomImage: ProductImage | null` with
  `zoomIndex: number | null` into the `images` array. The print-scale diagram
  slide is not an image and stays out of the zoom rotation.
- **Navigation:** on-screen prev/next arrows (glass styling consistent with
  `.product-zoom-close`), ArrowLeft/ArrowRight keys, and horizontal swipe on
  touch. Navigation wraps at the ends, matching the reviews `PhotoLightbox`.
- **Counter:** "n / total" indicator, `aria-live="polite"`. Arrows and counter
  render only when there is more than one photo.
- **Close sync:** closing the overlay scrolls the gallery to the photo last
  viewed and returns focus to that slide's zoom trigger.
- **Reduced motion:** no new animations; gallery sync uses instant scroll.

## Alternatives rejected

- **Generalize `reviews/PhotoLightbox`:** built around review captions and
  a flat review-photo list; reworking it for products risks regressing
  reviews for no user-visible gain.
- **Third-party lightbox library:** new dependency, off-brand UI.

## Testing

- Unit-test the wrap-around index helper alongside the existing
  `productGalleryCarousel` helpers.
- Manual pass in the dev preview: open zoom, arrows/keys/counter, close sync,
  single-image product renders no arrows, mobile viewport layout.
