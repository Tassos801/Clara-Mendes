# Zoom Gallery Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let shoppers move between product photos inside the product-page enlarged view (arrows, arrow keys, swipe, counter, wrap-around, gallery sync on close).

**Architecture:** Extend the existing `ProductGalleryCarousel` zoom overlay in `app/routes/products.$handle.tsx`. Zoom state changes from the image object to an index into `images`; two new pure helpers in `app/lib/productGalleryCarousel.ts` handle wrap-around and swipe resolution. No new components or dependencies.

**Tech Stack:** Hydrogen/React Router 7, TypeScript, plain CSS in `app/styles/app.css`, `node --test` for unit tests.

Spec: `docs/superpowers/specs/2026-08-14-zoom-gallery-navigation-design.md`

---

### Task 1: Pure helpers (wrap-around + swipe), TDD

**Files:**
- Modify: `app/lib/productGalleryCarousel.ts`
- Test: `scripts/productGalleryCarousel.node-test.mjs`

- [ ] **Step 1: Write the failing tests** — append to `scripts/productGalleryCarousel.node-test.mjs` (extend the import to include the two new names):

```js
import {
  clampCarouselIndex,
  cycleCarouselIndex,
  nearestCarouselIndex,
  resolveZoomSwipe,
} from '../app/lib/productGalleryCarousel.ts';

test('cycles the zoom view through photos with wrap-around', () => {
  assert.equal(cycleCarouselIndex(0, 1, 5), 1);
  assert.equal(cycleCarouselIndex(4, 1, 5), 0);
  assert.equal(cycleCarouselIndex(0, -1, 5), 4);
  assert.equal(cycleCarouselIndex(2, -1, 5), 1);
  assert.equal(cycleCarouselIndex(3, 0, 5), 3);
  assert.equal(cycleCarouselIndex(9, 1, 5), 0);
  assert.equal(cycleCarouselIndex(0, 1, 0), 0);
  assert.equal(cycleCarouselIndex(Number.NaN, 1, 5), 1);
});

test('resolves a zoom swipe into a photo step', () => {
  assert.equal(resolveZoomSwipe({deltaX: -120, deltaY: 8}), 1);
  assert.equal(resolveZoomSwipe({deltaX: 120, deltaY: -10}), -1);
  assert.equal(resolveZoomSwipe({deltaX: -30, deltaY: 0}), 0);
  assert.equal(resolveZoomSwipe({deltaX: -80, deltaY: -90}), 0);
  assert.equal(resolveZoomSwipe({deltaX: Number.NaN, deltaY: 0}), 0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: the two new tests FAIL (`cycleCarouselIndex is not a function` / export missing).

- [ ] **Step 3: Implement helpers** — append to `app/lib/productGalleryCarousel.ts`:

```ts
const ZOOM_SWIPE_THRESHOLD = 56;

export function cycleCarouselIndex(index: number, delta: number, total: number) {
  if (total <= 0) return 0;

  const base = clampCarouselIndex(index, total);
  const step = Number.isFinite(delta) ? Math.trunc(delta) : 0;
  return (((base + step) % total) + total) % total;
}

export function resolveZoomSwipe({
  deltaX,
  deltaY,
}: {
  deltaX: number;
  deltaY: number;
}): -1 | 0 | 1 {
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return 0;
  if (Math.abs(deltaX) < ZOOM_SWIPE_THRESHOLD) return 0;
  if (Math.abs(deltaX) <= Math.abs(deltaY)) return 0;

  return deltaX < 0 ? 1 : -1;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/lib/productGalleryCarousel.ts scripts/productGalleryCarousel.node-test.mjs
git commit -m "Add wrap-around and swipe helpers for the zoom gallery"
```

### Task 2: Wire navigation into the zoom overlay

**Files:**
- Modify: `app/routes/products.$handle.tsx` (`ProductGalleryCarousel`, ~line 812)

- [ ] **Step 1: Update imports**

`type PointerEvent as ReactPointerEvent` joins the react import; the carousel lib import gains the new helpers:

```ts
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
```

```ts
import {
  clampCarouselIndex,
  cycleCarouselIndex,
  nearestCarouselIndex,
  resolveZoomSwipe,
} from '~/lib/productGalleryCarousel';
```

- [ ] **Step 2: Replace zoom state with an index + derived image**

Replace `const [zoomImage, setZoomImage] = useState<ProductImage | null>(null);` with:

```ts
const [zoomIndex, setZoomIndex] = useState<number | null>(null);
const zoomPointerRef = useRef<{id: number; x: number; y: number} | null>(null);
const zoomCount = images.length;
const zoomImage = zoomIndex != null ? (images[zoomIndex] ?? null) : null;
const zoomOpen = zoomIndex != null;
```

(`galleryTrackRef`, `zoomCloseRef`, `zoomTriggerRef` stay as they are.)

- [ ] **Step 3: Close syncs the gallery; navigation cycles**

Replace the existing `closeZoom` callback with:

```ts
const closeZoom = useCallback(() => {
  if (zoomIndex != null) {
    const track = galleryTrackRef.current;
    const slide = track?.querySelectorAll<HTMLElement>(
      '[data-product-gallery-slide]',
    )[zoomIndex];
    if (track && slide) {
      setActiveIndex(zoomIndex);
      track.scrollTo({behavior: 'auto', left: slide.offsetLeft});
    }
    const trigger = slide?.querySelector<HTMLElement>('.product-zoom-trigger');
    window.requestAnimationFrame(() =>
      (trigger ?? zoomTriggerRef.current)?.focus(),
    );
  }
  setZoomIndex(null);
}, [zoomIndex]);

const navigateZoom = useCallback(
  (delta: number) => {
    setZoomIndex((current) =>
      current == null ? current : cycleCarouselIndex(current, delta, zoomCount),
    );
  },
  [zoomCount],
);
```

- [ ] **Step 4: Reset + effects**

In the `galleryIdentity` effect, `setZoomImage(null)` becomes `setZoomIndex(null)`.

Replace the single zoom effect (`if (!zoomImage) return;` …) with two effects keyed on `zoomOpen` so navigating doesn't re-lock scroll or steal focus back to Close:

```ts
useEffect(() => {
  if (!zoomOpen) return;

  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  zoomCloseRef.current?.focus();
  return () => {
    document.body.style.overflow = previousOverflow;
  };
}, [zoomOpen]);

useEffect(() => {
  if (!zoomOpen) return;

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') closeZoom();
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      navigateZoom(-1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      navigateZoom(1);
    }
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}, [closeZoom, navigateZoom, zoomOpen]);
```

- [ ] **Step 5: Swipe handlers** (plain functions above the `if (slideCount === 0)` return):

```ts
const handleZoomPointerDown = (event: ReactPointerEvent<HTMLImageElement>) => {
  zoomPointerRef.current = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
  };
};

const handleZoomPointerUp = (event: ReactPointerEvent<HTMLImageElement>) => {
  const start = zoomPointerRef.current;
  zoomPointerRef.current = null;
  if (!start || start.id !== event.pointerId) return;

  const step = resolveZoomSwipe({
    deltaX: event.clientX - start.x,
    deltaY: event.clientY - start.y,
  });
  if (step !== 0) navigateZoom(step);
};

const handleZoomPointerCancel = () => {
  zoomPointerRef.current = null;
};
```

- [ ] **Step 6: Trigger stores the index; overlay gains arrows + counter**

In the gallery slide `onClick`: `setZoomImage(image)` becomes `setZoomIndex(index)`.

Replace the overlay `<img …/>` line and add nav controls before the Close button:

```tsx
<img
  src={zoomImage.url}
  alt={zoomImage.altText || productTitle}
  draggable={false}
  onPointerDown={handleZoomPointerDown}
  onPointerUp={handleZoomPointerUp}
  onPointerCancel={handleZoomPointerCancel}
/>
{zoomCount > 1 ? (
  <>
    <button
      className="product-zoom-nav product-zoom-nav--previous"
      type="button"
      aria-label="Previous photo"
      onClick={() => navigateZoom(-1)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14.5 5.5 8 12l6.5 6.5M8.5 12H20" />
      </svg>
    </button>
    <button
      className="product-zoom-nav product-zoom-nav--next"
      type="button"
      aria-label="Next photo"
      onClick={() => navigateZoom(1)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m9.5 5.5 6.5 6.5-6.5 6.5M15.5 12H4" />
      </svg>
    </button>
    <p
      className="product-zoom-counter"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Photo ${(zoomIndex ?? 0) + 1} of ${zoomCount}`}
    >
      <span aria-hidden="true">
        {String((zoomIndex ?? 0) + 1).padStart(2, '0')}
        <i>/</i>
        {String(zoomCount).padStart(2, '0')}
      </span>
    </p>
  </>
) : null}
```

- [ ] **Step 7: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add app/routes/products.\$handle.tsx
git commit -m "Navigate product photos inside the zoom overlay"
```

### Task 3: Overlay nav styling

**Files:**
- Modify: `app/styles/app.css` (after the `.product-zoom-close` block, ~line 1004)

- [ ] **Step 1: Add styles**

Append after `.product-zoom-close`; also add `touch-action: pan-y pinch-zoom; user-select: none; -webkit-user-select: none;` to the existing `.product-zoom-overlay img` block:

```css
.product-zoom-nav {
  align-items: center;
  backdrop-filter: blur(16px) saturate(1.25);
  -webkit-backdrop-filter: blur(16px) saturate(1.25);
  background: var(--glass-surface-strong);
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  box-shadow: var(--glass-shadow);
  color: var(--color-ink);
  cursor: pointer;
  display: flex;
  height: 48px;
  justify-content: center;
  padding: 0;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
}

.product-zoom-nav svg {
  fill: none;
  height: 20px;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5;
  width: 20px;
}

.product-zoom-nav--previous {
  left: clamp(10px, 2.5vw, 28px);
}

.product-zoom-nav--next {
  right: clamp(10px, 2.5vw, 28px);
}

.product-zoom-nav:hover {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.72), transparent 55%),
    rgba(251, 250, 246, 0.94);
}

.product-zoom-nav:focus-visible,
.product-zoom-close:focus-visible {
  outline: 1.5px solid var(--color-paper);
  outline-offset: 3px;
}

.product-zoom-counter {
  backdrop-filter: blur(16px) saturate(1.25);
  -webkit-backdrop-filter: blur(16px) saturate(1.25);
  background: var(--glass-surface-strong);
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  bottom: clamp(14px, 3vw, 28px);
  color: var(--color-ink);
  font-size: 0.68rem;
  font-weight: 600;
  left: 50%;
  letter-spacing: 0.18em;
  margin: 0;
  padding: 9px 16px;
  pointer-events: none;
  position: absolute;
  transform: translateX(-50%);
}

.product-zoom-counter i {
  font-style: normal;
  opacity: 0.45;
  padding: 0 5px;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/styles/app.css
git commit -m "Style zoom overlay navigation controls"
```

### Task 4: Verify in the browser, full check, PR

- [ ] **Step 1: Dev preview pass** — start the `clara-mendes` dev server (launch.json), open an art-print PDP. Verify: click photo → zoom; arrows cycle with wrap; ArrowLeft/ArrowRight work; counter updates; scale-diagram slide never appears in zoom; close lands the gallery on the viewed photo; Esc/backdrop still close; single-photo product (if any) shows no arrows. Mobile viewport: controls fit, nothing overlaps. Screenshot proof.
- [ ] **Step 2: Full gate** — `npm test && npm run lint && npm run typecheck && npm run build` all clean.
- [ ] **Step 3: Push branch + open PR** titled "Navigate product photos inside the enlarged view".
